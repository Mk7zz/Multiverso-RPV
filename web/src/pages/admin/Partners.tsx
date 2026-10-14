import { useState } from 'react';
import { CompanyLogo } from '../../components/Partners';
import { ErrorBox, Field, Loader, Modal, StatCard } from '../../components/ui';
import { api } from '../../lib/api';
import { fmtDate } from '../../lib/format';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import { useNotifications } from '../../lib/notifications';
import { COMPANY_STATUS, maskCnpj, SIZE_LABEL, type Company } from '../../lib/partners';

interface AdminCompany extends Company {
  cnpj: string;
  status: string;
  owner_name: string | null;
  owner_email: string | null;
  open_jobs: number;
  applications: number;
  invites: number;
  invites_accepted: number;
  hired: number;
  is_demo: number;
  created_at: string;
}

interface Data {
  companies: AdminCompany[];
  summary: { pending: number; approved: number; openJobs: number; talents: number; applications: number; invitesAccepted: number; hired: number };
}

export function AdminPartners() {
  useDocumentTitle('Empresas parceiras');
  const [status, setStatus] = useState('');
  const { data, error, reload } = useApi<Data>(`/admin/partners?status=${status}`);
  const [review, setReview] = useState<AdminCompany | null>(null);

  return (
    <>
      <div className="section-head">
        <div>
          <h1 style={{ margin: 0 }}>Empresas parceiras</h1>
          <span className="muted small">Aprove os cadastros e acompanhe a ponte entre alunos e mercado.</span>
        </div>
        <select className="input" style={{ width: 200 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todas</option>
          {Object.entries(COMPANY_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>
      <Loader data={data} error={error}>
        {(d) => (
          <>
            <div className="grid grid-4 mb">
              <StatCard label="Aguardando aprovação" value={d.summary.pending} sub={`${d.summary.approved} aprovadas`} icon="clock" />
              <StatCard label="Talentos na vitrine" value={d.summary.talents} sub="alunos com opt-in" icon="star" />
              <StatCard label="Oportunidades abertas" value={d.summary.openJobs} sub={`${d.summary.applications} candidaturas`} icon="briefcase" />
              <StatCard label="Conexões feitas" value={d.summary.invitesAccepted + d.summary.hired} sub={`${d.summary.invitesAccepted} convites aceitos · ${d.summary.hired} aprovações`} icon="network" />
            </div>
            <div className="card pad-0 table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Empresa</th>
                    <th>Responsável</th>
                    <th className="num">Vagas</th>
                    <th className="num">Candidaturas</th>
                    <th className="num">Convites</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.companies.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <span className="row" style={{ flexWrap: 'nowrap' }}>
                          <CompanyLogo company={c} size={32} />
                          <span>
                            <strong>{c.name}</strong> {!!c.is_demo && <span className="pill gray">demo</span>}
                            <div className="muted small">
                              {maskCnpj(c.cnpj)} · {c.sector} · {c.municipality}
                            </div>
                          </span>
                        </span>
                      </td>
                      <td className="small">
                        {c.owner_name}
                        <div className="muted">{c.owner_email}</div>
                      </td>
                      <td className="num">{c.open_jobs}</td>
                      <td className="num">{c.applications}</td>
                      <td className="num">
                        {c.invites_accepted}/{c.invites}
                      </td>
                      <td>
                        <span className={`pill ${COMPANY_STATUS[c.status]?.pill}`}>{COMPANY_STATUS[c.status]?.label}</span>
                      </td>
                      <td className="nowrap">
                        <button className={`btn sm ${c.status === 'pending' ? '' : 'secondary'}`} onClick={() => setReview(c)}>
                          {c.status === 'pending' ? 'Analisar' : 'Gerenciar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!d.companies.length && (
                    <tr>
                      <td colSpan={7} className="muted">
                        Nenhuma empresa neste filtro. Divulgue a página /empresas para os parceiros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Loader>
      {review && (
        <ReviewModal
          company={review}
          onClose={() => setReview(null)}
          onDone={() => {
            setReview(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function ReviewModal({ company: c, onClose, onDone }: { company: AdminCompany; onClose: () => void; onDone: () => void }) {
  const { toast } = useNotifications();
  const [note, setNote] = useState(c.review_note ?? '');
  const [error, setError] = useState<string | null>(null);

  async function set(status: string) {
    setError(null);
    try {
      await api.patch(`/admin/partners/${c.id}`, { status, review_note: note });
      toast('Empresa atualizada', status === 'approved' ? 'O(a) responsável foi avisado(a) por e-mail.' : undefined);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal
      title={c.name}
      onClose={onClose}
      wide
      footer={
        <>
          {c.status !== 'rejected' && c.status !== 'suspended' && (
            <button className="btn danger" onClick={() => set(c.status === 'approved' ? 'suspended' : 'rejected')}>
              {c.status === 'approved' ? 'Suspender acesso' : 'Recusar'}
            </button>
          )}
          {c.status !== 'approved' && (
            <button className="btn accent" onClick={() => set('approved')}>
              Aprovar parceira
            </button>
          )}
        </>
      }
    >
      <div className="stack">
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <CompanyLogo company={c} size={56} />
          <div>
            <strong>{c.legal_name || c.name}</strong>
            <div className="muted small">
              CNPJ {maskCnpj(c.cnpj)} · cadastro em {fmtDate(c.created_at)}
            </div>
          </div>
        </div>
        <div className="form-grid small">
          <Info label="Setor" value={c.sector} />
          <Info label="Porte" value={c.size ? SIZE_LABEL[c.size] : null} />
          <Info label="Município" value={c.municipality} />
          <Info label="Site" value={c.website} />
          <Info label="Responsável" value={c.owner_name} />
          <Info label="E-mail" value={c.owner_email} />
          <Info label="Telefone" value={c.contact_phone} />
        </div>
        {c.description && <p className="text-2 small" style={{ margin: 0 }}>{c.description}</p>}
        <p className="small muted" style={{ margin: 0 }}>
          Antes de aprovar, confira o CNPJ na consulta pública da Receita Federal e se o e-mail pertence à empresa.
        </p>
        <Field label="Observação para a empresa" hint="Opcional. Vai no e-mail em caso de recusa ou suspensão.">
          <textarea className="input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <ErrorBox error={error} />
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="muted">{label}</div>
      <strong>{value || '—'}</strong>
    </div>
  );
}
