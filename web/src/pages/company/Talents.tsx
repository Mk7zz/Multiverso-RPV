import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { ApprovedOnly } from '../../components/CompanyLayout';
import { LevelBadge } from '../../components/Game';
import { AreaPills, TalentTile } from '../../components/Partners';
import { PixelIcon } from '../../components/PixelIcon';
import { Empty, ErrorBox, Field, Loader, Modal, Pagination, StatCard } from '../../components/ui';
import { api } from '../../lib/api';
import { fmtDate, fmtDuration, timeAgo } from '../../lib/format';
import { useApi, useDebounced, useDocumentTitle } from '../../lib/hooks';
import { useNotifications } from '../../lib/notifications';
import { APPLICATION_STATUS, AREA_LABEL, GOAL_LABEL, INVITE_STATUS, type Job, type TalentCard } from '../../lib/partners';

interface Options {
  courses: { id: number; title: string }[];
  municipalities: string[];
}

const LEVEL_OPTIONS = [2, 3, 4, 5, 6, 7, 8];

export function CompanyTalents() {
  useDocumentTitle('Vitrine de talentos');
  return (
    <ApprovedOnly>
      <TalentSearch />
    </ApprovedOnly>
  );
}

function TalentSearch() {
  const [f, setF] = useState({ q: '', area: '', municipality: '', course_id: '', min_level: '', goal: '', saved: '', sort: '' });
  const [page, setPage] = useState(1);
  const q = useDebounced(f.q);
  const options = useApi<Options>('/company/options');
  const query = new URLSearchParams({ ...f, q, page: String(page) }).toString();
  const { data, error, setData } = useApi<{ talents: TalentCard[]; total: number; page: number; pageSize: number }>(`/company/talents?${query}`);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => {
    setF({ ...f, [k]: e.target.value });
    setPage(1);
  };

  async function toggleSave(t: TalentCard) {
    await (t.saved ? api.del(`/company/talents/${t.id}/save`) : api.post(`/company/talents/${t.id}/save`));
    setData((d) => (d ? { ...d, talents: d.talents.map((x) => (x.id === t.id ? { ...x, saved: !t.saved } : x)) } : d));
  }

  return (
    <>
      <div className="section-head">
        <div>
          <h1 style={{ margin: 0 }}>Vitrine de talentos</h1>
          <span className="muted small">Somente pessoas que escolheram aparecer para empresas parceiras.</span>
        </div>
        <span className="muted small">{data ? `${data.total} talentos encontrados` : ''}</span>
      </div>
      <div className="card filters mb">
        <input className="input" placeholder="Buscar por nome, objetivo, escola…" value={f.q} onChange={set('q')} />
        <select className="input" value={f.course_id} onChange={set('course_id')} aria-label="Curso concluído">
          <option value="">Qualquer curso concluído</option>
          {options.data?.courses.map((c) => (
            <option key={c.id} value={c.id}>
              Concluiu: {c.title}
            </option>
          ))}
        </select>
        <select className="input" value={f.area} onChange={set('area')} aria-label="Área de interesse">
          <option value="">Todas as áreas</option>
          {Object.entries(AREA_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select className="input" value={f.municipality} onChange={set('municipality')} aria-label="Município">
          <option value="">Todos os municípios</option>
          {options.data?.municipalities.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select className="input" value={f.min_level} onChange={set('min_level')} aria-label="Nível mínimo">
          <option value="">Qualquer nível</option>
          {LEVEL_OPTIONS.map((l) => (
            <option key={l} value={l}>
              Nível {l} ou mais
            </option>
          ))}
        </select>
        <select className="input" value={f.goal} onChange={set('goal')} aria-label="Busca">
          <option value="">Qualquer objetivo</option>
          {Object.entries(GOAL_LABEL)
            .filter(([k]) => k !== 'qualquer')
            .map(([k, v]) => (
              <option key={k} value={k}>
                Busca {v.toLowerCase()}
              </option>
            ))}
        </select>
        <select className="input" value={f.sort} onChange={set('sort')} aria-label="Ordenar">
          <option value="">Mais XP</option>
          <option value="courses">Mais cursos concluídos</option>
          <option value="active">Ativos recentemente</option>
        </select>
        <label className="row small" style={{ gap: 6 }}>
          <input type="checkbox" checked={f.saved === '1'} onChange={(e) => set('saved')({ target: { value: e.target.checked ? '1' : '' } })} /> Só salvos
        </label>
      </div>
      <Loader data={data} error={error}>
        {(d) =>
          d.talents.length ? (
            <>
              <div className="grid grid-3">
                {d.talents.map((t) => (
                  <TalentTile key={t.id} t={t} to={`/empresa/talentos/${t.id}`} onSave={() => toggleSave(t)} />
                ))}
              </div>
              <Pagination page={d.page} pageSize={d.pageSize} total={d.total} onChange={setPage} />
            </>
          ) : (
            <Empty icon="search" title="Nenhum talento com esses filtros">
              <p className="small muted">Tente remover algum filtro ou buscar por outra área.</p>
            </Empty>
          )
        }
      </Loader>
    </>
  );
}

interface TalentProfile extends TalentCard {
  bio: string | null;
  stats: { lessonsCompleted: number; quizzesPassed: number; coursesCompleted: number; coursesInProgress: number; certificates: number; studySeconds: number; currentStreak: number; bestStreak: number };
  courses: { id: number; title: string; workload_hours: number; final_grade: number | null; completed_at: string | null; certificate_code: string | null }[];
  badges: { code: string; name: string; description: string; icon: string; awarded_at: string }[];
  contact: { email: string } | null;
  invites: { id: number; status: string; created_at: string }[];
  applications: { id: number; status: string; created_at: string; job_id: number; job_title: string }[];
}

export function CompanyTalentDetail() {
  useDocumentTitle('Talento');
  return (
    <ApprovedOnly>
      <TalentDetail />
    </ApprovedOnly>
  );
}

function TalentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error, reload, setData } = useApi<{ talent: TalentProfile }>(`/company/talents/${id}`);
  const [inviting, setInviting] = useState(false);

  async function toggleSave(t: TalentProfile) {
    await (t.saved ? api.del(`/company/talents/${t.id}/save`) : api.post(`/company/talents/${t.id}/save`));
    setData({ talent: { ...t, saved: !t.saved } });
  }

  return (
    <Loader data={data} error={error}>
      {({ talent: t }) => {
        const pendingInvite = t.invites.some((i) => i.status === 'pending');
        return (
          <>
            <button className="btn ghost sm mb" onClick={() => navigate(-1)}>
              ‹ Voltar
            </button>
            <div className="card talent-hero">
              <div className="player-avatar">
                <Avatar config={t.avatar} name={t.name} size={96} />
                <LevelBadge level={t.level} />
              </div>
              <div className="grow" style={{ minWidth: 0 }}>
                <h1 style={{ margin: 0 }}>{t.name}</h1>
                <div className="player-level">
                  <PixelIcon name={t.level.icon} size={16} /> Nível {t.level.level} · <strong>{t.level.name}</strong> · {t.points} XP
                </div>
                <div className="muted">{[t.municipality, t.age ? `${t.age} anos` : null, t.school].filter(Boolean).join(' · ')}</div>
                {t.headline && <p className="talent-headline">"{t.headline}"</p>}
                <div className="row" style={{ gap: 6 }}>
                  {t.goal && <span className="pill gold">{GOAL_LABEL[t.goal]}</span>}
                  <AreaPills areas={t.areas} />
                </div>
                {t.bio && <p className="text-2 small">{t.bio}</p>}
              </div>
              <div className="stack talent-actions">
                <button className="btn" onClick={() => setInviting(true)} disabled={pendingInvite}>
                  <PixelIcon name="mail" size={16} /> {pendingInvite ? 'Convite enviado' : 'Convidar para conversar'}
                </button>
                <button className="btn secondary" onClick={() => toggleSave(t)}>
                  <PixelIcon name="star" size={16} /> {t.saved ? 'Salvo' : 'Salvar talento'}
                </button>
                <div className={`contact-box ${t.contact ? 'open' : ''}`}>
                  {t.contact ? (
                    <>
                      <span className="small muted">Contato liberado</span>
                      <a href={`mailto:${t.contact.email}`}>{t.contact.email}</a>
                    </>
                  ) : (
                    <span className="small">
                      <PixelIcon name="lock" size={14} /> O contato aparece quando o talento aceitar um convite ou se candidatar a uma vaga sua.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-4 section">
              <StatCard label="Cursos concluídos" value={t.stats.coursesCompleted} sub={`${t.stats.coursesInProgress} em andamento`} icon="gradcap" />
              <StatCard label="Certificados" value={t.stats.certificates} sub="com código de validação" icon="scroll" />
              <StatCard label="Tempo de estudo" value={fmtDuration(t.stats.studySeconds)} sub={`${t.stats.lessonsCompleted} aulas · ${t.stats.quizzesPassed} avaliações`} icon="clock" />
              <StatCard label="Constância" value={`${t.stats.bestStreak} dias`} sub={`maior sequência · atual ${t.stats.currentStreak}`} icon="flame" />
            </div>

            <div className="section split">
              <div className="card pad-0 table-wrap">
                <div className="card-title" style={{ padding: '16px 20px 0' }}>
                  <span>
                    <PixelIcon name="gradcap" size={18} /> Cursos concluídos
                  </span>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Curso</th>
                      <th className="num">Carga</th>
                      <th className="num">Nota</th>
                      <th>Certificado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.courses.map((c) => (
                      <tr key={c.id}>
                        <td>
                          {c.title}
                          <div className="muted small">{fmtDate(c.completed_at)}</div>
                        </td>
                        <td className="num">{c.workload_hours}h</td>
                        <td className="num">{c.final_grade != null ? Math.round(c.final_grade) : '—'}</td>
                        <td>
                          {c.certificate_code ? (
                            <a href={`/validar/${c.certificate_code}`} target="_blank" rel="noreferrer" className="small" title="Abrir a validação pública do certificado">
                              <PixelIcon name="check" size={12} /> {c.certificate_code}
                            </a>
                          ) : (
                            <span className="muted small">Ainda não emitido</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!t.courses.length && (
                      <tr>
                        <td colSpan={4} className="muted">
                          Ainda não concluiu cursos. Está em andamento em {t.stats.coursesInProgress}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="stack">
                <div className="card">
                  <div className="card-title">
                    <span>
                      <PixelIcon name="medal" size={18} /> Medalhas ({t.badges.length})
                    </span>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    {t.badges.map((b) => (
                      <span key={b.code} className="pill gray" title={b.description}>
                        <PixelIcon name={b.icon} size={14} /> {b.name}
                      </span>
                    ))}
                    {!t.badges.length && <span className="muted small">Nenhuma ainda.</span>}
                  </div>
                </div>
                {(t.applications.length > 0 || t.invites.length > 0) && (
                  <div className="card">
                    <div className="card-title">Histórico com a sua empresa</div>
                    {t.applications.map((a) => (
                      <div key={`a${a.id}`} className="small row between list-row">
                        <Link to={`/empresa/vagas/${a.job_id}`}>Candidatura: {a.job_title}</Link>
                        <span className={`pill ${APPLICATION_STATUS[a.status]?.pill}`}>{APPLICATION_STATUS[a.status]?.label}</span>
                      </div>
                    ))}
                    {t.invites.map((i) => (
                      <div key={`i${i.id}`} className="small row between list-row">
                        <span>Convite · {timeAgo(i.created_at)}</span>
                        <span className={`pill ${INVITE_STATUS[i.status]?.pill}`}>{INVITE_STATUS[i.status]?.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {inviting && (
              <InviteModal
                talent={t}
                onClose={() => setInviting(false)}
                onDone={() => {
                  setInviting(false);
                  reload();
                }}
              />
            )}
          </>
        );
      }}
    </Loader>
  );
}

export function InviteModal({ talent, onClose, onDone }: { talent: Pick<TalentCard, 'id' | 'name'>; onClose: () => void; onDone: () => void }) {
  const { toast } = useNotifications();
  const jobs = useApi<{ jobs: Job[] }>('/company/jobs');
  const first = talent.name.split(' ')[0];
  const [form, setForm] = useState({ job_id: '', message: `Oi, ${first}! Vimos sua trajetória no Multiverso e gostamos muito. Topa uma conversa?` });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/company/invites', { user_id: talent.id, job_id: form.job_id ? Number(form.job_id) : null, message: form.message });
      toast('Convite enviado', `${first} recebe um aviso na plataforma e por e-mail.`);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Convidar ${first}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn" onClick={send} disabled={busy}>
            Enviar convite
          </button>
        </>
      }
    >
      <div className="stack">
        <Field label="Oportunidade relacionada" hint="Opcional">
          <select className="input" value={form.job_id} onChange={(e) => setForm({ ...form, job_id: e.target.value })}>
            <option value="">Conversa geral</option>
            {jobs.data?.jobs
              .filter((j) => j.status === 'open')
              .map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Mensagem" hint="Conte por que a trajetória chamou sua atenção">
          <textarea className="input" rows={5} maxLength={1000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </Field>
        <p className="small muted" style={{ margin: 0 }}>
          <PixelIcon name="shield" size={14} /> O contato de {first} só é liberado se o convite for aceito.
        </p>
        <ErrorBox error={error} />
      </div>
    </Modal>
  );
}
