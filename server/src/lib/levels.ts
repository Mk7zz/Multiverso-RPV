/**
 * Níveis da jornada no Vale: o(a) aluno(a) nasce como semente e sobe a serra até virar lenda.
 * Os limites são em XP (pontos acumulados). O ícone é o nome de um ícone pixel-art do frontend.
 */
export const LEVELS = [
  { level: 1, name: 'Semente', icon: 'seed', min: 0 },
  { level: 2, name: 'Broto', icon: 'sprout', min: 100 },
  { level: 3, name: 'Nascente', icon: 'drop', min: 250 },
  { level: 4, name: 'Riacho', icon: 'creek', min: 500 },
  { level: 5, name: 'Correnteza', icon: 'wave', min: 850 },
  { level: 6, name: 'Rio Pomba', icon: 'canoe', min: 1300 },
  { level: 7, name: 'Trilheiro(a) do Vale', icon: 'boot', min: 1900 },
  { level: 8, name: 'Desbravador(a) da Serra', icon: 'mountain', min: 2700 },
  { level: 9, name: 'Guardião(ã) do Vale', icon: 'shield', min: 3700 },
  { level: 10, name: 'Lenda do Valley', icon: 'summit', min: 5000 },
] as const;

export interface LevelInfo {
  level: number;
  name: string;
  icon: string;
  min: number;
  /** XP necessário para o próximo nível (null no nível máximo). */
  next: number | null;
  /** 0–100: quanto do nível atual já foi percorrido. */
  progress: number;
}

export function levelInfo(points: number): LevelInfo {
  const p = Math.max(0, points || 0);
  let i = 0;
  while (i + 1 < LEVELS.length && p >= LEVELS[i + 1].min) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1]?.min ?? null;
  const progress = next === null ? 100 : Math.floor(((p - cur.min) / (next - cur.min)) * 100);
  return { level: cur.level, name: cur.name, icon: cur.icon, min: cur.min, next, progress };
}
