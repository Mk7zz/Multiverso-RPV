import fs from 'node:fs';
import { Router } from 'express';
import { z } from 'zod';
import { all, get, run, tx } from '../../db';
import { audit } from '../../lib/audit';
import { parseCsv, toCsv } from '../../lib/csv';
import { badRequest, idParam, notFound, pagination, parse } from '../../lib/http';
import { emails } from '../../lib/mailer';
import { hashPassword, randomPassword, randomToken, sha256 } from '../../lib/security';
import { uploader } from '../../lib/uploads';
import { findUser, findUserByEmail } from '../../lib/users';

export const adminUsersRouter = Router();

const USER_LIST_COLS = `u.id, u.name, u.email, u.role, u.municipality, u.school, u.birth_date, u.points, u.is_active, u.is_demo,
  u.created_at, u.last_login_at, u.last_seen_at,
  (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) enrollments,
  (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id AND e.status = 'completed') completed,
  (SELECT COALESCE(SUM(seconds),0) FROM study_time s WHERE s.user_id = u.id) study_seconds`;

function createResetToken(userId: number, days: number) {
  const token = randomToken();
  run(
    'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    userId,
    sha256(token),
    new Date(Date.now() + days * 86_400_000).toISOString(),
  );
  return token;
}

adminUsersRouter.get('/', (req, res) => {
  const { page, pageSize, offset } = pagination(req, 25);
  const where: string[] = ['1 = 1'];
  const params: (string | number)[] = [];
  const q = String(req.query.q ?? '').trim();
  if (q) {
    where.push('(u.name LIKE ? OR u.email LIKE ? OR u.municipality LIKE ? OR u.school LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (req.query.role === 'student' || req.query.role === 'admin') {
    where.push('u.role = ?');
    params.push(String(req.query.role));
  }
  if (req.query.status === 'active') where.push('u.is_active = 1');
  if (req.query.status === 'inactive') where.push('u.is_active = 0');
  const total = Number(get<{ n: number }>(`SELECT COUNT(*) n FROM users u WHERE ${where.join(' AND ')}`, ...params)!.n);
  const users = all(
    `SELECT ${USER_LIST_COLS} FROM users u WHERE ${where.join(' AND ')} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    ...params,
    pageSize,
    offset,
  );
  res.json({ users, total, page, pageSize });
});

adminUsersRouter.get('/export.csv', (req, res) => {
  const rows = all(`SELECT ${USER_LIST_COLS} FROM users u ORDER BY u.id`);
  audit(req, 'users.export', 'user', null, { count: rows.length });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="usuarios.csv"');
  res.send(
    toCsv(rows, [
      { key: 'id', label: 'id' },
      { key: 'name', label: 'nome' },
      { key: 'email', label: 'email' },
      { key: 'role', label: 'perfil' },
      { key: 'municipality', label: 'municipio' },
      { key: 'school', label: 'escola' },
      { key: 'birth_date', label: 'nascimento' },
      { key: 'is_active', label: 'ativo' },
      { key: 'points', label: 'pontos' },
      { key: 'enrollments', label: 'matriculas' },
      { key: 'completed', label: 'cursos_concluidos' },
      { key: 'study_seconds', label: 'segundos_estudo' },
      { key: 'created_at', label: 'cadastro' },
      { key: 'last_login_at', label: 'ultimo_login' },
    ]),
  );
});

/**
 * Importação via CSV. Colunas: nome;email;municipio;escola;perfil;nascimento
 * Cada usuário novo recebe um e-mail com link para definir a senha (válido por 7 dias).
 */
adminUsersRouter.post('/import', uploader('csv').single('file'), (req, res) => {
  if (!req.file) throw badRequest('Envie um arquivo CSV no campo "file".');
  const text = fs.readFileSync(req.file.path, 'utf8');
  fs.rm(req.file.path, { force: true }, () => {});
  const rows = parseCsv(text);
  if (!rows.length) throw badRequest('O arquivo está vazio ou sem cabeçalho.');

  const report = { created: 0, skipped: 0, errors: [] as { line: number; error: string }[] };
  const invites: { email: string; name: string; token: string }[] = [];
  tx(() => {
    rows.forEach((r, i) => {
      const line = i + 2;
      const name = r.nome || r.name;
      const email = (r.email || r['e-mail'] || '').toLowerCase();
      if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) {
        report.errors.push({ line, error: 'Nome ou e-mail ausente/inválido' });
        return;
      }
      if (findUserByEmail(email)) {
        report.skipped++;
        return;
      }
      const role = ['admin', 'administrador'].includes((r.perfil || r.role || '').toLowerCase()) ? 'admin' : 'student';
      const birth = /^\d{4}-\d{2}-\d{2}$/.test(r.nascimento ?? '') ? r.nascimento : null;
      const { id } = run(
        'INSERT INTO users (name, email, password_hash, role, municipality, school, birth_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        name,
        email,
        hashPassword(randomPassword()),
        role,
        r.municipio || r.municipality || null,
        r.escola || r.school || null,
        birth,
      );
      invites.push({ email, name, token: createResetToken(id, 7) });
      report.created++;
    });
  });
  invites.forEach((i) => emails.invited(i.email, i.name, i.token));
  audit(req, 'users.import', 'user', null, { created: report.created, skipped: report.skipped, errors: report.errors.length });
  res.json(report);
});

adminUsersRouter.post('/', (req, res) => {
  const body = parse(
    z.object({
      name: z.string().trim().min(3).max(120),
      email: z.string().trim().toLowerCase().email(),
      role: z.enum(['student', 'admin']).default('student'),
      municipality: z.string().trim().max(80).optional(),
      school: z.string().trim().max(160).optional(),
    }),
    req.body,
  );
  if (findUserByEmail(body.email)) throw badRequest('Já existe uma conta com este e-mail.');
  const { id } = run(
    'INSERT INTO users (name, email, password_hash, role, municipality, school) VALUES (?, ?, ?, ?, ?, ?)',
    body.name,
    body.email,
    hashPassword(randomPassword()),
    body.role,
    body.municipality || null,
    body.school || null,
  );
  emails.invited(body.email, body.name, createResetToken(id, 7));
  audit(req, 'users.create', 'user', id, { role: body.role });
  res.status(201).json({ user: get(`SELECT ${USER_LIST_COLS} FROM users u WHERE u.id = ?`, id) });
});

/** Controle de acessos: perfil, ativação e dados cadastrais. */
adminUsersRouter.patch('/:id', (req, res) => {
  const id = idParam(req);
  const user = findUser(id);
  if (!user) throw notFound('Usuário não encontrado');
  const body = parse(
    z.object({
      name: z.string().trim().min(3).max(120).optional(),
      role: z.enum(['student', 'admin']).optional(),
      is_active: z.boolean().optional(),
      municipality: z.string().trim().max(80).nullable().optional(),
      school: z.string().trim().max(160).nullable().optional(),
    }),
    req.body,
  );
  if (id === req.user!.id && (body.role === 'student' || body.is_active === false)) {
    throw badRequest('Você não pode remover o próprio acesso de administrador.');
  }
  run(
    `UPDATE users SET name = COALESCE(?, name), role = COALESCE(?, role), is_active = COALESCE(?, is_active),
       municipality = CASE WHEN ? THEN ? ELSE municipality END, school = CASE WHEN ? THEN ? ELSE school END WHERE id = ?`,
    body.name,
    body.role,
    body.is_active === undefined ? null : body.is_active,
    body.municipality !== undefined,
    body.municipality ?? null,
    body.school !== undefined,
    body.school ?? null,
    id,
  );
  audit(req, 'users.update', 'user', id, body);
  res.json({ user: get(`SELECT ${USER_LIST_COLS} FROM users u WHERE u.id = ?`, id) });
});

adminUsersRouter.post('/:id/send-reset', (req, res) => {
  const user = findUser(idParam(req));
  if (!user) throw notFound('Usuário não encontrado');
  emails.passwordReset(user.email, user.name, createResetToken(user.id, 1));
  audit(req, 'users.send_reset', 'user', user.id);
  res.json({ ok: true });
});

adminUsersRouter.get('/:id', (req, res) => {
  const id = idParam(req);
  const user = get(`SELECT ${USER_LIST_COLS} FROM users u WHERE u.id = ?`, id);
  if (!user) throw notFound('Usuário não encontrado');
  res.json({
    user,
    enrollments: all(
      'SELECT e.*, c.title FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = ? ORDER BY e.enrolled_at DESC',
      id,
    ),
    certificates: all('SELECT code, course_title, issued_at, final_grade FROM certificates WHERE user_id = ?', id),
    logs: all('SELECT action, entity, entity_id, created_at, ip FROM audit_logs WHERE user_id = ? ORDER BY id DESC LIMIT 30', id),
  });
});
