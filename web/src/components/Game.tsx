import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../lib/api';
import { fmtDate } from '../lib/format';
import { TIER_LABEL, useGame, WEEKDAYS } from '../lib/game';
import type { Badge, LevelInfo, Quest, QuestBoard } from '../lib/types';
import { useAuth } from '../lib/auth';
import { Avatar } from './Avatar';
import { PixelIcon } from './PixelIcon';
import { PixelValley } from './Scene';

export { RpvMark } from './Scene';

/** Faixa decorativa do vale (serras com a rede de nós e o rio). */
export function ValleyScene({ className = '' }: { className?: string }) {
  return <PixelValley variant="strip" className={`valley-scene ${className}`} />;
}
export function LevelBadge({ level, size = 'md' }: { level: LevelInfo; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`level-badge ${size}`} title={`Nível ${level.level} · ${level.name}`}>
      <span className="level-num">{level.level}</span>
      <PixelIcon name={level.icon} size={size === 'lg' ? 22 : size === 'sm' ? 14 : 18} />
    </span>
  );
}

export function XpBar({ level, points, compact }: { level: LevelInfo; points: number; compact?: boolean }) {
  return (
    <div className={`xp ${compact ? 'compact' : ''}`}>
      <div className="xp-track" role="progressbar" aria-valuenow={level.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso de XP no nível">
        <div className="xp-fill" style={{ width: `${level.progress}%` }} />
      </div>
      {!compact && (
        <div className="xp-legend">
          <span>{points.toLocaleString('pt-BR')} XP</span>
          <span>{level.next === null ? 'Nível máximo!' : `faltam ${(level.next - points).toLocaleString('pt-BR')} XP para o nível ${level.level + 1}`}</span>
        </div>
      )}
    </div>
  );
}

/** Chip do cabeçalho: nível, barra de XP e sequência. */
export function HudChip() {
  const { summary } = useGame();
  if (!summary) return null;
  return (
    <Link to="/painel" className="hud" title={`Nível ${summary.level.level} · ${summary.level.name} — ${summary.points} XP`}>
      <LevelBadge level={summary.level} size="sm" />
      <span className="hud-xp">
        <span className="hud-name">{summary.level.name}</span>
        <XpBar level={summary.level} points={summary.points} compact />
      </span>
      <span className={`hud-streak ${summary.currentStreak ? 'on' : ''}`} title="Sequência de dias estudando">
        <PixelIcon name="flame" size={16} />
        {summary.currentStreak}
      </span>
    </Link>
  );
}

export function WeekStreak({ week, today }: { week: { day: string; studied: boolean }[]; today: string }) {
  return (
    <div className="week">
      {week.map((d, i) => (
        <div key={d.day} className={`week-day ${d.studied ? 'on' : ''} ${d.day === today ? 'today' : ''} ${d.day > today ? 'future' : ''}`}>
          <span className="week-dot">{d.studied && <PixelIcon name="flame" size={16} />}</span>
          <span className="week-label">{WEEKDAYS[i]}</span>
        </div>
      ))}
    </div>
  );
}

/** "+10 XP" flutuante a cada pontuação recebida. */
export function XpFloats() {
  const { floats } = useGame();
  return (
    <div className="xp-floats" aria-live="polite">
      {floats.map((f) => (
        <span key={f.id} className="xp-float">
          +{f.points} XP
        </span>
      ))}
    </div>
  );
}

const CONFETTI = ['#8cc63f', '#3aa655', '#12a3a0', '#f2b705', '#ffffff', '#1f7a4d'];

export function LevelUpModal() {
  const { levelUp, closeLevelUp } = useGame();
  const { user } = useAuth();
  const pieces = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2.2 + Math.random() * 1.6,
        color: CONFETTI[i % CONFETTI.length],
        rotate: Math.random() * 360,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [levelUp?.level],
  );
  if (!levelUp) return null;
  return (
    <div className="modal-backdrop levelup-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closeLevelUp()}>
      <div className="confetti" aria-hidden>
        {pieces.map((p, i) => (
          <span key={i} style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`, transform: `rotate(${p.rotate}deg)` }} />
        ))}
      </div>
      <div className="levelup" role="dialog" aria-modal="true" aria-label="Você subiu de nível">
        <ValleyScene className="levelup-scene" />
        <span className="levelup-kicker">Subiu de nível!</span>
        <div className="levelup-hero">
          <Avatar config={user?.avatar} name={user?.name} size={110} variant="full" />
          <PixelIcon name={levelUp.icon} size={48} className="levelup-icon" />
        </div>
        <h2>
          Nível {levelUp.level} · {levelUp.name}
        </h2>
        <p className="text-2">{levelUp.next === null ? 'Você chegou ao cume. Agora você é lenda!' : `Próxima parada: ${levelUp.next.toLocaleString('pt-BR')} XP.`}</p>
        <button className="btn lg" onClick={closeLevelUp} autoFocus>
          Continuar ›
        </button>
      </div>
    </div>
  );
}

export function QuestItem({ q, onClaim, busy }: { q: Quest; onClaim: (code: string) => void; busy: boolean }) {
  const pct = Math.round((q.current / q.goal) * 100);
  return (
    <div className={`quest ${q.completed ? 'done' : ''} ${q.claimed ? 'claimed' : ''} ${q.code === 'daily_chest' ? 'chest' : ''}`}>
      <span className="quest-icon" aria-hidden>
        <PixelIcon name={q.code === 'daily_chest' && q.claimed ? 'coin' : q.icon} size={24} />
      </span>
      <div className="grow">
        <div className="quest-title">{q.title}</div>
        <div className="quest-bar">
          <div style={{ width: `${pct}%` }} />
        </div>
        <span className="muted small">
          {q.current}/{q.goal}
          {q.unit ? ` ${q.unit}` : ''}
        </span>
      </div>
      {q.claimed ? (
        <span className="pill success">✓ +{q.reward} XP</span>
      ) : q.completed ? (
        <button className="btn sm accent claim" disabled={busy} onClick={() => onClaim(q.code)}>
          Resgatar +{q.reward}
        </button>
      ) : (
        <span className="pill gray">+{q.reward} XP</span>
      )}
    </div>
  );
}

/** Lista de missões com resgate de recompensa. */
export function QuestList({ quests, onChange }: { quests: Quest[]; onChange: (b: QuestBoard) => void }) {
  const { reload } = useGame();
  const [busy, setBusy] = useState(false);
  async function claim(code: string) {
    setBusy(true);
    try {
      onChange(await api.post<QuestBoard>(`/gamification/quests/${code}/claim`));
      reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack" style={{ gap: 8 }}>
      {quests.map((q) => (
        <QuestItem key={q.code} q={q} onClaim={claim} busy={busy} />
      ))}
    </div>
  );
}

export function BadgeTile({ b }: { b: Badge }) {
  const tier = b.tier ?? 'bronze';
  const goal = b.goal ?? 1;
  const current = b.current ?? (b.awarded_at ? goal : 0);
  return (
    <div className={`badge-tile tier-${tier} ${b.awarded_at ? 'earned' : 'locked'}`} title={b.description}>
      <span className="badge-medal">
        <PixelIcon name={b.icon} size={32} className="icon" />
      </span>
      <strong className="small">{b.name}</strong>
      <span className="muted small">{b.description}</span>
      <span className={`tier-tag tier-${tier}`}>{TIER_LABEL[tier]}</span>
      {b.awarded_at ? (
        <span className="pill gold">{fmtDate(b.awarded_at)}</span>
      ) : (
        goal > 1 && (
          <div className="badge-progress" title={`${current}/${goal}`}>
            <div style={{ width: `${Math.round((current / goal) * 100)}%` }} />
          </div>
        )
      )}
    </div>
  );
}
