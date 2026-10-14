import type { NextFunction, Request, Response } from 'express';
import { get, now, run } from '../db';
import { forbidden, HttpError } from '../lib/http';
import { verifyToken } from '../lib/security';

export type Role = 'student' | 'admin' | 'company';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  company_id: number | null;
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
      ? get<AuthUser & { is_active: number }>('SELECT id, name, email, role, company_id, is_active FROM users WHERE id = ?', userId)
      : undefined;
    if (user?.is_active) {
      req.user = { id: user.id, name: user.name, email: user.email, role: user.role, company_id: user.company_id };
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

/** Rotas exclusivas de alunos (vitrine, candidaturas, convites). */
export function requireStudent(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) throw new HttpError(401, 'Faça login para continuar');
  if (req.user.role !== 'student') throw forbidden('Recurso disponível apenas para alunos');
  next();
}

/** Rotas da área da empresa parceira. A aprovação da empresa é conferida em cada rota (ver requireApprovedCompany). */
export function requireCompany(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) throw new HttpError(401, 'Faça login para continuar');
  if (req.user.role !== 'company' || !req.user.company_id) throw forbidden('Recurso disponível apenas para empresas parceiras');
  next();
}

export function requireApprovedCompany(req: Request, _res: Response, next: NextFunction) {
  const c = get<{ status: string }>('SELECT status FROM companies WHERE id = ?', req.user!.company_id);
  if (c?.status !== 'approved') {
    throw forbidden(
      c?.status === 'pending'
        ? 'Seu cadastro está em análise pela equipe do Multiverso. Você será avisado(a) assim que for aprovado.'
        : 'O acesso da sua empresa à vitrine de talentos não está ativo. Procure a equipe do Multiverso.',
    );
  }
  next();
}

export const isAdmin = (req: Request) => req.user?.role === 'admin';
