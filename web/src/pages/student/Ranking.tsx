import { useState } from 'react';
import { Avatar } from '../../components/Avatar';
import { LevelBadge } from '../../components/Game';
import { Loader } from '../../components/ui';
import { useApi, useDocumentTitle } from '../../lib/hooks';
import type { PublicUser } from '../../lib/types';
import { PixelIcon } from '../../components/PixelIcon';

type Row = PublicUser & { position: number; score: number; is_me: boolean };

export function Ranking() {
  useDocumentTitle('Ranking');
  const [period, setPeriod] = useState<'all' | 'month'>('all');
  const [scope, setScope] = useState<'all' | 'friends' | 'municipality'>('all');
  const { data, error } = useApi<{ ranking: Row[]; myPosition: number | null }>(`/gamification/ranking?period=${period}&scope=${scope}`);
  const medal = (p: number) => (p <= 3 ? <span className={`rank-medal m${p}`}>{p}</span> : p);

  return (
    <div className="container page" style={{ maxWidth: 820 }}>
      <div className="page-hero">
        <span className="page-hero-icon">
          <PixelIcon name="crown" size={36} />
        </span>
        <div>
          <h1>Arena</h1>
          <p className="text-2" style={{ margin: 0 }}>
            Ganhe XP concluindo aulas, exercícios, avaliações, cursos e missões, e estudando todos os dias.
          </p>
        </div>
      </div>
      <div className="row mb between">
        <div className="chips">
          {(
            [
              ['all', 'Geral'],
              ['municipality', 'Meu município'],
              ['friends', 'Amigos'],
            ] as const
          ).map(([v, l]) => (
            <button key={v} className={`chip ${scope === v ? 'on' : ''}`} onClick={() => setScope(v)}>
              {l}
            </button>
          ))}
        </div>
        <div className="chips">
          {(
            [
              ['all', 'Desde sempre'],
              ['month', 'Este mês'],
            ] as const
          ).map(([v, l]) => (
            <button key={v} className={`chip ${period === v ? 'on' : ''}`} onClick={() => setPeriod(v)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <Loader data={data} error={error}>
        {(d) => (
          <>
            {d.myPosition && <div className="alert info mb">Você está na posição <strong>#{d.myPosition}</strong>.</div>}
            {d.ranking.length >= 3 && (
              <div className="podium">
                {[d.ranking[1], d.ranking[0], d.ranking[2]].map((r) => (
                  <div key={r.id} className={`podium-col p${r.position} ${r.is_me ? 'me' : ''}`}>
                    <span className="podium-crown">{r.position === 1 ? <PixelIcon name="crown" size={28} /> : <PixelIcon name="medal" size={22} />}</span>
                    <div className="player-avatar">
                      <Avatar config={r.avatar} name={r.name} size={r.position === 1 ? 84 : 68} />
                      <LevelBadge level={r.level} size="sm" />
                    </div>
                    <strong className="truncate podium-name">{r.name.split(' ')[0]}</strong>
                    <span className="small muted">{r.score.toLocaleString('pt-BR')} XP</span>
                    <div className="podium-block">{r.position}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="card pad-0">
              {d.ranking.slice(d.ranking.length >= 3 ? 3 : 0).map((r) => (
                <div key={r.id} className={`rank-row ${r.is_me ? 'me' : ''}`}>
                  <span className={`rank-pos ${r.position <= 3 ? 'top' : ''}`}>{medal(r.position)}</span>
                  <Avatar config={r.avatar} name={r.name} size={40} />
                  <div className="grow">
                    <strong>
                      {r.name}
                      {r.is_me && ' (você)'}
                    </strong>
                    <div className="muted small">
                      <PixelIcon name={r.level.icon} size={14} /> Nv {r.level.level} · {r.level.name} · {r.municipality ?? '—'}
                    </div>
                  </div>
                  <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{r.score.toLocaleString('pt-BR')} XP</strong>
                </div>
              ))}
              {!d.ranking.length && <p className="muted center" style={{ padding: 20 }}>Ninguém pontuou ainda neste filtro.</p>}
            </div>
          </>
        )}
      </Loader>
    </div>
  );
}
