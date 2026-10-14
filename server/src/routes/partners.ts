import { Router } from 'express';
import { z } from 'zod';
import { all, get, now, run, tx } from '../db';
import { audit } from '../lib/audit';
import { badRequest, parse } from '../lib/http';
import { emails } from '../lib/mailer';
import { notify } from '../lib/notify';
import { broadcastAdmins } from '../lib/realtime';
import { hashPassword, signToken } from '../lib/security';
import { COMPANY_SIZES, normalizeCnpj } from '../lib/talent';
import { findUser, findUserByEmail, parseList, selfUser } from '../lib/users';

// Página pública "Para empresas" e cadastro de empresas parceiras.
export const partnersRouter = Router();

const LOGO_COLORS = ['#23384a', '#1f7a4d', '#12a3a0', '#e8772e', '#d64545', '#8a5a2b', '#0b6f6c', '#7c3aed'];
const n = (sql: string, ...p: (string | number)[]) => Number(get<{ n: number }>(sql, ...p)?.n ?? 0);

/** Números da vitrine para a página "Para empresas" (o argumento de venda para o parceiro). */
partnersRouter.get('/showcase', (_req, res) => {
  const talents = all<{ talent_areas: string | null }>(
    "SELECT talent_areas FROM users WHERE role = 'student' AND is_active = 1 AND talent_visible = 1",
  );
  const areas: Record<string, number> = {};
  for (const t of talents) for (const a of parseList(t.talent_areas)) areas[a] = (areas[a] ?? 0) + 1;
  res.json({
    stats: {
      students: n("SELECT COUNT(*) n FROM users WHERE role = 'student' AND is_active = 1"),
      talents: talents.length,
      certificates: n('SELECT COUNT(*) n FROM certificates'),
      studyHours: Math.round(n('SELECT COALESCE(SUM(seconds), 0) n FROM study_time') / 3600),
      courses: n('SELECT COUNT(*) n FROM courses WHERE published = 1'),
      municipalities: n("SELECT COUNT(DISTINCT LOWER(TRIM(municipality))) n FROM users WHERE role = 'student' AND municipality <> ''"),
      partners: n("SELECT COUNT(*) n FROM companies WHERE status = 'approved'"),
      openJobs: n("SELECT COUNT(*) n FROM jobs j JOIN companies c ON c.id = j.company_id WHERE j.status = 'open' AND c.status = 'approved'"),
    },
    areas: Object.entries(areas)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count),
    partners: all("SELECT id, name, sector, municipality, color FROM companies WHERE status = 'approved' ORDER BY reviewed_at DESC LIMIT 12"),
  });
});

partnersRouter.post('/register', (req, res) => {
  const body = parse(
    z.object({
      company: z.object({
        name: z.string().trim().min(2, 'Informe o nome da empresa').max(120),
        legal_name: z.string().trim().max(160).optional().or(z.literal('')),
        cnpj: z.string().trim().min(14, 'CNPJ inválido').max(18),
        sector: z.string().trim().min(2, 'Informe o setor de atuação').max(80),
        size: z.enum(COMPANY_SIZES).optional(),
        municipality: z.string().trim().min(2, 'Informe o município').max(80),
        website: z.string().trim().url('Site inválido (use https://…)').max(200).optional().or(z.literal('')),
        description: z.string().trim().max(1000).optional().or(z.literal('')),
        contact_phone: z.string().trim().max(30).optional().or(z.literal('')),
      }),
      responsible: z.object({
        name: z.string().trim().min(3, 'Informe o nome do(a) responsável').max(120),
        email: z.string().trim().toLowerCase().email('E-mail inválido'),
        password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres').max(128),
        job_title: z.string().trim().max(80).optional().or(z.literal('')),
      }),
      accept_terms: z.literal(true, { errorMap: () => ({ message: 'É preciso aceitar os termos de uso da vitrine de talentos' }) }),
    }),
    req.body,
  );
  const cnpj = normalizeCnpj(body.company.cnpj);
  if (!cnpj) throw badRequest('CNPJ inválido. Confira os números.');
  if (get('SELECT id FROM companies WHERE cnpj = ?', cnpj)) throw badRequest('Esta empresa já está cadastrada. Entre com o e-mail do(a) responsável.');
  if (findUserByEmail(body.responsible.email)) throw badRequest('Já existe uma conta com este e-mail.');

  const c = body.company;
  const { companyId, userId } = tx(() => {
    const companyId = run(
      `INSERT INTO companies (name, legal_name, cnpj, sector, size, municipality, website, description, contact_phone, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      c.name,
      c.legal_name || null,
      cnpj,
      c.sector,
      c.size ?? null,
      c.municipality,
      c.website || null,
      c.description || null,
      c.contact_phone || null,
      LOGO_COLORS[Number(cnpj.slice(-4)) % LOGO_COLORS.length],
    ).id;
    const userId = run(
      "INSERT INTO users (name, email, password_hash, role, company_id, job_title, municipality, last_login_at) VALUES (?, ?, ?, 'company', ?, ?, ?, ?)",
      body.responsible.name,
      body.responsible.email,
      hashPassword(body.responsible.password),
      companyId,
      body.responsible.job_title || null,
      c.municipality,
      now(),
    ).id;
    return { companyId, userId };
  });

  audit(req, 'partner.register', 'company', companyId, { name: c.name }, userId);
  for (const admin of all<{ id: number }>("SELECT id FROM users WHERE role = 'admin' AND is_active = 1")) {
    notify(admin.id, 'partner', `Nova empresa parceira: ${c.name}`, 'Cadastro aguardando aprovação.', '/admin/empresas');
  }
  broadcastAdmins('activity', { type: 'partner' });
  emails.partnerReceived(body.responsible.email, body.responsible.name, c.name);
  res.status(201).json({ token: signToken(userId), user: selfUser(findUser(userId)!) });
});
