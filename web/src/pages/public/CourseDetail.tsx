import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { PixelIcon } from '../../components/PixelIcon';
import { ErrorBox, Loader, Progress } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import type { CourseCard, EventItem } from '../../lib/types';
import { EventCard } from '../../components/Feed';

interface Detail {
  course: CourseCard & { description: string | null; cert_min_grade: number; cert_min_progress: number; require_feedback: number };
  modules: { id: number; title: string; description: string | null; lessons: { id: number; title: string; duration_minutes: number }[] }[];
  assessments: { id: number; title: string; kind: string }[];
  events: EventItem[];
}

export function CourseDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, error } = useApi<Detail>(`/catalog/courses/${slug}`);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useDocumentTitle(data?.course.title ?? 'Curso');

  async function enroll() {
    if (!user) return navigate(`/entrar?next=/cursos/${slug}`);
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/learning/courses/${data!.course.id}/enroll`);
      navigate(`/aprender/${slug}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container page">
      <Loader data={data} error={error}>
        {({ course, modules, assessments, events }) => {
          const totalMin = modules.flatMap((m) => m.lessons).reduce((s, l) => s + l.duration_minutes, 0);
          const enrolled = course.enrollment_status != null;
          return (
            <div className="split">
              <div>
                {course.trail_slug && (
                  <Link to={`/trilhas/${course.trail_slug}`} className="small">
                    ← {course.trail_title}
                  </Link>
                )}
                <h1 style={{ marginTop: 8 }}>{course.title}</h1>
                {course.summary && <p className="text-2" style={{ fontSize: '1.05rem' }}>{course.summary}</p>}
                <div className="row mb">
                  <span className="pill">Gratuito</span>
                  <span className="pill gray">Online · no seu ritmo</span>
                  {course.level && <span className="pill gray">{course.level}</span>}
                  {!!course.has_certificate && <span className="pill gold"><PixelIcon name="scroll" size={14} /> Com certificado</span>}
                </div>
                {course.cover_url && <img src={course.cover_url} alt="" style={{ borderRadius: 12, width: '100%', aspectRatio: '16/7', objectFit: 'cover' }} />}
                {course.description && (
                  <div className="section">
                    <h2>Sobre o curso</h2>
                    <p className="prose" style={{ whiteSpace: 'pre-line' }}>{course.description}</p>
                  </div>
                )}
                <div className="section">
                  <h2>Conteúdo</h2>
                  <p className="muted small">
                    {modules.length} módulos · {modules.reduce((s, m) => s + m.lessons.length, 0)} aulas · {Math.round(totalMin / 6) / 10}h de vídeo
                    {assessments.length > 0 && ` · ${assessments.length} avaliações`}
                  </p>
                  {modules.map((m, i) => (
                    <div className="tree-module" key={m.id}>
                      <div className="tree-module-head">
                        <strong>
                          Módulo {i + 1} · {m.title}
                        </strong>
                      </div>
                      {m.lessons.map((l) => (
                        <div className="tree-lesson" key={l.id}>
                          <span aria-hidden>▶</span>
                          <span className="grow">{l.title}</span>
                          <span className="muted small">{l.duration_minutes} min</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {events.length > 0 && (
                  <div className="section">
                    <h2>Eventos do curso</h2>
                    <div className="stack">
                      {events.map((e) => (
                        <EventCard key={e.id} e={e} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <aside className="card" style={{ position: 'sticky', top: 84 }}>
                <div className="stack">
                  {enrolled ? (
                    <>
                      <strong>{course.enrollment_status === 'completed' ? '✓ Curso concluído' : 'Você está inscrito(a)'}</strong>
                      <Progress value={course.enrollment_progress ?? 0} />
                      <span className="muted small">{Math.round(course.enrollment_progress ?? 0)}% concluído</span>
                      <Link to={`/aprender/${course.slug}`} className="btn block lg">
                        {course.enrollment_status === 'completed' ? 'Revisar curso' : 'Continuar curso'}
                      </Link>
                    </>
                  ) : (
                    <>
                      <button className="btn block lg" onClick={enroll} disabled={busy}>
                        {user ? 'Inscrever-se gratuitamente' : 'Entrar para se inscrever'}
                      </button>
                      <ErrorBox error={err} />
                    </>
                  )}
                  <hr style={{ margin: '6px 0' }} />
                  <div className="small stack" style={{ gap: 6 }}>
                    <span><PixelIcon name="clock" size={16} /> Carga horária: <strong>{course.workload_hours}h</strong></span>
                    <span><PixelIcon name="users" size={16} /> {course.students} estudantes inscritos</span>
                    {course.rating != null && <span>★ Avaliação média: {course.rating.toLocaleString('pt-BR')}/5</span>}
                    {!!course.has_certificate && (
                      <span>
                        <PixelIcon name="scroll" size={16} /> Certificado ao concluir {course.cert_min_progress}% das aulas
                        {assessments.some((a) => a.kind === 'quiz') && ` com nota mínima ${course.cert_min_grade}`}
                        {!!course.require_feedback && ' e responder ao feedback'}
                      </span>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          );
        }}
      </Loader>
    </div>
  );
}
