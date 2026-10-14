import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { api } from './api';
import { useAuth } from './auth';
import type { GameSummary, LevelInfo } from './types';

interface XpFloat {
  id: number;
  points: number;
}

interface GameState {
  summary: GameSummary | null;
  reload: () => void;
  floats: XpFloat[];
  levelUp: LevelInfo | null;
  closeLevelUp: () => void;
}

const Ctx = createContext<GameState | null>(null);
let floatSeq = 0;

/**
 * Estado de jogo do aluno: resumo do HUD (nível, XP, sequência, missões prontas),
 * "+XP" flutuante a cada ponto ganho e a celebração de subida de nível.
 * Os eventos chegam por SSE (via NotificationProvider) como CustomEvents da janela.
 */
export function GameProvider({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [floats, setFloats] = useState<XpFloat[]>([]);
  const [levelUp, setLevelUp] = useState<LevelInfo | null>(null);
  const location = useLocation();
  const isStudent = user?.role === 'student';

  const reload = useCallback(() => {
    if (!isStudent) return;
    api
      .get<GameSummary>('/gamification/summary')
      .then(setSummary)
      .catch(() => {});
  }, [isStudent]);

  useEffect(() => {
    if (!isStudent) setSummary(null);
  }, [isStudent]);

  // Missões podem ficar prontas sem ganho de XP (ex.: tempo de estudo), então o HUD se atualiza ao navegar.
  useEffect(reload, [reload, location.pathname]);

  useEffect(() => {
    const onXp = (e: Event) => {
      const d = (e as CustomEvent<{ points: number; total: number; level: LevelInfo }>).detail;
      const id = ++floatSeq;
      setFloats((f) => [...f.slice(-4), { id, points: d.points }]);
      setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1800);
      setUser((u) => (u ? { ...u, points: d.total, level: d.level } : u));
      reload();
    };
    const onLevel = (e: Event) => setLevelUp((e as CustomEvent<{ level: LevelInfo }>).detail.level);
    window.addEventListener('rpv:xp', onXp);
    window.addEventListener('rpv:level_up', onLevel);
    return () => {
      window.removeEventListener('rpv:xp', onXp);
      window.removeEventListener('rpv:level_up', onLevel);
    };
  }, [reload, setUser]);

  return <Ctx.Provider value={{ summary, reload, floats, levelUp, closeLevelUp: () => setLevelUp(null) }}>{children}</Ctx.Provider>;
}

export function useGame() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGame fora do GameProvider');
  return ctx;
}

export const WEEKDAYS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export const TIER_LABEL = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', lendaria: 'Lendária' } as const;
