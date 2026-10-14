import { Router } from 'express';
import { z } from 'zod';
import { all, get, now, run } from '../db';
import { audit } from '../lib/audit';
import { badRequest, idParam, notFound, parse } from '../lib/http';
import { emails } from '../lib/mailer';
import { notify } from '../lib/notify';
import { AREAS, companyContact, companyUserIds, findCompany, GOALS, JOB_TYPES, jobMatch, MODALITIES, publicCompany, type CompanyRow } from '../lib/talent';
import { findUser, needsGuardianConsent, parseIds, selfUser, type UserRow } from '../lib/users';
import { requireStudent } from '../middleware/auth';

// Lado do aluno na ponte com o mercado: vitrine (opt-in), oportunidades, candidaturas e convites.
export const opportunitiesRouter = Router();
opportunitiesRouter.use(requireStudent);

const OPEN_JOB = "j.status = 'open' AND c.status = 'approved' AND (j.closes_at IS NULL OR j.closes_at >= ?)";
const today = () => now().slice(0, 10);

type JobWithCompany = Record<string, any> & { course_ids: string | null; min_level: number; company_id: number };

function shapeJob(j: JobWithCompany, userId: number, points: number) {
  const company = findCompany(j.company_id)!;
  return {
    id: j.id,
    title: j.title,
    type: j.type,
    modality: j.modality,
    municipality: j.municipality,
    area: j.area,
    description: j.description,
    requirements: j.requirements,
    benefits: j.benefits,
    min_level: j.min_level,
    closes_at: j.closes_at,
    created_at: j.created_at,
    course_ids: parseIds(j.course_ids),
    company: publicCompany(company),
    match: jobMatch(userId, j, points),
    application: get('SELECT id, status, created_at FROM job_applications WHERE job_id = ? AND user_id = ?', j.id, userId) ?? null,
  };
}

/** Exige a declaração de autorização do responsável quando necessário (e a registra). */
function ensureConsent(u: UserRow, declared?: boolean) {
  if (!needsGuardianConsent(u.birth_date) || u.talent_guardian_ok) return;
  if (!declared) {
    throw badRequest('Antes de compartilhar seu perfil com empresas, confirme que você tem 18 anos ou mais, ou que seu responsável autorizou.');
  }
  run('UPDATE users SET talent_guardian_ok = 1 WHERE id = ?', u.id);
}

opportunitiesRouter.get('/jobs', (req, res) => {
  const me = findUser(req.user!.id)!;
  const where = [OPEN_JOB];
  const params: (string | number)[] = [today()];
  const q = String(req.query.q ?? '').trim();
  if (q) {
    where.push('(j.title LIKE ? OR j.description LIKE ? OR c.name LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  for (const [key, list] of [['area', AREAS], ['type', JOB_TYPES], ['modality', MODALITIES]] as const) {
    const v = String(req.query[key] ?? '');
    if ((list as readonly string[]).includes(v)) {
      where.push(`j.${key} = ?`);
      params.push(v);
    }
  }
  const jobs = all<JobWithCompany>(`SELECT j.* FROM jobs j JOIN companies c ON c.id = j.company_id WHERE ${where.join(' AND ')} ORDER BY j.id DESC LIMIT 60`, ...params);
  const shaped = jobs.map((j) => shapeJob(j, me.id, me.points));
  // Primeiro as oportunidades em que o aluno tem mais chance (cursos recomendados já concluídos).
  if (req.query.sort !== 'recent') shaped.sort((a, b) => b.match.score - a.match.score);
  res.json({ jobs: shaped });
});

opportunitiesRouter.get('/jobs/:id', (req, res) => {
  const me = findUser(req.user!.id)!;
  const job = get<JobWithCompany>(`SELECT j.* FROM jobs j JOIN companies c ON c.id = j.company_id WHERE j.id = ? AND c.status = 'approved'`, idParam(req));
  if (!job) throw notFound('Oportunidade não encontrada');
  const shaped = shapeJob(job, me.id, me.points);
  const ids = shaped.course_ids;
  const courses = ids.length
    ? all<{ id: number; title: string; slug: string }>(`SELECT id, title, slug FROM courses WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids)
    : [];
  res.json({
    job: shaped,
    open: job.status === 'open' && (!job.closes_at || job.closes_at >= today()),
    courses: courses.map((c) => ({ ...c, done: !shaped.match.missing.includes(c.id) })),
  });
});

opportunitiesRouter.post('/jobs/:id/apply', (req, res) => {
  const body = parse(z.object({ message: z.string().trim().max(1000).optional(), guardian_ok: z.boolean().optional() }), req.body);
  const me = findUser(req.user!.id)!;
  const job = get<JobWithCompany & { title: string }>(`SELECT j.* FROM jobs j JOIN companies c ON c.id = j.company_id WHERE j.id = ? AND ${OPEN_JOB}`, idParam(req), today());
  if (!job) throw notFound('Esta oportunidade não está mais aberta');
  if (get('SELECT 1 FROM job_applications WHERE job_id = ? AND user_id = ?', job.id, me.id)) throw badRequest('Você já se candidatou a esta oportunidade.');
  ensureConsent(me, body.guardian_ok);

  const { id } = run('INSERT INTO job_applications (job_id, user_id, message) VALUES (?, ?, ?)', job.id, me.id, body.message || null);
  for (const uid of companyUserIds(job.company_id)) {
    notify(uid, 'job_application', `Nova candidatura: ${job.title}`, me.name, `/empresa/vagas/${job.id}`);
    const owner = findUser(uid);
    if (owner) emails.newApplication(owner.email, owner.name, me.name, job.title, job.id);
  }
  audit(req, 'opportunity.apply', 'job', job.id);
  res.status(201).json({ application: get('SELECT id, status, created_at FROM job_applications WHERE id = ?', id) });
});

/** Desistir de uma candidatura que a empresa ainda não avaliou. */
opportunitiesRouter.delete('/applications/:id', (req, res) => {
  const app = get<{ id: number; status: string }>('SELECT id, status FROM job_applications WHERE id = ? AND user_id = ?', idParam(req), req.user!.id);
  if (!app) throw notFound('Candidatura não encontrada');
  if (!['sent', 'viewed'].includes(app.status)) throw badRequest('Esta candidatura já foi avaliada pela empresa.');
  run('DELETE FROM job_applications WHERE id = ?', app.id);
  res.json({ ok: true });
});

/** Resumo da carreira do aluno: vitrine, candidaturas e convites recebidos. */
opportunitiesRouter.get('/me', (req, res) => {
  const me = req.user!.id;
  const applications = all<{ company_id: number } & Record<string, unknown>>(
    `SELECT a.id, a.status, a.created_at, a.updated_at, j.id job_id, j.title job_title, j.type, j.company_id
     FROM job_applications a JOIN jobs j ON j.id = a.job_id WHERE a.user_id = ? ORDER BY a.id DESC`,
    me,
  ).map(({ company_id, ...a }) => ({ ...a, company: publicCompany(findCompany(company_id)!) }));
  const invites = all<{ id: number; company_id: number; status: string } & Record<string, unknown>>(
    `SELECT i.id, i.company_id, i.status, i.message, i.created_at, i.responded_at, j.id job_id, j.title job_title
     FROM talent_invites i LEFT JOIN jobs j ON j.id = i.job_id JOIN companies c ON c.id = i.company_id
     WHERE i.user_id = ? AND c.status IN ('approved', 'suspended') ORDER BY i.status = 'pending' DESC, i.id DESC`,
    me,
  ).map(({ company_id, ...i }) => ({
    ...i,
    company: publicCompany(findCompany(company_id) as CompanyRow),
    contact: i.status === 'accepted' ? companyContact(company_id) : null,
  }));
  res.json({ user: selfUser(findUser(me)!), applications, invites, pendingInvites: invites.filter((i) => i.status === 'pending').length });
});

/** Liga/desliga a vitrine e atualiza o que as empresas veem. */
opportunitiesRouter.put('/talent', (req, res) => {
  const body = parse(
    z.object({
      visible: z.boolean(),
      headline: z.string().trim().max(120).optional().nullable(),
      areas: z.array(z.enum(AREAS)).max(5).default([]),
      goal: z.enum(GOALS).optional().nullable(),
      guardian_ok: z.boolean().optional(),
    }),
    req.body,
  );
  const me = findUser(req.user!.id)!;
  if (body.visible) {
    ensureConsent(me, body.guardian_ok);
    if (!body.areas.length) throw badRequest('Escolha pelo menos uma área de interesse para aparecer na vitrine.');
  }
  run(
    'UPDATE users SET talent_visible = ?, talent_headline = ?, talent_areas = ?, talent_goal = ?, talent_updated_at = ? WHERE id = ?',
    body.visible,
    body.headline || null,
    JSON.stringify(body.areas),
    body.goal ?? null,
    now(),
    me.id,
  );
  audit(req, body.visible ? 'talent.visible_on' : 'talent.visible_off', 'user', me.id);
  res.json({ user: selfUser(findUser(me.id)!) });
});

function respond(req: import('express').Request, accept: boolean) {
  const me = findUser(req.user!.id)!;
  const inv = get<{ id: number; company_id: number; status: string; created_by: number | null }>(
    'SELECT * FROM talent_invites WHERE id = ? AND user_id = ?',
    idParam(req),
    me.id,
  );
  if (!inv || inv.status !== 'pending') throw notFound('Convite não encontrado');
  if (accept) ensureConsent(me, req.body?.guardian_ok === true);
  run('UPDATE talent_invites SET status = ?, responded_at = ? WHERE id = ?', accept ? 'accepted' : 'declined', now(), inv.id);
  for (const uid of companyUserIds(inv.company_id)) {
    notify(
      uid,
      'talent_invite',
      accept ? `${me.name} aceitou seu convite` : `${me.name} respondeu ao seu convite`,
      accept ? 'O contato já está liberado.' : undefined,
      accept ? `/empresa/talentos/${me.id}` : '/empresa/convites',
    );
    const owner = findUser(uid);
    if (owner) emails.inviteAnswered(owner.email, owner.name, me.name, accept);
  }
  audit(req, accept ? 'talent.invite_accept' : 'talent.invite_decline', 'talent_invite', inv.id);
  return inv.company_id;
}

opportunitiesRouter.post('/invites/:id/accept', (req, res) => {
  const companyId = respond(req, true);
  res.json({ ok: true, contact: companyContact(companyId) });
});

opportunitiesRouter.post('/invites/:id/decline', (req, res) => {
  respond(req, false);
  res.json({ ok: true });
});
