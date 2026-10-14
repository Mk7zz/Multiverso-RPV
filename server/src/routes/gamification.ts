import { Router } from 'express';
import { all, get } from '../db';
import { addDays, localDay } from '../lib/dates';
import { badgeDef, getUserStats, studyDays, userBadges } from '../lib/gamification';
import { LEVELS, levelInfo } from '../lib/levels';
import { claimableCount, claimQuest, listQuests, periodWindow } from '../lib/quests';
import { publicUser, type UserRow } from '../lib/users';
import { requireAuth } from '../middleware/auth';
import { rankPosition } from './profile';

export const gamificationRouter = Router();
gamificationRouter.use(requireAuth);

/**
 * Ranking por pontuação.
 *  period: all (pontuação total) | month (pontos ganhos no mês corrente)
 *  scope:  all | friends | municipality
 */
gamificationRouter.get('/ranking', (req, res) => {
  const me = req.user!.id;
  const period = req.query.period === 'month' ? 'month' : 'all';
  const scope = ['friends', 'municipality'].includes(String(req.query.scope)) ? String(req.query.scope) : 'all';

  const where = ["u.role = 'student'", 'u.is_active = 1'];
  const params: (string | number)[] = [];
  if (scope === 'friends') {
    where.push(`(u.id = ? OR u.id IN (
      SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END FROM friendships
      WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)))`);
    params.push(me, me, me, me);
  }
  if (scope === 'municipality') {
    const mine = get<{ municipality: string | null }>('SELECT municipality FROM users WHERE id = ?', me)?.municipality ?? '';
    where.push('LOWER(TRIM(u.municipality)) = LOWER(TRIM(?))');
    params.push(mine);
  }

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const scoreExpr =
    period === 'month'
      ? `(SELECT COALESCE(SUM(p.points), 0) FROM points_ledger p WHERE p.user_id = u.id AND p.created_at >= '${monthStart.toISOString()}')`
      : 'u.points';

  const rows = all<UserRow & { score: number }>(
    `SELECT u.id, u.name, u.municipality, u.school, u.avatar, u.points, ${scoreExpr} score
     FROM users u WHERE ${where.join(' AND ')} ORDER BY score DESC, u.name LIMIT 100`,
    ...params,
  );
  const ranking = rows.map((r, i) => ({ position: i + 1, score: r.score, ...publicUser(r), is_me: r.id === me }));
  res.json({ ranking, period, scope, myPosition: ranking.find((r) => r.is_me)?.position ?? (scope === 'all' && period === 'all' ? rankPosition(me) : null) });
});

gamificationRouter.get('/badges', (req, res) => {
  const earned = new Map(userBadges(req.user!.id).map((b: Record<string, any>) => [b.code, b.awarded_at]));
  const stats = getUserStats(req.user!.id);
  const badges = all<{ code: string; name: string; description: string; icon: string }>('SELECT code, name, description, icon FROM badges ORDER BY id');
  res.json({
    badges: badges.map((b) => {
      const def = badgeDef(b.code);
      return {
        ...b,
        awarded_at: earned.get(b.code) ?? null,
        tier: def?.tier ?? 'bronze',
        goal: def?.goal ?? 1,
        current: def ? Math.min(def.goal, def.metric(stats)) : 0,
      };
    }),
  });
});

/** Resumo para o HUD: nível, XP, sequência e a semana atual (dias estudados). */
gamificationRouter.get('/summary', (req, res) => {
  const userId = req.user!.id;
  const stats = getUserStats(userId);
  const studied = new Set(studyDays(userId));
  const week = periodWindow('weekly', userId);
  res.json({
    points: stats.points,
    level: levelInfo(stats.points),
    currentStreak: stats.currentStreak,
    bestStreak: stats.bestStreak,
    rank: rankPosition(userId),
    today: localDay(),
    week: Array.from({ length: 7 }, (_, i) => {
      const day = addDays(week.start, i);
      return { day, studied: studied.has(day) };
    }),
    claimableQuests: claimableCount(userId),
  });
});

gamificationRouter.get('/levels', (_req, res) => {
  res.json({ levels: LEVELS });
});

gamificationRouter.get('/quests', (req, res) => {
  res.json(listQuests(req.user!.id));
});

gamificationRouter.post('/quests/:code/claim', (req, res) => {
  const reward = claimQuest(req.user!.id, String(req.params.code));
  res.json({ reward, ...listQuests(req.user!.id) });
});
