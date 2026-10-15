import { fromAscii, outline, toRuns } from '../lib/pixel';
import { Pixels } from './Scene';

/*
 * Mestres do Saber: personagens da cultura popular desenhados à mão, pixel a pixel.
 * Seu Zico (visual provisório até a equipe definir as características): chapéu de palha,
 * cabelo e bigode brancos, camisa xadrez e bengala.
 */

const INK = '#1b2b33';

const ZICO_PAL: Record<string, string> = {
  h: '#ecc96a', // palha do chapéu
  H: '#c79a3c', // aba do chapéu na sombra
  b: '#8a3b2a', // fita do chapéu
  s: '#b97a45', // pele
  S: '#97602f', // pele na sombra
  m: '#d98a6a', // bochecha
  w: '#f3f1ea', // cabelo e bigode brancos
  k: INK, // olhos
  r: '#c0392b', // camisa xadrez
  R: '#f0e2c8', // listras claras do xadrez
  B: '#3b2412', // cinto
  p: '#5a6b7a', // calça
  P: '#45535f',
  o: '#4a2c17', // sapatos
  c: '#8a5a2b', // bengala
};

const HEAD = [
  '......hh......',
  '.....hhhh.....',
  '....hhhhhh....',
  '....bbbbbb....',
  '..hhhhhhhhhh..',
  '...HHHHHHHH...',
  '...wssssssw...',
];
const EYES_OPEN = '...skssssks...';
const EYES_SHUT = '...sSssssSs...';

const STAND = [
  '...smssssms...',
  '...swwwwwws...',
  '....wsSSsw....',
  '......SS......',
  '...rRrRRrRr...',
  '..rrRrRRrRrr..',
  '..RRRRRRRRRR..',
  '..rrRrRRrRrrcc',
  '..ssBBBBBBssc.',
];

/** Acenando: o braço esquerdo sobe até a altura do chapéu. */
const WAVE = [
  '.s.smssssms...',
  '.r.swwwwwws...',
  '.r..wsSSsw....',
  '.r....SS......',
  '.rrrRrRRrRr...',
  '...rRrRRrRrr..',
  '...RRRRRRRRR..',
  '...rRrRRrRrrcc',
  '....BBBBBBssc.',
];

const LEGS = ['....pppppp..c.', '....pPpppP..c.', '....pp..pp..c.', '....pp..pp..c.', '...ooo..ooo.c.'];

const pad = (rows: string[]) => ['.'.repeat(16), ...rows.map((r) => `.${r}.`), '.'.repeat(16)];
const sprite = (eyes: string, body: string[]) => toRuns(outline(fromAscii(pad([...HEAD, eyes, ...body, ...LEGS]), ZICO_PAL), INK));

const ZICO = {
  stand: sprite(EYES_OPEN, STAND),
  blink: sprite(EYES_SHUT, STAND),
  wave: sprite(EYES_OPEN, WAVE),
};

export const ZICO_W = 16;
export const ZICO_H = 24;
const SCALE = 0.7;

export type ZicoFrame = keyof typeof ZICO;

/** Seu Zico no mapa, com os pés em (x, y). */
export function ZicoSprite({ x, y, frame }: { x: number; y: number; frame: ZicoFrame }) {
  const w = ZICO_W * SCALE;
  const h = ZICO_H * SCALE;
  return (
    <g transform={`translate(${(x - w / 2).toFixed(2)} ${(y - h + 1).toFixed(2)})`}>
      <ellipse cx={w / 2} cy={h - 1.2} rx={5.5} ry={1.6} fill="#000" opacity={0.2} />
      <rect width={w} height={h} fill="transparent" />
      <g transform={`scale(${SCALE})`}>
        <Pixels runs={ZICO[frame]} />
      </g>
    </g>
  );
}

/** Rosto do Seu Zico para a caixa de diálogo. */
export function ZicoPortrait({ size = 64 }: { size?: number }) {
  return (
    <svg className="mestre-portrait" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
      <Pixels runs={ZICO.wave} />
    </svg>
  );
}
