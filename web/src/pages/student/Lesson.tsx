import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { PixelIcon } from '../../components/PixelIcon';
import { Loader } from '../../components/ui';
import { VideoPlayer } from '../../components/VideoPlayer';
import { api } from '../../lib/api';
import { fmtBytes } from '../../lib/format';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import { useNotifications } from '../../lib/notifications';
import type { AssessmentSummary } from '../../lib/types';
import { AssessmentRow } from './Learn';

interface LessonData {
  lesson: { id: number; title: string; description: string | null; content: string | null; video_url: string | null; duration_minutes: number };
  module: { id: number; title: string };
  course: { id: number; slug: string; title: string };
  materials: { id: number; title: string; url: string; file_name: string | null; size: number | null }[];
  assessments: AssessmentSummary[];
  completed: boolean;
  prev_lesson_id: number | null;
  next_lesson_id: number | null;
  position: number;
  total: number;
}

const HEARTBEAT_SECONDS = 30;

/** Envia pulsos de tempo de estudo enquanto a aba está visível. */
function useStudyHeartbeat(lessonId: number | undefined) {
  useEffect(() => {
    if (!lessonId) return;
    let elapsed = 0;
    const tick = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      elapsed += 5;
      if (elapsed >= HEARTBEAT_SECONDS) {
        elapsed = 0;
        api.post(`/learning/lessons/${lessonId}/heartbeat`, { seconds: HEARTBEAT_SECONDS }).catch(() => {});
      }
    }, 5000);
    return () => {
      clearInterval(tick);
      if (elapsed >= 10) api.post(`/learning/lessons/${lessonId}/heartbeat`, { seconds: elapsed }).catch(() => {});
    };
  }, [lessonId]);
}

export function LessonPage() {
  const { slug, lessonId } = useParams();
  const navigate = useNavigate();
  const { toast } = useNotifications();
  const { data, error, setData } = useApi<LessonData>(`/learning/lessons/${lessonId}`);
  const outline = useApi<{ modules: { id: number; title: string; lessons: { id: number; title: string; completed: boolean }[] }[] }>(
    `/learning/courses/${slug}`,
    [data?.completed],
  );
  const [busy, setBusy] = useState(false);
  useDocumentTitle(data?.lesson.title ?? 'Aula');
  useStudyHeartbeat(data?.lesson.id);

  async function complete(goNext: boolean) {
    if (!data) return;
    setBusy(true);
    try {
      if (!data.completed) {
        const r = await api.post(`/learning/lessons/${data.lesson.id}/complete`);
        setData({ ...data, completed: true });
        if (r.pointsAwarded) toast('Aula concluída! +pontos');
        if (r.enrollment?.completed) toast('Curso concluído!', 'Veja como emitir seu certificado.');
      }
      if (goNext && data.next_lesson_id) navigate(`/aprender/${slug}/aula/${data.next_lesson_id}`);
      else if (goNext) navigate(`/aprender/${slug}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container page">
      <Loader data={data} error={error}>
        {(d) => (
          <div className="split">
            <div className="stack" style={{ gap: 16 }}>
              <div className="small">
                <Link to={`/aprender/${d.course.slug}`}>{d.course.title}</Link> <span className="muted">› {d.module.title}</span>
              </div>
              <VideoPlayer url={d.lesson.video_url} onEnded={() => complete(false)} />
              <div className="row between">
                <div>
                  <span className="muted small">
                    Aula {d.position} de {d.total} · {d.lesson.duration_minutes} min
                  </span>
                  <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{d.lesson.title}</h1>
                </div>
                <div className="row">
                  {d.prev_lesson_id && (
                    <Link className="btn secondary" to={`/aprender/${slug}/aula/${d.prev_lesson_id}`}>
                      ‹ Anterior
                    </Link>
                  )}
                  {d.completed ? (
                    <button className="btn" onClick={() => complete(true)} disabled={busy}>
                      {d.next_lesson_id ? 'Próxima aula ›' : 'Voltar ao curso'}
                    </button>
                  ) : (
                    <button className="btn" onClick={() => complete(true)} disabled={busy}>
                      ✓ Concluir {d.next_lesson_id ? 'e avançar' : 'aula'}
                    </button>
                  )}
                </div>
              </div>
              {d.completed && <div className="alert success small">✓ Você concluiu esta aula.</div>}
              {d.lesson.description && <p className="text-2">{d.lesson.description}</p>}
              {d.lesson.content && <div className="card prose" dangerouslySetInnerHTML={{ __html: d.lesson.content }} />}

              {d.materials.length > 0 && (
                <div className="card">
                  <div className="card-title">Materiais complementares</div>
                  <div className="stack" style={{ gap: 6 }}>
                    {d.materials.map((m) => (
                      <a key={m.id} href={m.url} target="_blank" rel="noreferrer" className="row">
                        <PixelIcon name="folder" size={14} /> {m.title} <span className="muted small">{fmtBytes(m.size)}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {d.assessments.length > 0 && (
                <div className="card">
                  <div className="card-title">Atividades desta aula</div>
                  {d.assessments.map((a) => (
                    <AssessmentRow key={a.id} a={a} />
                  ))}
                </div>
              )}
            </div>

            <aside className="card pad-0" style={{ position: 'sticky', top: 84, maxHeight: 'calc(100vh - 110px)', overflowY: 'auto' }}>
              {outline.data?.modules.map((m) => (
                <div key={m.id}>
                  <div className="module-title">{m.title}</div>
                  <div className="lesson-list" style={{ padding: '0 6px 6px' }}>
                    {m.lessons.map((l) => (
                      <Link key={l.id} to={`/aprender/${slug}/aula/${l.id}`} className={`lesson-item small ${l.id === d.lesson.id ? 'current' : ''}`}>
                        <span className={`check-dot ${l.completed ? 'done' : ''}`}>{l.completed ? '✓' : ''}</span>
                        <span className="grow">{l.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </aside>
          </div>
        )}
      </Loader>
    </div>
  );
}
