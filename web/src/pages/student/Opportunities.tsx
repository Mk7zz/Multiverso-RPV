import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { BRAND } from '../../brand';
import { CompanyLogo, JobTile, MatchMeter } from '../../components/Partners';
import { PixelIcon } from '../../components/PixelIcon';
import { Empty, ErrorBox, Field, Loader, Modal, Tabs } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDate, timeAgo } from '../../lib/format';
import { useApi, useDebounced, useDocumentTitle } from '../../lib/hooks';
import { useNotifications } from '../../lib/notifications';
import { APPLICATION_STATUS, AREA_LABEL, GOAL_LABEL, INVITE_STATUS, JOB_TYPE_LABEL, MODALITY_LABEL, type Company, type StudentJob } from '../../lib/partners';
import type { User } from '../../lib/types';

type Tab = 'vagas' | 'candidaturas' | 'convites' | 'vitrine';

interface CareerMe {
  user: User;
  applications: { id: number; status: string; created_at: string; job_id: number; job_title: string; type: string; company: Company }[];
  invites: {
    id: number;
    status: string;
    message: string;
    created_at: string;
    job_id: number | null;
    job_title: string | null;
    company: Company;
    contact: { name: string | null; job_title: string | null; email: string | null; phone: string | null } | null;
  }[];
  pendingInvites: number;
}

export function Opportunities() {
  useDocumentTitle('Feira de Talentos');
  const [params, setParams] = useSearchParams();
  const tab = (params.get('aba') as Tab) || 'vagas';
  const career = useApi<CareerMe>('/opportunities/me');
  const setTab = (t: Tab) => setParams(t === 'vagas' ? {} : { aba: t }, { replace: true });
  const visible = career.data?.user.talent.visible;

  return (
    <div className="container page">
      <div className="page-hero">
        <div className="page-hero-icon">
          <PixelIcon name="briefcase" size={40} />
        </div>
        <div>
          <h1>Feira de Talentos</h1>
          <p className="text-2" style={{ margin: 0 }}>
            Oportunidades das empresas parceiras do {BRAND.world.name}. O que você aprende aqui conta pontos com elas.
          </p>
        </div>
      </div>
      {career.data && !visible && tab !== 'vitrine' && (
        <div className="alert info row between mb">
          <span>
            <PixelIcon name="star" size={16} /> Ligue sua vitrine e deixe as empresas parceiras encontrarem você.
          </span>
          <button className="btn sm" onClick={() => setTab('vitrine')}>
            Ativar vitrine
          </button>
        </div>
      )}
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'vagas', label: <><PixelIcon name="briefcase" size={16} /> Oportunidades</> },
          { value: 'candidaturas', label: <><PixelIcon name="list" size={16} /> Minhas candidaturas</> },
          {
            value: 'convites',
            label: (
              <>
                <PixelIcon name="mail" size={16} /> Convites {!!career.data?.pendingInvites && <span className="nav-count">{career.data.pendingInvites}</span>}
              </>
            ),
          },
          { value: 'vitrine', label: <><PixelIcon name="star" size={16} /> Minha vitrine {visible ? <span className="pill success">ligada</span> : null}</> },
        ]}
      />
      {tab === 'vagas' && <JobBoard />}
      {tab !== 'vagas' && (
        <Loader data={career.data} error={career.error}>
          {(d) => (
            <>
              {tab === 'candidaturas' && <MyApplications items={d.applications} onChange={career.reload} />}
              {tab === 'convites' && <MyInvites me={d} onChange={career.reload} />}
              {tab === 'vitrine' && <TalentSettings user={d.user} onSaved={career.reload} />}
            </>
          )}
        </Loader>
      )}
    </div>
  );
}

function JobBoard() {
  const [f, setF] = useState({ q: '', area: '', type: '', modality: '' });
  const q = useDebounced(f.q);
  const { data, error } = useApi<{ jobs: StudentJob[] }>(`/opportunities/jobs?${new URLSearchParams({ ...f, q })}`);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <>
      <div className="card filters mb">
        <input className="input" placeholder="Buscar vaga ou empresa…" value={f.q} onChange={set('q')} />
        <select className="input" value={f.type} onChange={set('type')} aria-label="Tipo">
          <option value="">Todos os tipos</option>
          {Object.entries(JOB_TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select className="input" value={f.area} onChange={set('area')} aria-label="Área">
          <option value="">Todas as áreas</option>
          {Object.entries(AREA_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select className="input" value={f.modality} onChange={set('modality')} aria-label="Modalidade">
          <option value="">Qualquer modalidade</option>
          {Object.entries(MODALITY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <Loader data={data} error={error}>
        {(d) =>
          d.jobs.length ? (
            <>
              <p className="small muted">Ordenadas pela sua compatibilidade: quanto mais cursos recomendados você conclui, mais alto ela fica.</p>
              <div className="grid grid-3">
                {d.jobs.map((j) => (
                  <JobTile key={j.id} job={j} />
                ))}
              </div>
            </>
          ) : (
            <Empty icon="briefcase" title="Nenhuma oportunidade aberta com esses filtros">
              <p className="small muted">Novas vagas aparecem aqui e você recebe um aviso quando uma empresa te convidar.</p>
            </Empty>
          )
        }
      </Loader>
    </>
  );
}

function MyApplications({ items, onChange }: { items: CareerMe['applications']; onChange: () => void }) {
  const { toast } = useNotifications();
  if (!items.length)
    return (
      <Empty icon="list" title="Você ainda não se candidatou">
        <p className="small muted">Veja as oportunidades abertas e candidate-se com um clique.</p>
      </Empty>
    );
  return (
    <div className="stack">
      {items.map((a) => (
        <div key={a.id} className="card row between">
          <span className="row" style={{ flexWrap: 'nowrap', minWidth: 0 }}>
            <CompanyLogo company={a.company} size={40} />
            <span style={{ minWidth: 0 }}>
              <Link to={`/oportunidades/${a.job_id}`} style={{ fontWeight: 600 }}>
                {a.job_title}
              </Link>
              <div className="muted small">
                {a.company.name} · {JOB_TYPE_LABEL[a.type]} · enviada {timeAgo(a.created_at)}
              </div>
            </span>
          </span>
          <span className="row">
            <span className={`pill ${APPLICATION_STATUS[a.status]?.pill}`}>{APPLICATION_STATUS[a.status]?.label}</span>
            {['sent', 'viewed'].includes(a.status) && (
              <button
                className="btn ghost sm"
                onClick={async () => {
                  if (!confirm('Desistir desta candidatura?')) return;
                  await api.del(`/opportunities/applications/${a.id}`);
                  toast('Candidatura retirada');
                  onChange();
                }}
              >
                Desistir
              </button>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function MyInvites({ me, onChange }: { me: CareerMe; onChange: () => void }) {
  const { toast } = useNotifications();
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsConsent = me.user.talent.needs_consent && !me.user.talent.guardian_ok;

  async function answer(id: number, accept: boolean) {
    setError(null);
    try {
      await api.post(`/opportunities/invites/${id}/${accept ? 'accept' : 'decline'}`, { guardian_ok: consent });
      toast(accept ? 'Convite aceito' : 'Convite recusado', accept ? 'O contato da empresa está liberado logo abaixo.' : undefined);
      onChange();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!me.invites.length)
    return (
      <Empty icon="mail" title="Nenhum convite ainda">
        <p className="small muted">{me.user.talent.visible ? 'Continue estudando: sua trajetória está visível para as empresas parceiras.' : 'Ative sua vitrine para que as empresas parceiras possam te encontrar.'}</p>
      </Empty>
    );
  return (
    <div className="stack">
      <ErrorBox error={error} />
      {me.invites.map((i) => (
        <div key={i.id} className={`card invite-card ${i.status}`}>
          <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
            <CompanyLogo company={i.company} />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="row between">
                <strong>{i.company.name}</strong>
                <span className={`pill ${INVITE_STATUS[i.status]?.pill}`}>{INVITE_STATUS[i.status]?.label}</span>
              </div>
              <div className="muted small">
                {i.company.sector} · {i.company.municipality} · {timeAgo(i.created_at)}
                {i.job_id && (
                  <>
                    {' '}
                    · sobre <Link to={`/oportunidades/${i.job_id}`}>{i.job_title}</Link>
                  </>
                )}
              </div>
              <p className="invite-message">"{i.message}"</p>
              {i.status === 'pending' && (
                <div className="stack" style={{ gap: 8 }}>
                  {needsConsent && (
                    <label className="terms-box small">
                      <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                      <span>Tenho 18 anos ou mais, ou meu responsável autorizou compartilhar meu contato com empresas parceiras.</span>
                    </label>
                  )}
                  <div className="row">
                    <button className="btn" onClick={() => answer(i.id, true)} disabled={needsConsent && !consent}>
                      Aceitar e compartilhar meu contato
                    </button>
                    <button className="btn ghost" onClick={() => answer(i.id, false)}>
                      Agora não
                    </button>
                  </div>
                </div>
              )}
              {i.contact && (
                <div className="contact-box open">
                  <span className="small muted">Contato da empresa</span>
                  <span>
                    {i.contact.name}
                    {i.contact.job_title ? ` · ${i.contact.job_title}` : ''}
                  </span>
                  {i.contact.email && <a href={`mailto:${i.contact.email}`}>{i.contact.email}</a>}
                  {i.contact.phone && <span>{i.contact.phone}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TalentSettings({ user, onSaved }: { user: User; onSaved: () => void }) {
  const { setUser } = useAuth();
  const { toast } = useNotifications();
  const t = user.talent;
  const [f, setF] = useState({ visible: t.visible, headline: t.headline ?? '', areas: t.areas, goal: t.goal ?? 'qualquer', guardian_ok: t.guardian_ok });
  const [error, setError] = useState<string | null>(null);
  const needsConsent = t.needs_consent && !t.guardian_ok;
  const toggleArea = (a: string) =>
    setF({ ...f, areas: f.areas.includes(a) ? f.areas.filter((x) => x !== a) : f.areas.length >= 5 ? f.areas : [...f.areas, a] });

  async function save(visible = f.visible) {
    setError(null);
    try {
      const r = await api.put<{ user: User }>('/opportunities/talent', { ...f, visible });
      setUser(r.user);
      setF({ ...f, visible });
      toast(visible ? 'Vitrine ligada' : 'Vitrine salva', visible ? 'As empresas parceiras já podem encontrar você.' : undefined);
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="split">
      <div className="card stack">
        <div className="row between">
          <div>
            <h3 style={{ margin: 0 }}>Aparecer para empresas parceiras</h3>
            <span className="small muted">{f.visible ? 'Sua vitrine está ligada.' : 'Sua vitrine está desligada. Ninguém de fora te encontra.'}</span>
          </div>
          <button className={`btn ${f.visible ? 'secondary' : 'accent'}`} onClick={() => save(!f.visible)} disabled={!f.visible && needsConsent && !f.guardian_ok}>
            {f.visible ? 'Desligar vitrine' : 'Ligar vitrine'}
          </button>
        </div>
        <Field label="Seu objetivo em uma frase" hint="Ex.: Quero meu primeiro estágio em tecnologia">
          <input className="input" maxLength={120} value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} />
        </Field>
        <Field label="O que você procura">
          <select className="input" value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })}>
            {Object.entries(GOAL_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <div className="field">
          <span>Áreas de interesse (até 5)</span>
          <div className="chips">
            {Object.entries(AREA_LABEL).map(([k, v]) => (
              <button key={k} type="button" className={`chip ${f.areas.includes(k) ? 'on' : ''}`} onClick={() => toggleArea(k)}>
                {v}
              </button>
            ))}
          </div>
        </div>
        {needsConsent && (
          <label className="terms-box small">
            <input type="checkbox" checked={f.guardian_ok} onChange={(e) => setF({ ...f, guardian_ok: e.target.checked })} />
            <span>Tenho 18 anos ou mais, ou meu responsável autorizou que meu perfil apareça para empresas parceiras.</span>
          </label>
        )}
        <ErrorBox error={error} />
        <div className="row end">
          <button className="btn" onClick={() => save()}>
            Salvar
          </button>
        </div>
      </div>
      <div className="card stack">
        <div className="card-title" style={{ margin: 0 }}>
          <span>
            <PixelIcon name="shield" size={18} /> Como funciona sua privacidade
          </span>
        </div>
        <Rule icon="check" text="As empresas veem seu nome, nível, município, cursos concluídos, notas, certificados e medalhas." />
        <Rule icon="lock" text="Seu e-mail fica protegido. Ele só é compartilhado se você aceitar um convite ou se candidatar a uma vaga." />
        <Rule icon="building" text="Só empresas aprovadas pela equipe do Multiverso acessam a vitrine." />
        <Rule icon="door" text="Você pode desligar a vitrine quando quiser." />
      </div>
    </div>
  );
}

function Rule({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
      <PixelIcon name={icon} size={18} />
      <span className="small text-2">{text}</span>
    </div>
  );
}

export function OpportunityDetail() {
  useDocumentTitle('Oportunidade');
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, error, reload } = useApi<{ job: StudentJob; open: boolean; courses: { id: number; title: string; slug: string; done: boolean }[] }>(`/opportunities/jobs/${id}`);
  const [applying, setApplying] = useState(false);

  return (
    <div className="container page">
      <button className="btn ghost sm mb" onClick={() => navigate(-1)}>
        ‹ Voltar
      </button>
      <Loader data={data} error={error}>
        {({ job, open, courses }) => (
          <div className="split">
            <div className="card stack">
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <CompanyLogo company={job.company} size={56} />
                <div>
                  <h1 style={{ margin: 0 }}>{job.title}</h1>
                  <span className="muted">
                    {job.company.name} · {job.municipality ?? job.company.municipality}
                  </span>
                </div>
              </div>
              <div className="row" style={{ gap: 4 }}>
                <span className="pill gold">{JOB_TYPE_LABEL[job.type]}</span>
                <span className="pill gray">{MODALITY_LABEL[job.modality]}</span>
                <span className="pill">{AREA_LABEL[job.area]}</span>
                {job.closes_at && <span className="pill warning">Inscrições até {fmtDate(`${job.closes_at}T12:00:00`)}</span>}
              </div>
              <Section title="Sobre a oportunidade" text={job.description} />
              {job.requirements && <Section title="Requisitos" text={job.requirements} />}
              {job.benefits && <Section title="Benefícios" text={job.benefits} />}
              {job.company.description && <Section title={`Sobre a ${job.company.name}`} text={job.company.description} />}
              {job.company.website && (
                <a href={job.company.website} target="_blank" rel="noreferrer" className="small">
                  {job.company.website.replace(/^https?:\/\//, '')} ↗
                </a>
              )}
            </div>
            <div className="stack">
              <div className="card stack">
                <div className="card-title" style={{ margin: 0 }}>
                  <span>
                    <PixelIcon name="target" size={18} /> Sua compatibilidade
                  </span>
                </div>
                <MatchMeter match={job.match} />
                {courses.map((c) => (
                  <div key={c.id} className="row between small" style={{ flexWrap: 'nowrap' }}>
                    <span className="row" style={{ flexWrap: 'nowrap', gap: 6 }}>
                      <PixelIcon name={c.done ? 'check' : 'books'} size={16} />
                      {c.done ? c.title : <Link to={`/cursos/${c.slug}`}>{c.title}</Link>}
                    </span>
                    {c.done ? <span className="pill success">concluído</span> : <span className="pill gray">recomendado</span>}
                  </div>
                ))}
                {job.min_level > 0 && (
                  <div className="small row" style={{ gap: 6 }}>
                    <PixelIcon name={job.match.levelOk ? 'check' : 'mountain'} size={16} /> Nível sugerido: {job.min_level}{' '}
                    {user && <span className="muted">(você está no {user.level.level})</span>}
                  </div>
                )}
              </div>
              <div className="card stack">
                {job.application ? (
                  <>
                    <span className={`pill ${APPLICATION_STATUS[job.application.status]?.pill}`} style={{ alignSelf: 'flex-start' }}>
                      {APPLICATION_STATUS[job.application.status]?.label}
                    </span>
                    <span className="small text-2">Você se candidatou {timeAgo(job.application.created_at)}. A empresa já consegue ver sua trajetória e seu contato.</span>
                  </>
                ) : open ? (
                  <>
                    <button className="btn accent lg block" onClick={() => setApplying(true)}>
                      Quero me candidatar
                    </button>
                    <span className="small muted">Ao se candidatar, a {job.company.name} vê sua trajetória no Multiverso e seu e-mail.</span>
                  </>
                ) : (
                  <span className="muted">Esta oportunidade não está mais recebendo candidaturas.</span>
                )}
              </div>
            </div>
            {applying && user && (
              <ApplyModal
                job={job}
                user={user}
                onClose={() => setApplying(false)}
                onDone={() => {
                  setApplying(false);
                  reload();
                }}
              />
            )}
          </div>
        )}
      </Loader>
    </div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 style={{ margin: '4px 0' }}>{title}</h3>
      <p className="text-2" style={{ margin: 0, whiteSpace: 'pre-line' }}>
        {text}
      </p>
    </div>
  );
}

function ApplyModal({ job, user, onClose, onDone }: { job: StudentJob; user: User; onClose: () => void; onDone: () => void }) {
  const { setUser } = useAuth();
  const { toast } = useNotifications();
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const needsConsent = user.talent.needs_consent && !user.talent.guardian_ok;

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/opportunities/jobs/${job.id}/apply`, { message, guardian_ok: consent });
      if (consent) setUser({ ...user, talent: { ...user.talent, guardian_ok: true } });
      toast('Candidatura enviada', `A ${job.company.name} foi avisada.`);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Candidatar-se: ${job.title}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn accent" onClick={send} disabled={busy || (needsConsent && !consent)}>
            Enviar candidatura
          </button>
        </>
      }
    >
      <div className="stack">
        <Field label="Mensagem para a empresa" hint="Opcional. Conte por que essa oportunidade combina com você.">
          <textarea className="input" rows={4} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        {needsConsent && (
          <label className="terms-box small">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>Tenho 18 anos ou mais, ou meu responsável autorizou compartilhar meu perfil e contato com empresas parceiras.</span>
          </label>
        )}
        <p className="small muted" style={{ margin: 0 }}>
          <PixelIcon name="shield" size={14} /> A empresa vai ver seu nome, nível, cursos concluídos, certificados e seu e-mail ({user.email}).
        </p>
        <ErrorBox error={error} />
      </div>
    </Modal>
  );
}
