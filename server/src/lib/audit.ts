import type { Request } from 'express';
import { run } from '../db';

/** Registra uma ação no log de auditoria (visível em Admin › Logs). */
export function audit(
  req: Request | null,
  action: string,
  entity?: string,
  entityId?: number | null,
  details?: Record<string, unknown>,
  userId?: number,
) {
  run(
    'INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip) VALUES (?, ?, ?, ?, ?, ?)',
    userId ?? req?.user?.id ?? null,
    action,
    entity ?? null,
    entityId ?? null,
    details ? JSON.stringify(details) : null,
    req?.ip ?? null,
  );
}
