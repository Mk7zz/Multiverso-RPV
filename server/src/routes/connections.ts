import { Router } from 'express';
import { z } from 'zod';
import { all, get, now, run } from '../db';
import { badRequest, forbidden, idParam, notFound, parse } from '../lib/http';
import { checkBadges, getUserStats, userBadges } from '../lib/gamification';
import { notify } from '../lib/notify';
import { findUser, publicUser, type UserRow } from '../lib/users';
import { requireAuth } from '../middleware/auth';

// Conexões: solicitação de amizade e comparação de perfis. (Chat direto é pós-MVP.)
export const connectionsRouter = Router();
connectionsRouter.use(requireAuth);

type Friendship = { id: number; requester_id: number; addressee_id: number; status: string };

function friendshipBetween(a: number, b: number) {
  return get<Friendship>(
    'SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)',
    a,
    b,
    b,
    a,
  );
}

const USER_COLS = 'u.id, u.name, u.municipality, u.school, u.avatar, u.points, u.bio';

connectionsRouter.get('/', (req, res) => {
  const me = req.user!.id;
  const friends = all<UserRow & { friendship_id: number }>(
    `SELECT ${USER_COLS}, f.id friendship_id FROM friendships f
     JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
     WHERE f.status = 'accepted' AND (f.requester_id = ? OR f.addressee_id = ?) AND u.is_active = 1
     ORDER BY u.points DESC`,
    me,
    me,
    me,
  );
  const incoming = all<UserRow & { friendship_id: number; created_at: string }>(
    `SELECT ${USER_COLS}, f.id friendship_id, f.created_at FROM friendships f JOIN users u ON u.id = f.requester_id
     WHERE f.addressee_id = ? AND f.status = 'pending' ORDER BY f.id DESC`,
    me,
  );
  const outgoing = all<UserRow & { friendship_id: number; created_at: string }>(
    `SELECT ${USER_COLS}, f.id friendship_id, f.created_at FROM friendships f JOIN users u ON u.id = f.addressee_id
     WHERE f.requester_id = ? AND f.status = 'pending' ORDER BY f.id DESC`,
    me,
  );
  const map = (rows: (UserRow & { friendship_id: number })[]) => rows.map((r) => ({ ...publicUser(r), friendship_id: r.friendship_id }));
  res.json({ friends: map(friends), incoming: map(incoming), outgoing: map(outgoing) });
});

connectionsRouter.get('/search', (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 2) return res.json({ users: [] });
  const me = req.user!.id;
  const rows = all<UserRow>(
    `SELECT ${USER_COLS} FROM users u WHERE u.role = 'student' AND u.is_active = 1 AND u.id != ?
       AND (u.name LIKE ? OR u.school LIKE ? OR u.municipality LIKE ?) ORDER BY u.name LIMIT 20`,
    me,
    `%${q}%`,
    `%${q}%`,
    `%${q}%`,
  );
  res.json({ users: rows.map((u) => ({ ...publicUser(u), friendship: friendshipBetween(me, u.id) ?? null })) });
});

connectionsRouter.post('/requests', (req, res) => {
  const { user_id } = parse(z.object({ user_id: z.number().int().positive() }), req.body);
  const me = req.user!.id;
  if (user_id === me) throw badRequest('Você não pode adicionar a si mesmo(a).');
  const other = findUser(user_id);
  if (!other || !other.is_active) throw notFound('Usuário não encontrado');

  const existing = friendshipBetween(me, user_id);
  if (existing?.status === 'accepted') throw badRequest('Vocês já são amigos.');
  if (existing?.status === 'pending') {
    // Se a outra pessoa já tinha me convidado, aceitar automaticamente.
    if (existing.addressee_id === me) return acceptFriendship(existing, me, res);
    throw badRequest('Solicitação já enviada.');
  }
  if (existing) run('DELETE FROM friendships WHERE id = ?', existing.id);
  const { id } = run('INSERT INTO friendships (requester_id, addressee_id) VALUES (?, ?)', me, user_id);
  notify(user_id, 'friend_request', `${req.user!.name} quer se conectar com você`, undefined, '/conexoes');
  res.status(201).json({ friendship: get('SELECT * FROM friendships WHERE id = ?', id) });
});

function acceptFriendship(f: Friendship, me: number, res: import('express').Response) {
  run("UPDATE friendships SET status = 'accepted', responded_at = ? WHERE id = ?", now(), f.id);
  const meUser = findUser(me)!;
  notify(f.requester_id, 'friend_accepted', `${meUser.name} aceitou sua solicitação de amizade`, undefined, `/conexoes/comparar/${me}`);
  checkBadges(f.requester_id);
  checkBadges(f.addressee_id);
  res.json({ friendship: get('SELECT * FROM friendships WHERE id = ?', f.id) });
}

connectionsRouter.post('/requests/:id/accept', (req, res) => {
  const f = get<Friendship>('SELECT * FROM friendships WHERE id = ?', idParam(req));
  if (!f || f.addressee_id !== req.user!.id || f.status !== 'pending') throw notFound('Solicitação não encontrada');
  acceptFriendship(f, req.user!.id, res);
});

connectionsRouter.post('/requests/:id/decline', (req, res) => {
  const f = get<Friendship>('SELECT * FROM friendships WHERE id = ?', idParam(req));
  if (!f || f.status !== 'pending' || (f.addressee_id !== req.user!.id && f.requester_id !== req.user!.id)) {
    throw notFound('Solicitação não encontrada');
  }
  // O destinatário recusa; o solicitante cancela.
  if (f.addressee_id === req.user!.id) run("UPDATE friendships SET status = 'declined', responded_at = ? WHERE id = ?", now(), f.id);
  else run('DELETE FROM friendships WHERE id = ?', f.id);
  res.json({ ok: true });
});

connectionsRouter.delete('/friends/:id', (req, res) => {
  const f = friendshipBetween(req.user!.id, idParam(req));
  if (!f) throw notFound('Amizade não encontrada');
  run('DELETE FROM friendships WHERE id = ?', f.id);
  res.json({ ok: true });
});

function comparable(userId: number) {
  const user = findUser(userId)!;
  const stats = getUserStats(userId);
  const courses = all(
    `SELECT c.id, c.title, c.slug, e.status, e.progress, e.final_grade FROM enrollments e JOIN courses c ON c.id = e.course_id
     WHERE e.user_id = ? ORDER BY c.position, c.id`,
    userId,
  );
  return { user: publicUser(user), stats, badges: userBadges(userId), courses };
}

/** Comparação lado a lado — permitida apenas entre amigos. */
connectionsRouter.get('/compare/:id', (req, res) => {
  const other = idParam(req);
  const f = friendshipBetween(req.user!.id, other);
  if (f?.status !== 'accepted') throw forbidden('Vocês precisam ser amigos para comparar perfis.');
  res.json({ me: comparable(req.user!.id), friend: comparable(other) });
});
