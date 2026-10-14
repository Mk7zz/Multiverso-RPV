import { Router, type Request } from 'express';
import { all, get, now } from '../db';
import { notFound } from '../lib/http';
import { isAdmin } from '../middleware/auth';

// Vitrine pública (perfil Visitante): trilhas, cursos, avisos e eventos. Não exige login.
export const catalogRouter = Router();

const COURSE_CARD = `
  SELECT c.id, c.title, c.slug, c.summary, c.cover_url, c.workload_hours, c.level, c.has_certificate,
         c.access_type, c.availability, c.delivery_mode, c.published, c.trail_id, t.title trail_title, t.slug trail_slug,
         (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) modules_count,
         (SELECT COUNT(*) FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = c.id) lessons_count,
         (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) students,
         (SELECT ROUND(AVG(rating), 1) FROM feedback f WHERE f.course_id = c.id) rating,
         e.status enrollment_status, e.progress enrollment_progress
  FROM courses c
  LEFT JOIN trails t ON t.id = c.trail_id
  LEFT JOIN enrollments e ON e.course_id = c.id AND e.user_id = ?`;

const viewerId = (req: Request) => req.user?.id ?? 0;

export function listCourses(req: Request, filters: { q?: string; trailId?: number } = {}) {
  const where = ['c.published = 1'];
  const params: (string | number)[] = [viewerId(req)];
  if (filters.q) {
    where.push('(c.title LIKE ? OR c.summary LIKE ?)');
    params.push(`%${filters.q}%`, `%${filters.q}%`);
  }
  if (filters.trailId) {
    where.push('c.trail_id = ?');
    params.push(filters.trailId);
  }
  return all(`${COURSE_CARD} WHERE ${where.join(' AND ')} ORDER BY c.position, c.id`, ...params);
}

export function activeAnnouncements() {
  const t = now();
  return all(
    `SELECT id, title, body, level, pinned, starts_at, ends_at, created_at FROM announcements
     WHERE (starts_at IS NULL OR starts_at <= ?) AND (ends_at IS NULL OR ends_at >= ?)
     ORDER BY pinned DESC, created_at DESC LIMIT 20`,
    t,
    t,
  );
}

export function upcomingEvents(limit = 20) {
  return all(
    `SELECT ev.*, c.title course_title, c.slug course_slug FROM events ev LEFT JOIN courses c ON c.id = ev.course_id
     WHERE COALESCE(ev.ends_at, ev.starts_at) >= ? ORDER BY ev.starts_at LIMIT ?`,
    now(),
    limit,
  );
}

catalogRouter.get('/home', (req, res) => {
  const stats = {
    students: Number(get<{ n: number }>("SELECT COUNT(*) n FROM users WHERE role = 'student'")!.n),
    courses: Number(get<{ n: number }>('SELECT COUNT(*) n FROM courses WHERE published = 1')!.n),
    certificates: Number(get<{ n: number }>('SELECT COUNT(*) n FROM certificates')!.n),
    municipalities: Number(
      get<{ n: number }>("SELECT COUNT(DISTINCT LOWER(TRIM(municipality))) n FROM users WHERE role = 'student' AND municipality <> ''")!.n,
    ),
  };
  res.json({
    stats,
    trails: all('SELECT id, title, slug, description, cover_url FROM trails WHERE published = 1 ORDER BY position, id'),
    courses: listCourses(req),
    announcements: activeAnnouncements(),
    events: upcomingEvents(4),
  });
});

catalogRouter.get('/courses', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : undefined;
  const trailId = Number(req.query.trail) || undefined;
  res.json({ courses: listCourses(req, { q, trailId }) });
});

catalogRouter.get('/courses/:slug', (req, res) => {
  const course = get<Record<string, any>>(`${COURSE_CARD} WHERE c.slug = ?`, viewerId(req), req.params.slug);
  if (!course || (!course.published && !isAdmin(req))) throw notFound('Curso não encontrado');
  const full = get<{ description: string; cert_min_grade: number; cert_min_progress: number; require_feedback: number }>(
    'SELECT description, cert_min_grade, cert_min_progress, require_feedback FROM courses WHERE id = ?',
    course.id,
  )!;
  const modules = all<{ id: number; title: string; description: string | null }>(
    'SELECT id, title, description FROM modules WHERE course_id = ? ORDER BY position, id',
    course.id,
  );
  const lessons = all<{ id: number; module_id: number; title: string; duration_minutes: number }>(
    `SELECT l.id, l.module_id, l.title, l.duration_minutes FROM lessons l JOIN modules m ON m.id = l.module_id
     WHERE m.course_id = ? ORDER BY l.position, l.id`,
    course.id,
  );
  const assessments = all(
    `SELECT a.id, a.title, a.kind, a.scope_type, a.scope_id FROM assessments a
     WHERE a.published = 1 AND ((a.scope_type = 'course' AND a.scope_id = ?)
       OR (a.scope_type = 'module' AND a.scope_id IN (SELECT id FROM modules WHERE course_id = ?))
       OR (a.scope_type = 'lesson' AND a.scope_id IN (SELECT l.id FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = ?)))`,
    course.id,
    course.id,
    course.id,
  );
  res.json({
    course: { ...course, ...full },
    modules: modules.map((m) => ({ ...m, lessons: lessons.filter((l) => l.module_id === m.id) })),
    assessments,
    events: all('SELECT * FROM events WHERE course_id = ? AND COALESCE(ends_at, starts_at) >= ? ORDER BY starts_at', course.id, now()),
  });
});

catalogRouter.get('/trails', (_req, res) => {
  res.json({
    trails: all(
      `SELECT t.id, t.title, t.slug, t.description, t.cover_url,
         (SELECT COUNT(*) FROM courses c WHERE c.trail_id = t.id AND c.published = 1) courses_count,
         (SELECT COALESCE(SUM(workload_hours), 0) FROM courses c WHERE c.trail_id = t.id AND c.published = 1) workload_hours
       FROM trails t WHERE t.published = 1 ORDER BY t.position, t.id`,
    ),
  });
});

catalogRouter.get('/trails/:slug', (req, res) => {
  const trail = get<{ id: number; published: number }>('SELECT * FROM trails WHERE slug = ?', req.params.slug);
  if (!trail || (!trail.published && !isAdmin(req))) throw notFound('Trilha não encontrada');
  const assessments = all(
    "SELECT id, title, kind, description FROM assessments WHERE scope_type = 'trail' AND scope_id = ? AND published = 1 ORDER BY position, id",
    trail.id,
  );
  res.json({ trail, courses: listCourses(req, { trailId: trail.id }), assessments });
});

catalogRouter.get('/announcements', (_req, res) => {
  res.json({ announcements: activeAnnouncements() });
});

catalogRouter.get('/events', (_req, res) => {
  res.json({ events: upcomingEvents(50) });
});
