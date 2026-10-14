import { Router } from 'express';
import { z } from 'zod';
import { all, get, now, run } from '../../db';
import { audit } from '../../lib/audit';
import { idParam, notFound, parse } from '../../lib/http';
import { emails } from '../../lib/mailer';
import { notify } from '../../lib/notify';
import { COMPANY_STATUS, findCompany } from '../../lib/talent';

// Aprovação e acompanhamento das empresas parceiras.
export const adminPartnersRouter = Router();

const n = (sql: string, ...p: (string | number)[]) => Number(get<{ n: number }>(sql, ...p)?.n ?? 0);

adminPartnersRouter.get('/', (req, res) => {
  const status = String(req.query.status ?? '');
  const valid = (COMPANY_STATUS as readonly string[]).includes(status);
  const companies = all(
    `SELECT c.*,
       (SELECT u.name FROM users u WHERE u.company_id = c.id ORDER BY u.id LIMIT 1) owner_name,
       (SELECT u.email FROM users u WHERE u.company_id = c.id ORDER BY u.id LIMIT 1) owner_email,
       (SELECT COUNT(*) FROM jobs j WHERE j.company_id = c.id AND j.status = 'open') open_jobs,
       (SELECT COUNT(*) FROM job_applications a JOIN jobs j ON j.id = a.job_id WHERE j.company_id = c.id) applications,
       (SELECT COUNT(*) FROM talent_invites i WHERE i.company_id = c.id) invites,
       (SELECT COUNT(*) FROM talent_invites i WHERE i.company_id = c.id AND i.status = 'accepted') invites_accepted,
       (SELECT COUNT(*) FROM job_applications a JOIN jobs j ON j.id = a.job_id WHERE j.company_id = c.id AND a.status = 'hired') hired
     FROM companies c ${valid ? 'WHERE c.status = ?' : ''}
     ORDER BY c.status = 'pending' DESC, c.id DESC`,
    ...(valid ? [status] : []),
  );
  res.json({
    companies,
    summary: {
      pending: n("SELECT COUNT(*) n FROM companies WHERE status = 'pending'"),
      approved: n("SELECT COUNT(*) n FROM companies WHERE status = 'approved'"),
      openJobs: n("SELECT COUNT(*) n FROM jobs j JOIN companies c ON c.id = j.company_id WHERE j.status = 'open' AND c.status = 'approved'"),
      talents: n("SELECT COUNT(*) n FROM users WHERE role = 'student' AND is_active = 1 AND talent_visible = 1"),
      applications: n('SELECT COUNT(*) n FROM job_applications'),
      invitesAccepted: n("SELECT COUNT(*) n FROM talent_invites WHERE status = 'accepted'"),
      hired: n("SELECT COUNT(*) n FROM job_applications WHERE status = 'hired'"),
    },
  });
});

adminPartnersRouter.patch('/:id', (req, res) => {
  const body = parse(z.object({ status: z.enum(COMPANY_STATUS), review_note: z.string().trim().max(500).optional().nullable() }), req.body);
  const company = findCompany(idParam(req));
  if (!company) throw notFound('Empresa não encontrada');
  run('UPDATE companies SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?', body.status, body.review_note || null, req.user!.id, now(), company.id);
  if (body.status !== company.status && body.status !== 'pending') {
    const approved = body.status === 'approved';
    for (const u of all<{ id: number; name: string; email: string }>("SELECT id, name, email FROM users WHERE company_id = ? AND role = 'company'", company.id)) {
      notify(
        u.id,
        'partner',
        approved ? `${company.name} foi aprovada como parceira` : `Atualização sobre o cadastro de ${company.name}`,
        approved ? 'A vitrine de talentos já está liberada.' : body.review_note || undefined,
        approved ? '/empresa/talentos' : '/empresa',
      );
      emails.partnerReviewed(u.email, u.name, company.name, approved, body.review_note);
    }
  }
  audit(req, 'partner.review', 'company', company.id, { from: company.status, to: body.status });
  res.json({ company: findCompany(company.id) });
});
