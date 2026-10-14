// O módulo node:sqlite ainda emite ExperimentalWarning; silenciamos apenas esse aviso.
const originalEmitWarning = process.emitWarning;
process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
  const msg = typeof warning === 'string' ? warning : warning?.message;
  if (msg?.includes('SQLite')) return;
  return (originalEmitWarning as (...a: unknown[]) => void).call(process, warning, ...rest);
}) as typeof process.emitWarning;

const { DatabaseSync } = await import('node:sqlite');
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config';

type Param = string | number | bigint | null | boolean | undefined | Uint8Array;
type SqlValue = string | number | bigint | null | Uint8Array;

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

const cache = new Map<string, ReturnType<typeof db.prepare>>();
function stmt(sql: string) {
  let s = cache.get(sql);
  if (!s) {
    s = db.prepare(sql);
    cache.set(sql, s);
  }
  return s;
}

function norm(params: Param[]): SqlValue[] {
  return params.map((p) => (p === undefined ? null : typeof p === 'boolean' ? (p ? 1 : 0) : p));
}

export function all<T = Record<string, any>>(sql: string, ...params: Param[]): T[] {
  return stmt(sql).all(...norm(params)) as T[];
}

export function get<T = Record<string, any>>(sql: string, ...params: Param[]): T | undefined {
  return stmt(sql).get(...norm(params)) as T | undefined;
}

export function run(sql: string, ...params: Param[]) {
  const r = stmt(sql).run(...norm(params));
  return { changes: Number(r.changes), id: Number(r.lastInsertRowid) };
}

let txDepth = 0;
export function tx<T>(fn: () => T): T {
  if (txDepth > 0) return fn();
  txDepth++;
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  } finally {
    txDepth--;
  }
}

export const now = () => new Date().toISOString();

/** Aplica, em ordem, os arquivos NNN_nome.sql ainda não executados (controle via PRAGMA user_version). */
export function migrate() {
  const current = Number((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version);
  const files = fs
    .readdirSync(config.migrationsDir)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort();
  for (const file of files) {
    const version = parseInt(file, 10);
    if (version <= current) continue;
    const sql = fs.readFileSync(path.join(config.migrationsDir, file), 'utf8');
    tx(() => {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${version}`);
    });
    console.log(`[db] migração aplicada: ${file}`);
  }
}
