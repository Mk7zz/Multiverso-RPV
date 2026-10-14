import { Router } from 'express';
import { z } from 'zod';
import { get, now, run, tx } from '../db';
import { audit } from '../lib/audit';
import { badRequest, HttpError, parse } from '../lib/http';
import { checkBadges } from '../lib/gamification';
import { emails } from '../lib/mailer';
import { notify } from '../lib/notify';
import { broadcastAdmins } from '../lib/realtime';
import { hashPassword, randomToken, sha256, signToken, verifyPassword } from '../lib/security';
import { getSetting } from '../lib/settings';
import { findUser, findUserByEmail, selfUser } from '../lib/users';
import { requireAuth } from '../middleware/auth';
import { avatarSchema } from './profile';

export const authRouter = Router();

const password = z.string().min(8, 'A senha deve ter pelo menos 8 caracteres').max(128);
const email = z.string().trim().toLowerCase().email('E-mail inválido');

// Limite simples de tentativas de login por IP+e-mail (proteção contra força bruta).
const failures = new Map<string, { count: number; until: number }>();
function checkThrottle(key: string) {
  const f = failures.get(key);
  if (f && f.count >= 5 && f.until > Date.now()) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos e tente novamente.');
}
function registerFailure(key: string) {
  const f = failures.get(key);
  const count = f && f.until > Date.now() ? f.count + 1 : 1;
  failures.set(key, { count, until: Date.now() + 10 * 60_000 });
}

authRouter.post('/register', (req, res) => {
  if (getSetting('allow_registration') !== 'true') throw badRequest('O cadastro de novos usuários está temporariamente fechado.');
  const body = parse(
    z.object({
      name: z.string().trim().min(3, 'Informe seu nome completo').max(120),
      email,
      password,
      municipality: z.string().trim().min(2, 'Informe seu município').max(80),
      school: z.string().trim().max(160).optional(),
      birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
      avatar: avatarSchema.optional(),
    }),
    req.body,
  );
  if (findUserByEmail(body.email)) throw badRequest('Já existe uma conta com este e-mail.');

  const { id } = run(
    'INSERT INTO users (name, email, password_hash, municipality, school, birth_date, avatar, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    body.name,
    body.email,
    hashPassword(body.password),
    body.municipality,
    body.school || null,
    body.birth_date || null,
    body.avatar ? JSON.stringify(body.avatar) : null,
    now(),
  );
  audit(req, 'auth.register', 'user', id, undefined, id);
  notify(id, 'welcome', 'Bem-vindo(a) ao Multiverso!', 'Sua jornada começou. Visite a Academia e escolha o primeiro curso.', '/cursos');
  if (body.avatar) checkBadges(id);
  emails.welcome(body.email, body.name);
  broadcastAdmins('activity', { type: 'register' });
  res.status(201).json({ token: signToken(id), user: selfUser(findUser(id)!) });
});

authRouter.post('/login', (req, res) => {
  const body = parse(z.object({ email, password: z.string().min(1) }), req.body);
  const key = `${req.ip}|${body.email}`;
  checkThrottle(key);
  const user = findUserByEmail(body.email);
  if (!user || !verifyPassword(body.password, user.password_hash)) {
    registerFailure(key);
    audit(req, 'auth.login_failed', 'user', user?.id ?? null, { email: body.email });
    throw new HttpError(401, 'E-mail ou senha incorretos.');
  }
  if (!user.is_active) throw new HttpError(403, 'Sua conta está desativada. Procure a equipe do Multiverso.');
  failures.delete(key);
  run('UPDATE users SET last_login_at = ?, last_seen_at = ? WHERE id = ?', now(), now(), user.id);
  audit(req, 'auth.login', 'user', user.id, undefined, user.id);
  res.json({ token: signToken(user.id), user: selfUser(user) });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: selfUser(findUser(req.user!.id)!) });
});

/** Sempre responde 200 para não revelar quais e-mails estão cadastrados. */
authRouter.post('/forgot-password', (req, res) => {
  const body = parse(z.object({ email }), req.body);
  const user = findUserByEmail(body.email);
  if (user?.is_active) {
    const token = randomToken();
    run(
      'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      user.id,
      sha256(token),
      new Date(Date.now() + 60 * 60_000).toISOString(),
    );
    emails.passwordReset(user.email, user.name, token);
    audit(req, 'auth.password_reset_requested', 'user', user.id, undefined, user.id);
  }
  res.json({ ok: true, message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.' });
});

authRouter.post('/reset-password', (req, res) => {
  const body = parse(z.object({ token: z.string().min(10), password }), req.body);
  const reset = get<{ id: number; user_id: number; expires_at: string; used_at: string | null }>(
    'SELECT * FROM password_resets WHERE token_hash = ?',
    sha256(body.token),
  );
  if (!reset || reset.used_at || reset.expires_at < now()) throw badRequest('Link inválido ou expirado. Solicite uma nova redefinição.');
  tx(() => {
    run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(body.password), reset.user_id);
    run('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL', now(), reset.user_id);
  });
  audit(req, 'auth.password_reset', 'user', reset.user_id, undefined, reset.user_id);
  const user = findUser(reset.user_id)!;
  res.json({ token: signToken(user.id), user: selfUser(user) });
});

authRouter.post('/change-password', requireAuth, (req, res) => {
  const body = parse(z.object({ current_password: z.string().min(1), new_password: password }), req.body);
  const user = findUser(req.user!.id)!;
  if (!verifyPassword(body.current_password, user.password_hash)) throw badRequest('Senha atual incorreta.');
  run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(body.new_password), user.id);
  audit(req, 'auth.password_changed', 'user', user.id);
  res.json({ ok: true });
});

/** Alteração do e-mail de acesso (exige a senha atual e avisa o e-mail antigo). */
authRouter.post('/change-email', requireAuth, (req, res) => {
  const body = parse(z.object({ email, password: z.string().min(1) }), req.body);
  const user = findUser(req.user!.id)!;
  if (!verifyPassword(body.password, user.password_hash)) throw badRequest('Senha incorreta.');
  const other = findUserByEmail(body.email);
  if (other && other.id !== user.id) throw badRequest('Este e-mail já está em uso.');
  run('UPDATE users SET email = ? WHERE id = ?', body.email, user.id);
  emails.emailChanged(user.email, user.name, body.email);
  audit(req, 'auth.email_changed', 'user', user.id, { from: user.email, to: body.email });
  res.json({ user: selfUser(findUser(user.id)!) });
});
