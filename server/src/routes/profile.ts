import { Router } from 'express';
import { z } from 'zod';
import { all, get, run } from '../db';
import { audit } from '../lib/audit';
import { idParam, notFound, parse } from '../lib/http';
import { checkBadges, getUserStats, userBadges } from '../lib/gamification';
import { findUser, publicUser, selfUser } from '../lib/users';
import { requireAuth } from '../middleware/auth';

export const profileRouter = Router();
profileRouter.use(requireAuth);

/** Opções do criador de avatar (o frontend desenha o SVG a partir destes valores). */
export const avatarSchema = z.object({
  skin: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  hair: z.enum(['none', 'short', 'long', 'curly', 'bun', 'mohawk', 'afro']),
  hairColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  eyes: z.enum(['round', 'happy', 'wink', 'sleepy']),
  mouth: z.enum(['smile', 'grin', 'neutral', 'open']),
  shirt: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accessory: z.enum(['none', 'glasses', 'sunglasses', 'cap', 'headphones', 'earring']),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  outfit: z.enum(['tee', 'hoodie', 'jacket']).optional(),
  pants: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export function rankPosition(userId: number) {
  const me = get<{ points: number }>('SELECT points FROM users WHERE id = ?', userId);
  if (!me) return null;
  return (
    Number(get<{ n: number }>("SELECT COUNT(*) n FROM users WHERE role = 'student' AND is_active = 1 AND points > ?", me.points)!.n) + 1
  );
}

profileRouter.get('/', (req, res) => {
  const user = findUser(req.user!.id)!;
  res.json({
    user: selfUser(user),
    stats: getUserStats(user.id),
    badges: userBadges(user.id),
    rank: rankPosition(user.id),
    recentPoints: all('SELECT points, reason, ref, created_at FROM points_ledger WHERE user_id = ? ORDER BY id DESC LIMIT 15', user.id),
  });
});

profileRouter.put('/', (req, res) => {
  const body = parse(
    z.object({
      name: z.string().trim().min(3).max(120),
      municipality: z.string().trim().min(2).max(80),
      school: z.string().trim().max(160).optional().nullable(),
      birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
      bio: z.string().trim().max(280).optional().nullable(),
    }),
    req.body,
  );
  run(
    'UPDATE users SET name = ?, municipality = ?, school = ?, birth_date = ?, bio = ? WHERE id = ?',
    body.name,
    body.municipality,
    body.school || null,
    body.birth_date || null,
    body.bio || null,
    req.user!.id,
  );
  audit(req, 'profile.update', 'user', req.user!.id);
  res.json({ user: selfUser(findUser(req.user!.id)!) });
});

profileRouter.put('/avatar', (req, res) => {
  const avatar = parse(avatarSchema, req.body);
  run('UPDATE users SET avatar = ? WHERE id = ?', JSON.stringify(avatar), req.user!.id);
  checkBadges(req.user!.id);
  res.json({ user: selfUser(findUser(req.user!.id)!) });
});

/** Perfil público de outro aluno (usado em ranking e conexões). */
profileRouter.get('/users/:id', (req, res) => {
  const user = findUser(idParam(req));
  if (!user || !user.is_active) throw notFound('Usuário não encontrado');
  const friendship = get(
    `SELECT id, requester_id, addressee_id, status FROM friendships
     WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`,
    req.user!.id,
    user.id,
    user.id,
    req.user!.id,
  );
  const stats = getUserStats(user.id);
  res.json({
    user: publicUser(user),
    friendship: friendship ?? null,
    stats: {
      points: stats.points,
      coursesCompleted: stats.coursesCompleted,
      certificates: stats.certificates,
      currentStreak: stats.currentStreak,
      lessonsCompleted: stats.lessonsCompleted,
    },
    badges: userBadges(user.id),
    rank: user.role === 'student' ? rankPosition(user.id) : null,
  });
});
