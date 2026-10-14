import { all, get } from '../db';
import { getUserStats, userBadges } from './gamification';
import { levelInfo, LEVELS } from './levels';
import { ageFrom, parseAvatar, parseIds, parseList, type UserRow } from './users';

// Vocabulário compartilhado entre a vitrine de talentos e as oportunidades das empresas parceiras.
// O frontend tem a mesma lista em web/src/lib/partners.ts (rótulos para exibição).
export const AREAS = [
  'tecnologia',
  'dados',
  'design',
  'marketing',
  'administracao',
  'vendas',
  'atendimento',
  'industria',
  'agro',
  'energia',
  'saude',
  'educacao',
] as const;
export const JOB_TYPES = ['estagio', 'jovem_aprendiz', 'emprego', 'trainee', 'freelance'] as const;
export const GOALS = [...JOB_TYPES, 'qualquer'] as const;
export const MODALITIES = ['presencial', 'hibrido', 'remoto'] as const;
export const COMPANY_SIZES = ['micro', 'pequena', 'media', 'grande'] as const;
export const COMPANY_STATUS = ['pending', 'approved', 'rejected', 'suspended'] as const;

/** Valida os dígitos verificadores do CNPJ (aceita com ou sem máscara). */
export function normalizeCnpj(raw: string): string | null {
  const d = raw.replace(/\D/g, '');
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return null;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((s, w, i) => s + Number(d[i]) * w, 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]) ? d : null;
}

export const minPointsForLevel = (level: number) => LEVELS.find((l) => l.level === level)?.min ?? 0;

export interface CompanyRow {
  id: number;
  name: string;
  legal_name: string | null;
  cnpj: string;
  sector: string;
  size: string | null;
  municipality: string;
  website: string | null;
  description: string | null;
  contact_phone: string | null;
  color: string;
  status: string;
  review_note: string | null;
  reviewed_at: string | null;
  is_demo: number;
  created_at: string;
}

export const findCompany = (id: number) => get<CompanyRow>('SELECT * FROM companies WHERE id = ?', id);

/** Dados da empresa visíveis para alunos (sem CNPJ e sem dados internos). */
export function publicCompany(c: CompanyRow) {
  return {
    id: c.id,
    name: c.name,
    sector: c.sector,
    size: c.size,
    municipality: c.municipality,
    website: c.website,
    description: c.description,
    color: c.color,
  };
}

/** Contato da empresa (liberado ao aluno depois de aceitar um convite). */
export function companyContact(companyId: number) {
  const c = findCompany(companyId);
  const owner = get<{ name: string; email: string; job_title: string | null }>(
    "SELECT name, email, job_title FROM users WHERE company_id = ? AND role = 'company' AND is_active = 1 ORDER BY id LIMIT 1",
    companyId,
  );
  return { name: owner?.name ?? null, job_title: owner?.job_title ?? null, email: owner?.email ?? null, phone: c?.contact_phone ?? null };
}

export const companyUserIds = (companyId: number) =>
  all<{ id: number }>("SELECT id FROM users WHERE company_id = ? AND role = 'company' AND is_active = 1", companyId).map((u) => u.id);

/**
 * A empresa só vê o e-mail do aluno se ele se candidatou a uma vaga dela
 * ou aceitou um convite dela. Fora isso, o contato fica protegido.
 */
export function contactUnlocked(companyId: number, userId: number) {
  return !!get(
    `SELECT 1 FROM job_applications a JOIN jobs j ON j.id = a.job_id WHERE j.company_id = ? AND a.user_id = ?
     UNION SELECT 1 FROM talent_invites WHERE company_id = ? AND user_id = ? AND status = 'accepted'`,
    companyId,
    userId,
    companyId,
    userId,
  );
}

/** Cursos concluídos pelo aluno (com nota e certificado verificável, quando houver). */
export function completedCourses(userId: number) {
  return all<{ id: number; title: string; slug: string; workload_hours: number; final_grade: number | null; completed_at: string | null; certificate_code: string | null }>(
    `SELECT c.id, c.title, c.slug, c.workload_hours, e.final_grade, e.completed_at, ce.code certificate_code
     FROM enrollments e JOIN courses c ON c.id = e.course_id
     LEFT JOIN certificates ce ON ce.user_id = e.user_id AND ce.course_id = e.course_id
     WHERE e.user_id = ? AND e.status = 'completed' ORDER BY e.completed_at DESC`,
    userId,
  );
}

/**
 * Compatibilidade aluno x vaga: cursos recomendados pela empresa que o aluno já concluiu
 * e se ele alcançou o nível mínimo. Serve para ordenar candidatos e motivar o aluno.
 */
export function jobMatch(userId: number, job: { course_ids: string | null; min_level: number }, points?: number) {
  const wanted = parseIds(job.course_ids);
  const done = new Set(
    all<{ course_id: number }>("SELECT course_id FROM enrollments WHERE user_id = ? AND status = 'completed'", userId).map((r) => r.course_id),
  );
  const have = wanted.filter((id) => done.has(id));
  const pts = points ?? get<{ points: number }>('SELECT points FROM users WHERE id = ?', userId)?.points ?? 0;
  const levelOk = levelInfo(pts).level >= (job.min_level || 0);
  const coursePart = wanted.length ? have.length / wanted.length : 1;
  return {
    wanted: wanted.length,
    have: have.length,
    missing: wanted.filter((id) => !done.has(id)),
    levelOk,
    score: Math.round((coursePart * 0.8 + (levelOk ? 0.2 : 0)) * 100),
  };
}

/** Card do talento na busca da empresa. */
export function talentCard(u: UserRow & { courses_completed?: number; certificates?: number; study_seconds?: number }) {
  return {
    id: u.id,
    name: u.name,
    municipality: u.municipality,
    school: u.school,
    avatar: parseAvatar(u.avatar),
    points: u.points,
    level: levelInfo(u.points),
    age: ageFrom(u.birth_date),
    headline: u.talent_headline,
    areas: parseList(u.talent_areas),
    goal: u.talent_goal,
    courses_completed: Number(u.courses_completed ?? 0),
    certificates: Number(u.certificates ?? 0),
    study_seconds: Number(u.study_seconds ?? 0),
    last_seen_at: u.last_seen_at,
  };
}

/** Perfil completo do talento para a empresa: trajetória comprovada na plataforma. */
export function talentProfile(u: UserRow, companyId: number) {
  const stats = getUserStats(u.id);
  const unlocked = contactUnlocked(companyId, u.id);
  return {
    ...talentCard(u),
    bio: u.bio,
    stats: {
      lessonsCompleted: stats.lessonsCompleted,
      quizzesPassed: stats.quizzesPassed,
      coursesCompleted: stats.coursesCompleted,
      coursesInProgress: stats.coursesInProgress,
      certificates: stats.certificates,
      studySeconds: stats.studySeconds,
      currentStreak: stats.currentStreak,
      bestStreak: stats.bestStreak,
    },
    courses: completedCourses(u.id),
    badges: userBadges(u.id),
    contact: unlocked ? { email: u.email } : null,
    saved: !!get('SELECT 1 FROM company_saved_talents WHERE company_id = ? AND user_id = ?', companyId, u.id),
    invites: all('SELECT id, status, job_id, created_at, responded_at FROM talent_invites WHERE company_id = ? AND user_id = ? ORDER BY id DESC', companyId, u.id),
    applications: all(
      `SELECT a.id, a.status, a.created_at, j.id job_id, j.title job_title FROM job_applications a JOIN jobs j ON j.id = a.job_id
       WHERE j.company_id = ? AND a.user_id = ? ORDER BY a.id DESC`,
      companyId,
      u.id,
    ),
  };
}
