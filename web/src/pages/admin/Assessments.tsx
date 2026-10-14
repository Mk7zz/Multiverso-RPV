import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ErrorBox, Field, Loader, Modal } from '../../components/ui';
import { api } from '../../lib/api';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import type { QuestionItem } from './Questions';

type Scope = 'lesson' | 'module' | 'course' | 'trail';

interface AssessmentItem {
  id: number;
  title: string;
  description: string | null;
  kind: 'quiz' | 'exercise';
  scope_type: Scope;
  scope_id: number;
  scope_title: string;
  course_title: string | null;
  min_grade: number;
  allow_recovery: number;
  shuffle_questions: number;
  published: number;
  position: number;
  question_ids: number[];
  stats: { attempts: number; students: number; avg_score: number | null; passed: number | null };
}

interface Scopes {
  trails: { id: number; title: string }[];
  courses: { id: number; title: string }[];
  modules: { id: number; title: string; course_id: number; course_title: string }[];
  lessons: { id: number; title: string; course_id: number; module_title: string }[];
}

const SCOPE_LABEL: Record<Scope, string> = { lesson: 'Aula', module: 'Módulo', course: 'Curso', trail: 'Trilha' };

/** Avaliações (questionários e exercícios) configuráveis por aula, módulo, curso ou trilha. */
export function AdminAssessments() {
  useDocumentTitle('Avaliações');
  const [params, setParams] = useSearchParams();
  const course = params.get('curso') ?? '';
  const scopes = useApi<Scopes>('/admin/scopes');
  const { data, error, reload } = useApi<{ assessments: AssessmentItem[] }>(`/admin/assessments?course=${course}`);
  const [edit, setEdit] = useState<Partial<AssessmentItem> | null>(null);

  async function remove(a: AssessmentItem) {
    if (!confirm(`Excluir "${a.title}"? As tentativas dos alunos também serão removidas.`)) return;
    await api.del(`/admin/assessments/${a.id}`);
    reload();
  }

  return (
    <>
      <div className="section-head">
        <h1 style={{ margin: 0 }}>Avaliações</h1>
        <button
          className="btn"
          onClick={() => setEdit({ kind: 'quiz', scope_type: 'course', scope_id: course ? Number(course) : undefined, min_grade: 70, allow_recovery: 1, published: 1, question_ids: [] })}
        >
          + Nova avaliação
        </button>
      </div>
      <p className="muted small">
        <strong>Questionários</strong> contam nota (nota mínima e recuperação). <strong>Exercícios</strong> são atividades de fixação com correção
        comentada. A correção é automática (questões fechadas).
      </p>
      <div className="row mb">
        <select className="input" style={{ maxWidth: 360 }} value={course} onChange={(e) => setParams(e.target.value ? { curso: e.target.value } : {})}>
          <option value="">Todas</option>
          {scopes.data?.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>
      <Loader data={data} error={error}>
        {(d) => (
          <div className="card pad-0 table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Avaliação</th>
                  <th>Vínculo</th>
                  <th className="num">Questões</th>
                  <th className="num">Nota mín.</th>
                  <th className="num">Alunos</th>
                  <th className="num">Média</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {d.assessments.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.title}</strong>
                      <div className="row small" style={{ gap: 4 }}>
                        <span className={`pill ${a.kind === 'quiz' ? 'gold' : ''}`}>{a.kind === 'quiz' ? 'Questionário' : 'Exercício'}</span>
                        {!a.published && <span className="pill gray">Oculta</span>}
                      </div>
                    </td>
                    <td className="small">
                      {SCOPE_LABEL[a.scope_type]}: {a.scope_title}
                      {a.course_title && a.scope_type !== 'course' && <div className="muted">{a.course_title}</div>}
                    </td>
                    <td className="num">{a.question_ids.length}</td>
                    <td className="num">{a.kind === 'quiz' ? a.min_grade : '—'}</td>
                    <td className="num">{a.stats.students}</td>
                    <td className="num">{a.stats.avg_score ?? '—'}</td>
                    <td className="nowrap">
                      <button className="btn ghost sm" onClick={() => setEdit(a)}>Editar</button>
                      <button className="btn ghost sm" onClick={() => remove(a)}>Excluir</button>
                    </td>
                  </tr>
                ))}
                {!d.assessments.length && (
                  <tr>
                    <td colSpan={7} className="muted center">Nenhuma avaliação.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Loader>
      {edit && scopes.data && <AssessmentModal item={edit} scopes={scopes.data} onClose={() => setEdit(null)} onDone={reload} />}
    </>
  );
}

function AssessmentModal({ item, scopes, onClose, onDone }: { item: Partial<AssessmentItem>; scopes: Scopes; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    title: item.title ?? '',
    description: item.description ?? '',
    kind: item.kind ?? 'quiz',
    scope_type: item.scope_type ?? 'course',
    scope_id: item.scope_id ?? 0,
    min_grade: item.min_grade ?? 70,
    allow_recovery: item.allow_recovery ?? 1,
    shuffle_questions: item.shuffle_questions ?? 0,
    published: item.published ?? 1,
    position: item.position ?? 0,
  });
  const [selected, setSelected] = useState<number[]>(item.question_ids ?? []);
  const [qFilter, setQFilter] = useState('');
  const bank = useApi<{ questions: QuestionItem[] }>('/admin/questions?pageSize=100');
  const [error, setError] = useState<string | null>(null);

  const scopeOptions = useMemo(() => {
    switch (f.scope_type) {
      case 'trail':
        return scopes.trails.map((t) => ({ id: t.id, label: t.title }));
      case 'course':
        return scopes.courses.map((c) => ({ id: c.id, label: c.title }));
      case 'module':
        return scopes.modules.map((m) => ({ id: m.id, label: `${m.course_title} › ${m.title}` }));
      case 'lesson':
        return scopes.lessons.map((l) => ({ id: l.id, label: `${l.module_title} › ${l.title}` }));
    }
  }, [f.scope_type, scopes]);

  const questions = (bank.data?.questions ?? []).filter((q) => !qFilter || q.statement.toLowerCase().includes(qFilter.toLowerCase()) || q.course_title?.toLowerCase().includes(qFilter.toLowerCase()));

  async function save() {
    setError(null);
    try {
      const body = {
        ...f,
        scope_id: Number(f.scope_id),
        min_grade: Number(f.min_grade),
        allow_recovery: !!f.allow_recovery,
        shuffle_questions: !!f.shuffle_questions,
        published: !!f.published,
        question_ids: selected,
      };
      if (item.id) await api.put(`/admin/assessments/${item.id}`, body);
      else await api.post('/admin/assessments', body);
      onDone();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal wide title={item.id ? 'Editar avaliação' : 'Nova avaliação'} onClose={onClose} footer={<><button className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn" onClick={save}>Salvar</button></>}>
      <div className="stack">
        <div className="form-grid">
          <Field label="Título" className="full"><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Tipo">
            <select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as 'quiz' })}>
              <option value="quiz">Questionário (conta nota)</option>
              <option value="exercise">Exercício de fixação</option>
            </select>
          </Field>
          <Field label="Nível">
            <select className="input" value={f.scope_type} onChange={(e) => setF({ ...f, scope_type: e.target.value as Scope, scope_id: 0 })}>
              <option value="lesson">Aula</option>
              <option value="module">Módulo</option>
              <option value="course">Curso</option>
              <option value="trail">Trilha</option>
            </select>
          </Field>
          <Field label={`Vinculada a (${SCOPE_LABEL[f.scope_type].toLowerCase()})`} className="full">
            <select className="input" value={f.scope_id || ''} onChange={(e) => setF({ ...f, scope_id: Number(e.target.value) })}>
              <option value="">Selecione…</option>
              {scopeOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </Field>
          {f.kind === 'quiz' && (
            <Field label="Nota mínima (0-100)"><input className="input" type="number" min={0} max={100} value={f.min_grade} onChange={(e) => setF({ ...f, min_grade: Number(e.target.value) })} /></Field>
          )}
          <Field label="Descrição / instruções" className="full"><textarea className="input" style={{ minHeight: 60 }} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        </div>
        <div className="row">
          {f.kind === 'quiz' && <label className="check"><input type="checkbox" checked={!!f.allow_recovery} onChange={(e) => setF({ ...f, allow_recovery: e.target.checked ? 1 : 0 })} /> Permitir recuperação</label>}
          <label className="check"><input type="checkbox" checked={!!f.shuffle_questions} onChange={(e) => setF({ ...f, shuffle_questions: e.target.checked ? 1 : 0 })} /> Embaralhar questões</label>
          <label className="check"><input type="checkbox" checked={!!f.published} onChange={(e) => setF({ ...f, published: e.target.checked ? 1 : 0 })} /> Publicada</label>
        </div>
        <hr style={{ margin: 0 }} />
        <div className="row between">
          <strong>Questões do banco ({selected.length} selecionadas)</strong>
          <input className="input" style={{ maxWidth: 260 }} placeholder="Filtrar questões…" value={qFilter} onChange={(e) => setQFilter(e.target.value)} />
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
          {questions.map((q) => (
            <label key={q.id} className="check" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
              <input type="checkbox" checked={selected.includes(q.id)} onChange={(e) => setSelected((s) => (e.target.checked ? [...s, q.id] : s.filter((x) => x !== q.id)))} />
              <span className="small">
                {q.statement}
                {q.course_title && <span className="muted"> · {q.course_title}</span>}
              </span>
            </label>
          ))}
          {!questions.length && <p className="muted small" style={{ padding: 12 }}>Nenhuma questão. Cadastre no Banco de questões.</p>}
        </div>
        <ErrorBox error={error} />
      </div>
    </Modal>
  );
}
