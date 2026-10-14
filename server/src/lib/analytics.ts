import { all, get } from '../db';
import { addDays, daysAgoIso, localDay } from './dates';
import { onlineUsers } from './realtime';
import { getNumberSetting } from './settings';

const n = (sql: string, ...p: (string | number)[]) => Number(get<{ n: number }>(sql, ...p)?.n ?? 0);
const pct = (part: number, total: number) => (total ? Math.round((part / total) * 1000) / 10 : 0);

/** Métricas do painel (alunos ativos, conclusão/abandono, tempo de estudo, cursos, municípios). */
export function getMetrics() {
  const activeDays = getNumberSetting('active_days') || 7;
  const abandonDays = getNumberSetting('abandonment_days') || 30;
  const today = localDay();
  const activeSinceDay = addDays(today, -(activeDays - 1));
  const activeSinceIso = daysAgoIso(activeDays);

  const students = n("SELECT COUNT(*) n FROM users WHERE role = 'student' AND is_active = 1");
  const activeStudents = n(
    `SELECT COUNT(*) n FROM users WHERE role = 'student' AND is_active = 1
       AND (last_seen_at >= ? OR id IN (SELECT user_id FROM study_time WHERE day >= ?))`,
    activeSinceIso,
    activeSinceDay,
  );
  const activeToday = n('SELECT COUNT(DISTINCT user_id) n FROM study_time WHERE day = ?', today);

  const enrollments = n('SELECT COUNT(*) n FROM enrollments');
  const completed = n("SELECT COUNT(*) n FROM enrollments WHERE status = 'completed'");
  const abandoned = n(
    "SELECT COUNT(*) n FROM enrollments WHERE status = 'in_progress' AND COALESCE(last_access_at, enrolled_at) < ?",
    daysAgoIso(abandonDays),
  );

  const study = get<{ total: number; learners: number }>('SELECT COALESCE(SUM(seconds),0) total, COUNT(DISTINCT user_id) learners FROM study_time')!;
  const avgStudySeconds = study.learners ? Math.round(study.total / study.learners) : 0;

  const topCourses = all<{
    id: number;
    title: string;
    enrollments: number;
    completed: number;
    study_seconds: number;
    learners_7d: number;
  }>(
    `SELECT c.id, c.title,
       (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) enrollments,
       (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'completed') completed,
       (SELECT COALESCE(SUM(seconds),0) FROM study_time s WHERE s.course_id = c.id) study_seconds,
       (SELECT COUNT(DISTINCT user_id) FROM study_time s WHERE s.course_id = c.id AND s.day >= ?) learners_7d
     FROM courses c WHERE c.published = 1
     ORDER BY enrollments DESC, study_seconds DESC`,
    activeSinceDay,
  ).map((c) => ({ ...c, completionRate: pct(c.completed, c.enrollments) }));

  const municipalities = all<{ municipality: string; students: number; completions: number }>(
    `SELECT COALESCE(NULLIF(TRIM(u.municipality), ''), 'Não informado') municipality,
       COUNT(*) students,
       SUM((SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id AND e.status = 'completed')) completions
     FROM users u WHERE u.role = 'student' AND u.is_active = 1
     GROUP BY 1 ORDER BY students DESC`,
  );

  const firstDay = addDays(today, -13);
  const studyByDay = new Map(
    all<{ day: string; learners: number; seconds: number }>(
      'SELECT day, COUNT(DISTINCT user_id) learners, SUM(seconds) seconds FROM study_time WHERE day >= ? GROUP BY day',
      firstDay,
    ).map((r) => [r.day, r]),
  );
  const daily = Array.from({ length: 14 }, (_, i) => {
    const day = addDays(firstDay, i);
    const row = studyByDay.get(day);
    return { day, activeStudents: row?.learners ?? 0, studyMinutes: Math.round((row?.seconds ?? 0) / 60) };
  });

  const feedback = get<{ avg: number | null; count: number; nps: number | null }>(
    `SELECT ROUND(AVG(rating), 2) avg, COUNT(*) count,
       ROUND(100.0 * (SUM(CASE WHEN recommend >= 9 THEN 1 ELSE 0 END) - SUM(CASE WHEN recommend <= 6 THEN 1 ELSE 0 END)) / NULLIF(COUNT(recommend), 0), 1) nps
     FROM feedback`,
  )!;

  return {
    generatedAt: new Date().toISOString(),
    windows: { activeDays, abandonDays },
    totals: {
      students,
      activeStudents,
      activeToday,
      onlineNow: onlineUsers(),
      courses: n('SELECT COUNT(*) n FROM courses WHERE published = 1'),
      enrollments,
      completed,
      abandoned,
      certificates: n('SELECT COUNT(*) n FROM certificates'),
      newStudents7d: n("SELECT COUNT(*) n FROM users WHERE role = 'student' AND created_at >= ?", daysAgoIso(7)),
    },
    rates: {
      completion: pct(completed, enrollments),
      abandonment: pct(abandoned, enrollments),
      active: pct(activeStudents, students),
    },
    study: { avgSecondsPerStudent: avgStudySeconds, totalSeconds: study.total },
    topCourses,
    municipalities,
    daily,
    feedback,
  };
}
