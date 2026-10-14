import { useState } from 'react';
import { Loader, Modal, Pagination } from '../../components/ui';
import { fmtDateTime } from '../../lib/format';
import { useApi, useDocumentTitle } from '../../lib/hooks';

interface Email {
  id: number;
  to_email: string;
  subject: string;
  body_html: string;
  status: 'pending' | 'sent' | 'logged' | 'failed';
  error: string | null;
  created_at: string;
}

const STATUS = {
  sent: <span className="pill success">Enviado</span>,
  logged: <span className="pill gray">Registrado (sem SMTP)</span>,
  pending: <span className="pill warning">Na fila</span>,
  failed: <span className="pill danger">Falhou</span>,
};

/** Caixa de saída dos e-mails automáticos (útil para conferir envios e operar sem SMTP em desenvolvimento). */
export function AdminEmails() {
  useDocumentTitle('E-mails');
  const [page, setPage] = useState(1);
  const { data, error } = useApi<{ emails: Email[]; total: number; page: number; pageSize: number }>(`/admin/emails?page=${page}`);
  const [view, setView] = useState<Email | null>(null);
  return (
    <>
      <h1>E-mails automáticos</h1>
      <p className="text-2 small">Boas-vindas, redefinição de senha, conclusão de curso, certificado, convites e avisos de mensagens. Configure o SMTP no arquivo <code>server/.env</code> para envio real.</p>
      <Loader data={data} error={error}>
        {(d) => (
          <>
            <div className="card pad-0 table-wrap">
              <table className="table">
                <thead><tr><th>Data</th><th>Para</th><th>Assunto</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {d.emails.map((e) => (
                    <tr key={e.id}>
                      <td className="small nowrap">{fmtDateTime(e.created_at)}</td>
                      <td className="small">{e.to_email}</td>
                      <td>{e.subject}</td>
                      <td title={e.error ?? ''}>{STATUS[e.status]}</td>
                      <td><button className="btn ghost sm" onClick={() => setView(e)}>Ver</button></td>
                    </tr>
                  ))}
                  {!d.emails.length && <tr><td colSpan={5} className="muted center">Nenhum e-mail.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination page={d.page} pageSize={d.pageSize} total={d.total} onChange={setPage} />
          </>
        )}
      </Loader>
      {view && (
        <Modal title={view.subject} onClose={() => setView(null)} wide>
          <p className="small muted">Para: {view.to_email}</p>
          <iframe title="Prévia do e-mail" srcDoc={view.body_html} sandbox="" style={{ width: '100%', height: 480, border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }} />
        </Modal>
      )}
    </>
  );
}
