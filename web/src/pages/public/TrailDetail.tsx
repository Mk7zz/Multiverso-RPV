import { Link, useParams } from 'react-router';
import { CourseCard } from '../../components/CourseCard';
import { Loader, Progress } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import type { CourseCard as Course, Trail } from '../../lib/types';

export function TrailDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { data, error } = useApi<{ trail: Trail; courses: Course[]; assessments: { id: number; title: string; kind: string; description: string | null }[] }>(
    `/catalog/trails/${slug}`,
  );
  useDocumentTitle(data?.trail.title ?? 'Trilha');

  return (
    <div className="container page">
      <Loader data={data} error={error}>
        {({ trail, courses, assessments }) => {
          const done = courses.filter((c) => c.enrollment_status === 'completed').length;
          return (
            <>
              <span className="muted small">Trilha de aprendizagem</span>
              <h1>{trail.title}</h1>
              {trail.description && <p className="text-2" style={{ maxWidth: 760 }}>{trail.description}</p>}
              {user && (
                <div className="card flat mb" style={{ maxWidth: 420 }}>
                  <div className="row between small">
                    <strong>Seu progresso na trilha</strong>
                    <span>
                      {done}/{courses.length} cursos
                    </span>
                  </div>
                  <div className="mt">
                    <Progress value={courses.length ? (done / courses.length) * 100 : 0} gold />
                  </div>
                </div>
              )}
              <div className="grid grid-3">
                {courses.map((c, i) => (
                  <div key={c.id} className="stack" style={{ gap: 6 }}>
                    <span className="muted small">Etapa {i + 1}</span>
                    <CourseCard course={c} />
                  </div>
                ))}
              </div>
              {assessments.length > 0 && (
                <div className="section">
                  <h2>Avaliações da trilha</h2>
                  <div className="stack">
                    {assessments.map((a) => (
                      <div key={a.id} className="card flat row between">
                        <div>
                          <strong>{a.title}</strong>
                          {a.description && <div className="small muted">{a.description}</div>}
                        </div>
                        <Link className="btn secondary" to={user ? `/avaliacoes/${a.id}` : `/entrar?next=/avaliacoes/${a.id}`}>
                          Fazer avaliação
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        }}
      </Loader>
    </div>
  );
}
