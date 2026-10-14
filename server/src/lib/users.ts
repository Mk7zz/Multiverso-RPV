import { get } from '../db';
import { levelInfo } from './levels';

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'student' | 'admin';
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
}

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
