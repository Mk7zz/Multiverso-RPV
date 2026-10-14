import { Router } from 'express';
import { z } from 'zod';
import { all, get, now, run } from '../db';
import { audit } from '../lib/audit';
import { badRequest, HttpError, idParam, notFound, pagination, parse } from '../lib/http';
import { levelInfo } from '../lib/levels';
import { emails } from '../lib/mailer';
import { notify } from '../lib/notify';
import {
  AREAS,
  COMPANY_SIZES,
  findCompany,
  GOALS,
  JOB_TYPES,
  jobMatch,
  minPointsForLevel,
  MODALITIES,
  talentCard,
  talentProfile,
} from '../lib/talent';
import { findUser, parseIds, selfUser, type UserRow } from '../lib/users';
import { requireApprovedCompany, requireCompany } from '../middleware/auth';

// Área da empresa parceira: vitrine de talentos, convites, oportunidades e candidatos.
export const companyRouter = Router();
companyRouter.use(requireCompany);

const n = (sql: string, ...p: (string | number)[]) => Number(get<{ n: number }>(sql, ...p)?.n ?? 0);
const cid = (req: { user?: { company_id: number | null } }) => req.user!.company_id!;

type JobRow = {
  id: number;
  company_id: number;
  title: string;
  type: string;
  modality: string;
  municipality: string | null;
  area: string;
  description: string;
  requirements: string | null;
  benefits: string | null;
  course_ids: string | null;
  min_level: number;
  status: string;
  closes_at: string | null;
  created_at: string;
  updated_at: string;
};

const jobOut = (j: JobRow) => ({ ...j, course_ids: parseIds(j.course_ids) });

function ownJob(req: { user?: { company_id: number | null } }, id: number) {
  const job = get<JobRow>('SELECT * FROM jobs WHERE id = ? AND company_id = ?', id, cid(req));
  if (!job) throw notFound('Oportunidade não encontrada');
  return job;
}

/** Painel da empresa: status do cadastro e números do funil. */
companyRouter.get('/me', (req, res) => {
  const company = findCompany(cid(req))!;
  const id = company.id;
  res.json({
    user: selfUser(findUser(req.user!.id)!),
    company,
    stats: {
      talentsAvailable: n("SELECT COUNT(*) n FROM users WHERE role = 'student' AND is_active = 1 AND talent_visible = 1"),
      openJobs: n("SELECT COUNT(*) n FROM jobs WHERE company_id = ? AND status = 'open'", id),
      applications: n('SELECT COUNT(*) n FROM job_applications a JOIN jobs j ON j.id = a.job_id WHERE j.company_id = ?', id),
      newApplications: n("SELECT COUNT(*) n FROM job_applications a JOIN jobs j ON j.id = a.job_id WHERE j.company_id = ? AND a.status = 'sent'", id),
      invitesSent: n('SELECT COUNT(*) n FROM talent_invites WHERE company_id = ?', id),
      invitesAccepted: n("SELECT COUNT(*) n FROM talent_invites WHERE company_id = ? AND status = 'accepted'", id),
      saved: n('SELECT COUNT(*) n FROM company_saved_talents WHERE company_id = ?', id),
      hired: n("SELECT COUNT(*) n FROM job_applications a JOIN jobs j ON j.id = a.job_id WHERE j.company_id = ? AND a.status = 'hired'", id),
    },
    recentApplications: all(
      `SELECT a.id, a.status, a.created_at, u.id user_id, u.name, u.avatar, u.points, j.id job_id, j.title job_title
       FROM job_applications a JOIN jobs j ON j.id = a.job_id JOIN users u ON u.id = a.user_id
       WHERE j.company_id = ? ORDER BY a.id DESC LIMIT 6`,
      id,
    ).map((r) => ({ ...r, avatar: r.avatar ? JSON.parse(r.avatar) : null, level: levelInfo(r.points) })),
  });
});

companyRouter.put('/me', (req, res) => {
  const body = parse(
    z.object({
      name: z.string().trim().min(2).max(120),
      legal_name: z.string().trim().max(160).optional().nullable(),
      sector: z.string().trim().min(2).max(80),
      size: z.enum(COMPANY_SIZES).optional().nullable(),
      municipality: z.string().trim().min(2).max(80),
      website: z.string().trim().url('Site inválido (use https://…)').max(200).optional().nullable().or(z.literal('')),
      description: z.string().trim().max(1000).optional().nullable(),
      contact_phone: z.string().trim().max(30).optional().nullable(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    }),
    req.body,
  );
  run(
    `UPDATE companies SET name = ?, legal_name = ?, sector = ?, size = ?, municipality = ?, website = ?, description = ?, contact_phone = ?,
       color = COALESCE(?, color) WHERE id = ?`,
    body.name,
    body.legal_name || null,
    body.sector,
    body.size ?? null,
    body.municipality,
    body.website || null,
    body.description || null,
    body.contact_phone || null,
    body.color,
    cid(req),
  );
  audit(req, 'company.update', 'company', cid(req));
  res.json({ company: findCompany(cid(req)) });
});

/** Opções dos filtros e do formulário de oportunidade. */
companyRouter.get('/options', (_req, res) => {
  res.json({
    courses: all('SELECT id, title FROM courses WHERE published = 1 ORDER BY position, id'),
    municipalities: all<{ municipality: string }>(
      "SELECT DISTINCT municipality FROM users WHERE role = 'student' AND talent_visible = 1 AND municipality <> '' ORDER BY municipality",
    ).map((r) => r.municipality),
  });
});

// ---- A partir daqui, só empresas aprovadas ----------------------------------------------
companyRouter.use(requireApprovedCompany);

const TALENT_AGG = `
  (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id AND e.status = 'completed') courses_completed,
  (SELECT COUNT(*) FROM certificates ce WHERE ce.user_id = u.id) certificates,
  (SELECT COALESCE(SUM(seconds), 0) FROM study_time st WHERE st.user_id = u.id) study_seconds`;

/** Busca na vitrine: somente alunos ativos que ligaram a vitrine (opt-in). */
companyRouter.get('/talents', (req, res) => {
  const { page, pageSize, offset } = pagination(req, 12);
  const where = ["u.role = 'student'", 'u.is_active = 1', 'u.talent_visible = 1'];
  const params: (string | number)[] = [];
  const q = String(req.query.q ?? '').trim();
  if (q) {
    where.push('(u.name LIKE ? OR u.talent_headline LIKE ? OR u.school LIKE ? OR u.bio LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (req.query.municipality) {
    where.push('u.municipality = ?');
    params.push(String(req.query.municipality));
  }
  if (req.query.area && (AREAS as readonly string[]).includes(String(req.query.area))) {
    where.push('u.talent_areas LIKE ?');
    params.push(`%"${req.query.area}"%`);
  }
  if (req.query.goal && (GOALS as readonly string[]).includes(String(req.query.goal))) {
    where.push("(u.talent_goal = ? OR u.talent_goal = 'qualquer')");
    params.push(String(req.query.goal));
  }
  const courseId = Number(req.query.course_id);
  if (courseId) {
    where.push("EXISTS (SELECT 1 FROM enrollments e WHERE e.user_id = u.id AND e.course_id = ? AND e.status = 'completed')");
    params.push(courseId);
  }
  const minLevel = Number(req.query.min_level);
  if (minLevel > 1) {
    where.push('u.points >= ?');
    params.push(minPointsForLevel(minLevel));
  }
  if (req.query.saved === '1') {
    where.push('EXISTS (SELECT 1 FROM company_saved_talents s WHERE s.user_id = u.id AND s.company_id = ?)');
    params.push(cid(req));
  }
  const order =
    req.query.sort === 'active' ? 'u.last_seen_at DESC' : req.query.sort === 'courses' ? 'courses_completed DESC, u.points DESC' : 'u.points DESC';
  const whereSql = where.join(' AND ');
  const total = n(`SELECT COUNT(*) n FROM users u WHERE ${whereSql}`, ...params);
  const rows = all<UserRow & { courses_completed: number; certificates: number; study_seconds: number }>(
    `SELECT u.*, ${TALENT_AGG} FROM users u WHERE ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`,
    ...params,
    pageSize,
    offset,
  );
  const saved = new Set(all<{ user_id: number }>('SELECT user_id FROM company_saved_talents WHERE company_id = ?', cid(req)).map((r) => r.user_id));
  res.json({ talents: rows.map((r) => ({ ...talentCard(r), saved: saved.has(r.id) })), total, page, pageSize });
});

function visibleTalent(id: number, companyId: number) {
  const u = findUser(id);
  // Quem se candidatou a uma vaga da empresa continua visível para ela mesmo sem a vitrine ligada.
  const applied = !!get('SELECT 1 FROM job_applications a JOIN jobs j ON j.id = a.job_id WHERE j.company_id = ? AND a.user_id = ?', companyId, id);
  if (!u || u.role !== 'student' || !u.is_active || (!u.talent_visible && !applied)) throw notFound('Talento não encontrado');
  return u;
}

companyRouter.get('/talents/:id', (req, res) => {
  const u = visibleTalent(idParam(req), cid(req));
  audit(req, 'company.talent_view', 'user', u.id, { company_id: cid(req) });
  res.json({ talent: talentProfile(u, cid(req)) });
});

companyRouter.post('/talents/:id/save', (req, res) => {
  const u = visibleTalent(idParam(req), cid(req));
  run('INSERT OR IGNORE INTO company_saved_talents (company_id, user_id) VALUES (?, ?)', cid(req), u.id);
  res.json({ saved: true });
});

companyRouter.delete('/talents/:id/save', (req, res) => {
  run('DELETE FROM company_saved_talents WHERE company_id = ? AND user_id = ?', cid(req), idParam(req));
  res.json({ saved: false });
});

// ---- Convites ---------------------------------------------------------------------------
companyRouter.get('/invites', (req, res) => {
  const rows = all(
    `SELECT i.id, i.status, i.message, i.created_at, i.responded_at, i.job_id, j.title job_title,
            u.id user_id, u.name, u.avatar, u.points, u.municipality, u.email
     FROM talent_invites i JOIN users u ON u.id = i.user_id LEFT JOIN jobs j ON j.id = i.job_id
     WHERE i.company_id = ? ORDER BY i.id DESC`,
    cid(req),
  );
  res.json({
    invites: rows.map(({ email, avatar, ...r }) => ({
      ...r,
      avatar: avatar ? JSON.parse(avatar) : null,
      level: levelInfo(r.points),
      // O e-mail só aparece depois do aceite.
      email: r.status === 'accepted' ? email : null,
    })),
  });
});

companyRouter.post('/invites', (req, res) => {
  const body = parse(
    z.object({
      user_id: z.number().int().positive(),
      job_id: z.number().int().positive().optional().nullable(),
      message: z.string().trim().min(20, 'Escreva uma mensagem de pelo menos 20 caracteres').max(1000),
    }),
    req.body,
  );
  const company = findCompany(cid(req))!;
  const u = findUser(body.user_id);
  if (!u || u.role !== 'student' || !u.is_active || !u.talent_visible) throw notFound('Talento não encontrado');
  if (body.job_id) ownJob(req, body.job_id);
  if (get("SELECT 1 FROM talent_invites WHERE company_id = ? AND user_id = ? AND status = 'pending'", company.id, u.id)) {
    throw badRequest('Já existe um convite aguardando resposta deste talento.');
  }
  // Limite diário para evitar disparos em massa.
  if (n("SELECT COUNT(*) n FROM talent_invites WHERE company_id = ? AND created_at >= ?", company.id, new Date(Date.now() - 86_400_000).toISOString()) >= 30) {
    throw new HttpError(429, 'Limite de 30 convites por dia atingido. Tente novamente amanhã.');
  }
  const { id } = run(
    'INSERT INTO talent_invites (company_id, user_id, job_id, message, created_by) VALUES (?, ?, ?, ?, ?)',
    company.id,
    u.id,
    body.job_id ?? null,
    body.message,
    req.user!.id,
  );
  notify(u.id, 'talent_invite', `${company.name} quer conversar com você`, 'Uma empresa parceira viu sua trajetória no Multiverso.', '/oportunidades?aba=convites');
  emails.talentInvite(u.email, u.name, company.name);
  audit(req, 'company.invite', 'user', u.id, { company_id: company.id, invite_id: id });
  res.status(201).json({ invite: get('SELECT * FROM talent_invites WHERE id = ?', id) });
});

// ---- Oportunidades ----------------------------------------------------------------------
const jobSchema = z.object({
  title: z.string().trim().min(3, 'Informe o título da oportunidade').max(120),
  type: z.enum(JOB_TYPES),
  modality: z.enum(MODALITIES),
  municipality: z.string().trim().max(80).optional().nullable(),
  area: z.enum(AREAS),
  description: z.string().trim().min(20, 'Descreva a oportunidade (pelo menos 20 caracteres)').max(4000),
  requirements: z.string().trim().max(2000).optional().nullable(),
  benefits: z.string().trim().max(1000).optional().nullable(),
  course_ids: z.array(z.number().int().positive()).max(10).default([]),
  min_level: z.number().int().min(0).max(10).default(0),
  status: z.enum(['open', 'closed']).default('open'),
  closes_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
});

companyRouter.get('/jobs', (req, res) => {
  const jobs = all<JobRow & { applications: number; new_applications: number }>(
    `SELECT j.*, (SELECT COUNT(*) FROM job_applications a WHERE a.job_id = j.id) applications,
            (SELECT COUNT(*) FROM job_applications a WHERE a.job_id = j.id AND a.status = 'sent') new_applications
     FROM jobs j WHERE j.company_id = ? ORDER BY j.status = 'open' DESC, j.id DESC`,
    cid(req),
  );
  res.json({ jobs: jobs.map(jobOut) });
});

companyRouter.post('/jobs', (req, res) => {
  const b = parse(jobSchema, req.body);
  const { id } = run(
    `INSERT INTO jobs (company_id, title, type, modality, municipality, area, description, requirements, benefits, course_ids, min_level, status, closes_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    cid(req),
    b.title,
    b.type,
    b.modality,
    b.municipality || null,
    b.area,
    b.description,
    b.requirements || null,
    b.benefits || null,
    JSON.stringify(b.course_ids),
    b.min_level,
    b.status,
    b.closes_at || null,
    req.user!.id,
  );
  audit(req, 'company.job_create', 'job', id);
  res.status(201).json({ job: jobOut(ownJob(req, id)) });
});

companyRouter.put('/jobs/:id', (req, res) => {
  const job = ownJob(req, idParam(req));
  const b = parse(jobSchema, req.body);
  run(
    `UPDATE jobs SET title = ?, type = ?, modality = ?, municipality = ?, area = ?, description = ?, requirements = ?, benefits = ?,
       course_ids = ?, min_level = ?, status = ?, closes_at = ?, updated_at = ? WHERE id = ?`,
    b.title,
    b.type,
    b.modality,
    b.municipality || null,
    b.area,
    b.description,
    b.requirements || null,
    b.benefits || null,
    JSON.stringify(b.course_ids),
    b.min_level,
    b.status,
    b.closes_at || null,
    now(),
    job.id,
  );
  audit(req, 'company.job_update', 'job', job.id);
  res.json({ job: jobOut(ownJob(req, job.id)) });
});

/** Oportunidade com candidatos ordenados pela compatibilidade. Abrir a lista marca as novas como vistas. */
companyRouter.get('/jobs/:id', (req, res) => {
  const job = ownJob(req, idParam(req));
  const rows = all<UserRow & { application_id: number; application_status: string; application_message: string | null; applied_at: string; courses_completed: number; certificates: number; study_seconds: number }>(
    `SELECT u.*, a.id application_id, a.status application_status, a.message application_message, a.created_at applied_at, ${TALENT_AGG}
     FROM job_applications a JOIN users u ON u.id = a.user_id WHERE a.job_id = ? ORDER BY a.id DESC`,
    job.id,
  );
  const applications = rows
    .map((r) => ({
      id: r.application_id,
      is_new: r.application_status === 'sent',
      // Abrir a lista já conta como "vista" (atualizado logo abaixo).
      status: r.application_status === 'sent' ? 'viewed' : r.application_status,
      message: r.application_message,
      created_at: r.applied_at,
      talent: { ...talentCard(r), email: r.email },
      match: jobMatch(r.id, job, r.points),
    }))
    .sort((a, b) => b.match.score - a.match.score);
  run("UPDATE job_applications SET status = 'viewed', updated_at = ? WHERE job_id = ? AND status = 'sent'", now(), job.id);
  res.json({ job: jobOut(job), applications });
});

const STATUS_COPY: Record<string, string> = {
  shortlisted: 'avançou para a próxima etapa',
  declined: 'foi encerrada pela empresa',
  hired: 'foi aprovada. Parabéns!',
};

companyRouter.patch('/applications/:id', (req, res) => {
  const { status } = parse(z.object({ status: z.enum(['viewed', 'shortlisted', 'declined', 'hired']) }), req.body);
  const app = get<{ id: number; user_id: number; job_id: number; title: string; company: string }>(
    `SELECT a.id, a.user_id, a.job_id, j.title, c.name company FROM job_applications a JOIN jobs j ON j.id = a.job_id JOIN companies c ON c.id = j.company_id
     WHERE a.id = ? AND j.company_id = ?`,
    idParam(req),
    cid(req),
  );
  if (!app) throw notFound('Candidatura não encontrada');
  run('UPDATE job_applications SET status = ?, updated_at = ? WHERE id = ?', status, now(), app.id);
  if (STATUS_COPY[status]) {
    notify(app.user_id, 'job_application', `Sua candidatura para ${app.title} ${STATUS_COPY[status]}`, app.company, '/oportunidades?aba=candidaturas');
  }
  audit(req, 'company.application_status', 'job_application', app.id, { status });
  res.json({ ok: true });
});
