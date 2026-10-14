import { Router } from 'express';
import { z } from 'zod';
import { all, get, run, tx } from '../../db';
import { audit } from '../../lib/audit';
import { badRequest, idParam, notFound, parse } from '../../lib/http';
import { emails } from '../../lib/mailer';
import { notify } from '../../lib/notify';

// Avisos, eventos e mensagens internas enviadas pela equipe.
export const adminCommunicationRouter = Router();

const isoDate = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/));
const toIso = (v: string | null | undefined) => (v ? new Date(v).toISOString() : null);

// ---- Avisos -----------------------------------------------------------------------
const announcementSchema = z.object({
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(1).max(5000),
  level: z.enum(['info', 'important']).default('info'),
  pinned: z.boolean().default(false),
  starts_at: isoDate.nullable().optional(),
  ends_at: isoDate.nullable().optional(),
  notify_students: z.boolean().default(false),
});

adminCommunicationRouter.get('/announcements', (_req, res) => {
  res.json({ announcements: all('SELECT a.*, u.name author FROM announcements a LEFT JOIN users u ON u.id = a.created_by ORDER BY a.id DESC') });
});

adminCommunicationRouter.post('/announcements', (req, res) => {
  const b = parse(announcementSchema, req.body);
  const { id } = run(
    'INSERT INTO announcements (title, body, level, pinned, starts_at, ends_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    b.title,
    b.body,
    b.level,
    b.pinned,
    toIso(b.starts_at),
    toIso(b.ends_at),
    req.user!.id,
  );
  if (b.notify_students) {
    for (const u of all<{ id: number }>("SELECT id FROM users WHERE role = 'student' AND is_active = 1")) {
      notify(u.id, 'announcement', `Aviso: ${b.title}`, b.body.slice(0, 140), '/');
    }
  }
  audit(req, 'announcement.create', 'announcement', id);
  res.status(201).json({ announcement: get('SELECT * FROM announcements WHERE id = ?', id) });
});

adminCommunicationRouter.put('/announcements/:id', (req, res) => {
  const id = idParam(req);
  const b = parse(announcementSchema, req.body);
  const { changes } = run(
    'UPDATE announcements SET title = ?, body = ?, level = ?, pinned = ?, starts_at = ?, ends_at = ? WHERE id = ?',
    b.title,
    b.body,
    b.level,
    b.pinned,
    toIso(b.starts_at),
    toIso(b.ends_at),
    id,
  );
  if (!changes) throw notFound();
  audit(req, 'announcement.update', 'announcement', id);
  res.json({ announcement: get('SELECT * FROM announcements WHERE id = ?', id) });
});

adminCommunicationRouter.delete('/announcements/:id', (req, res) => {
  run('DELETE FROM announcements WHERE id = ?', idParam(req));
  audit(req, 'announcement.delete', 'announcement', idParam(req));
  res.json({ ok: true });
});

// ---- Eventos ----------------------------------------------------------------------
const eventSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  url: z.string().trim().max(500).nullable().optional(),
  starts_at: isoDate,
  ends_at: isoDate.nullable().optional(),
  course_id: z.number().int().positive().nullable().optional(),
  notify_students: z.boolean().default(false),
});

adminCommunicationRouter.get('/events', (_req, res) => {
  res.json({ events: all('SELECT e.*, c.title course_title FROM events e LEFT JOIN courses c ON c.id = e.course_id ORDER BY e.starts_at DESC') });
});

adminCommunicationRouter.post('/events', (req, res) => {
  const b = parse(eventSchema, req.body);
  const { id } = run(
    'INSERT INTO events (title, description, location, url, starts_at, ends_at, course_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    b.title,
    b.description,
    b.location,
    b.url,
    toIso(b.starts_at),
    toIso(b.ends_at),
    b.course_id ?? null,
  );
  if (b.notify_students) {
    const users = b.course_id
      ? all<{ id: number }>('SELECT user_id id FROM enrollments WHERE course_id = ?', b.course_id)
      : all<{ id: number }>("SELECT id FROM users WHERE role = 'student' AND is_active = 1");
    users.forEach((u) => notify(u.id, 'event', `Novo evento: ${b.title}`, b.location ?? undefined, '/eventos'));
  }
  audit(req, 'event.create', 'event', id);
  res.status(201).json({ event: get('SELECT * FROM events WHERE id = ?', id) });
});

adminCommunicationRouter.put('/events/:id', (req, res) => {
  const id = idParam(req);
  const b = parse(eventSchema, req.body);
  const { changes } = run(
    'UPDATE events SET title = ?, description = ?, location = ?, url = ?, starts_at = ?, ends_at = ?, course_id = ? WHERE id = ?',
    b.title,
    b.description,
    b.location,
    b.url,
    toIso(b.starts_at),
    toIso(b.ends_at),
    b.course_id ?? null,
    id,
  );
  if (!changes) throw notFound();
  audit(req, 'event.update', 'event', id);
  res.json({ event: get('SELECT * FROM events WHERE id = ?', id) });
});

adminCommunicationRouter.delete('/events/:id', (req, res) => {
  run('DELETE FROM events WHERE id = ?', idParam(req));
  audit(req, 'event.delete', 'event', idParam(req));
  res.json({ ok: true });
});

// ---- Mensagens internas -----------------------------------------------------------
adminCommunicationRouter.get('/messages', (_req, res) => {
  res.json({
    messages: all(
      `SELECT m.*, u.name sender_name, c.title course_title,
         (SELECT COUNT(*) FROM message_recipients r WHERE r.message_id = m.id) recipients,
         (SELECT COUNT(*) FROM message_recipients r WHERE r.message_id = m.id AND r.read_at IS NOT NULL) read_count
       FROM messages m LEFT JOIN users u ON u.id = m.sender_id LEFT JOIN courses c ON c.id = m.course_id ORDER BY m.id DESC`,
    ),
  });
});

adminCommunicationRouter.post('/messages', (req, res) => {
  const b = parse(
    z.object({
      subject: z.string().trim().min(3).max(200),
      body: z.string().trim().min(1).max(10_000),
      audience: z.enum(['all', 'course', 'user']),
      course_id: z.number().int().positive().optional(),
      user_ids: z.array(z.number().int().positive()).optional(),
      send_email: z.boolean().default(false),
    }),
    req.body,
  );
  let recipients: { id: number; name: string; email: string }[];
  if (b.audience === 'all') recipients = all("SELECT id, name, email FROM users WHERE role = 'student' AND is_active = 1");
  else if (b.audience === 'course') {
    if (!b.course_id) throw badRequest('Selecione o curso.');
    recipients = all('SELECT u.id, u.name, u.email FROM enrollments e JOIN users u ON u.id = e.user_id WHERE e.course_id = ? AND u.is_active = 1', b.course_id);
  } else {
    if (!b.user_ids?.length) throw badRequest('Selecione ao menos um destinatário.');
    recipients = all(`SELECT id, name, email FROM users WHERE id IN (${b.user_ids.map(() => '?').join(',')})`, ...b.user_ids);
  }
  if (!recipients.length) throw badRequest('Nenhum destinatário encontrado.');

  const id = tx(() => {
    const { id } = run(
      'INSERT INTO messages (sender_id, subject, body, audience, course_id) VALUES (?, ?, ?, ?, ?)',
      req.user!.id,
      b.subject,
      b.body,
      b.audience,
      b.course_id ?? null,
    );
    recipients.forEach((r) => run('INSERT OR IGNORE INTO message_recipients (message_id, user_id) VALUES (?, ?)', id, r.id));
    return id;
  });
  recipients.forEach((r) => {
    notify(r.id, 'message', `Nova mensagem: ${b.subject}`, undefined, '/mensagens');
    if (b.send_email) emails.internalMessage(r.email, r.name, b.subject);
  });
  audit(req, 'message.send', 'message', id, { audience: b.audience, recipients: recipients.length });
  res.status(201).json({ id, recipients: recipients.length });
});
