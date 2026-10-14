import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { PixelIcon } from '../../components/PixelIcon';
import { Loader, Progress } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import type { CourseCard, Trail } from '../../lib/types';

const STEP = 168; // distância vertical entre paradas (px)

interface Region {
  key: string;
  title: string;
  slug: string | null;
  courses: CourseCard[];
}

/** Desvio horizontal (em % da largura) de cada parada, desenhando o rio em zigue-zague. */
const offset = (i: number) => Math.round(Math.sin(i * 1.15) * 26);

function RegionMap({ region, index, marker }: { region: Region; index: number; marker: number | null }) {
  const { user } = useAuth();
  const done = region.courses.filter((c) => c.enrollment_status === 'completed').length;
  const conquered = region.courses.length > 0 && done === region.courses.length;
  const stops = region.courses.length + 1; // + cume
  const height = stops * STEP;
  const point = (i: number) => ({ x: 50 + offset(i + index), y: STEP / 2 + i * STEP });
  const pts = Array.from({ length: stops }, (_, i) => point(i));
  // Curva suave passando pelas paradas (o "rio" da trilha).
  const d = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1];
    const my = (prev.y + p.y) / 2;
    return `${acc} C ${prev.x} ${my}, ${p.x} ${my}, ${p.x} ${p.y}`;
  }, '');
  const doneUntil = pts.slice(0, done + 1);

  return (
    <section className="region">
      <header className="region-head">
        <div>
          <span className="region-kicker">Região {index + 1}</span>
          <h2>{region.title}</h2>
        </div>
        <div className="region-score">
          <strong>
            {done}/{region.courses.length}
          </strong>
          <span className="small muted">cursos conquistados</span>
          <Progress value={region.courses.length ? (done / region.courses.length) * 100 : 0} gold={conquered} />
        </div>
      </header>
      <div className="map" style={{ height }}>
        <svg className="map-river" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden>
          <path d={d} className="river-base" vectorEffect="non-scaling-stroke" />
          {done > 0 && (
            <path
              d={doneUntil.reduce((acc, p, i) => {
                if (i === 0) return `M ${p.x} ${p.y}`;
                const prev = doneUntil[i - 1];
                const my = (prev.y + p.y) / 2;
                return `${acc} C ${prev.x} ${my}, ${p.x} ${my}, ${p.x} ${p.y}`;
              }, '')}
              className="river-done"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {region.courses.map((c, i) => {
          const p = pts[i];
          const state = c.enrollment_status === 'completed' ? 'completed' : c.enrollment_status === 'in_progress' ? 'ongoing' : marker === c.id ? 'next' : 'open';
          const pct = Math.round(c.enrollment_progress ?? 0);
          return (
            <Link
              key={c.id}
              to={c.enrollment_status ? `/aprender/${c.slug}` : `/cursos/${c.slug}`}
              className={`map-stop ${state}`}
              style={{ left: `${p.x}%`, top: p.y }}
              title={c.title}
            >
              <span className="stop-node" style={state === 'ongoing' ? ({ '--pct': `${pct}%` } as CSSProperties) : undefined}>
                <span className="stop-inner">{state === 'completed' ? <PixelIcon name="flag" size={26} /> : state === 'ongoing' ? `${pct}%` : i + 1}</span>
              </span>
              <span className="stop-label">
                {c.title}
                <span className="stop-meta">
                  {state === 'completed' ? 'Conquistado' : state === 'ongoing' ? 'Em expedição' : state === 'next' ? 'Próxima parada' : `${c.lessons_count} aulas · ${c.workload_hours}h`}
                </span>
              </span>
              {marker === c.id && user && (
                <span className="stop-player">
                  <Avatar config={user.avatar} name={user.name} size={38} />
                </span>
              )}
            </Link>
          );
        })}
        <div className={`map-stop summit ${conquered ? 'completed' : ''}`} style={{ left: `${pts[stops - 1].x}%`, top: pts[stops - 1].y }}>
          <span className="stop-node">
            <span className="stop-inner"><PixelIcon name={conquered ? 'trophy' : 'summit'} size={32} /></span>
          </span>
          <span className="stop-label">
            Cume da região
            <span className="stop-meta">{conquered ? 'Região conquistada!' : 'Conclua todos os cursos'}</span>
          </span>
        </div>
      </div>
    </section>
  );
}

export function Journey() {
  useDocumentTitle('Mapa do Vale');
  const { data, error } = useApi<{ trails: Trail[]; courses: CourseCard[] }>('/catalog/home');

  return (
    <div className="container page" style={{ maxWidth: 820 }}>
      <div className="page-hero">
        <span className="page-hero-icon">
          <PixelIcon name="map" size={36} />
        </span>
        <div>
          <h1>Mapa do Vale</h1>
          <p className="text-2" style={{ margin: 0 }}>
            Cada trilha é uma região do Rio Pomba Valley. Siga o rio, conquiste os cursos e chegue ao cume de cada região.
          </p>
        </div>
      </div>
      <Loader data={data} error={error}>
        {(d) => {
          const regions: Region[] = d.trails.map((t) => ({ key: `t${t.id}`, title: t.title, slug: t.slug, courses: d.courses.filter((c) => c.trail_id === t.id) }));
          const loose = d.courses.filter((c) => !c.trail_id || !d.trails.some((t) => t.id === c.trail_id));
          if (loose.length) regions.push({ key: 'free', title: 'Território livre', slug: null, courses: loose });
          const visible = regions.filter((r) => r.courses.length);
          const all = visible.flatMap((r) => r.courses);
          // Onde o avatar fica: na expedição em andamento ou na próxima parada ainda não iniciada.
          const marker = (all.find((c) => c.enrollment_status === 'in_progress') ?? all.find((c) => !c.enrollment_status))?.id ?? null;
          const done = all.filter((c) => c.enrollment_status === 'completed').length;
          const regionsDone = visible.filter((r) => r.courses.every((c) => c.enrollment_status === 'completed')).length;
          return (
            <>
              <div className="grid grid-3 mb">
                <div className="card stat">
                  <span className="stat-value">
                    <PixelIcon name="flag" size={24} /> {done}/{all.length}
                  </span>
                  <span className="stat-label">cursos conquistados</span>
                </div>
                <div className="card stat">
                  <span className="stat-value">
                    <PixelIcon name="trophy" size={24} /> {regionsDone}/{visible.length}
                  </span>
                  <span className="stat-label">regiões conquistadas</span>
                </div>
                <div className="card stat">
                  <span className="stat-value">
                    <PixelIcon name="compass" size={24} /> {all.filter((c) => c.enrollment_status === 'in_progress').length}</span>
                  <span className="stat-label">expedições em andamento</span>
                </div>
              </div>
              {visible.map((r, i) => (
                <RegionMap key={r.key} region={r} index={i} marker={marker} />
              ))}
            </>
          );
        }}
      </Loader>
    </div>
  );
}
