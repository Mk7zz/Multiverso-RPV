import { Link, useSearchParams } from 'react-router';
import { BRAND } from '../../brand';
import { AnnouncementList, EventCard } from '../../components/Feed';
import { QuestList, WeekStreak } from '../../components/Game';
import { PixelIcon } from '../../components/PixelIcon';
import { Empty, Loader, Progress, StatCard } from '../../components/ui';
import { World } from '../../components/World';
import { fmtDuration, timeAgo } from '../../lib/format';
import { useGame } from '../../lib/game';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import type { Announcement, Badge, EventItem, Notification, QuestBoard, UserStats } from '../../lib/types';

interface MyCourse {
  course_id: number;
  title: string;
  slug: string;
  cover_url: string | null;
  status: 'in_progress' | 'completed';
  progress: number;
  final_grade: number | null;
  certificate_code: string | null;
  has_certificate: number;
  study_seconds: number;
  next_lesson_id: number | null;
  completed_at: string | null;
  last_access_at: string | null;
}

/** Base do aluno: o mundo 2D no topo e, abaixo, o diário de bordo com progresso e missões. */
export function Dashboard() {
  useDocumentTitle(BRAND.world.name);
  const [params] = useSearchParams();
  const { summary } = useGame();
  const profile = useApi<{ stats: UserStats; badges: Badge[]; rank: number | null }>('/profile');
  const allBadges = useApi<{ badges: Badge[] }>('/gamification/badges', [summary?.points]);
  const quests = useApi<QuestBoard>('/gamification/quests', [summary?.points, summary?.claimableQuests]);
  const courses = useApi<{ courses: MyCourse[] }>('/learning/my-courses');
  const notes = useApi<{ notifications: Notification[] }>('/communication/notifications');
  const ann = useApi<{ announcements: Announcement[] }>('/catalog/announcements');
  const events = useApi<{ events: EventItem[] }>('/catalog/events');

  const inProgress = courses.data?.courses.filter((c) => c.status === 'in_progress') ?? [];
  const completed = courses.data?.courses.filter((c) => c.status === 'completed') ?? [];
  // Próximas medalhas: as não conquistadas mais perto da meta.
  const nextBadges = (allBadges.data?.badges ?? [])
    .filter((b) => !b.awarded_at)
    .sort((a, b) => (b.current ?? 0) / (b.goal ?? 1) - (a.current ?? 0) / (a.goal ?? 1))
    .slice(0, 3);

  return (
    <div className="container page">
      <World welcome={params.has('bemvindo')} />

      <Loader data={profile.data} error={profile.error}>
        {({ stats, badges, rank }) => (
          <div className="grid grid-4 mt">
            <StatCard label="XP total" icon="coin" value={stats.points.toLocaleString('pt-BR')} sub={rank ? <Link to="/ranking">#{rank} no ranking geral</Link> : undefined} />
            <StatCard label="Missões cumpridas" icon="target" value={stats.questsCompleted} sub={<Link to="/missoes">Ver missões</Link>} />
            <StatCard label="Tempo de estudo" icon="clock" value={fmtDuration(stats.studySeconds)} sub={`${stats.lessonsCompleted} aulas concluídas`} />
            <StatCard
              label="Medalhas"
              icon="medal"
              value={badges.length}
              sub={
                badges.length ? (
                  <span className="row" style={{ gap: 4 }}>
                    {badges.slice(-6).map((b) => (
                      <PixelIcon key={b.code} name={b.icon} size={16} title={b.name} />
                    ))}
                  </span>
                ) : (
                  'Conquiste a primeira!'
                )
              }
            />
          </div>
        )}
      </Loader>

      {ann.data && ann.data.announcements.length > 0 && (
        <div className="section">
          <AnnouncementList items={ann.data.announcements} />
        </div>
      )}

      <div className="section split">
        <div>
          <div className="section-head">
            <h2>
              <PixelIcon name="compass" size={22} /> Expedições em andamento
            </h2>
            <Link to="/jornada">Ver no mapa ›</Link>
          </div>
          <Loader data={courses.data} error={courses.error}>
            {() =>
              inProgress.length ? (
                <div className="stack">
                  {inProgress.map((c) => (
                    <div key={c.course_id} className="card flat row" style={{ flexWrap: 'nowrap' }}>
                      <div className="thumb" style={{ backgroundImage: c.cover_url ? `url(${c.cover_url})` : undefined }} aria-hidden />
                      <div className="grow stack" style={{ gap: 6 }}>
                        <Link to={`/aprender/${c.slug}`}>
                          <strong>{c.title}</strong>
                        </Link>
                        <Progress value={c.progress} />
                        <span className="muted small">
                          {Math.round(c.progress)}% · {fmtDuration(c.study_seconds)} de estudo
                          {c.last_access_at && ` · ${timeAgo(c.last_access_at)}`}
                        </span>
                      </div>
                      <Link className="btn" to={c.next_lesson_id ? `/aprender/${c.slug}/aula/${c.next_lesson_id}` : `/aprender/${c.slug}`}>
                        {c.next_lesson_id ? 'Continuar' : 'Ver curso'}
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty icon="compass" title="Nenhuma expedição em andamento. Passe na Academia, escolha um curso e ganhe XP.">
                  <Link to="/cursos" className="btn accent">
                    Ir para a Academia
                  </Link>
                </Empty>
              )
            }
          </Loader>

          {completed.length > 0 && (
            <>
              <div className="section-head section">
                <h2>
                  <PixelIcon name="flag" size={22} /> Expedições concluídas
                </h2>
              </div>
              <div className="card pad-0 table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Curso</th>
                      <th className="num">Nota</th>
                      <th>Concluído</th>
                      <th>Certificado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completed.map((c) => (
                      <tr key={c.course_id}>
                        <td>
                          <Link to={`/aprender/${c.slug}`}>{c.title}</Link>
                        </td>
                        <td className="num">{c.final_grade ?? '—'}</td>
                        <td>{c.completed_at ? new Date(c.completed_at).toLocaleDateString('pt-BR') : '—'}</td>
                        <td>
                          {c.certificate_code ? (
                            <a href={`/api/certificates/${c.certificate_code}/pdf`} target="_blank" rel="noreferrer">
                              <PixelIcon name="download" size={14} /> Baixar
                            </a>
                          ) : c.has_certificate ? (
                            <Link to={`/aprender/${c.slug}`}>Emitir</Link>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <aside className="stack">
          {summary && (
            <div className="card">
              <div className="card-title">
                <span>
                  <PixelIcon name="flame" size={18} /> {summary.currentStreak} {summary.currentStreak === 1 ? 'dia seguido' : 'dias seguidos'}
                </span>
                <span className="muted small">recorde {summary.bestStreak}</span>
              </div>
              <WeekStreak week={summary.week} today={summary.today} />
            </div>
          )}
          <div className="card quest-card">
            <div className="card-title">
              <span>
                <PixelIcon name="target" size={18} /> Missões do dia
              </span>
              <Link to="/missoes" className="small">
                Todas
              </Link>
            </div>
            <Loader data={quests.data} error={quests.error}>
              {(q) => <QuestList quests={q.daily} onChange={quests.setData} />}
            </Loader>
          </div>
          {nextBadges.length > 0 && (
            <div className="card">
              <div className="card-title">
                <span>
                  <PixelIcon name="medal" size={18} /> Próximas medalhas
                </span>
                <Link to="/perfil" className="small">
                  Coleção
                </Link>
              </div>
              <div className="stack" style={{ gap: 10 }}>
                {nextBadges.map((b) => (
                  <div key={b.code} className="row" style={{ flexWrap: 'nowrap' }}>
                    <span className={`mini-medal tier-${b.tier ?? 'bronze'}`}>
                      <PixelIcon name={b.icon} size={20} />
                    </span>
                    <div className="grow">
                      <div className="small">
                        <strong>{b.name}</strong> <span className="muted">· {b.description}</span>
                      </div>
                      <Progress value={((b.current ?? 0) / (b.goal ?? 1)) * 100} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="card">
            <div className="card-title">
              <span>
                <PixelIcon name="bell" size={18} /> Notificações
              </span>
              <Link to="/notificacoes" className="small">
                Ver todas
              </Link>
            </div>
            {notes.data?.notifications.slice(0, 5).map((n) => (
              <div key={n.id} className="small" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                {n.link ? <Link to={n.link}>{n.title}</Link> : n.title}
                <div className="muted">{timeAgo(n.created_at)}</div>
              </div>
            ))}
            {notes.data && !notes.data.notifications.length && <p className="muted small">Nada por aqui ainda.</p>}
          </div>
          <div className="card">
            <div className="card-title">
              <span>
                <PixelIcon name="calendar" size={18} /> Próximos eventos
              </span>
            </div>
            <div className="stack">
              {events.data?.events.slice(0, 3).map((e) => <EventCard key={e.id} e={e} />)}
              {events.data && !events.data.events.length && <p className="muted small">Nenhum evento agendado.</p>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
