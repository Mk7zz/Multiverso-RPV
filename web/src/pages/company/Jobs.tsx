import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { ApprovedOnly, useCompany } from '../../components/CompanyLayout';
import { AreaPills, MatchMeter } from '../../components/Partners';
import { PixelIcon } from '../../components/PixelIcon';
import { Empty, ErrorBox, Field, Loader, Modal } from '../../components/ui';
import { api } from '../../lib/api';
import { fmtDate, fmtDuration, MUNICIPALITIES, timeAgo } from '../../lib/format';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import { useNotifications } from '../../lib/notifications';
import { APPLICATION_STATUS, AREA_LABEL, JOB_TYPE_LABEL, MODALITY_LABEL, type Job, type JobMatch, type TalentCard } from '../../lib/partners';

export function CompanyJobs() {
  useDocumentTitle('Oportunidades');
  return (
    <ApprovedOnly>
      <JobList />
    </ApprovedOnly>
  );
}

function JobList() {
  const [params, setParams] = useSearchParams();
  const { data, error, reload } = useApi<{ jobs: Job[] }>('/company/jobs');
  const { reload: reloadMe } = useCompany();
  const [editing, setEditing] = useState<Job | 'new' | null>(params.get('nova') ? 'new' : null);

  const close = () => {
    setEditing(null);
    if (params.get('nova')) setParams({}, { replace: true });
  };

  return (
    <>
      <div className="section-head">
        <h1 style={{ margin: 0 }}>Oportunidades</h1>
        <button className="btn" onClick={() => setEditing('new')}>
          + Nova oportunidade
        </button>
      </div>
      <Loader data={data} error={error}>
        {(d) =>
          d.jobs.length ? (
            <div className="card pad-0 table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Oportunidade</th>
                    <th>Tipo</th>
                    <th className="num">Candidaturas</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.jobs.map((j) => (
                    <tr key={j.id}>
                      <td>
                        <Link to={`/empresa/vagas/${j.id}`} style={{ fontWeight: 600 }}>
                          {j.title}
                        </Link>
                        <div className="muted small">
                          {AREA_LABEL[j.area]} · {MODALITY_LABEL[j.modality]} · publicada {fmtDate(j.created_at)}
                        </div>
                      </td>
                      <td>{JOB_TYPE_LABEL[j.type]}</td>
                      <td className="num">
                        {j.applications}
                        {!!j.new_applications && <span className="pill info" style={{ marginLeft: 6 }}>{j.new_applications} nova(s)</span>}
                      </td>
                      <td>{j.status === 'open' ? <span className="pill success">Aberta</span> : <span className="pill gray">Encerrada</span>}</td>
                      <td className="nowrap">
                        <button className="btn ghost sm" onClick={() => setEditing(j)}>
                          Editar
                        </button>
                        <Link to={`/empresa/vagas/${j.id}`} className="btn secondary sm">
                          Candidatos
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon="briefcase" title="Nenhuma oportunidade publicada">
              <p className="small muted">Estágio, jovem aprendiz, emprego: publique e ela aparece para os alunos na Feira de Talentos.</p>
              <button className="btn" onClick={() => setEditing('new')}>
                Publicar a primeira
              </button>
            </Empty>
          )
        }
      </Loader>
      {editing && (
        <JobEditor
          job={editing === 'new' ? null : editing}
          onClose={close}
          onSaved={() => {
            close();
            reload();
            reloadMe();
          }}
        />
      )}
    </>
  );
}

function JobEditor({ job, onClose, onSaved }: { job: Job | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useNotifications();
  const { me } = useCompany();
  const options = useApi<{ courses: { id: number; title: string }[] }>('/company/options');
  const [f, setF] = useState({
    title: job?.title ?? '',
    type: job?.type ?? 'estagio',
    modality: job?.modality ?? 'presencial',
    municipality: job?.municipality ?? me.company.municipality,
    area: job?.area ?? 'tecnologia',
    description: job?.description ?? '',
    requirements: job?.requirements ?? '',
    benefits: job?.benefits ?? '',
    course_ids: job?.course_ids ?? [],
    min_level: job?.min_level ?? 0,
    status: job?.status ?? 'open',
    closes_at: job?.closes_at ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const toggleCourse = (id: number) => setF({ ...f, course_ids: f.course_ids.includes(id) ? f.course_ids.filter((c) => c !== id) : [...f.course_ids, id] });

  async function save() {
    setError(null);
    try {
      const body = { ...f, min_level: Number(f.min_level) };
      await (job ? api.put(`/company/jobs/${job.id}`, body) : api.post('/company/jobs', body));
      toast(job ? 'Oportunidade atualizada' : 'Oportunidade publicada', job ? undefined : 'Ela já aparece para os alunos.');
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal
      title={job ? 'Editar oportunidade' : 'Nova oportunidade'}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn" onClick={save}>
            {job ? 'Salvar' : 'Publicar'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Título" className="full">
          <input className="input" value={f.title} onChange={set('title')} placeholder="Ex.: Estágio em suporte de TI" />
        </Field>
        <Field label="Tipo">
          <select className="input" value={f.type} onChange={set('type')}>
            {Object.entries(JOB_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Área">
          <select className="input" value={f.area} onChange={set('area')}>
            {Object.entries(AREA_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Modalidade">
          <select className="input" value={f.modality} onChange={set('modality')}>
            {Object.entries(MODALITY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Município">
          <input className="input" list="mun-job" value={f.municipality ?? ''} onChange={set('municipality')} />
          <datalist id="mun-job">{MUNICIPALITIES.map((m) => <option key={m} value={m} />)}</datalist>
        </Field>
        <Field label="Descrição" className="full">
          <textarea className="input" rows={4} value={f.description} onChange={set('description')} placeholder="O dia a dia, o time, o que a pessoa vai aprender." />
        </Field>
        <Field label="Requisitos" hint="Opcional">
          <textarea className="input" value={f.requirements ?? ''} onChange={set('requirements')} />
        </Field>
        <Field label="Benefícios" hint="Opcional">
          <textarea className="input" value={f.benefits ?? ''} onChange={set('benefits')} />
        </Field>
        <div className="field full">
          <span>Cursos do Multiverso que contam a favor</span>
          <div className="chips">
            {options.data?.courses.map((c) => (
              <button key={c.id} type="button" className={`chip ${f.course_ids.includes(c.id) ? 'on' : ''}`} onClick={() => toggleCourse(c.id)}>
                {c.title}
              </button>
            ))}
          </div>
          <small>Os alunos veem a compatibilidade com a vaga e quais cursos faltam. Os candidatos chegam para você ordenados por ela.</small>
        </div>
        <Field label="Nível mínimo sugerido">
          <select className="input" value={f.min_level} onChange={set('min_level')}>
            <option value={0}>Sem mínimo</option>
            {[2, 3, 4, 5, 6, 7, 8].map((l) => (
              <option key={l} value={l}>
                Nível {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Inscrições até" hint="Opcional">
          <input className="input" type="date" value={f.closes_at ?? ''} onChange={set('closes_at')} />
        </Field>
        <Field label="Status">
          <select className="input" value={f.status} onChange={set('status')}>
            <option value="open">Aberta</option>
            <option value="closed">Encerrada</option>
          </select>
        </Field>
      </div>
      <div className="mt">
        <ErrorBox error={error} />
      </div>
    </Modal>
  );
}

interface Application {
  id: number;
  is_new: boolean;
  status: string;
  message: string | null;
  created_at: string;
  talent: TalentCard & { email: string };
  match: JobMatch;
}

export function CompanyJobDetail() {
  useDocumentTitle('Candidatos');
  return (
    <ApprovedOnly>
      <JobDetail />
    </ApprovedOnly>
  );
}

function JobDetail() {
  const { id } = useParams();
  const { toast } = useNotifications();
  const { data, error, setData } = useApi<{ job: Job; applications: Application[] }>(`/company/jobs/${id}`);

  async function setStatus(a: Application, status: string) {
    await api.patch(`/company/applications/${a.id}`, { status });
    setData((d) => (d ? { ...d, applications: d.applications.map((x) => (x.id === a.id ? { ...x, status } : x)) } : d));
    toast('Candidatura atualizada', status === 'viewed' ? undefined : 'O talento recebe um aviso.');
  }

  return (
    <Loader data={data} error={error}>
      {(d) => (
        <>
          <Link to="/empresa/vagas" className="btn ghost sm mb">
            ‹ Oportunidades
          </Link>
          <div className="section-head">
            <div>
              <h1 style={{ margin: 0 }}>{d.job.title}</h1>
              <span className="muted">
                {JOB_TYPE_LABEL[d.job.type]} · {MODALITY_LABEL[d.job.modality]} · {d.job.municipality ?? ''} · {d.applications.length} candidatura(s)
              </span>
            </div>
            {d.job.status === 'open' ? <span className="pill success">Aberta</span> : <span className="pill gray">Encerrada</span>}
          </div>
          {d.applications.length ? (
            <div className="stack">
              {d.applications.map((a) => (
                <div key={a.id} className="card applicant">
                  <Avatar config={a.talent.avatar} name={a.talent.name} size={56} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <Link to={`/empresa/talentos/${a.talent.id}`} className="talent-name">
                      {a.talent.name}
                    </Link>
                    {a.is_new && <span className="pill info" style={{ marginLeft: 8 }}>nova</span>}
                    <div className="muted small">
                      <PixelIcon name={a.talent.level.icon} size={14} /> Nível {a.talent.level.level} · {a.talent.municipality} · {a.talent.courses_completed} cursos ·{' '}
                      {fmtDuration(a.talent.study_seconds)} de estudo · candidatou-se {timeAgo(a.created_at)}
                    </div>
                    <AreaPills areas={a.talent.areas} />
                    {a.message && <p className="small text-2" style={{ margin: '6px 0 0' }}>"{a.message}"</p>}
                    <a href={`mailto:${a.talent.email}`} className="small">
                      <PixelIcon name="mail" size={14} /> {a.talent.email}
                    </a>
                  </div>
                  <div className="stack applicant-side">
                    <MatchMeter match={a.match} />
                    <select className="input" value={a.status} onChange={(e) => setStatus(a, e.target.value)} aria-label="Etapa da candidatura">
                      {Object.entries(APPLICATION_STATUS)
                        .filter(([k]) => k !== 'sent')
                        .map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty icon="users" title="Nenhuma candidatura ainda">
              <p className="small muted">
                Enquanto isso, procure na <Link to="/empresa/talentos">vitrine de talentos</Link> e convide quem tem o perfil da vaga.
              </p>
            </Empty>
          )}
        </>
      )}
    </Loader>
  );
}
