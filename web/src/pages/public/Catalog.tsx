import { useState } from 'react';
import { CourseCard } from '../../components/CourseCard';
import { Empty, Loader } from '../../components/ui';
import { useApi, useDebounced, useDocumentTitle } from '../../lib/hooks';
import type { CourseCard as Course, Trail } from '../../lib/types';

export function Catalog() {
  useDocumentTitle('Cursos');
  const [q, setQ] = useState('');
  const [trail, setTrail] = useState<number | ''>('');
  const query = useDebounced(q);
  const trails = useApi<{ trails: Trail[] }>('/catalog/trails');
  const { data, error } = useApi<{ courses: Course[] }>(`/catalog/courses?q=${encodeURIComponent(query)}&trail=${trail}`);

  return (
    <div className="container page">
      <div className="section-head">
        <div>
          <h1>Cursos</h1>
          <p className="muted" style={{ margin: 0 }}>
            Todos os cursos são gratuitos, online e podem ser feitos no seu ritmo.
          </p>
        </div>
      </div>
      <div className="row mb">
        <input className="input grow" style={{ maxWidth: 420 }} placeholder="Buscar curso…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar curso" />
        <div className="chips">
          <button className={`chip ${trail === '' ? 'on' : ''}`} onClick={() => setTrail('')}>
            Todas as trilhas
          </button>
          {trails.data?.trails.map((t) => (
            <button key={t.id} className={`chip ${trail === t.id ? 'on' : ''}`} onClick={() => setTrail(t.id)}>
              {t.title}
            </button>
          ))}
        </div>
      </div>
      <Loader data={data} error={error}>
        {(d) =>
          d.courses.length ? (
            <div className="grid grid-3">
              {d.courses.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          ) : (
            <Empty icon="search" title="Nenhum curso encontrado" />
          )
        }
      </Loader>
    </div>
  );
}
