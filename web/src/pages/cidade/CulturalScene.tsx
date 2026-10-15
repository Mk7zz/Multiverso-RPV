import { memo, useMemo, useRef, type MouseEvent, type ReactNode } from 'react';
import { randomLook } from '../../components/CityWorld';
import { Pixels, type DayTime } from '../../components/Scene';
import { Character } from '../../components/World';
import { sfx, type CityPlace } from '../../lib/cidade';
import { seeded } from '../../lib/pixel';
import type { AvatarConfig } from '../../lib/types';
import {
  carRuns,
  clamp,
  Clouds,
  Critters,
  DEPTH,
  EDGE,
  FarHills,
  FULL,
  GROUND_END,
  Haze,
  INK,
  initAmbient,
  makeBackdrop,
  makeSpawner,
  NearHills,
  ParticleLayer,
  pick,
  PixelText,
  rnd,
  SceneBox,
  SceneHud,
  SkyLayer,
  sprite,
  stepAmbient,
  stepParticles,
  TimeTint,
  TownLights,
  uid,
  useBubbles,
  useCamera,
  useDiscoveries,
  useLoop,
  W,
  type Discovery,
  type Particle,
} from './sceneKit';

/*
 * Visita ao Centro Cultural Humberto Mauro: um prédio pequeno de dois andares no centro da cidade,
 * com a placa vermelha comprida em cima da entrada e os pilares de cobogó dos lados. A frente de
 * baixo é aberta, como uma casa de bonecas: à esquerda o saguão com o elevador vermelho e o balcão,
 * no meio a galeria de quadros e, à direita, o teatro com as cadeiras vermelhas, o palco de cortina
 * e a tela de cinema (Humberto Mauro fez filmes aqui em Cataguases). Na calçada de pedrinhas em
 * losango, o cartaz do espetáculo, gente passando e carros na rua.
 */

const CX = 160;
/** Chão de dentro do prédio (a soleira de granito fica logo abaixo). */
const FLOOR = 88;
/** Fundo das salas (onde a parede encontra o chão). */
const BACK = 78;
const CURB = 102;
const ROAD_Y = 114;
const B = { x0: 24, x1: 296, top: 6 };
const SIGN = { y0: 40, y1: 53 };
const OPEN = 55;
const LOBBY = { x0: 34, x1: 100 };
const GALLERY = { x0: 100, x1: 196 };
const THEATER = { x0: 196, x1: 286 };
const LIFT = { x0: 42, x1: 66, door0: 48, door1: 60 };
const STAGE = { x0: 206, x1: 276, top: 59, floor: 77 };
const STAGE_CX = (STAGE.x0 + STAGE.x1) / 2;
const SCREEN = { x0: 214, x1: 268, y0: 59, h: 16 };
const BOOTH = { x: 200, y: 57 };
const FRAMES = [106, 124, 142, 160, 178];
const UP_WIN = [64, 124, 196, 256];
const SEAT_ROWS = [82, 85, 88];
const SEAT_X = Array.from({ length: 12 }, (_, i) => 200 + i * 7);
const RED = '#d42a2a';
const RED_DK = '#a51d22';
const SEAT = '#c8262b';
const UPPER = '#e6e4c6';
const UPPER_SH = '#cfcdb0';

const DISCOVERIES: Discovery[] = [
  { key: 'placa', emoji: '🟥', label: 'A placa vermelha', tip: 'Toque na placa vermelha do prédio! 🟥' },
  { key: 'elevador', emoji: '🛗', label: 'O elevador vermelho', tip: 'Toque no elevador vermelho! 🛗' },
  { key: 'quadros', emoji: '🖼️', label: 'Os quadros da galeria', tip: 'Toque nos quadros da galeria! 🖼️' },
  { key: 'cinema', emoji: '🎬', label: 'O cinema', tip: 'Toque no projetor lá no alto do teatro! 🎬' },
  { key: 'danca', emoji: '💃', label: 'A dança no palco', tip: 'Toque na cortina do palco! 💃' },
  { key: 'cadeiras', emoji: '💺', label: 'As cadeiras do teatro', tip: 'Toque nas cadeiras vermelhas! 💺' },
  { key: 'cartaz', emoji: '📜', label: 'O cartaz do espetáculo', tip: 'Toque no cartaz da calçada! 📜' },
  { key: 'gente', emoji: '👋', label: 'Quem visita o Centro Cultural', tip: 'Dê um oi pra quem está passeando! 👋' },
];

const LINES_IN = ['Olha esse quadro! 🖼️', 'Que exposição linda! 🎨', 'Vamos ver o filme? 🎬', 'Que lugar bonito! ✨'];
const LINES_DAY = ['Oi! 👋', 'Vamos no Centro Cultural? 🎭', 'Hoje tem espetáculo! 💃', 'Que dia bonito! ☀️', 'Bora ver um filme! 🎬'];
const LINES_NIGHT = ['Boa noite! 🌙', 'Hoje tem show! 🎭', 'Que noite bonita! ⭐'];
const SKIN = ['#f1c27d', '#c68642', '#8d5524', '#e0ac69'];
const HAIR = ['#2a1a12', '#5a3a1c', '#d9a441', '#1b1b1b', '#7a2e1a'];

/* ---- Sprites ---- */

/** Moço de chapéu do filme antigo (preto e branco). */
const filmManRuns = [
  sprite(['.kkk.', 'kkkkk', '.kwk.', '..k..', '.kkk.', 'k.k.k', '..k..', '.k.k.', 'k...k'], { k: '#1b1b1b', w: '#9a9a92' }, '#1b1b1b'),
  sprite(['.kkk.', 'kkkkk', '.kwk.', '..k..', '.kkk.', 'k.k.k', '..k..', '..k..', '.k.k.'], { k: '#1b1b1b', w: '#9a9a92' }, '#1b1b1b'),
];

/* ---- Prédio ---- */

/** Pilar de cobogó (tijolinho vazado) com a base de granito preto. */
function Cobogo({ x0, x1 }: { x0: number; x1: number }) {
  const holes: ReactNode[] = [];
  for (let y = OPEN + 1; y < FLOOR - 7; y += 3) for (let x = x0 + 1; x < x1 - 1; x += 3) holes.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.5} height={1.5} fill="#4a2a22" />);
  return (
    <g>
      <rect x={x0 - 1} y={OPEN} width={x1 - x0 + 2} height={FLOOR - OPEN} fill={INK} />
      <rect x={x0} y={OPEN} width={x1 - x0} height={FLOOR - OPEN} fill="#9a5a48" />
      {holes}
      <rect x={x0} y={OPEN} width={1} height={FLOOR - OPEN - 6} fill="#b8705a" />
      <rect x={x0} y={FLOOR - 6} width={x1 - x0} height={6} fill="#2b2f33" />
      <rect x={x0} y={FLOOR - 6} width={x1 - x0} height={1} fill="#4a5258" />
    </g>
  );
}

/** Andar de cima com as janelas de persiana e o forro da entrada (o que fica parado). */
const Facade = memo(function Facade({ night }: { night: boolean }) {
  const glass = night ? '#ffd76a' : '#9fb4bc';
  return (
    <g>
      {/* Paredes de cima com a platibanda */}
      <rect x={B.x0 - 1} y={B.top - 1} width={B.x1 - B.x0 + 2} height={SIGN.y0 - B.top + 1} fill={INK} />
      <rect x={B.x0} y={B.top} width={B.x1 - B.x0} height={SIGN.y0 - B.top} fill={UPPER} />
      <rect x={B.x0} y={B.top} width={B.x1 - B.x0} height={3} fill={UPPER_SH} />
      <rect x={B.x0} y={B.top + 3} width={B.x1 - B.x0} height={1} fill="#000" opacity={0.08} />
      <rect x={B.x0} y={SIGN.y0 - 3} width={B.x1 - B.x0} height={3} fill={UPPER_SH} />
      {upperWindows(glass, night)}
      {/* Cano do ar-condicionado */}
      <rect x={B.x1 - 6} y={B.top + 4} width={2} height={SIGN.y0 - B.top - 4} fill="#d9d9d2" />
      {/* Forro da entrada */}
      <rect x={B.x0} y={SIGN.y1} width={B.x1 - B.x0} height={OPEN - SIGN.y1} fill="#f4f1e6" />
    </g>
  );
});

function upperWindows(glass: string, night: boolean): ReactNode[] {
  return UP_WIN.map((x, i) => (
    <g key={x}>
      <rect x={x - 14} y={14} width={28} height={19} fill={INK} />
      <rect x={x - 13} y={15} width={26} height={17} fill="#f4f1de" />
      <rect x={x - 12} y={16} width={24} height={15} fill={glass} />
      {/* Persiana meio baixada */}
      {Array.from({ length: night ? 3 : 5 }, (_, k) => (
        <rect key={k} x={x - 12} y={16 + k * 2} width={24} height={1} fill={night ? '#f2e2b0' : '#eef0ea'} />
      ))}
      <rect x={x - 0.5} y={16} width={1} height={15} fill="#f4f1de" />
      {/* Ar-condicionado debaixo de algumas janelas */}
      {i % 2 === 0 && (
        <g>
          <rect x={x + 3} y={33} width={10} height={4} fill={INK} />
          <rect x={x + 4} y={33} width={8} height={3} fill="#ecece6" />
          <rect x={x + 5} y={34} width={6} height={1} fill="#b9bdb8" />
        </g>
      )}
    </g>
  ));
}

/** Logotipo da placa: quadrado branco com a porta entreaberta. */
function Logo({ x, y }: { x: number; y: number }) {
  return (
    <g fill="#ffffff">
      <rect x={x} y={y} width={8} height={1} />
      <rect x={x} y={y} width={1} height={10} />
      <rect x={x + 7} y={y} width={1} height={10} />
      <path d={`M${x + 1} ${y + 1}L${x + 5} ${y + 2}L${x + 5} ${y + 10}L${x + 1} ${y + 10}Z`} />
    </g>
  );
}

/** Placa vermelha comprida: CENTRO CULTURAL grande e HUMBERTO MAURO menor; tocada, as letras brilham. */
function Sign({ glow, t, night }: { glow: boolean; t: number; night: boolean }) {
  const lit = glow && Math.sin(t * 18) > 0;
  const text = lit ? '#ffe27a' : '#ffffff';
  return (
    <g>
      <rect x={B.x0 - 2} y={SIGN.y0 - 1} width={B.x1 - B.x0 + 4} height={SIGN.y1 - SIGN.y0 + 2} fill={INK} />
      <rect x={B.x0 - 1} y={SIGN.y0} width={B.x1 - B.x0 + 2} height={SIGN.y1 - SIGN.y0} fill={night ? '#e63a36' : RED} />
      <rect x={B.x0 - 1} y={SIGN.y0} width={B.x1 - B.x0 + 2} height={1} fill="#ef6a5e" />
      <rect x={B.x0 - 1} y={SIGN.y1 - 2} width={B.x1 - B.x0 + 2} height={2} fill={RED_DK} />
      <Logo x={61} y={41} />
      <g transform="translate(77 42) scale(2)">
        <PixelText text="CENTRO CULTURAL" x={0} y={0} fill={text} />
      </g>
      <PixelText text="HUMBERTO MAURO" x={199} y={47} fill={text} />
    </g>
  );
}

/** Quadros da galeria: cada toque troca a obra. */
function Art({ k, x, y }: { k: number; x: number; y: number }) {
  const ix = x + 1;
  const iy = y + 1;
  switch (k % 6) {
    case 0:
      return (
        <g>
          <rect x={ix} y={iy} width={10} height={11} fill="#f6f4ee" />
          <path d={`M${ix + 2} ${iy + 9}L${ix + 6} ${iy + 3}L${ix + 4} ${iy + 3}L${ix + 8} ${iy + 1}L${ix + 8} ${iy + 5}L${ix + 7} ${iy + 4}L${ix + 3} ${iy + 10}Z`} fill="#e0402e" />
        </g>
      );
    case 1:
      return (
        <g>
          <rect x={ix} y={iy} width={10} height={11} fill="#ead9b5" />
          <rect x={ix + 2} y={iy + 3} width={2} height={2} fill="#d64545" />
          <rect x={ix + 6} y={iy + 3} width={2} height={2} fill="#d64545" />
          <rect x={ix + 2} y={iy + 5} width={6} height={2} fill="#d64545" />
          <rect x={ix + 3} y={iy + 7} width={4} height={1} fill="#d64545" />
          <rect x={ix + 4} y={iy + 8} width={2} height={1} fill="#d64545" />
        </g>
      );
    case 2:
      return (
        <g>
          {['#2f5fb3', '#f2b705', '#12a3a0', '#d64545', '#8cc63f'].map((c, i) => (
            <rect key={c} x={ix + i * 2} y={iy} width={2} height={11} fill={c} />
          ))}
        </g>
      );
    case 3:
      return (
        <g>
          <rect x={ix} y={iy} width={10} height={11} fill="#9fd3ee" />
          <rect x={ix + 6} y={iy + 2} width={2} height={2} fill="#f2c200" />
          <path d={`M${ix} ${iy + 8}L${ix + 3} ${iy + 5}L${ix + 6} ${iy + 8}L${ix + 8} ${iy + 6}L${ix + 10} ${iy + 8}L${ix + 10} ${iy + 11}L${ix} ${iy + 11}Z`} fill="#4caf5a" />
          <rect x={ix} y={iy + 9} width={10} height={2} fill="#2f8f4a" />
        </g>
      );
    case 4:
      return (
        <g>
          <rect x={ix} y={iy} width={10} height={11} fill="#33424d" />
          <rect x={ix + 2} y={iy + 1} width={6} height={2} fill="#1b1b1b" />
          <rect x={ix + 3} y={iy + 3} width={4} height={4} fill="#e0ac69" />
          <rect x={ix + 4} y={iy + 4} width={1} height={1} fill="#1b1b1b" />
          <rect x={ix + 6} y={iy + 4} width={1} height={1} fill="#1b1b1b" />
          <rect x={ix + 2} y={iy + 7} width={6} height={4} fill="#e8e2d0" />
        </g>
      );
    default:
      // Azulejo azul e branco
      return (
        <g>
          <rect x={ix} y={iy} width={10} height={11} fill="#f6f4ee" />
          {[0, 5].map((dx) =>
            [0, 5].map((dy) => (
              <g key={`${dx}${dy}`} fill="#2f5fb3">
                <rect x={ix + dx + 2} y={iy + dy + 1} width={1} height={3} />
                <rect x={ix + dx + 1} y={iy + dy + 2} width={3} height={1} />
              </g>
            )),
          )}
        </g>
      );
  }
}

/** Salas de dentro: saguão, galeria e teatro (as paredes do fundo e os chãos). */
const Rooms = memo(function Rooms({ night }: { night: boolean }) {
  const marble = useMemo(() => {
    const rand = seeded(41);
    return Array.from({ length: 40 }, () => ({ x: LOBBY.x0 + rand() * (LOBBY.x1 - LOBBY.x0), y: BACK + 1 + rand() * (FLOOR - BACK - 2), w: 2 + rand() * 4 }));
  }, []);
  return (
    <g>
      {/* Saguão: parede creme, faixa vermelha atrás do elevador e piso de mármore */}
      <rect x={LOBBY.x0} y={OPEN} width={LOBBY.x1 - LOBBY.x0} height={BACK - OPEN} fill="#efe6d2" />
      <rect x={LOBBY.x0} y={OPEN} width={40} height={BACK - OPEN} fill="#b8322f" opacity={0.85} />
      <rect x={LOBBY.x0} y={BACK} width={LOBBY.x1 - LOBBY.x0} height={FLOOR - BACK} fill="#e8dcc0" />
      {marble.map((m, i) => (
        <rect key={i} x={m.x} y={m.y} width={m.w} height={1} fill="#fff6e0" opacity={0.7} />
      ))}
      {/* Galeria: parede branca comprida e piso de madeira clara */}
      <rect x={GALLERY.x0} y={OPEN} width={GALLERY.x1 - GALLERY.x0} height={BACK - OPEN} fill="#f6f4ee" />
      <rect x={GALLERY.x0} y={BACK} width={GALLERY.x1 - GALLERY.x0} height={FLOOR - BACK} fill="#d9b98a" />
      {[81, 84, 87].map((y) => (
        <rect key={y} x={GALLERY.x0} y={y} width={GALLERY.x1 - GALLERY.x0} height={1} fill="#c9a676" />
      ))}
      <rect x={GALLERY.x0} y={BACK - 1} width={GALLERY.x1 - GALLERY.x0} height={1} fill="#d8d4c8" />
      {/* Plaquinhas embaixo dos quadros */}
      {FRAMES.map((x) => (
        <rect key={x} x={x + 4} y={75} width={4} height={1} fill="#c4c0b4" />
      ))}
      {/* Banco preto no meio da galeria */}
      <rect x={136} y={82} width={18} height={3} fill={INK} />
      <rect x={137} y={82} width={16} height={1} fill="#3d4a52" />
      <rect x={138} y={85} width={1} height={3} fill={INK} />
      <rect x={151} y={85} width={1} height={3} fill={INK} />
      {/* Teatro: parede escura, carpete e o palco */}
      <rect x={THEATER.x0} y={OPEN} width={THEATER.x1 - THEATER.x0} height={FLOOR - OPEN} fill="#262c38" />
      <rect x={THEATER.x0} y={81} width={THEATER.x1 - THEATER.x0} height={FLOOR - 81} fill="#3a3238" />
      <rect x={STAGE.x0 - 2} y={OPEN + 2} width={STAGE.x1 - STAGE.x0 + 4} height={STAGE.floor - OPEN - 2} fill="#15121a" />
      <rect x={STAGE.x0} y={STAGE.top} width={STAGE.x1 - STAGE.x0} height={STAGE.floor - STAGE.top} fill="#3b2d40" />
      <rect x={STAGE.x0} y={STAGE.floor} width={STAGE.x1 - STAGE.x0} height={4} fill="#5c3a1c" />
      <rect x={STAGE.x0} y={STAGE.floor} width={STAGE.x1 - STAGE.x0} height={1} fill="#a8742e" />
      {/* Placa de saída verde */}
      <rect x={279} y={60} width={5} height={3} fill="#2e9a4a" />
      <rect x={280} y={61} width={3} height={1} fill="#c9f2d2" />
      {/* Cabine do projetor lá no alto */}
      <rect x={BOOTH.x - 1} y={BOOTH.y - 1} width={8} height={6} fill="#15121a" />
      <rect x={BOOTH.x} y={BOOTH.y} width={6} height={4} fill={night ? '#5a5040' : '#3d4652'} />
      {/* Paredes de divisão entre as salas */}
      {[LOBBY.x1, GALLERY.x1].map((x) => (
        <g key={x}>
          <rect x={x - 1.5} y={OPEN} width={3} height={FLOOR - OPEN} fill="#cfc9b8" />
          <rect x={x - 1.5} y={OPEN} width={1} height={FLOOR - OPEN} fill="#e8e3d4" />
        </g>
      ))}
      {/* Spots do teto */}
      {[46, 62, 86, 112, 136, 160, 184].map((x) => (
        <rect key={x} x={x} y={OPEN} width={2} height={1} fill="#fff6c8" />
      ))}
    </g>
  );
});

/** Elevador vermelho com a porta de grade que abre; aceso em cima quando chega. */
function Lift({ open, arriving }: { open: number; arriving: boolean }) {
  const half = (LIFT.door1 - LIFT.door0) / 2;
  const slide = half * open;
  const grid: ReactNode[] = [];
  for (const [d0, side] of [
    [LIFT.door0 - slide, 0],
    [LIFT.door0 + half + slide, 1],
  ] as const) {
    for (let y = 66; y < FLOOR; y += 3) grid.push(<rect key={`h${side}${y}`} x={d0} y={y} width={half} height={1} fill="#4a5258" />);
    for (let x = 1; x < half; x += 3) grid.push(<rect key={`v${side}${x}`} x={d0 + x} y={65} width={1} height={FLOOR - 65} fill="#4a5258" />);
  }
  return (
    <g>
      <rect x={LIFT.x0 - 1} y={58} width={LIFT.x1 - LIFT.x0 + 2} height={FLOOR - 58} fill={INK} />
      <rect x={LIFT.x0} y={59} width={LIFT.x1 - LIFT.x0} height={FLOOR - 59} fill={SEAT} />
      <rect x={LIFT.x1 - 4} y={59} width={4} height={FLOOR - 59} fill={RED_DK} />
      <rect x={LIFT.x0} y={59} width={LIFT.x1 - LIFT.x0} height={1} fill="#e85a52" />
      {/* Lâmpada de parede e as letrinhas douradas */}
      <rect x={LIFT.x0 + 2} y={61} width={4} height={1} fill="#ffe9a8" />
      <rect x={LIFT.x0 + 15} y={61} width={6} height={1} fill="#d9a441" />
      {/* Vão da porta: escuro por dentro, a porta de grade corre para os lados */}
      <rect x={LIFT.door0 - 1} y={64} width={LIFT.door1 - LIFT.door0 + 2} height={FLOOR - 64} fill={INK} />
      <rect x={LIFT.door0} y={65} width={LIFT.door1 - LIFT.door0} height={FLOOR - 65} fill="#e9d9a8" />
      <svg x={LIFT.door0} y={65} width={LIFT.door1 - LIFT.door0} height={FLOOR - 65} viewBox={`${LIFT.door0} 65 ${LIFT.door1 - LIFT.door0} ${FLOOR - 65}`} overflow="hidden">
        <rect x={LIFT.door0 - slide} y={65} width={half} height={FLOOR - 65} fill="#8d969c" />
        <rect x={LIFT.door0 + half + slide} y={65} width={half} height={FLOOR - 65} fill="#8d969c" />
        {grid}
      </svg>
      {/* Setinha que acende quando o elevador chega */}
      <rect x={53} y={62} width={2} height={1} fill={arriving ? '#ffe27a' : '#7a2020'} />
      <rect x={52.5} y={63} width={3} height={0.6} fill={arriving ? '#ffe27a' : '#7a2020'} />
    </g>
  );
}

/** Balcão da recepção (tampo branco, frente de madeira escura vazada). */
function Desk() {
  return (
    <g>
      <rect x={73} y={76} width={24} height={3} fill={INK} />
      <rect x={74} y={76} width={22} height={2} fill="#f4f1e6" />
      <rect x={75} y={79} width={20} height={8} fill="#4a2e22" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={76 + i * 3} y={80} width={1.5} height={6} fill="#2e1c14" />
      ))}
      <rect x={75} y={87} width={20} height={1} fill="#2e1c14" />
    </g>
  );
}

/** Cortina vermelha do palco: `open` de 0 (fechada) a 1 (aberta). */
function Curtain({ open }: { open: number }) {
  const full = (STAGE.x1 - STAGE.x0) / 2;
  const w = full - (full - 6) * open;
  const folds = (x0: number, w0: number) =>
    Array.from({ length: Math.max(1, Math.floor(w0 / 3)) }, (_, i) => <rect key={i} x={x0 + 1 + i * 3} y={STAGE.top} width={1} height={STAGE.floor - STAGE.top} fill="#7e1219" />);
  return (
    <g>
      <rect x={STAGE.x0} y={STAGE.top} width={w} height={STAGE.floor - STAGE.top} fill="#b3202a" />
      {folds(STAGE.x0, w)}
      <rect x={STAGE.x1 - w} y={STAGE.top} width={w} height={STAGE.floor - STAGE.top} fill="#b3202a" />
      {folds(STAGE.x1 - w, w)}
      {/* Bambinela com franja dourada */}
      <rect x={STAGE.x0 - 1} y={STAGE.top - 3} width={STAGE.x1 - STAGE.x0 + 2} height={4} fill="#b3202a" />
      {Array.from({ length: 24 }, (_, i) => (
        <rect key={i} x={STAGE.x0 + i * 3} y={STAGE.top + 1} width={2} height={1} fill="#e3b341" />
      ))}
    </g>
  );
}

/** Tela de cinema que desce: quando desce toda, passa um filme antigo em preto e branco. */
function Screen({ k, t }: { k: number; t: number }) {
  if (k <= 0) return null;
  const h = SCREEN.h * k;
  const w = SCREEN.x1 - SCREEN.x0;
  const playing = k >= 1;
  const flick = 0.85 + Math.sin(t * 47) * 0.08 + Math.sin(t * 13) * 0.05;
  const manX = SCREEN.x0 + 4 + ((t * 9) % (w - 8));
  return (
    <g>
      <rect x={SCREEN.x0 - 1} y={SCREEN.y0} width={w + 2} height={h + 1} fill={INK} />
      <rect x={SCREEN.x0} y={SCREEN.y0} width={w} height={h} fill="#f1efe6" />
      {playing && (
        <g>
          <rect x={SCREEN.x0 + 1} y={SCREEN.y0 + 1} width={w - 2} height={h - 2} fill="#cfcfc6" opacity={flick} />
          <rect x={SCREEN.x0 + 1} y={SCREEN.y0 + 11} width={w - 2} height={4} fill="#7d7d76" />
          <rect x={SCREEN.x0 + 36} y={SCREEN.y0 + 3} width={3} height={3} fill="#f6f6f0" />
          <g transform={`translate(${manX.toFixed(1)} ${SCREEN.y0 + 2})`}>
            <Pixels runs={filmManRuns[Math.floor(t * 4) % 2]} />
          </g>
          {/* Riscos do filme velho */}
          {Math.sin(t * 7.3) > 0.4 && <rect x={SCREEN.x0 + 6 + ((t * 61) % (w - 12))} y={SCREEN.y0 + 1} width={0.6} height={h - 2} fill="#555" opacity={0.6} />}
          {Math.sin(t * 5.1) > 0.7 && <rect x={SCREEN.x0 + 3 + ((t * 37) % (w - 6))} y={SCREEN.y0 + 4} width={1} height={1} fill="#222" />}
        </g>
      )}
    </g>
  );
}

/** Cartaz do espetáculo na calçada: um lado é a dança, o outro é o cinema. */
function Poster({ side }: { side: number }) {
  const x = 106;
  return (
    <g>
      <rect x={x + 1} y={92} width={1} height={7} fill={INK} />
      <rect x={x + 11} y={92} width={1} height={7} fill={INK} />
      <rect x={x - 1} y={77} width={15} height={17} fill={INK} />
      {side === 0 ? (
        <g>
          <rect x={x} y={78} width={13} height={15} fill="#2e7d4a" />
          <rect x={x} y={78} width={13} height={6} fill="#c8262b" />
          {[0, 3, 6, 9].map((d) => (
            <rect key={d} x={x + 1 + d} y={80} width={2} height={2} fill="#e85a52" />
          ))}
          <rect x={x + 1} y={86} width={8} height={1} fill="#f2c200" />
          <rect x={x + 1} y={88} width={11} height={1} fill="#ffffff" />
          <rect x={x + 1} y={90} width={6} height={1} fill="#ffffff" />
          <rect x={x + 9} y={89} width={3} height={3} fill="#e8772e" />
        </g>
      ) : (
        <g>
          <rect x={x} y={78} width={13} height={15} fill="#1d2430" />
          {/* Claquete de cinema */}
          {[0, 2, 4, 6, 8].map((d) => (
            <rect key={d} x={x + 2 + d} y={80} width={1} height={2} fill="#ffffff" />
          ))}
          <rect x={x + 2} y={82} width={9} height={5} fill="#f4f1de" />
          <rect x={x + 3} y={83} width={7} height={3} fill="#3a3f42" />
          {[0, 2, 4, 6, 8].map((d) => (
            <rect key={d} x={x + 2 + d} y={88} width={1} height={1} fill="#f2c200" />
          ))}
          <rect x={x + 2} y={90} width={9} height={1} fill="#ffffff" />
        </g>
      )}
    </g>
  );
}

/** Lojinhas vizinhas: parede, janelas de cima, toldo e vitrine (ou porta de enrolar). */
const SHOPS = [
  { x0: -300, x1: -112, top: 30, wall: '#dfe8ea', awn: '#2e7d4a', stripe: '#f4f1de', shutter: true },
  { x0: -112, x1: B.x0 - 1, top: 20, wall: '#efe0c0', awn: '#5a3a28', stripe: '#8a5a3a', shutter: false },
  { x0: B.x1 + 1, x1: 420, top: 14, wall: '#f4f1de', awn: '#e9efe6', stripe: '#2e9a4a', shutter: false },
  { x0: 420, x1: 640, top: 28, wall: '#f6dcc0', awn: '#2f5fb3', stripe: '#f4f1de', shutter: true },
];

const Shops = memo(function Shops({ night }: { night: boolean }) {
  const goods = useMemo(() => {
    const rand = seeded(57);
    return SHOPS.map((s) => Array.from({ length: 10 }, () => ({ x: s.x0 + 8 + rand() * (s.x1 - s.x0 - 34), y: 66 + Math.floor(rand() * 4) * 5, c: ['#f2b705', '#d64545', '#12a3a0', '#8cc63f', '#ec6a8c', '#2f5fb3'][Math.floor(rand() * 6)] })));
  }, []);
  const glass = night ? '#ffd76a' : '#9fb4bc';
  return (
    <g>
      {SHOPS.map((s, si) => {
        const w = s.x1 - s.x0;
        const wins = Math.floor((w - 10) / 24);
        return (
          <g key={s.x0}>
            <rect x={s.x0 - 1} y={s.top - 1} width={w + 2} height={FLOOR - s.top + 1} fill={INK} />
            <rect x={s.x0} y={s.top} width={w} height={FLOOR - s.top} fill={s.wall} />
            <rect x={s.x0} y={s.top} width={w} height={2} fill="#000" opacity={0.08} />
            {Array.from({ length: wins }, (_, i) => {
              const x = s.x0 + 8 + i * 24;
              return (
                <g key={i}>
                  <rect x={x - 1} y={s.top + 7} width={16} height={14} fill={INK} />
                  <rect x={x} y={s.top + 8} width={14} height={12} fill={glass} />
                  <rect x={x + 6.5} y={s.top + 8} width={1} height={12} fill="#f4f1de" />
                </g>
              );
            })}
            {/* Toldo listrado */}
            <rect x={s.x0 - 1} y={51} width={w + 2} height={8} fill={INK} />
            <rect x={s.x0} y={52} width={w} height={6} fill={s.awn} />
            {Array.from({ length: Math.floor(w / 8) }, (_, i) => (
              <rect key={i} x={s.x0 + i * 8 + 2} y={52} width={3} height={6} fill={s.stripe} />
            ))}
            <rect x={s.x0} y={58} width={w} height={1} fill="#000" opacity={0.2} />
            {/* Embaixo: porta de enrolar ou vitrine com coisinhas coloridas */}
            {s.shutter ? (
              <g>
                <rect x={s.x0 + 6} y={60} width={w - 12} height={FLOOR - 60} fill="#a7adb0" />
                {Array.from({ length: Math.floor((FLOOR - 60) / 2) }, (_, i) => (
                  <rect key={i} x={s.x0 + 6} y={61 + i * 2} width={w - 12} height={1} fill="#8d969c" />
                ))}
              </g>
            ) : (
              <g>
                <rect x={s.x0 + 5} y={61} width={w - 26} height={FLOOR - 63} fill={INK} />
                <rect x={s.x0 + 6} y={62} width={w - 28} height={FLOOR - 65} fill={night ? '#f3dc9a' : '#cfe3e8'} />
                {goods[si].map((g, i) => (
                  <rect key={i} x={g.x} y={g.y} width={3} height={3} fill={g.c} />
                ))}
                <rect x={s.x1 - 18} y={61} width={12} height={FLOOR - 61} fill={INK} />
                <rect x={s.x1 - 17} y={62} width={10} height={FLOOR - 62} fill={night ? '#e8c46a' : '#6f8d96'} />
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
});

/** Calçada de pedrinhas em losango, meio-fio e a rua. */
const Street = memo(function Street() {
  return (
    <g>
      <defs>
        <pattern id="cc-calcada" width={8} height={4} patternUnits="userSpaceOnUse">
          <rect width={8} height={4} fill="#efe3cf" />
          <path d="M4 0L8 2L4 4L0 2Z" fill="#b5523b" />
        </pattern>
      </defs>
      <rect x={FULL.x} y={FLOOR} width={FULL.w} height={CURB - FLOOR} fill="url(#cc-calcada)" />
      <rect x={FULL.x} y={CURB} width={FULL.w} height={2} fill="#b9b29c" />
      <rect x={FULL.x} y={CURB + 2} width={FULL.w} height={GROUND_END - CURB - 2} fill="#4a4f55" />
      {Array.from({ length: 40 }, (_, i) => (
        <rect key={i} x={FULL.x + i * 30} y={ROAD_Y + 6} width={14} height={1} fill="#e9e2c4" />
      ))}
      {/* Soleira de granito e o tapete da entrada */}
      <rect x={B.x0} y={FLOOR} width={B.x1 - B.x0} height={2} fill="#2b2f33" />
      <rect x={46} y={91} width={34} height={4} fill="#2b3238" />
      <rect x={52} y={92} width={22} height={1} fill="#3a8a9a" />
    </g>
  );
});

/** Poste de luz da calçada. */
function Lamp({ x, night }: { x: number; night: boolean }) {
  return (
    <g>
      <rect x={x - 1} y={44} width={2} height={CURB - 44} fill="#3a3f42" />
      <rect x={x - 1} y={44} width={8} height={1.5} fill="#3a3f42" />
      <rect x={x + 4} y={45} width={5} height={2} fill="#3a3f42" />
      <rect x={x + 5} y={47} width={3} height={1} fill={night ? '#fff6c8' : '#d9d9d2'} />
    </g>
  );
}

/* ---- Coisas vivas ---- */

interface Walker {
  id: number;
  inside: boolean;
  x: number;
  y: number;
  tx: number;
  speed: number;
  walk: number;
  wait: number;
  config: AvatarConfig;
  say: string | null;
  sayUntil: number;
}

interface Car {
  id: number;
  x: number;
  dir: number;
  speed: number;
  runs: (typeof carRuns)[number];
}

const IN_X = { x0: LOBBY.x0 + 6, x1: GALLERY.x1 - 8 };
const AREA = { x0: -20, x1: W + 20, y0: -10, y1: 34 };

function newWalker(x?: number): Walker {
  return { id: uid(), inside: false, x: x ?? pick([-60, W + 60]), y: Math.round(rnd(93, 99)), tx: rnd(20, W - 20), speed: rnd(8, 12), walk: 0, wait: x === undefined ? rnd(0, 4) : rnd(0, 2), config: randomLook(), say: null, sayUntil: 0 };
}

function newVisitor(x: number): Walker {
  return { ...newWalker(x), inside: true, y: Math.round(rnd(84, 87)), tx: rnd(IN_X.x0, IN_X.x1), speed: rnd(6, 9), wait: 0 };
}

function initLife() {
  return {
    walkers: [newVisitor(rnd(120, 150)), newVisitor(rnd(160, 185)), newWalker(rnd(20, 90)), newWalker(rnd(200, 290)), newWalker()],
    seats: SEAT_ROWS.flatMap(() => SEAT_X.map(() => (Math.random() < 0.3 ? { skin: pick(SKIN), hair: pick(HAIR) } : null))),
    art: [0, 1, 2, 3, 4],
    poster: 0,
    lift: { at: -10, until: -10, guest: true },
    film: { at: -10, until: -10 },
    dance: { at: -10, until: -10, who: randomLook(), clapped: true },
    clapUntil: 0,
    signUntil: 0,
    cars: [] as Car[],
    carTimer: rnd(1, 3),
    timers: { mote: 0, note: 0, clap: 0 },
  };
}

/** De 0 a 1: abre/desce em `ramp` segundos, fica e volta no fim. */
const ramp = (t: number, at: number, until: number, secs: number) => (t > until ? 0 : Math.min(clamp((t - at) / secs, 0, 1), clamp((until - t) / secs, 0, 1)));

/* ---- Componente ---- */

export const CulturalScene = memo(function CulturalScene({ place, time, onPoints }: { place: CityPlace; time: DayTime; onPoints?: (total: number) => void }) {
  const night = time === 'night';
  const bd = useMemo(() => makeBackdrop(58, 61, { blocks: 4 }), []);
  const cam = useCamera((vw) => (vw < 200 ? 150 : CX));
  const life = useRef(initLife());
  const ambient = useRef(initAmbient(AREA));
  const particles = useRef<Particle[]>([]);
  const spawn = useMemo(() => makeSpawner(particles), []);

  const clock = useLoop((dt, t) => {
    const L = life.current;
    cam.step(dt);
    stepAmbient(ambient.current, dt, t, night, AREA);

    for (const w of L.walkers) {
      if (w.wait > 0) {
        w.wait -= dt;
        w.walk = 0;
        continue;
      }
      const dx = w.tx - w.x;
      if (Math.abs(dx) < 0.8) {
        if (w.x < -50 || w.x > W + 50) {
          Object.assign(w, newWalker());
          continue;
        }
        w.wait = rnd(1.2, 4.5);
        if (Math.random() < 0.3 && t > w.sayUntil) {
          w.say = pick(w.inside ? LINES_IN : night ? LINES_NIGHT : LINES_DAY);
          w.sayUntil = t + 2.6;
        }
        w.tx = w.inside ? rnd(IN_X.x0, IN_X.x1) : Math.random() < 0.25 ? pick([-60, W + 60]) : rnd(10, W - 10);
      } else {
        w.x += Math.sign(dx) * Math.min(Math.abs(dx), w.speed * dt);
        w.walk += dt;
      }
    }

    // Quem chega de elevador sai andando para a galeria
    if (!L.lift.guest && t > L.lift.at + 0.7) {
      L.lift.guest = true;
      const inside = L.walkers.filter((w) => w.inside);
      if (inside.length >= 4) L.walkers = L.walkers.filter((w) => w !== inside[0]);
      const v = newVisitor((LIFT.door0 + LIFT.door1) / 2);
      v.y = 85;
      v.tx = rnd(110, 180);
      L.walkers.push(v);
    }

    // Dança: notinhas saindo do palco; no fim, a plateia aplaude
    if (t < L.dance.until) {
      L.timers.note -= dt;
      if (L.timers.note <= 0) {
        L.timers.note = rnd(0.3, 0.6);
        spawn('note', STAGE_CX + rnd(-22, 22), STAGE.top + 6, { vx: rnd(-3, 3), vy: -rnd(5, 9), life: 1.6, c: pick(['#ffe27a', '#ffffff', '#ec6a8c']) });
      }
    } else if (!L.dance.clapped) {
      L.dance.clapped = true;
      clap(t, 2.8);
    }
    if (t < L.clapUntil) {
      L.timers.clap -= dt;
      if (L.timers.clap <= 0) {
        L.timers.clap = 0.12;
        const i = L.seats.findIndex((s) => s && Math.random() < 0.25);
        if (i >= 0) spawn('spark', SEAT_X[i % SEAT_X.length] + 3, SEAT_ROWS[Math.floor(i / SEAT_X.length)] - 9, { life: 0.4, vy: -6, vx: rnd(-3, 3), c: '#fff6c8' });
      }
    }

    L.carTimer -= dt;
    if (L.carTimer <= 0 && L.cars.length < 2) {
      L.carTimer = rnd(4, 9);
      const dir = pick([-1, 1]);
      L.cars.push({ id: uid(), x: dir > 0 ? -EDGE - 30 : W + EDGE + 30, dir, speed: rnd(26, 36), runs: pick(carRuns) });
    }
    for (const c of L.cars) c.x += c.dir * c.speed * dt;
    L.cars = L.cars.filter((c) => c.x > -EDGE - 40 && c.x < W + EDGE + 40);

    L.timers.mote -= dt;
    if (!night && L.timers.mote <= 0) {
      L.timers.mote = rnd(0.3, 0.7);
      spawn('mote', rnd(-60, W + 60), rnd(0, 36), { vx: rnd(-1.5, 1.5), vy: rnd(-1.2, -0.3), life: rnd(4, 7), c: time === 'dusk' ? '#ffd9a8' : '#fff6c8' });
    }
    particles.current = stepParticles(particles.current, dt, spawn);
  });

  const { say, live } = useBubbles(clock);
  const { found, fresh, discover, toast } = useDiscoveries(place.id, DISCOVERIES, clock, onPoints);
  const guard = cam.guard;

  function clap(t: number, secs: number) {
    life.current.clapUntil = t + secs;
    sfx('palmas');
    setTimeout(() => sfx('palmas'), 400);
  }

  const tapSign = () => {
    if (!guard()) return;
    sfx('zap');
    life.current.signUntil = clock.current + 1.2;
    for (let i = 0; i < 12; i++) spawn('spark', rnd(70, 250), rnd(SIGN.y0, SIGN.y1), { life: rnd(0.5, 0.9), vx: rnd(-6, 6), vy: rnd(-8, 2), c: pick(['#ffffff', '#ffe27a']) });
    say('placa', CX, SIGN.y0 - 2, pick(['Centro Cultural Humberto Mauro! 🎭', 'Aqui tem arte, teatro e cinema! 🎬']), 3);
    discover('placa');
  };

  const tapLift = () => {
    if (!guard()) return;
    const L = life.current;
    const t = clock.current;
    if (t < L.lift.until) return;
    sfx('plim');
    L.lift = { at: t, until: t + 3.5, guest: false };
    say('elevador', (LIFT.x0 + LIFT.x1) / 2, 56, pick(['Plim! Chegou o elevador! 🛗', 'Plim! Quem vem lá? 🛗']), 2.6);
    discover('elevador');
  };

  const tapArt = (i: number) => {
    if (!guard()) return;
    const L = life.current;
    sfx('pop');
    L.art[i] = (L.art[i] + 5) % 6;
    for (let k = 0; k < 6; k++) spawn('spark', FRAMES[i] + 6 + rnd(-6, 6), rnd(60, 72), { life: rnd(0.4, 0.8), vx: rnd(-5, 5), vy: rnd(-6, 2), c: '#ffe27a' });
    say(`q${i}`, FRAMES[i] + 6, 58, pick(['Que quadro bonito! 🖼️', 'Isso é arte! 🎨', 'Uma exposição! 🖼️']), 2.4);
    discover('quadros');
  };

  const tapFilm = () => {
    if (!guard()) return;
    const L = life.current;
    const t = clock.current;
    if (t < L.film.until) return;
    // Se estiver tendo dança, a cortina fecha antes de a tela descer
    const busy = t < L.dance.until;
    if (busy) L.dance.until = t + 1;
    sfx('whir');
    setTimeout(() => sfx('tictac'), 700);
    L.film = { at: t + (busy ? 1 : 0), until: t + 10 };
    say('cinema', BOOTH.x + 3, BOOTH.y - 2, pick(['Humberto Mauro fazia filmes aqui! 🎬', 'Luz, câmera, ação! 🎬']), 3.2);
    discover('cinema');
  };

  const tapStage = () => {
    if (!guard()) return;
    const L = life.current;
    const t = clock.current;
    if (t < L.film.until || t < L.dance.until) return;
    sfx('musica');
    L.dance = { at: t, until: t + 7, who: randomLook(), clapped: false };
    say('danca', STAGE_CX, STAGE.top - 4, pick(['Vai começar o espetáculo! 💃', 'Hoje tem dança! 💃']), 2.8);
    discover('danca');
  };

  const tapSeats = () => {
    if (!guard()) return;
    const L = life.current;
    sfx('pop');
    L.seats = L.seats.map((s) => s ?? (Math.random() < 0.45 ? { skin: pick(SKIN), hair: pick(HAIR) } : null));
    clap(clock.current, 2);
    say('cadeiras', 241, 70, pick(['Cadeiras vermelhas! 💺', 'Cabe muita gente aqui! 💺', 'Clap, clap, clap! 👏']), 2.6);
    discover('cadeiras');
  };

  const tapPoster = () => {
    if (!guard()) return;
    const L = life.current;
    sfx('creak');
    L.poster = 1 - L.poster;
    say('cartaz', 112, 74, L.poster ? 'Hoje tem cinema! 🎬' : 'Hoje tem espetáculo de dança! 💃', 2.6);
    discover('cartaz');
  };

  const tapWalker = (w: Walker) => {
    if (!guard()) return;
    sfx('pop');
    w.say = pick(w.inside ? LINES_IN : night ? LINES_NIGHT : LINES_DAY);
    w.sayUntil = clock.current + 2.8;
    w.wait = Math.max(w.wait, 2.4);
    discover('gente');
  };

  const tapCar = (x: number, id: string) => {
    if (!guard()) return;
    sfx('honk');
    say(id, x, ROAD_Y - 12, pick(['Bi-bi! 🚗', 'Fom-fom! 🚙']), 1.6);
  };

  const t = clock.current;
  const L = life.current;
  const A = ambient.current;
  const view = cam.view(t);

  const tapGround = (e: MouseEvent<SVGSVGElement>) => {
    if (!guard()) return;
    const pt = cam.toWorld(e);
    if (pt && pt.y > FLOOR) spawn('marker', pt.x, pt.y, { life: 0.6, c: '#ffffff' });
  };

  const liftOpen = ramp(t, L.lift.at, L.lift.until, 0.5);
  const filmK = ramp(t, L.film.at, L.film.until, 0.8);
  const curtainK = ramp(t, L.dance.at, L.dance.until, 1);
  const dancing = curtainK > 0;
  const dx = STAGE_CX + Math.sin((t - L.dance.at) * 1.6) * 14;
  const spin = Math.cos((t - L.dance.at) * 7) >= 0 ? 1 : -1;

  const inside = L.walkers.filter((w) => w.inside).sort((a, b) => a.y - b.y);
  const outside = L.walkers.filter((w) => !w.inside).sort((a, b) => a.y - b.y);
  const walkerNode = (w: Walker) => (
    <g
      key={w.id}
      className="cw-tap"
      onClick={(e) => {
        e.stopPropagation();
        tapWalker(w);
      }}
    >
      <Character x={w.x} y={w.y} config={w.config} frame={w.walk > 0 ? (((Math.floor(w.walk / 0.17) % 2) + 1) as 1 | 2) : 0} />
    </g>
  );

  const bubbles = [...live(t), ...L.walkers.filter((w) => w.say && w.sayUntil > t).map((w) => ({ key: `w${w.id}`, x: w.x, y: w.y - 18, text: w.say! }))];

  return (
    <SceneBox cam={cam}>
      <svg ref={cam.svg} className="visit-art" viewBox={`${view.fx.toFixed(2)} ${view.fy.toFixed(2)} ${view.vw.toFixed(2)} ${view.vh.toFixed(2)}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" onClick={tapGround}>
        <defs>
          <radialGradient id="cc-glow">
            <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={view.layer(DEPTH.sky)}>
          <SkyLayer time={time} bd={bd} />
        </g>
        <g transform={view.layer(DEPTH.clouds)}>
          <Clouds A={A} t={t} time={time} />
        </g>
        <g transform={view.layer(DEPTH.far)}>
          <FarHills time={time} bd={bd} />
        </g>
        <Haze time={time} ground={bd.ground} />
        <g transform={view.layer(DEPTH.near)}>
          <NearHills time={time} bd={bd} />
        </g>

        <Street />
        <Shops night={night} />
        <Facade night={night} />
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapSign();
          }}
          role="button"
          aria-label="Placa do Centro Cultural"
        >
          <Sign glow={t < L.signUntil} t={t} night={night} />
        </g>

        {/* Dentro: saguão, galeria e teatro */}
        <Rooms night={night} />
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapLift();
          }}
          role="button"
          aria-label="Elevador"
        >
          <Lift open={liftOpen} arriving={t < L.lift.until} />
        </g>
        <Desk />
        {FRAMES.map((x, i) => (
          <g
            key={x}
            className="cw-tap"
            onClick={(e) => {
              e.stopPropagation();
              tapArt(i);
            }}
          >
            {/* Luz do spot no quadro */}
            <path d={`M${x + 5} ${OPEN}L${x + 13} 74L${x - 1} 74Z`} fill="#fff6c8" opacity={0.18} />
            <rect x={x - 1} y={59} width={14} height={15} fill="#2a2a2a" />
            <rect x={x} y={60} width={12} height={13} fill="#ffffff" />
            <Art k={L.art[i]} x={x} y={60.5} />
          </g>
        ))}

        {/* Palco: dançarina, cortina, tela e o facho do projetor */}
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapStage();
          }}
          role="button"
          aria-label="Palco"
        >
          <rect x={STAGE.x0} y={STAGE.top - 3} width={STAGE.x1 - STAGE.x0} height={STAGE.floor - STAGE.top + 3} fill="transparent" />
          {dancing && (
            <g>
              <ellipse cx={dx} cy={STAGE.floor - 1} rx={9} ry={2} fill="#fff6c8" opacity={0.35} />
              <path d={`M${dx - 3} ${STAGE.top}L${dx + 3} ${STAGE.top}L${dx + 9} ${STAGE.floor}L${dx - 9} ${STAGE.floor}Z`} fill="#fff6c8" opacity={0.12} />
              <g transform={`translate(${dx.toFixed(2)} 0) scale(${spin} 1) translate(${(-dx).toFixed(2)} 0)`}>
                <Character x={dx} y={STAGE.floor} config={L.dance.who} frame={Math.sin(t * 8) > 0 ? 1 : 2} />
              </g>
            </g>
          )}
          <Curtain open={curtainK} />
          <Screen k={filmK} t={t} />
        </g>
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapFilm();
          }}
          role="button"
          aria-label="Projetor de cinema"
        >
          <rect x={BOOTH.x - 3} y={BOOTH.y - 3} width={12} height={10} fill="transparent" />
          <rect x={BOOTH.x + 1} y={BOOTH.y + 1} width={4} height={2} fill={filmK > 0 ? '#fff6c8' : '#6f7d86'} />
        </g>
        {filmK >= 1 && (
          <path
            d={`M${BOOTH.x + 5} ${BOOTH.y + 1}L${SCREEN.x0} ${SCREEN.y0}L${SCREEN.x1} ${SCREEN.y0}L${SCREEN.x1} ${SCREEN.y0 + SCREEN.h}L${SCREEN.x0} ${SCREEN.y0 + SCREEN.h}L${BOOTH.x + 5} ${BOOTH.y + 3}Z`}
            fill="#fff6c8"
            opacity={0.1 + Math.sin(t * 31) * 0.03}
            pointerEvents="none"
          />
        )}

        {/* Cadeiras vermelhas (vistas por trás), com a plateia */}
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapSeats();
          }}
          role="button"
          aria-label="Cadeiras do teatro"
        >
          {SEAT_ROWS.map((y, r) =>
            SEAT_X.map((x, i) => {
              const p = L.seats[r * SEAT_X.length + i];
              const bob = p && t < L.clapUntil && Math.sin(t * 20 + i + r) > 0 ? -1 : 0;
              return (
                <g key={`${r}-${i}`}>
                  {p && (
                    <g>
                      <rect x={x + 1.5} y={y - 8 + bob} width={3} height={3} fill={p.skin} />
                      <rect x={x + 1.5} y={y - 8.5 + bob} width={3} height={2} fill={p.hair} />
                    </g>
                  )}
                  <rect x={x - 0.5} y={y - 5.5} width={7} height={5.5} fill={INK} />
                  <rect x={x} y={y - 5} width={6} height={5} fill={SEAT} />
                  <rect x={x} y={y - 5} width={6} height={1} fill="#e85a52" />
                  <rect x={x + 5} y={y - 4} width={1} height={4} fill={RED_DK} />
                </g>
              );
            }),
          )}
        </g>

        {inside.map(walkerNode)}

        {/* Pilares de cobogó da frente */}
        <Cobogo x0={B.x0} x1={LOBBY.x0} />
        <Cobogo x0={THEATER.x1} x1={B.x1} />

        <Lamp x={10} night={night} />
        <Lamp x={304} night={night} />
        <g
          className="cw-tap"
          onClick={(e) => {
            e.stopPropagation();
            tapPoster();
          }}
          role="button"
          aria-label="Cartaz do espetáculo"
        >
          <Poster side={L.poster} />
        </g>
        {outside.map(walkerNode)}

        {L.cars.map((c) => (
          <g
            key={c.id}
            className="cw-tap"
            onClick={(e) => {
              e.stopPropagation();
              tapCar(c.x, `car${c.id}`);
            }}
          >
            <g transform={`translate(${c.x.toFixed(2)} ${ROAD_Y - 10}) scale(${c.dir} 1) translate(-10 0)`}>
              <Pixels runs={c.runs} />
            </g>
          </g>
        ))}

        <ParticleLayer list={particles.current} />
        <Critters A={A} t={t} night={night} area={AREA} spawn={spawn} />

        <TimeTint time={time} />
        {night && (
          <>
            <g transform={view.layer(DEPTH.near)}>
              <TownLights bd={bd} />
            </g>
            <g pointerEvents="none">
              {[50, 80, 120, 150, 180].map((x) => (
                <circle key={x} cx={x} cy={70} r={16} fill="url(#cc-glow)" opacity={0.4} />
              ))}
              {UP_WIN.map((x) => (
                <circle key={x} cx={x} cy={24} r={12} fill="url(#cc-glow)" opacity={0.35} />
              ))}
              <rect x={B.x0} y={SIGN.y0} width={B.x1 - B.x0} height={SIGN.y1 - SIGN.y0} fill="#ff6a5a" opacity={0.18} />
              {[14, 308].map((x) => (
                <circle key={x} cx={x} cy={48} r={8} fill="url(#cc-glow)" opacity={0.7} />
              ))}
              {dancing && <circle cx={dx} cy={68} r={12} fill="url(#cc-glow)" opacity={0.5} />}
              {filmK > 0 && <rect x={SCREEN.x0} y={SCREEN.y0} width={SCREEN.x1 - SCREEN.x0} height={SCREEN.h * filmK} fill="#fff6c8" opacity={0.25} />}
            </g>
          </>
        )}
      </svg>

      <SceneHud
        t={t}
        view={view}
        bubbles={bubbles}
        list={DISCOVERIES}
        found={found}
        fresh={fresh}
        toast={toast.current}
        night={night}
        firstTip="Toque no prédio, nos quadros e no teatro para descobrir! 👆"
        dragText="👈 Arraste para ver o Centro Cultural todo 👉"
        dragged={cam.dragged.current}
      />
    </SceneBox>
  );
});
