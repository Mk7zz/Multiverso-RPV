import nodemailer from 'nodemailer';
import { config } from '../config';
import { now, run } from '../db';
import { getSettings } from './settings';

const transporter = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function layout(title: string, paragraphs: string[], action?: { label: string; url: string }) {
  const { platform_name } = getSettings();
  const button = action
    ? `<p style="margin:28px 0"><a href="${action.url}" style="background:#1d5c3f;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(action.label)}</a></p>
       <p style="font-size:12px;color:#6b7280">Se o botão não funcionar, copie este endereço: ${action.url}</p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f3f5f2;font-family:Segoe UI,Arial,sans-serif;color:#1f2937">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#1d5c3f;color:#fff;padding:18px 24px;font-weight:700">${escapeHtml(platform_name)}</div>
    <div style="padding:24px">
      <h2 style="margin:0 0 16px;font-size:20px">${escapeHtml(title)}</h2>
      ${paragraphs.map((p) => `<p style="line-height:1.55">${p}</p>`).join('')}
      ${button}
    </div>
  </div></body></html>`;
}

/**
 * Registra o e-mail na caixa de saída e envia via SMTP (se configurado).
 * Sem SMTP, o e-mail fica com status "logged" e é exibido no console e no painel admin.
 */
export function sendMail(to: string, subject: string, html: string) {
  const { id } = run('INSERT INTO email_outbox (to_email, subject, body_html) VALUES (?, ?, ?)', to, subject, html);
  if (!transporter) {
    run("UPDATE email_outbox SET status = 'logged', sent_at = ? WHERE id = ?", now(), id);
    if (!config.isProd) console.log(`[mail] (sem SMTP) para ${to}: ${subject}`);
    return;
  }
  transporter
    .sendMail({ from: config.mailFrom, to, subject, html })
    .then(() => run("UPDATE email_outbox SET status = 'sent', sent_at = ? WHERE id = ?", now(), id))
    .catch((err: Error) => {
      console.error('[mail] falha no envio:', err.message);
      run("UPDATE email_outbox SET status = 'failed', error = ? WHERE id = ?", err.message, id);
    });
}

const link = (path: string) => `${config.appUrl}${path}`;

export const emails = {
  welcome(to: string, name: string) {
    sendMail(
      to,
      'Bem-vindo(a) ao Multiverso Rio Pomba Valley!',
      layout(`Olá, ${escapeHtml(name)}!`, [
        'Sua conta foi criada com sucesso. Agora você já pode se inscrever nos cursos gratuitos, acumular pontos, conquistar medalhas e emitir certificados.',
      ], { label: 'Explorar cursos', url: link('/cursos') }),
    );
  },
  invited(to: string, name: string, resetToken: string) {
    sendMail(
      to,
      'Seu acesso ao Multiverso Rio Pomba Valley',
      layout(`Olá, ${escapeHtml(name)}!`, [
        'Uma conta foi criada para você na plataforma Multiverso Rio Pomba Valley.',
        'Clique no botão abaixo para definir sua senha. O link é válido por 7 dias.',
      ], { label: 'Definir minha senha', url: link(`/redefinir-senha?token=${resetToken}`) }),
    );
  },
  passwordReset(to: string, name: string, resetToken: string) {
    sendMail(
      to,
      'Redefinição de senha',
      layout(`Olá, ${escapeHtml(name)}`, [
        'Recebemos um pedido para redefinir a sua senha. O link abaixo é válido por 1 hora.',
        'Se você não fez esse pedido, ignore este e-mail. Sua senha continua a mesma.',
      ], { label: 'Redefinir senha', url: link(`/redefinir-senha?token=${resetToken}`) }),
    );
  },
  emailChanged(to: string, name: string, newEmail: string) {
    sendMail(
      to,
      'Seu e-mail de acesso foi alterado',
      layout(`Olá, ${escapeHtml(name)}`, [
        `O e-mail de acesso da sua conta foi alterado para <b>${escapeHtml(newEmail)}</b>.`,
        'Se você não reconhece essa alteração, entre em contato com a equipe do Multiverso.',
      ]),
    );
  },
  courseCompleted(to: string, name: string, courseTitle: string, courseSlug: string) {
    sendMail(
      to,
      `Parabéns! Você concluiu "${courseTitle}"`,
      layout(`Parabéns, ${escapeHtml(name)}!`, [
        `Você concluiu o curso <b>${escapeHtml(courseTitle)}</b>.`,
        'Acesse o curso para responder ao formulário de feedback e emitir seu certificado.',
      ], { label: 'Ir para o curso', url: link(`/aprender/${courseSlug}`) }),
    );
  },
  certificateIssued(to: string, name: string, courseTitle: string, code: string) {
    sendMail(
      to,
      `Seu certificado de "${courseTitle}" está disponível`,
      layout(`Certificado emitido!`, [
        `${escapeHtml(name)}, seu certificado do curso <b>${escapeHtml(courseTitle)}</b> foi emitido.`,
        `Código de validação: <b>${code}</b>. Qualquer pessoa pode verificar a autenticidade na página pública de validação.`,
      ], { label: 'Ver meus certificados', url: link('/certificados') }),
    );
  },
  partnerReceived(to: string, name: string, company: string) {
    sendMail(
      to,
      'Recebemos o cadastro da sua empresa',
      layout(`Olá, ${escapeHtml(name)}!`, [
        `O cadastro da <b>${escapeHtml(company)}</b> como empresa parceira foi recebido e está em análise pela equipe do Multiverso.`,
        'Assim que for aprovado, você poderá publicar oportunidades e buscar talentos na vitrine.',
      ], { label: 'Acompanhar cadastro', url: link('/empresa') }),
    );
  },
  partnerReviewed(to: string, name: string, company: string, approved: boolean, note?: string | null) {
    sendMail(
      to,
      approved ? 'Sua empresa foi aprovada no Multiverso' : 'Atualização sobre o cadastro da sua empresa',
      layout(`Olá, ${escapeHtml(name)}`, [
        approved
          ? `A <b>${escapeHtml(company)}</b> agora é parceira do Multiverso. A vitrine de talentos e a publicação de oportunidades já estão liberadas.`
          : `O acesso da <b>${escapeHtml(company)}</b> à vitrine de talentos não está ativo no momento.`,
        ...(note ? [`Observação da equipe: ${escapeHtml(note)}`] : []),
      ], { label: approved ? 'Encontrar talentos' : 'Acessar a área da empresa', url: link(approved ? '/empresa/talentos' : '/empresa') }),
    );
  },
  talentInvite(to: string, name: string, company: string) {
    sendMail(
      to,
      `${company} quer conversar com você`,
      layout(`Olá, ${escapeHtml(name)}!`, [
        `A empresa parceira <b>${escapeHtml(company)}</b> viu sua trajetória no Multiverso e enviou um convite.`,
        'Seu contato só é compartilhado se você aceitar.',
      ], { label: 'Ver convite', url: link('/oportunidades?aba=convites') }),
    );
  },
  inviteAnswered(to: string, name: string, talent: string, accepted: boolean) {
    sendMail(
      to,
      accepted ? `${talent} aceitou seu convite` : `${talent} respondeu ao seu convite`,
      layout(`Olá, ${escapeHtml(name)}`, [
        accepted
          ? `<b>${escapeHtml(talent)}</b> aceitou o convite. O contato já está liberado no perfil do talento.`
          : `<b>${escapeHtml(talent)}</b> preferiu não seguir com o convite agora.`,
      ], { label: 'Ver convites', url: link('/empresa/convites') }),
    );
  },
  newApplication(to: string, name: string, talent: string, job: string, jobId: number) {
    sendMail(
      to,
      `Nova candidatura: ${job}`,
      layout(`Olá, ${escapeHtml(name)}`, [`<b>${escapeHtml(talent)}</b> se candidatou à oportunidade <b>${escapeHtml(job)}</b>.`], {
        label: 'Ver candidatos',
        url: link(`/empresa/vagas/${jobId}`),
      }),
    );
  },
  internalMessage(to: string, name: string, subject: string) {
    sendMail(
      to,
      `Nova mensagem: ${subject}`,
      layout(`Olá, ${escapeHtml(name)}`, [`Você recebeu uma nova mensagem da equipe do Multiverso: <b>${escapeHtml(subject)}</b>.`], {
        label: 'Ler mensagem',
        url: link('/mensagens'),
      }),
    );
  },
};
