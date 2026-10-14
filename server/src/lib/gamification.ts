import { all, get, now, run } from '../db';
import { addDays, localDay } from './dates';
import { levelInfo } from './levels';
import { notify } from './notify';
import { pushToUser } from './realtime';
import { getNumberSetting, type SettingKey } from './settings';

export interface UserStats {
  points: number;
  lessonsCompleted: number;
  quizzesPassed: number;
  perfectScores: number;
  coursesCompleted: number;
  coursesInProgress: number;
  certificates: number;
  friends: number;
  feedbacks: number;
  studySeconds: number;
  currentStreak: number;
  bestStreak: number;
  hasAvatar: boolean;
  questsCompleted: number;
  level: number;
}

export type BadgeTier = 'bronze' | 'prata' | 'ouro' | 'lendaria';

interface BadgeDef {
  code: string;
  name: string;
  description: string;
  icon: string;
  tier: BadgeTier;
  /** Valor atual do critério; a medalha é concedida quando chega em `goal`. */
  metric: (s: UserStats) => number;
  goal: number;
}

/** Catálogo de medalhas. Novas medalhas são sincronizadas com o banco na inicialização. */
export const BADGES: BadgeDef[] = [
  { code: 'first_lesson', name: 'Primeiro passo', description: 'Concluiu a primeira aula', icon: 'target', tier: 'bronze', metric: (s) => s.lessonsCompleted, goal: 1 },
  { code: 'lessons_10', name: 'Maratonista', description: 'Concluiu 10 aulas', icon: 'books', tier: 'prata', metric: (s) => s.lessonsCompleted, goal: 10 },
  { code: 'lessons_30', name: 'Devorador de conteúdo', description: 'Concluiu 30 aulas', icon: 'bulb', tier: 'ouro', metric: (s) => s.lessonsCompleted, goal: 30 },
  { code: 'first_quiz', name: 'Mandou bem', description: 'Foi aprovado(a) na primeira avaliação', icon: 'check', tier: 'bronze', metric: (s) => s.quizzesPassed, goal: 1 },
  { code: 'perfect_score', name: 'Nota máxima', description: 'Tirou 100% em uma avaliação', icon: 'star', tier: 'prata', metric: (s) => s.perfectScores, goal: 1 },
  { code: 'first_course', name: 'Formado(a)', description: 'Concluiu o primeiro curso', icon: 'gradcap', tier: 'prata', metric: (s) => s.coursesCompleted, goal: 1 },
  { code: 'three_courses', name: 'Multiversal', description: 'Concluiu 3 cursos', icon: 'portal', tier: 'ouro', metric: (s) => s.coursesCompleted, goal: 3 },
  { code: 'five_courses', name: 'Explorador(a) do Multiverso', description: 'Concluiu 5 cursos', icon: 'compass', tier: 'lendaria', metric: (s) => s.coursesCompleted, goal: 5 },
  { code: 'first_certificate', name: 'Certificado na mão', description: 'Emitiu o primeiro certificado', icon: 'scroll', tier: 'prata', metric: (s) => s.certificates, goal: 1 },
  { code: 'streak_3', name: 'Constância', description: 'Estudou 3 dias seguidos', icon: 'flame', tier: 'bronze', metric: (s) => s.bestStreak, goal: 3 },
  { code: 'streak_7', name: 'Imparável', description: 'Estudou 7 dias seguidos', icon: 'bolt', tier: 'prata', metric: (s) => s.bestStreak, goal: 7 },
  { code: 'streak_30', name: 'Chama do Vale', description: 'Estudou 30 dias seguidos', icon: 'sun', tier: 'lendaria', metric: (s) => s.bestStreak, goal: 30 },
  { code: 'study_5h', name: 'Dedicação', description: 'Acumulou 5 horas de estudo', icon: 'clock', tier: 'prata', metric: (s) => Math.floor(s.studySeconds / 3600), goal: 5 },
  { code: 'friends_3', name: 'Conectado(a)', description: 'Fez 3 amizades na plataforma', icon: 'users', tier: 'bronze', metric: (s) => s.friends, goal: 3 },
  { code: 'friends_10', name: 'Hub do ecossistema', description: 'Fez 10 amizades na plataforma', icon: 'network', tier: 'ouro', metric: (s) => s.friends, goal: 10 },
  { code: 'feedback', name: 'Voz ativa', description: 'Avaliou um curso no formulário de feedback', icon: 'chat', tier: 'bronze', metric: (s) => s.feedbacks, goal: 1 },
  { code: 'avatar', name: 'Cara nova', description: 'Personalizou o próprio avatar', icon: 'palette', tier: 'bronze', metric: (s) => (s.hasAvatar ? 1 : 0), goal: 1 },
  { code: 'quests_5', name: 'Missão dada', description: 'Completou 5 missões', icon: 'map', tier: 'bronze', metric: (s) => s.questsCompleted, goal: 5 },
  { code: 'quests_25', name: 'Bandeirante do Vale', description: 'Completou 25 missões', icon: 'flag', tier: 'ouro', metric: (s) => s.questsCompleted, goal: 25 },
  { code: 'level_3', name: 'Nascente', description: 'Alcançou o nível 3', icon: 'drop', tier: 'bronze', metric: (s) => s.level, goal: 3 },
  { code: 'level_6', name: 'Rio Pomba', description: 'Alcançou o nível 6', icon: 'canoe', tier: 'ouro', metric: (s) => s.level, goal: 6 },
  { code: 'level_10', name: 'Lenda do Valley', description: 'Alcançou o nível máximo', icon: 'summit', tier: 'lendaria', metric: (s) => s.level, goal: 10 },
];

export const badgeDef = (code: string) => BADGES.find((b) => b.code === code);

export function syncBadges() {
  for (const b of BADGES) {
    run(
      `INSERT INTO badges (code, name, description, icon) VALUES (?, ?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET name = excluded.name, description = excluded.description, icon = excluded.icon`,
      b.code,
      b.name,
      b.description,
      b.icon,
    );
  }
}

/** Soma pontos uma única vez por (motivo, referência). Retorna true se pontuou. */
export function awardPoints(userId: number, setting: SettingKey | number, reason: string, ref: string | number = ''): boolean {
  const points = typeof setting === 'number' ? setting : getNumberSetting(setting);
  if (points <= 0) return false;
  const { changes } = run('INSERT OR IGNORE INTO points_ledger (user_id, points, reason, ref) VALUES (?, ?, ?, ?)', userId, points, reason, String(ref));
  if (!changes) return false;
  const before = get<{ points: number }>('SELECT points FROM users WHERE id = ?', userId)?.points ?? 0;
  run('UPDATE users SET points = points + ? WHERE id = ?', points, userId);
  const total = before + points;
  const level = levelInfo(total);
  // Feedback imediato no app: "+10 XP" flutuante e barra de XP atualizada.
  pushToUser(userId, 'xp', { points, reason, total, level });
  if (level.level > levelInfo(before).level) {
    notify(userId, 'level_up', `Subiu para o nível ${level.level}: ${level.name}`, 'Continue subindo a serra do Vale!', '/painel');
    pushToUser(userId, 'level_up', { level });
    checkBadges(userId);
  }
  return true;
}

export function studyDays(userId: number): string[] {
  return all<{ day: string }>('SELECT DISTINCT day FROM study_time WHERE user_id = ? ORDER BY day DESC', userId).map((r) => r.day);
}

/** Streak atual (terminando hoje ou ontem) e maior sequência histórica. */
export function computeStreak(daysDesc: string[]): { current: number; best: number } {
  if (!daysDesc.length) return { current: 0, best: 0 };
  const today = localDay();
  let current = 0;
  if (daysDesc[0] === today || daysDesc[0] === addDays(today, -1)) {
    current = 1;
    for (let i = 1; i < daysDesc.length && daysDesc[i] === addDays(daysDesc[i - 1], -1); i++) current++;
  }
  let best = 1;
  let run_ = 1;
  for (let i = 1; i < daysDesc.length; i++) {
    run_ = daysDesc[i] === addDays(daysDesc[i - 1], -1) ? run_ + 1 : 1;
    best = Math.max(best, run_);
  }
  return { current, best: Math.max(best, current) };
}

export function getUserStats(userId: number): UserStats {
  const n = (sql: string, ...p: (number | string)[]) => Number(get<{ n: number }>(sql, ...p)?.n ?? 0);
  const user = get<{ points: number; avatar: string | null }>('SELECT points, avatar FROM users WHERE id = ?', userId);
  const streak = computeStreak(studyDays(userId));
  return {
    points: user?.points ?? 0,
    lessonsCompleted: n('SELECT COUNT(*) n FROM lesson_progress WHERE user_id = ?', userId),
    quizzesPassed: n(
      "SELECT COUNT(DISTINCT t.assessment_id) n FROM attempts t JOIN assessments a ON a.id = t.assessment_id WHERE t.user_id = ? AND t.passed = 1 AND a.kind = 'quiz'",
      userId,
    ),
    perfectScores: n('SELECT COUNT(*) n FROM attempts WHERE user_id = ? AND score >= 100', userId),
    coursesCompleted: n("SELECT COUNT(*) n FROM enrollments WHERE user_id = ? AND status = 'completed'", userId),
    coursesInProgress: n("SELECT COUNT(*) n FROM enrollments WHERE user_id = ? AND status = 'in_progress'", userId),
    certificates: n('SELECT COUNT(*) n FROM certificates WHERE user_id = ?', userId),
    friends: n("SELECT COUNT(*) n FROM friendships WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)", userId, userId),
    feedbacks: n('SELECT COUNT(*) n FROM feedback WHERE user_id = ?', userId),
    studySeconds: n('SELECT COALESCE(SUM(seconds), 0) n FROM study_time WHERE user_id = ?', userId),
    currentStreak: streak.current,
    bestStreak: streak.best,
    hasAvatar: !!user?.avatar,
    questsCompleted: n("SELECT COUNT(*) n FROM points_ledger WHERE user_id = ? AND reason = 'quest'", userId),
    level: levelInfo(user?.points ?? 0).level,
  };
}

/** Concede as medalhas cujos critérios foram atingidos. Retorna as novas medalhas. */
export function checkBadges(userId: number): string[] {
  const owned = new Set(
    all<{ code: string }>('SELECT b.code FROM user_badges ub JOIN badges b ON b.id = ub.badge_id WHERE ub.user_id = ?', userId).map((r) => r.code),
  );
  const pending = BADGES.filter((b) => !owned.has(b.code));
  if (!pending.length) return [];
  const stats = getUserStats(userId);
  const awarded: string[] = [];
  for (const b of pending) {
    if (b.metric(stats) < b.goal) continue;
    const badge = get<{ id: number }>('SELECT id FROM badges WHERE code = ?', b.code);
    if (!badge) continue;
    run('INSERT OR IGNORE INTO user_badges (user_id, badge_id, awarded_at) VALUES (?, ?, ?)', userId, badge.id, now());
    notify(userId, 'badge', `Nova medalha: ${b.name}`, b.description, '/perfil');
    awarded.push(b.code);
  }
  return awarded;
}

/** Registra tempo de estudo do dia (alimenta streak, tempo médio e alunos ativos). */
export function recordStudy(userId: number, courseId: number, seconds: number) {
  const day = localDay();
  run(
    `INSERT INTO study_time (user_id, course_id, day, seconds) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, course_id, day) DO UPDATE SET seconds = seconds + excluded.seconds`,
    userId,
    courseId,
    day,
    Math.max(0, Math.round(seconds)),
  );
  run('UPDATE enrollments SET last_access_at = ? WHERE user_id = ? AND course_id = ?', now(), userId, courseId);
  awardPoints(userId, 'points_daily_study', 'daily_study', day);
}

export function userBadges(userId: number) {
  return all(
    `SELECT b.code, b.name, b.description, b.icon, ub.awarded_at
     FROM user_badges ub JOIN badges b ON b.id = ub.badge_id WHERE ub.user_id = ? ORDER BY ub.awarded_at`,
    userId,
  );
}
