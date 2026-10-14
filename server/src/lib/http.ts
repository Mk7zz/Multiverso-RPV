import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError, type ZodTypeAny, type z } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg);
export const notFound = (msg = 'Registro não encontrado') => new HttpError(404, msg);
export const forbidden = (msg = 'Acesso negado') => new HttpError(403, msg);

export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  return schema.parse(data);
}

export function idParam(req: Request, name = 'id'): number {
  const id = Number(req.params[name]);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('Identificador inválido');
  return id;
}

export function pagination(req: Request, defaultSize = 20) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || defaultSize));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const field = first?.path.join('.');
    res.status(400).json({
      error: first ? `${field ? field + ': ' : ''}${first.message}` : 'Dados inválidos',
      issues: err.issues,
    });
    return;
  }
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: `Falha no upload: ${err.message}` });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
}
