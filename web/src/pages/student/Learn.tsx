import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { PixelIcon } from '../../components/PixelIcon';
import { ErrorBox, Loader, Progress } from '../../components/ui';
import { api } from '../../lib/api';
import { fmtDate } from '../../lib/format';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import { useNotifications } from '../../lib/notifications';
import type { AssessmentSummary, CertificateStatus } from '../../lib/types';

interface LearnData {
  course: { id: number; title: string; slug: string; summary: string | null; has_certificate: number; workload_hours: number };
  enrollment: { status: string; progress: number; final_grade: number | null } | null;
  modules: {
    id: number;
    title: string;
    lessons: { id: number; title: string; duration_minutes: number; completed: boolean }[];
    assessments: AssessmentSummary[];
  }[];
  assessments: AssessmentSummary[];
  certificate: CertificateStatus;
  feedback: { rating: number } | null;
}

export function AssessmentRow({ a }: { a: AssessmentSummary }) {
  return (
    <Link to={`/avaliacoes/${a.id}`} className="lesson-item">
      <span className={`check-dot ${a.passed ? 'done' : ''}`}>{a.passed ? '✓' : a.kind === 'quiz' ? '★' : <PixelIcon name="pencil" size={12} />}</span>
      <span className="grow">
        {a.title}
        <span className="muted small" style={{ display: 'block' }}>
          {a.kind === 'quiz' ? `Avaliação · nota mínima ${a.min_grade}` : 'Exercício de fixação'}
          {a.best_score != null && ` · melhor nota ${a.best_score}`}
        </span>
      </span>
      {a.kind === 'quiz' && a.attempts > 0 && !a.passed && <span className="pill warning">Recuperação</span>}
    </Link>
  );
}

export function Learn() {
  const { slug } = useParams();
  const { data, error, reload } = useApi<LearnData>(`/learning/courses/${slug}`);
  useDocumentTitle(data?.course.title ?? 'Curso');

  return (
    <div className="container page">
      <Loader data={data} error={error}>
        {(d) => {
          const lessons = d.modules.flatMap((m) => m.lessons);
          const next = lessons.find((l) => !l.completed) ?? lessons[0];
          const courseQuizzes = d.assessments.filter((a) => a.scope_type === 'course');
          const lessonAssessments = d.assessments.filter((a) => a.scope_type === 'lesson');
          return (
            <div className="split">
              <div>
                <Link to={`/cursos/${d.course.slug}`} className="small">
                  ← Página do curso
                </Link>
                <h1 style={{ marginTop: 8 }}>{d.course.title}</h1>
                <div className="card flat mb">
                  <div className="row between">
                    <strong>Seu progresso</strong>
                    <span>{Math.round(d.enrollment?.progress ?? 0)}%</span>
                  </div>
                  <div className="mt">
                    <Progress value={d.enrollment?.progress ?? 0} />
                  </div>
                  <div className="row between mt">
                    <span className="muted small">
                      {lessons.filter((l) => l.completed).length} de {lessons.length} aulas
                      {d.enrollment?.final_grade != null && ` · nota final ${d.enrollment.final_grade}`}
                    </span>
                    {next && (
                      <Link to={`/aprender/${d.course.slug}/aula/${next.id}`} className="btn">
                        {lessons.some((l) => l.completed) ? 'Continuar ▶' : 'Começar ▶'}
                      </Link>
                    )}
                  </div>
                </div>

                {d.modules.map((m, i) => (
                  <div className="tree-module" key={m.id}>
                    <div className="tree-module-head">
                      <strong className="grow">
                        Módulo {i + 1} · {m.title}
                      </strong>
                      <span className="muted small">
                        {m.lessons.filter((l) => l.completed).length}/{m.lessons.length}
                      </span>
                    </div>
                    <div className="lesson-list" style={{ padding: 6 }}>
                      {m.lessons.map((l) => (
                        <div key={l.id}>
                          <Link to={`/aprender/${d.course.slug}/aula/${l.id}`} className="lesson-item">
                            <span className={`check-dot ${l.completed ? 'done' : ''}`}>{l.completed ? '✓' : ''}</span>
                            <span className="grow">{l.title}</span>
                            <span className="muted small">{l.duration_minutes} min</span>
                          </Link>
                          {lessonAssessments
                            .filter((a) => a.scope_id === l.id)
                            .map((a) => (
                              <div key={a.id} style={{ paddingLeft: 24 }}>
                                <AssessmentRow a={a} />
                              </div>
                            ))}
                        </div>
                      ))}
                      {m.assessments.map((a) => (
                        <AssessmentRow key={a.id} a={a} />
                      ))}
                    </div>
                  </div>
                ))}

                {courseQuizzes.length > 0 && (
                  <div className="tree-module">
                    <div className="tree-module-head">
                      <strong>Avaliação do curso</strong>
                    </div>
                    <div className="lesson-list" style={{ padding: 6 }}>
                      {courseQuizzes.map((a) => (
                        <AssessmentRow key={a.id} a={a} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <aside>
                <CertificatePanel courseId={d.course.id} status={d.certificate} onChange={reload} />
              </aside>
            </div>
          );
        }}
      </Loader>
    </div>
  );
}

function CertificatePanel({ courseId, status, onChange }: { courseId: number; status: CertificateStatus; onChange: () => void }) {
  const [showForm, setShowForm] = useState(false);
  if (!status.hasCertificate) {
    return (
      <div className="card">
        <div className="card-title">Certificado</div>
        <p className="muted small">Este curso não emite certificado.</p>
      </div>
    );
  }
  const cert = status.certificate;
  return (
    <div className="card" style={{ position: 'sticky', top: 84 }}>
      <div className="card-title"><PixelIcon name="scroll" size={16} /> Certificado</div>
      {cert ? (
        <div className="stack">
          <div className="alert success">Certificado emitido em {fmtDate(cert.issued_at)}!</div>
          <span className="small">
            Código: <strong>{cert.code}</strong>
          </span>
          <a className="btn block" href={`/api/certificates/${cert.code}/pdf?download=1`}>
            Baixar PDF
          </a>
          <Link className="btn secondary block" to={`/validar/${cert.code}`}>
            Página de validação
          </Link>
        </div>
      ) : (
        <>
          <p className="small text-2">Cumpra os critérios abaixo para receber seu certificado automaticamente:</p>
          {status.requirements.map((r) => (
            <div className="req" key={r.key}>
              <span className={`req-icon ${r.met ? 'met' : ''}`}>{r.met ? '✓' : ''}</span>
              <div>
                <div className="small">{r.label}</div>
                {r.detail && <div className="muted small">{r.detail}</div>}
              </div>
            </div>
          ))}
          {status.canGiveFeedback && !showForm && (
            <button className="btn block accent mt" onClick={() => setShowForm(true)}>
              Responder feedback e emitir certificado
            </button>
          )}
          {showForm && <FeedbackForm courseId={courseId} onDone={onChange} />}
        </>
      )}
    </div>
  );
}

function FeedbackForm({ courseId, onDone }: { courseId: number; onDone: () => void }) {
  const { toast } = useNotifications();
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState(0);
  const [recommend, setRecommend] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!rating) return setError('Dê uma nota geral para o curso.');
    setBusy(true);
    setError(null);
    try {
      const r = await api.post(`/learning/courses/${courseId}/feedback`, {
        rating,
        content_rating: content || undefined,
        recommend: recommend ?? undefined,
        comment: comment || undefined,
      });
      toast('Obrigado pelo feedback!', r.certificate ? 'Seu certificado foi emitido.' : undefined);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const Stars = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className={n <= value ? 'on' : ''} onClick={() => onChange(n)} aria-label={`${n} estrelas`}>
          ★
        </button>
      ))}
    </div>
  );

  return (
    <div className="stack mt">
      <hr style={{ margin: 0 }} />
      <strong>Formulário de feedback</strong>
      <div className="field">
        <span>Nota geral do curso *</span>
        <Stars value={rating} onChange={setRating} />
      </div>
      <div className="field">
        <span>Qualidade do conteúdo</span>
        <Stars value={content} onChange={setContent} />
      </div>
      <div className="field">
        <span>De 0 a 10, quanto você recomendaria este curso?</span>
        <div className="scale">
          {Array.from({ length: 11 }, (_, n) => (
            <button key={n} type="button" className={recommend === n ? 'on' : ''} onClick={() => setRecommend(n)}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>Comentários (opcional)</span>
        <textarea className="input" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} />
      </label>
      <ErrorBox error={error} />
      <button className="btn block" onClick={submit} disabled={busy}>
        Enviar feedback
      </button>
    </div>
  );
}
