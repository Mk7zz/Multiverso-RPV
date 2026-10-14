import { get } from '../db';
import { levelInfo } from './levels';

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'student' | 'admin' | 'company';
  municipality: string | null;
  school: string | null;
  birth_date: string | null;
  bio: string | null;
  avatar: string | null;
  points: number;
  is_active: number;
  created_at: string;
  last_login_at: string | null;
  last_seen_at: string | null;
  company_id: number | null;
  job_title: string | null;
  talent_visible: number;
  talent_headline: string | null;
  talent_areas: string | null;
  talent_goal: string | null;
  talent_guardian_ok: number;
  talent_updated_at: string | null;
}

export function parseList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function parseIds(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  } catch {
    return [];
  }
}

/** Idade completa a partir de AAAA-MM-DD (null se não informada). */
export function ageFrom(birth: string | null, today = new Date()) {
  if (!birth || !/^\d{4}-\d{2}-\d{2}$/.test(birth)) return null;
  const [y, m, d] = birth.split('-').map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}

/**
 * Para aparecer na vitrine ou se candidatar, menores de 18 anos (ou quem não informou a
 * data de nascimento) precisam declarar a autorização do responsável (LGPD, art. 14).
 */
export const needsGuardianConsent = (birth: string | null) => (ageFrom(birth) ?? 0) < 18;

export function parseAvatar(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Dados do próprio usuário (nunca inclui o hash da senha). */
export function selfUser(u: UserRow) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    municipality: u.municipality,
    school: u.school,
    birth_date: u.birth_date,
    bio: u.bio,
    avatar: parseAvatar(u.avatar),
    points: u.points,
    level: levelInfo(u.points),
    created_at: u.created_at,
    company_id: u.company_id,
    job_title: u.job_title,
    talent: {
      visible: !!u.talent_visible,
      headline: u.talent_headline,
      areas: parseList(u.talent_areas),
      goal: u.talent_goal,
      guardian_ok: !!u.talent_guardian_ok,
      needs_consent: needsGuardianConsent(u.birth_date),
    },
  };
}

/** Dados visíveis por outros alunos (ranking, conexões). */
export function publicUser(u: Pick<UserRow, 'id' | 'name' | 'municipality' | 'school' | 'avatar' | 'points'> & { bio?: string | null }) {
  return {
    id: u.id,
    name: u.name,
    municipality: u.municipality,
    school: u.school,
    bio: u.bio ?? null,
    avatar: parseAvatar(u.avatar),
    points: u.points,
    level: levelInfo(u.points),
  };
}

export const findUser = (id: number) => get<UserRow>('SELECT * FROM users WHERE id = ?', id);
export const findUserByEmail = (email: string) => get<UserRow>('SELECT * FROM users WHERE email = ?', email.trim());
