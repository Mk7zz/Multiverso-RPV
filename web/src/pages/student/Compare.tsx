import { Link, useParams } from 'react-router';
import { Avatar } from '../../components/Avatar';
import { PixelIcon } from '../../components/PixelIcon';
import { Loader, Progress } from '../../components/ui';
import { fmtDuration } from '../../lib/format';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import type { Badge, PublicUser, UserStats } from '../../lib/types';

interface Side {
  user: PublicUser;
  stats: UserStats;
  badges: Badge[];
  courses: { id: number; title: string; slug: string; status: string; progress: number; final_grade: number | null }[];
}

const ROWS: { key: keyof UserStats; label: string; fmt?: (v: number) => string }[] = [
  { key: 'points', label: 'Pontos' },
  { key: 'currentStreak', label: 'Sequência atual (dias)' },
  { key: 'bestStreak', label: 'Maior sequência (dias)' },
  { key: 'coursesCompleted', label: 'Cursos concluídos' },
  { key: 'certificates', label: 'Certificados' },
  { key: 'lessonsCompleted', label: 'Aulas concluídas' },
  { key: 'quizzesPassed', label: 'Avaliações aprovadas' },
  { key: 'studySeconds', label: 'Tempo de estudo', fmt: fmtDuration },
];

/** Comparação de perfis entre amigos. */
export function Compare() {
  const { id } = useParams();
  const { data, error } = useApi<{ me: Side; friend: Side }>(`/connections/compare/${id}`);
  useDocumentTitle('Comparar perfis');

  return (
    <div className="container page" style={{ maxWidth: 920 }}>
      <Link to="/conexoes" className="small">
        ← Conexões
      </Link>
      <h1 style={{ marginTop: 8 }}>Comparar perfis</h1>
      <Loader data={data} error={error}>
        {({ me, friend }) => {
          const courseIds = [...new Set([...me.courses, ...friend.courses].map((c) => c.id))];
          const course = (s: Side, cid: number) => s.courses.find((c) => c.id === cid);
          return (
            <>
              <div className="card pad-0 table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th />
                      {[me, friend].map((s, i) => (
                        <th key={i} className="center">
                          <div className="stack" style={{ alignItems: 'center', gap: 4 }}>
                            <Avatar config={s.user.avatar} name={s.user.name} size={56} />
                            {i === 0 ? 'Você' : s.user.name}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((r) => {
                      const a = me.stats[r.key] as number;
                      const b = friend.stats[r.key] as number;
                      const f = r.fmt ?? String;
                      return (
                        <tr key={r.key}>
                          <td>{r.label}</td>
                          <td className="center" style={{ fontWeight: a > b ? 800 : 400 }}>{f(a)}{a > b && <> <PixelIcon name="trophy" size={14} /></>}</td>
                          <td className="center" style={{ fontWeight: b > a ? 800 : 400 }}>{f(b)}{b > a && <> <PixelIcon name="trophy" size={14} /></>}</td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td>Medalhas</td>
                      <td className="center">{me.badges.length ? me.badges.map((b) => <PixelIcon key={b.code} name={b.icon} size={16} title={b.name} />) : '—'}</td>
                      <td className="center">{friend.badges.length ? friend.badges.map((b) => <PixelIcon key={b.code} name={b.icon} size={16} title={b.name} />) : '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {courseIds.length > 0 && (
                <div className="section card">
                  <div className="card-title">Progresso nos cursos</div>
                  {courseIds.map((cid) => {
                    const a = course(me, cid);
                    const b = course(friend, cid);
                    const info = a ?? b!;
                    return (
                      <div key={cid} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <Link to={`/cursos/${info.slug}`}>
                          <strong>{info.title}</strong>
                        </Link>
                        <div className="grid grid-2" style={{ gap: 10, marginTop: 6 }}>
                          {[a, b].map((c, i) => (
                            <div key={i} className="small">
                              <span className="muted">{i === 0 ? 'Você' : friend.user.name.split(' ')[0]}: </span>
                              {c ? (
                                <>
                                  {c.status === 'completed' ? '✓ concluído' : `${Math.round(c.progress)}%`}
                                  <Progress value={c.progress} gold={i === 1} />
                                </>
                              ) : (
                                <span className="muted">não inscrito</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        }}
      </Loader>
    </div>
  );
}
