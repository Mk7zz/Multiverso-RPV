import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { PixelIcon } from '../../components/PixelIcon';
import { ErrorBox, Loader } from '../../components/ui';
import { api } from '../../lib/api';
import { fmtDateTime } from '../../lib/format';
import { useApi, useDocumentTitle } from '../../lib/hooks';

interface Question {
  id: number;
  statement: string;
  type: 'single' | 'multiple';
  options: { id: number; text: string }[];
}

interface Data {
  assessment: { id: number; title: string; description: string | null; kind: 'quiz' | 'exercise'; min_grade: number; allow_recovery: number };
  context: { course: { title: string; slug: string } | null; trail: { title: string; slug: string } | null; scopeTitle?: string };
  questions: Question[];
  state: {
    attempts: { id: number; score: number; passed: number; is_recovery: number; created_at: string }[];
    passed: boolean;
    best: number | null;
    canAttempt: boolean;
    nextIsRecovery: boolean;
  };
}

interface Result {
  attempt: { score: number; passed: boolean; is_recovery: boolean; min_grade: number };
  pointsAwarded: boolean;
  results: { question_id: number; selected: number[]; correct: boolean; correct_options?: number[]; explanation?: string | null }[];
}

export function AssessmentPage() {
  const { id } = useParams();
  const { data, error, reload } = useApi<Data>(`/assessments/${id}`);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  useDocumentTitle(data?.assessment.title ?? 'Avaliação');

  function toggle(q: Question, optionId: number) {
    setAnswers((prev) => {
      const cur = prev[q.id] ?? [];
      if (q.type === 'single') return { ...prev, [q.id]: [optionId] };
      return { ...prev, [q.id]: cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId] };
    });
  }

  async function submit() {
    if (!data) return;
    const unanswered = data.questions.filter((q) => !answers[q.id]?.length).length;
    if (unanswered && !confirm(`Você deixou ${unanswered} questão(ões) sem resposta. Enviar mesmo assim?`)) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api.post<Result>(`/assessments/${data.assessment.id}/attempts`, { answers });
      setResult(r);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function retry() {
    setResult(null);
    setAnswers({});
    setStarted(true);
    reload();
  }

  return (
    <div className="container page" style={{ maxWidth: 820 }}>
      <Loader data={data} error={error}>
        {(d) => {
          const back = d.context.course ? `/aprender/${d.context.course.slug}` : d.context.trail ? `/trilhas/${d.context.trail.slug}` : '/painel';
          const byQuestion = new Map(result?.results.map((r) => [r.question_id, r]));
          const isQuiz = d.assessment.kind === 'quiz';
          const showIntro = !started && !result && d.state.attempts.length > 0;
          return (
            <>
              <Link to={back} className="small">
                ← {d.context.course?.title ?? d.context.trail?.title ?? 'Voltar'}
              </Link>
              <h1 style={{ marginTop: 8 }}>{d.assessment.title}</h1>
              <div className="row mb">
                <span className={`pill ${isQuiz ? 'gold' : ''}`}>{isQuiz ? 'Avaliação' : 'Exercício de fixação'}</span>
                {isQuiz && <span className="pill gray">Nota mínima: {d.assessment.min_grade}</span>}
                <span className="pill gray">{d.questions.length} questões</span>
                {d.state.best != null && <span className="pill gray">Sua melhor nota: {d.state.best}</span>}
              </div>
              {d.assessment.description && <p className="text-2">{d.assessment.description}</p>}

              {result && (
                <div className={`alert ${result.attempt.passed ? 'success' : 'warning'} mb`}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>Nota: {result.attempt.score}</div>
                  {isQuiz ? (
                    result.attempt.passed ? (
                      <p style={{ margin: 0 }}>
                        Parabéns, você foi aprovado(a){result.attempt.is_recovery ? ' na recuperação' : ''}! {result.pointsAwarded && <>+pontos <PixelIcon name="star" size={14} /></>}
                      </p>
                    ) : (
                      <p style={{ margin: 0 }}>
                        Você não atingiu a nota mínima ({result.attempt.min_grade}).{' '}
                        {d.assessment.allow_recovery ? 'Revise o conteúdo e faça a recuperação quando estiver pronto(a).' : ''}
                      </p>
                    )
                  ) : (
                    <p style={{ margin: 0 }}>Confira abaixo a correção de cada questão. {result.pointsAwarded && <>+pontos <PixelIcon name="star" size={14} /></>}</p>
                  )}
                  <div className="row mt">
                    <Link className="btn secondary" to={back}>
                      Voltar ao curso
                    </Link>
                    {(!isQuiz || !result.attempt.passed) && d.state.canAttempt && (
                      <button className="btn" onClick={retry}>
                        {isQuiz ? 'Fazer recuperação' : 'Refazer exercício'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {showIntro ? (
                <div className="card">
                  <div className="card-title">Suas tentativas</div>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th className="num">Nota</th>
                        <th>Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.state.attempts.map((t) => (
                        <tr key={t.id}>
                          <td>{fmtDateTime(t.created_at)}</td>
                          <td className="num">{t.score}</td>
                          <td>
                            {t.passed ? <span className="pill success">Aprovado</span> : <span className="pill danger">Reprovado</span>}{' '}
                            {!!t.is_recovery && <span className="pill gray">Recuperação</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="row mt">
                    {d.state.canAttempt ? (
                      <button className="btn" onClick={() => setStarted(true)}>
                        {d.state.nextIsRecovery ? 'Fazer recuperação' : d.state.passed ? 'Refazer para melhorar a nota' : 'Nova tentativa'}
                      </button>
                    ) : (
                      <span className="muted">Esta avaliação não permite novas tentativas.</span>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {d.state.nextIsRecovery && !result && <div className="alert info mb">Esta tentativa é de <strong>recuperação</strong>.</div>}
                  <div className="stack" style={{ gap: 18 }}>
                    {d.questions.map((q, i) => {
                      const r = byQuestion.get(q.id);
                      return (
                        <div key={q.id} className="card">
                          <div className="row between" style={{ alignItems: 'flex-start' }}>
                            <strong className="grow" style={{ whiteSpace: 'pre-line' }}>
                              {i + 1}. {q.statement}
                            </strong>
                            {r && (r.correct ? <span className="pill success">✓ Correta</span> : <span className="pill danger"><PixelIcon name="close" size={12} /> Incorreta</span>)}
                          </div>
                          {q.type === 'multiple' && <div className="muted small">Marque todas as alternativas corretas.</div>}
                          <div className="stack mt" style={{ gap: 8 }}>
                            {q.options.map((o) => {
                              const selected = (answers[q.id] ?? []).includes(o.id);
                              let cls = selected ? 'selected' : '';
                              if (r?.correct_options) {
                                if (r.correct_options.includes(o.id)) cls = 'correct';
                                else if (r.selected.includes(o.id)) cls = 'wrong';
                              }
                              return (
                                <label key={o.id} className={`option ${cls}`}>
                                  <input
                                    type={q.type === 'single' ? 'radio' : 'checkbox'}
                                    name={`q${q.id}`}
                                    checked={selected}
                                    disabled={!!result}
                                    onChange={() => toggle(q, o.id)}
                                  />
                                  <span>{o.text}</span>
                                </label>
                              );
                            })}
                          </div>
                          {r?.explanation && <div className="alert info small mt"><PixelIcon name="bulb" size={14} /> {r.explanation}</div>}
                        </div>
                      );
                    })}
                  </div>
                  {!result && (
                    <div className="row end mt">
                      <ErrorBox error={err} />
                      <button className="btn lg" onClick={submit} disabled={busy || !d.state.canAttempt}>
                        {busy ? 'Corrigindo…' : 'Enviar respostas'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          );
        }}
      </Loader>
    </div>
  );
}
