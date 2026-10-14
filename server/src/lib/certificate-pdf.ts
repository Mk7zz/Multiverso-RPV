import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { Writable } from 'node:stream';
import { config } from '../config';
import { formatDateBR } from './dates';
import { getSettings } from './settings';

export interface CertificateData {
  code: string;
  student_name: string;
  course_title: string;
  workload_hours: number;
  final_grade: number | null;
  issued_at: string;
}

const GREEN = '#1d5c3f';
const GOLD = '#c9a227';

/** Template fixo de certificado (A4 paisagem). Versionamento de templates é pós-MVP. */
export async function renderCertificatePdf(cert: CertificateData, out: Writable) {
  const settings = getSettings();
  const validationUrl = `${config.appUrl}/validar/${cert.code}`;
  const qr = await QRCode.toBuffer(validationUrl, { margin: 0, width: 220, color: { dark: GREEN } });

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, info: { Title: `Certificado ${cert.code}` } });
  doc.pipe(out);
  const W = doc.page.width;
  const H = doc.page.height;

  doc.rect(0, 0, W, H).fill('#fbfaf6');
  doc.rect(24, 24, W - 48, H - 48).lineWidth(3).stroke(GREEN);
  doc.rect(34, 34, W - 68, H - 68).lineWidth(1).stroke(GOLD);
  doc.rect(0, 0, 18, H).fill(GREEN);
  doc.rect(W - 18, 0, 18, H).fill(GREEN);

  doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(13).text(settings.platform_name.toUpperCase(), 0, 72, { align: 'center', characterSpacing: 2 });
  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(44).text('CERTIFICADO', 0, 104, { align: 'center', characterSpacing: 4 });
  doc.fillColor(GOLD).fontSize(12).font('Helvetica').text('DE CONCLUSÃO', 0, 156, { align: 'center', characterSpacing: 6 });

  doc.fillColor('#374151').fontSize(15).text('Certificamos que', 0, 205, { align: 'center' });
  doc.fillColor(GREEN).font('Helvetica-Bold').fontSize(30).text(cert.student_name, 60, 232, { align: 'center', width: W - 120 });

  const grade = cert.final_grade != null ? `, com nota final ${cert.final_grade.toLocaleString('pt-BR')}` : '';
  const hours = cert.workload_hours.toLocaleString('pt-BR');
  doc
    .fillColor('#374151')
    .font('Helvetica')
    .fontSize(15)
    .text(`concluiu o curso "${cert.course_title}", com carga horária de ${hours} horas${grade}, em ${formatDateBR(cert.issued_at)}.`, 110, 284, {
      align: 'center',
      width: W - 220,
      lineGap: 4,
    });

  const signY = H - 150;
  doc.moveTo(W / 2 - 150, signY).lineTo(W / 2 + 150, signY).lineWidth(1).stroke('#9ca3af');
  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(13).text(settings.certificate_signer_name, W / 2 - 200, signY + 8, { width: 400, align: 'center' });
  doc.fillColor('#6b7280').font('Helvetica').fontSize(11).text(settings.certificate_signer_role, W / 2 - 200, signY + 26, { width: 400, align: 'center' });

  doc.image(qr, W - 150, H - 160, { width: 90 });
  doc.fillColor('#6b7280').fontSize(9).text('Valide em:', 60, H - 96).text(validationUrl, 60, H - 84);
  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(11).text(`Código: ${cert.code}`, 60, H - 70);

  doc.end();
}
