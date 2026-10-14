import { useState } from 'react';
import { PixelIcon } from '../../components/PixelIcon';
import { ErrorBox, Field, Loader, Modal, Pagination } from '../../components/ui';
import { api } from '../../lib/api';
import { useApi, useDebounced, useDocumentTitle } from '../../lib/hooks';
import { useNotifications } from '../../lib/notifications';

export interface QuestionItem {
  id: number;
  statement: string;
  explanation: string | null;
  type: 'single' | 'multiple';
  tags: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  course_id: number | null;
  course_title: string | null;
  options: { id: number; text: string; is_correct: number }[];
}

const DIFF = { easy: 'Fácil', medium: 'Média', hard: 'Difícil' };

/** Banco de questões fechadas (escolha única ou múltipla), reutilizáveis em qualquer avaliação. */
export function AdminQuestions() {
  useDocumentTitle('Banco de questões');
  const [q, setQ] = useState('');
  const [course, setCourse] = useState('');
  const [page, setPage] = useState(1);
  const query = useDebounced(q);
  const courses = useApi<{ courses: { id: number; title: string }[] }>('/admin/content/courses');
  const { data, error, reload } = useApi<{ questions: QuestionItem[]; total: number; page: number; pageSize: number }>(
    `/admin/questions?q=${encodeURIComponent(query)}&course=${course}&page=${page}`,
  );
  const [edit, setEdit] = useState<Partial<QuestionItem> | null>(null);
  const { toast } = useNotifications();

  async function remove(item: QuestionItem) {
    if (!confirm('Excluir esta questão?')) return;
    try {
      await api.del(`/admin/questions/${item.id}`);
      reload();
    } catch (e) {
      toast((e as Error).message);
    }
  }

  return (
    <>
      <div className="section-head">
        <h1 style={{ margin: 0 }}>Banco de questões</h1>
        <button className="btn" onClick={() => setEdit({ type: 'single', difficulty: 'medium', course_id: course ? Number(course) : null })}>
          + Nova questão
        </button>
      </div>
      <div className="row mb">
        <input className="input" style={{ maxWidth: 360 }} placeholder="Buscar no enunciado ou tags…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="input" style={{ maxWidth: 320 }} value={course} onChange={(e) => { setCourse(e.target.value); setPage(1); }}>
          <option value="">Todos os cursos</option>
          {courses.data?.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>
      <Loader data={data} error={error}>
        {(d) => (
          <>
            <div className="stack">
              {d.questions.map((item) => (
                <div key={item.id} className="card flat">
                  <div className="row between" style={{ alignItems: 'flex-start' }}>
                    <div className="grow">
                      <strong style={{ whiteSpace: 'pre-line' }}>{item.statement}</strong>
                      <div className="row small mt" style={{ gap: 6 }}>
                        <span className="pill gray">{item.type === 'single' ? 'Escolha única' : 'Múltipla escolha'}</span>
                        <span className="pill gray">{DIFF[item.difficulty]}</span>
                        {item.course_title && <span className="pill">{item.course_title}</span>}
                      </div>
                      <ul className="small" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                        {item.options.map((o) => (
                          <li key={o.id} style={{ color: o.is_correct ? 'var(--success)' : undefined, fontWeight: o.is_correct ? 600 : 400 }}>
                            {o.text} {o.is_correct ? '✓' : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="row">
                      <button className="btn ghost sm" onClick={() => setEdit(item)}>Editar</button>
                      <button className="btn ghost sm" onClick={() => remove(item)}>Excluir</button>
                    </div>
                  </div>
                </div>
              ))}
              {!d.questions.length && <p className="muted">Nenhuma questão encontrada.</p>}
            </div>
            <Pagination page={d.page} pageSize={d.pageSize} total={d.total} onChange={setPage} />
          </>
        )}
      </Loader>
      {edit && <QuestionModal item={edit} courses={courses.data?.courses ?? []} onClose={() => setEdit(null)} onDone={reload} />}
    </>
  );
}

function QuestionModal({ item, courses, onClose, onDone }: { item: Partial<QuestionItem>; courses: { id: number; title: string }[]; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    statement: item.statement ?? '',
    explanation: item.explanation ?? '',
    type: item.type ?? 'single',
    tags: item.tags ?? '',
    difficulty: item.difficulty ?? 'medium',
    course_id: item.course_id ?? null,
  });
  const [options, setOptions] = useState<{ text: string; is_correct: boolean }[]>(
    item.options?.map((o) => ({ text: o.text, is_correct: !!o.is_correct })) ?? [
      { text: '', is_correct: true },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
    ],
  );
  const [error, setError] = useState<string | null>(null);

  const setCorrect = (i: number) =>
    setOptions((list) => list.map((o, j) => (f.type === 'single' ? { ...o, is_correct: i === j } : j === i ? { ...o, is_correct: !o.is_correct } : o)));

  async function save() {
    setError(null);
    try {
      const body = { ...f, options: options.filter((o) => o.text.trim()) };
      if (item.id) await api.put(`/admin/questions/${item.id}`, body);
      else await api.post('/admin/questions', body);
      onDone();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal wide title={item.id ? 'Editar questão' : 'Nova questão'} onClose={onClose} footer={<><button className="btn secondary" onClick={onClose}>Cancelar</button><button className="btn" onClick={save}>Salvar</button></>}>
      <div className="stack">
        <Field label="Enunciado"><textarea className="input" value={f.statement} onChange={(e) => setF({ ...f, statement: e.target.value })} autoFocus /></Field>
        <div className="form-grid">
          <Field label="Tipo">
            <select className="input" value={f.type} onChange={(e) => { const type = e.target.value as 'single' | 'multiple'; setF({ ...f, type }); if (type === 'single') setOptions((l) => { const first = l.findIndex((o) => o.is_correct); return l.map((o, j) => ({ ...o, is_correct: j === Math.max(0, first) })); }); }}>
              <option value="single">Escolha única</option>
              <option value="multiple">Múltipla escolha</option>
            </select>
          </Field>
          <Field label="Dificuldade">
            <select className="input" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value as 'easy' })}>
              <option value="easy">Fácil</option>
              <option value="medium">Média</option>
              <option value="hard">Difícil</option>
            </select>
          </Field>
          <Field label="Curso (organização do banco)">
            <select className="input" value={f.course_id ?? ''} onChange={(e) => setF({ ...f, course_id: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Nenhum</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </Field>
          <Field label="Tags"><input className="input" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="ia, ética…" /></Field>
        </div>
        <strong>Alternativas <span className="muted small">(marque a(s) correta(s))</span></strong>
        {options.map((o, i) => (
          <div key={i} className="row" style={{ flexWrap: 'nowrap' }}>
            <input type={f.type === 'single' ? 'radio' : 'checkbox'} checked={o.is_correct} onChange={() => setCorrect(i)} aria-label="Correta" style={{ width: 18, height: 18, accentColor: 'var(--brand)' }} />
            <input className="input grow" value={o.text} placeholder={`Alternativa ${i + 1}`} onChange={(e) => setOptions((l) => l.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
            <button className="btn ghost sm" onClick={() => setOptions((l) => l.filter((_, j) => j !== i))} disabled={options.length <= 2} aria-label="Remover opção"><PixelIcon name="close" size={12} /></button>
          </div>
        ))}
        {options.length < 8 && (
          <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setOptions([...options, { text: '', is_correct: false }])}>
            + Alternativa
          </button>
        )}
        <Field label="Explicação (exibida após a correção)"><textarea className="input" style={{ minHeight: 60 }} value={f.explanation} onChange={(e) => setF({ ...f, explanation: e.target.value })} /></Field>
        <ErrorBox error={error} />
      </div>
    </Modal>
  );
}
