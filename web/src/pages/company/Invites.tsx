import { useState } from 'react';
import { Link } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { ApprovedOnly, useCompany } from '../../components/CompanyLayout';
import { PixelIcon } from '../../components/PixelIcon';
import { Empty, ErrorBox, Field, Loader } from '../../components/ui';
import { api } from '../../lib/api';
import { MUNICIPALITIES, timeAgo } from '../../lib/format';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import { useNotifications } from '../../lib/notifications';
import { INVITE_STATUS, maskCnpj, SIZE_LABEL } from '../../lib/partners';
import type { AvatarConfig, LevelInfo } from '../../lib/types';

interface Invite {
  id: number;
  status: string;
  message: string;
  created_at: string;
  responded_at: string | null;
  job_id: number | null;
  job_title: string | null;
  user_id: number;
  name: string;
  avatar: AvatarConfig | null;
  level: LevelInfo;
  municipality: string | null;
  email: string | null;
}

export function CompanyInvites() {
  useDocumentTitle('Convites');
  return (
    <ApprovedOnly>
      <InviteList />
    </ApprovedOnly>
  );
}

function InviteList() {
  const { data, error } = useApi<{ invites: Invite[] }>('/company/invites');
  return (
    <>
      <div className="section-head">
        <div>
          <h1 style={{ margin: 0 }}>Convites</h1>
          <span className="muted small">Quando o talento aceita, o e-mail aparece aqui e no perfil dele.</span>
        </div>
        <Link to="/empresa/talentos" className="btn">
          <PixelIcon name="search" size={16} /> Encontrar talentos
        </Link>
      </div>
      <Loader data={data} error={error}>
        {(d) =>
          d.invites.length ? (
            <div className="card pad-0 table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Talento</th>
                    <th>Oportunidade</th>
                    <th>Enviado</th>
                    <th>Situação</th>
                    <th>Contato</th>
                  </tr>
                </thead>
                <tbody>
                  {d.invites.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <span className="row" style={{ flexWrap: 'nowrap' }}>
                          <Avatar config={i.avatar} name={i.name} size={32} />
                          <span>
                            <Link to={`/empresa/talentos/${i.user_id}`} style={{ fontWeight: 600 }}>
                              {i.name}
                            </Link>
                            <div className="muted small">
                              Nível {i.level.level} · {i.municipality}
                            </div>
                          </span>
                        </span>
                      </td>
                      <td className="small">{i.job_title ?? <span className="muted">Conversa geral</span>}</td>
                      <td className="small">{timeAgo(i.created_at)}</td>
                      <td>
                        <span className={`pill ${INVITE_STATUS[i.status]?.pill}`}>{INVITE_STATUS[i.status]?.label}</span>
                      </td>
                      <td className="small">
                        {i.email ? (
                          <a href={`mailto:${i.email}`}>{i.email}</a>
                        ) : (
                          <span className="muted">
                            <PixelIcon name="lock" size={12} /> protegido
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon="mail" title="Nenhum convite enviado">
              <p className="small muted">Encontre um talento na vitrine e clique em "Convidar para conversar".</p>
            </Empty>
          )
        }
      </Loader>
    </>
  );
}

const COLORS = ['#23384a', '#1f7a4d', '#12a3a0', '#e8772e', '#d64545', '#8a5a2b', '#0b6f6c', '#7c3aed'];

export function CompanyProfile() {
  useDocumentTitle('Dados da empresa');
  const { me, reload } = useCompany();
  const { toast } = useNotifications();
  const c = me.company;
  const [f, setF] = useState({
    name: c.name,
    legal_name: c.legal_name ?? '',
    sector: c.sector,
    size: c.size ?? '',
    municipality: c.municipality,
    website: c.website ?? '',
    contact_phone: c.contact_phone ?? '',
    description: c.description ?? '',
    color: c.color,
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function save() {
    setError(null);
    try {
      await api.put('/company/me', { ...f, size: f.size || null });
      toast('Dados da empresa atualizados');
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <h1>Dados da empresa</h1>
      <div className="card stack" style={{ maxWidth: 820 }}>
        <div className="form-grid">
          <Field label="Nome da empresa">
            <input className="input" value={f.name} onChange={set('name')} />
          </Field>
          <Field label="CNPJ" hint="Para alterar, fale com a equipe">
            <input className="input" value={maskCnpj(c.cnpj)} disabled />
          </Field>
          <Field label="Razão social">
            <input className="input" value={f.legal_name} onChange={set('legal_name')} />
          </Field>
          <Field label="Setor">
            <input className="input" value={f.sector} onChange={set('sector')} />
          </Field>
          <Field label="Porte">
            <select className="input" value={f.size} onChange={set('size')}>
              <option value="">Não informado</option>
              {Object.entries(SIZE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Município">
            <input className="input" list="mun-profile" value={f.municipality} onChange={set('municipality')} />
            <datalist id="mun-profile">{MUNICIPALITIES.map((m) => <option key={m} value={m} />)}</datalist>
          </Field>
          <Field label="Site">
            <input className="input" value={f.website} onChange={set('website')} placeholder="https://" />
          </Field>
          <Field label="Telefone de contato" hint="Visível só para quem aceitar um convite">
            <input className="input" value={f.contact_phone} onChange={set('contact_phone')} />
          </Field>
          <Field label="Sobre a empresa" className="full" hint="Aparece para os alunos nas oportunidades">
            <textarea className="input" maxLength={1000} value={f.description} onChange={set('description')} />
          </Field>
          <div className="field full">
            <span>Cor da marca na plataforma</span>
            <div className="swatches">
              {COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  className={`swatch ${f.color === col ? 'on' : ''}`}
                  style={{ background: col }}
                  aria-label={`Cor ${col}`}
                  aria-pressed={f.color === col}
                  onClick={() => setF({ ...f, color: col })}
                />
              ))}
            </div>
          </div>
        </div>
        <ErrorBox error={error} />
        <div className="row end">
          <button className="btn" onClick={save}>
            Salvar
          </button>
        </div>
      </div>
    </>
  );
}
