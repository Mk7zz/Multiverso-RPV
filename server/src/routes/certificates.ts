import { Router } from 'express';
import { all, get } from '../db';
import { renderCertificatePdf, type CertificateData } from '../lib/certificate-pdf';
import { notFound } from '../lib/http';
import { requireAuth } from '../middleware/auth';

export const certificatesRouter = Router();

const normalizeCode = (code: string) => code.trim().toUpperCase();

certificatesRouter.get('/mine', requireAuth, (req, res) => {
  res.json({
    certificates: all(
      `SELECT ct.*, c.slug course_slug FROM certificates ct JOIN courses c ON c.id = ct.course_id
       WHERE ct.user_id = ? ORDER BY ct.issued_at DESC`,
      req.user!.id,
    ),
  });
});

/** Validação pública de autenticidade (não exige login). */
certificatesRouter.get('/validate/:code', (req, res) => {
  const cert = get<CertificateData>(
    'SELECT code, student_name, course_title, workload_hours, final_grade, issued_at FROM certificates WHERE code = ?',
    normalizeCode(req.params.code),
  );
  res.json(cert ? { valid: true, certificate: cert } : { valid: false });
});

/** PDF do certificado. O código funciona como identificador público (o mesmo do QR code). */
certificatesRouter.get('/:code/pdf', async (req, res) => {
  const cert = get<CertificateData>('SELECT * FROM certificates WHERE code = ?', normalizeCode(req.params.code));
  if (!cert) throw notFound('Certificado não encontrado');
  res.setHeader('Content-Type', 'application/pdf');
  const disposition = req.query.download ? 'attachment' : 'inline';
  res.setHeader('Content-Disposition', `${disposition}; filename="certificado-${cert.code}.pdf"`);
  await renderCertificatePdf(cert, res);
});
