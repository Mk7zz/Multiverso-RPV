import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { PixelIcon } from '../../components/PixelIcon';
import { ErrorBox, Field, Loader, Modal, Progress } from '../../components/ui';
import { api, upload } from '../../lib/api';
import { fmtBytes } from '../../lib/format';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import { useNotifications } from '../../lib/notifications';

interface Material {
  id: number;
  title: string;
  url: string;
  file_name: string | null;
  size: number | null;
}
interface Lesson {
  id: number;
  module_id: number;
  title: string;
  description: string | null;
  content: string | null;
  video_url: string | null;
  duration_minutes: number;
  position: number;
  materials: Material[];
}
interface Module {
  id: number;
  title: string;
  description: string | null;
  position: number;
  lessons: Lesson[];
}
interface Course {
  id: number;
  title: string;
  slug: string;
  trail_id: number | null;
  summary: string | null;
  description: string | null;
  cover_url: string | null;
  workload_hours: number;
  level: string | null;
  has_certificate: number;
  cert_min_grade: number;
  cert_min_progress: number;
  require_feedback: number;
  published: number;
  position: number;
}

export function ImageInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [pct, setPct] = useState<number | null>(null);
  return (
    <Field label={label} hint="Envie uma imagem ou informe uma URL">
      <div className="row">
        <input className="input grow" value={value} onChange={(e) => onChange(e.target.value)} placeholder="/uploads/images/…" />
        <label className="btn secondary">
          {pct !== null ? `${pct}%` : 'Enviar'}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setPct(0);
              try {
                onChange((await upload('image', f, setPct)).url);
              } finally {
                setPct(null);
              }
            }}
          />
        </label>
      </div>
      {value && <img src={value} alt="" style={{ maxHeight: 90, borderRadius: 8, alignSelf: 'flex-start' }} />}
    </Field>
  );
}

export function AdminCourseEditor() {
  const { id } = useParams();
  const { data, error, reload } = useApi<{ course: Course; modules: Module[] }>(`/admin/content/courses/${id}`);
  const trails = useApi<{ trails: { id: number; title: string }[] }>('/admin/content/trails');
  const [lessonEdit, setLessonEdit] = useState<{ moduleId: number; lesson?: Lesson } | null>(null);
  const { toast } = useNotifications();
  useDocumentTitle(data?.course.title ?? 'Editar curso');

  async function addModule() {
    const title = prompt('Título do novo módulo:');
    if (!title) return;
    await api.post(`/admin/content/courses/${id}/modules`, { title });
    reload();
  }
  async function renameModule(m: Module) {
    const title = prompt('Título do módulo:', m.title);
    if (!title) return;
    await api.put(`/admin/content/modules/${m.id}`, { title, description: m.description });
    reload();
  }
  async function deleteModule(m: Module) {
    if (!confirm(`Excluir o módulo "${m.title}" e todas as suas aulas?`)) return;
    await api.del(`/admin/content/modules/${m.id}`);
    toast('Módulo excluído');
    reload();
  }
  async function move(type: 'modules' | 'lessons', list: { id: number }[], index: number, dir: -1 | 1) {
    const ids = list.map((x) => x.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    await api.post('/admin/content/reorder', { type, ids });
    reload();
  }

  return (
    <Loader data={data} error={error}>
      {(d) => (
        <>
          <Link to="/admin/conteudo" className="small">
            ← Trilhas e cursos
          </Link>
          <div className="section-head" style={{ marginTop: 8 }}>
            <h1 style={{ margin: 0 }}>{d.course.title}</h1>
            <div className="row">
              <Link className="btn secondary" to={`/admin/avaliacoes?curso=${d.course.id}`}>
                <PixelIcon name="pencil" size={16} /> Avaliações do curso
              </Link>
              <Link className="btn secondary" to={`/cursos/${d.course.slug}`} target="_blank">
                Visualizar ↗
              </Link>
            </div>
          </div>
          <div className="split">
            <div>
              <div className="row between mb">
                <h2 style={{ margin: 0 }}>Módulos e aulas</h2>
                <button className="btn" onClick={addModule}>
                  + Módulo
                </button>
              </div>
              {d.modules.map((m, mi) => (
                <div key={m.id} className="tree-module">
                  <div className="tree-module-head">
                    <strong className="grow">
                      {mi + 1}. {m.title}
                    </strong>
                    <button className="btn ghost sm" onClick={() => move('modules', d.modules, mi, -1)} aria-label="Subir">↑</button>
                    <button className="btn ghost sm" onClick={() => move('modules', d.modules, mi, 1)} aria-label="Descer">↓</button>
                    <button className="btn ghost sm" onClick={() => renameModule(m)}>Renomear</button>
                    <button className="btn ghost sm" onClick={() => deleteModule(m)}>Excluir</button>
                  </div>
                  {m.lessons.map((l, li) => (
                    <div key={l.id} className="tree-lesson">
                      <PixelIcon name={l.video_url ? 'play' : 'scroll'} size={16} />
                      <span className="grow">
                        {l.title}
                        <span className="muted small" style={{ display: 'block' }}>
                          {l.duration_minutes} min{l.materials.length > 0 && ` · ${l.materials.length} material(is)`}
                          {!l.video_url && ' · sem vídeo'}
                        </span>
                      </span>
                      <button className="btn ghost sm" onClick={() => move('lessons', m.lessons, li, -1)} aria-label="Subir">↑</button>
                      <button className="btn ghost sm" onClick={() => move('lessons', m.lessons, li, 1)} aria-label="Descer">↓</button>
                      <button className="btn secondary sm" onClick={() => setLessonEdit({ moduleId: m.id, lesson: l })}>
                        Editar
                      </button>
                    </div>
                  ))}
                  <div style={{ padding: 10 }}>
                    <button className="btn ghost sm" onClick={() => setLessonEdit({ moduleId: m.id })}>
                      + Adicionar aula
                    </button>
                  </div>
                </div>
              ))}
              {!d.modules.length && <p className="muted">Nenhum módulo ainda. Comece adicionando o primeiro.</p>}
            </div>
            <CourseSettings course={d.course} trails={trails.data?.trails ?? []} onSaved={reload} />
          </div>
          {lessonEdit && <LessonModal moduleId={lessonEdit.moduleId} lesson={lessonEdit.lesson} onClose={() => setLessonEdit(null)} onDone={reload} />}
        </>
      )}
    </Loader>
  );
}

function CourseSettings({ course, trails, onSaved }: { course: Course; trails: { id: number; title: string }[]; onSaved: () => void }) {
  const { toast } = useNotifications();
  const navigate = useNavigate();
  const [f, setF] = useState(course);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setF(course), [course]);

  async function save() {
    setError(null);
    try {
      await api.put(`/admin/content/courses/${course.id}`, {
        title: f.title,
        trail_id: f.trail_id,
        summary: f.summary,
        description: f.description,
        cover_url: f.cover_url || null,
        workload_hours: Number(f.workload_hours),
        level: f.level,
        has_certificate: !!f.has_certificate,
        cert_min_grade: Number(f.cert_min_grade),
        cert_min_progress: Number(f.cert_min_progress),
        require_feedback: !!f.require_feedback,
        published: !!f.published,
        position: Number(f.position),
      });
      toast('Curso salvo');
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remove() {
    if (!confirm('Excluir este curso definitivamente?')) return;
    try {
      await api.del(`/admin/content/courses/${course.id}`);
    } catch (e) {
      if (!confirm(`${(e as Error).message}\n\nExcluir mesmo assim (remove matrículas e certificados)?`)) return;
      await api.del(`/admin/content/courses/${course.id}?force=1`);
    }
    navigate('/admin/conteudo');
  }

  return (
    <aside className="card stack">
      <h3 style={{ margin: 0 }}>Configurações do curso</h3>
      <Field label="Título"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
      <Field label="Trilha">
        <select className="input" value={f.trail_id ?? ''} onChange={(e) => setF({ ...f, trail_id: e.target.value ? Number(e.target.value) : null })}>
          <option value="">Sem trilha</option>
          {trails.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </Field>
      <Field label="Resumo"><textarea className="input" style={{ minHeight: 60 }} value={f.summary ?? ''} onChange={(e) => setF({ ...f, summary: e.target.value })} /></Field>
      <Field label="Descrição"><textarea className="input" value={f.description ?? ''} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <ImageInput label="Capa" value={f.cover_url ?? ''} onChange={(v) => setF({ ...f, cover_url: v })} />
      <div className="form-grid">
        <Field label="Carga horária (h)"><input className="input" type="number" min={0} value={f.workload_hours} onChange={(e) => setF({ ...f, workload_hours: Number(e.target.value) })} /></Field>
        <Field label="Nível"><input className="input" value={f.level ?? ''} onChange={(e) => setF({ ...f, level: e.target.value })} /></Field>
        <Field label="Ordem"><input className="input" type="number" value={f.position} onChange={(e) => setF({ ...f, position: Number(e.target.value) })} /></Field>
      </div>
      <hr style={{ margin: 0 }} />
      <strong>Certificação</strong>
      <label className="check"><input type="checkbox" checked={!!f.has_certificate} onChange={(e) => setF({ ...f, has_certificate: e.target.checked ? 1 : 0 })} /> Emite certificado</label>
      {!!f.has_certificate && (
        <>
          <div className="form-grid">
            <Field label="Nota mínima (0-100)"><input className="input" type="number" min={0} max={100} value={f.cert_min_grade} onChange={(e) => setF({ ...f, cert_min_grade: Number(e.target.value) })} /></Field>
            <Field label="% mínimo de aulas"><input className="input" type="number" min={0} max={100} value={f.cert_min_progress} onChange={(e) => setF({ ...f, cert_min_progress: Number(e.target.value) })} /></Field>
          </div>
          <label className="check"><input type="checkbox" checked={!!f.require_feedback} onChange={(e) => setF({ ...f, require_feedback: e.target.checked ? 1 : 0 })} /> Exigir formulário de feedback</label>
        </>
      )}
      <hr style={{ margin: 0 }} />
      <label className="check"><input type="checkbox" checked={!!f.published} onChange={(e) => setF({ ...f, published: e.target.checked ? 1 : 0 })} /> <strong>Publicado</strong> (visível no catálogo)</label>
      <ErrorBox error={error} />
      <button className="btn" onClick={save}>Salvar curso</button>
      <button className="btn ghost" style={{ color: 'var(--danger)' }} onClick={remove}>Excluir curso</button>
    </aside>
  );
}

function LessonModal({ moduleId, lesson, onClose, onDone }: { moduleId: number; lesson?: Lesson; onClose: () => void; onDone: () => void }) {
  const { toast } = useNotifications();
  const [f, setF] = useState({
    title: lesson?.title ?? '',
    description: lesson?.description ?? '',
    content: lesson?.content ?? '',
    video_url: lesson?.video_url ?? '',
    duration_minutes: lesson?.duration_minutes ?? 0,
  });
  const [materials, setMaterials] = useState<Material[]>(lesson?.materials ?? []);
  const [videoPct, setVideoPct] = useState<number | null>(null);
  const [matPct, setMatPct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    try {
      const body = { ...f, video_url: f.video_url || null, duration_minutes: Number(f.duration_minutes) };
      if (lesson) await api.put(`/admin/content/lessons/${lesson.id}`, body);
      else await api.post(`/admin/content/modules/${moduleId}/lessons`, body);
      toast('Aula salva');
      onDone();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function remove() {
    if (!lesson || !confirm('Excluir esta aula?')) return;
    await api.del(`/admin/content/lessons/${lesson.id}`);
    onDone();
    onClose();
  }
  async function uploadVideo(file: File) {
    setVideoPct(0);
    try {
      const r = await upload('video', file, setVideoPct);
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => setF((x) => ({ ...x, duration_minutes: Math.max(1, Math.round(v.duration / 60)) }));
      v.src = URL.createObjectURL(file);
      setF((x) => ({ ...x, video_url: r.url }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setVideoPct(null);
    }
  }
  async function addMaterial(file: File) {
    if (!lesson) return;
    setMatPct(0);
    try {
      const r = await upload('material', file, setMatPct);
      const m = await api.post(`/admin/content/lessons/${lesson.id}/materials`, { title: file.name.replace(/\.[^.]+$/, ''), ...r });
      setMaterials((list) => [...list, m.material]);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMatPct(null);
    }
  }
  async function removeMaterial(m: Material) {
    await api.del(`/admin/content/materials/${m.id}`);
    setMaterials((list) => list.filter((x) => x.id !== m.id));
    onDone();
  }

  return (
    <Modal
      wide
      title={lesson ? 'Editar aula' : 'Nova aula'}
      onClose={onClose}
      footer={
        <>
          {lesson && <button className="btn danger" style={{ marginRight: 'auto' }} onClick={remove}>Excluir aula</button>}
          <button className="btn secondary" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={save} disabled={videoPct !== null}>Salvar aula</button>
        </>
      }
    >
      <div className="stack">
        <Field label="Título"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} autoFocus /></Field>
        <Field label="Vídeo" hint="Envie um arquivo de vídeo (MP4/WebM) ou cole um link do YouTube/Vimeo">
          <div className="row">
            <input className="input grow" value={f.video_url} onChange={(e) => setF({ ...f, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=… ou /uploads/videos/…" />
            <label className="btn secondary">
              ⬆ Enviar vídeo
              <input type="file" accept="video/*" hidden onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])} />
            </label>
          </div>
          {videoPct !== null && <Progress value={videoPct} />}
        </Field>
        <div className="form-grid">
          <Field label="Duração (minutos)"><input className="input" type="number" min={0} value={f.duration_minutes} onChange={(e) => setF({ ...f, duration_minutes: Number(e.target.value) })} /></Field>
          <Field label="Descrição curta"><input className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        </div>
        <Field label="Conteúdo de apoio (HTML simples permitido)">
          <textarea className="input" style={{ minHeight: 140 }} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} />
        </Field>
        <div>
          <strong>Materiais complementares</strong>
          {!lesson && <p className="muted small">Salve a aula primeiro para anexar materiais.</p>}
          {lesson && (
            <div className="stack mt" style={{ gap: 6 }}>
              {materials.map((m) => (
                <div key={m.id} className="row between small">
                  <a href={m.url} target="_blank" rel="noreferrer"><PixelIcon name="folder" size={14} /> {m.title}</a>
                  <span className="row">
                    <span className="muted">{fmtBytes(m.size)}</span>
                    <button className="btn ghost sm" onClick={() => removeMaterial(m)}>Remover</button>
                  </span>
                </div>
              ))}
              <label className="btn secondary sm" style={{ alignSelf: 'flex-start' }}>
                {matPct !== null ? `Enviando ${matPct}%` : '+ Anexar arquivo'}
                <input type="file" hidden onChange={(e) => e.target.files?.[0] && addMaterial(e.target.files[0])} />
              </label>
            </div>
          )}
        </div>
        <ErrorBox error={error} />
      </div>
    </Modal>
  );
}
