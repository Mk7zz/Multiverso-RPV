import type { NextFunction, Request, Response } from 'express';
import { get, now, run } from '../db';
import { forbidden, HttpError } from '../lib/http';
import { verifyToken } from '../lib/security';

export type Role = 'student' | 'admin';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const lastSeenWrites = new Map<number, number>();

/** Identifica o usuário (se houver token). Visitantes seguem sem req.user. */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : typeof req.query.access_token === 'string' ? req.query.access_token : null;
  if (token) {
    const userId = verifyToken(token);
    const user = userId
      ? get<AuthUser & { is_active: number }>('SELECT id, name, email, role, is_active FROM users WHERE id = ?', userId)
      : undefined;
    if (user?.is_active) {
      req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
      // Atualiza "visto por último" no máximo 1x por minuto por usuário.
      const last = lastSeenWrites.get(user.id) ?? 0;
      if (Date.now() - last > 60_000) {
        lastSeenWrites.set(user.id, Date.now());
        run('UPDATE users SET last_seen_at = ? WHERE id = ?', now(), user.id);
      }
    }
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) throw new HttpError(401, 'Faça login para continuar');
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) throw new HttpError(401, 'Faça login para continuar');
  if (req.user.role !== 'admin') throw forbidden('Apenas administradores podem acessar este recurso');
  next();
}

export const isAdmin = (req: Request) => req.user?.role === 'admin';
