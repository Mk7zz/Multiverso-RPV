import { Router } from 'express';
import { all, get, now, run } from '../db';
import { idParam, notFound } from '../lib/http';
import { openUserStream } from '../lib/realtime';
import { requireAuth } from '../middleware/auth';

// Notificações, mensagens internas recebidas e stream em tempo real do aluno.
export const communicationRouter = Router();
communicationRouter.use(requireAuth);

communicationRouter.get('/stream', (req, res) => {
  openUserStream(req.user!.id, res);
});

communicationRouter.get('/summary', (req, res) => {
  const userId = req.user!.id;
  res.json({
    unreadNotifications: Number(get<{ n: number }>('SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND read_at IS NULL', userId)!.n),
    unreadMessages: Number(get<{ n: number }>('SELECT COUNT(*) n FROM message_recipients WHERE user_id = ? AND read_at IS NULL', userId)!.n),
  });
});

communicationRouter.get('/notifications', (req, res) => {
  const unreadOnly = req.query.unread === '1';
  res.json({
    notifications: all(
      `SELECT * FROM notifications WHERE user_id = ? ${unreadOnly ? 'AND read_at IS NULL' : ''} ORDER BY id DESC LIMIT 100`,
      req.user!.id,
    ),
  });
});

communicationRouter.post('/notifications/:id/read', (req, res) => {
  run('UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?', now(), idParam(req), req.user!.id);
  res.json({ ok: true });
});

communicationRouter.post('/notifications/read-all', (req, res) => {
  run('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL', now(), req.user!.id);
  res.json({ ok: true });
});

communicationRouter.get('/messages', (req, res) => {
  res.json({
    messages: all(
      `SELECT m.id, m.subject, m.body, m.audience, m.created_at, r.read_at, u.name sender_name, c.title course_title
       FROM message_recipients r JOIN messages m ON m.id = r.message_id
       LEFT JOIN users u ON u.id = m.sender_id LEFT JOIN courses c ON c.id = m.course_id
       WHERE r.user_id = ? ORDER BY m.id DESC LIMIT 200`,
      req.user!.id,
    ),
  });
});

communicationRouter.post('/messages/:id/read', (req, res) => {
  const { changes } = run(
    'UPDATE message_recipients SET read_at = COALESCE(read_at, ?) WHERE message_id = ? AND user_id = ?',
    now(),
    idParam(req),
    req.user!.id,
  );
  if (!changes) throw notFound('Mensagem não encontrada');
  res.json({ ok: true });
});
