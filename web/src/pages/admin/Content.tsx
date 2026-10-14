import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ErrorBox, Field, Loader, Modal, Tabs } from '../../components/ui';
import { api } from '../../lib/api';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import { useNotifications } from '../../lib/notifications';
import { ImageInput } from './CourseEditor';

interface AdminTrail {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  published: number;
  position: number;
  courses_count: number;
}

interface AdminCourseRow {
  id: number;
  title: string;
  slug: string;
  trail_title: string | null;
  published: number;
  modules_count: number;
  lessons_count: number;
  students: number;
  workload_hours: number;
}

export function AdminContent() {
  useDocumentTitle('Conteúdo');
  const [tab, setTab] = useState<'cursos' | 'trilhas'>('cursos');
  const courses = useApi<{ courses: AdminCourseRow[] }>('/admin/content/courses');
  const trails = useApi<{ trails: AdminTrail[] }>('/admin/content/trails');
  const [newCourse, setNewCourse] = useState(false);
  const [trailEdit, setTrailEdit] = useState<Partial<AdminTrail> | null>(null);

  return (
    <>
      <div className="section-head">
        <h1 style={{ margin: 0 }}>Trilhas e cursos</h1>
        <div className="row">
          <button className="btn secondary" onClick={() => setTrailEdit({ published: 1, position: 0 })}>
            + Nova trilha
          </button>
          <button className="btn" onClick={() => setNewCourse(true)}>
            + Novo curso
          </button>
        </div>
      </div>
      <p className="muted small">Estrutura: Trilha → Curso → Módulo → Aula. No MVP os cursos são abertos, fixos (sem expiração) e assíncronos.</p>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'cursos', label: 'Cursos' },
          { value: 'trilhas', label: 'Trilhas' },
        ]}
      />
      {tab === 'cursos' && (
        <Loader data={courses.data} error={courses.error}>
          {(d) => (
            <div className="card pad-0 table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Curso</th>
                    <th>Trilha</th>
                    <th className="num">Módulos</th>
                    <th className="num">Aulas</th>
                    <th className="num">Alunos</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.courses.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/admin/conteudo/cursos/${c.id}`}>
                          <strong>{c.title}</strong>
                        </Link>
                      </td>
                      <td>{c.trail_title ?? '—'}</td>
                      <td className="num">{c.modules_count}</td>
                      <td className="num">{c.lessons_count}</td>
                      <td className="num">{c.students}</td>
                      <td>{c.published ? <span className="pill success">Publicado</span> : <span className="pill gray">Rascunho</span>}</td>
                      <td className="nowrap">
                        <Link className="btn ghost sm" to={`/admin/conteudo/cursos/${c.id}`}>
                          Editar
                        </Link>
                        <Link className="btn ghost sm" to={`/cursos/${c.slug}`} target="_blank">
                          Ver ↗
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Loader>
      )}
      {tab === 'trilhas' && (
        <Loader data={trails.data} error={trails.error}>
          {(d) => (
            <div className="card pad-0 table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Trilha</th>
                    <th className="num">Cursos</th>
                    <th className="num">Ordem</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.trails.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.title}</strong>
                      </td>
                      <td className="num">{t.courses_count}</td>
                      <td className="num">{t.position}</td>
                      <td>{t.published ? <span className="pill success">Publicada</span> : <span className="pill gray">Rascunho</span>}</td>
                      <td className="nowrap">
                        <button className="btn ghost sm" onClick={() => setTrailEdit(t)}>
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Loader>
      )}
      {newCourse && <NewCourseModal trails={trails.data?.trails ?? []} onClose={() => setNewCourse(false)} />}
      {trailEdit && (
        <TrailModal
          trail={trailEdit}
          onClose={() => setTrailEdit(null)}
          onDone={() => {
            trails.reload();
            courses.reload();
          }}
        />
      )}
    </>
  );
}

function NewCourseModal({ trails, onClose }: { trails: AdminTrail[]; onClose: () => void }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [trailId, setTrailId] = useState<string>(trails[0]?.id ? String(trails[0].id) : '');
  const [error, setError] = useState<string | null>(null);
  async function create() {
    try {
      const r = await api.post('/admin/content/courses', { title, trail_id: trailId ? Number(trailId) : null, published: false });
      navigate(`/admin/conteudo/cursos/${r.course.id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Modal title="Novo curso" onClose={onClose} footer={<><button className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn" onClick={create}>Criar e editar</button></>}>
      <div className="stack">
        <Field label="Título do curso"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></Field>
        <Field label="Trilha">
          <select className="input" value={trailId} onChange={(e) => setTrailId(e.target.value)}>
            <option value="">Sem trilha</option>
            {trails.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </Field>
        <ErrorBox error={error} />
      </div>
    </Modal>
  );
}

function TrailModal({ trail, onClose, onDone }: { trail: Partial<AdminTrail>; onClose: () => void; onDone: () => void }) {
  const { toast } = useNotifications();
  const [form, setForm] = useState({
    title: trail.title ?? '',
    description: trail.description ?? '',
    cover_url: trail.cover_url ?? '',
    published: !!trail.published,
    position: trail.position ?? 0,
  });
  const [error, setError] = useState<string | null>(null);
  async function save() {
    try {
      const body = { ...form, cover_url: form.cover_url || null };
      if (trail.id) await api.put(`/admin/content/trails/${trail.id}`, body);
      else await api.post('/admin/content/trails', body);
      toast('Trilha salva');
      onDone();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remove() {
    if (!trail.id || !confirm('Excluir esta trilha? Os cursos continuam existindo, mas ficam sem trilha.')) return;
    await api.del(`/admin/content/trails/${trail.id}`);
    onDone();
    onClose();
  }
  return (
    <Modal
      title={trail.id ? 'Editar trilha' : 'Nova trilha'}
      onClose={onClose}
      footer={
        <>
          {trail.id && <button className="btn danger" style={{ marginRight: 'auto' }} onClick={remove}>Excluir</button>}
          <button className="btn secondary" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={save}>Salvar</button>
        </>
      }
    >
      <div className="stack">
        <Field label="Título"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Descrição"><textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <ImageInput label="Imagem de capa" value={form.cover_url} onChange={(v) => setForm({ ...form, cover_url: v })} />
        <div className="row">
          <Field label="Ordem"><input className="input" type="number" style={{ width: 100 }} value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} /></Field>
          <label className="check"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Publicada</label>
        </div>
        <ErrorBox error={error} />
      </div>
    </Modal>
  );
}
