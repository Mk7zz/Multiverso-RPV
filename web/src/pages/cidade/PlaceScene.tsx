import { memo, useMemo } from 'react';
import { Pixels, treeRuns, type DayTime } from '../../components/Scene';
import { PlaceArt } from '../../components/World';
import type { CityPlace } from '../../lib/cidade';
import { fromAscii, outline, seeded, toRuns } from '../../lib/pixel';

// Cena larga: os lados podem ser cortados em telas estreitas; o centro (igreja + espelho d'água) sempre aparece.
const W = 320;
const H = 112;
const GROUND = 82;
const CX = 154;

const PALM = [
  '......lll.lll....',
  '....llLLlllLLll..',
  '..llLll.lLl.llLl.',
  '.lLl...lLLLl...ll',
  'lL....lLlclLl...l',
  'l....lL.cbc.Ll...',
  '....lL...b...Ll..',
  '...l.....b....l..',
  '.........b.......',
  '.........B.......',
  '........bB.......',
  '........bB.......',
  '........bB.......',
  '.........bB......',
  '.........bB......',
  '.........bB......',
  '........bbBb.....',
];
const palmRuns = toRuns(outline(fromAscii(PALM, { l: '#3aa655', L: '#8cc63f', b: '#8a5a2b', B: '#a0703e', c: '#6b4423' }), '#0f3d2a'));

function Palm({ x, y, flip }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y - 36}) scale(${flip ? -2 : 2} 2) translate(-9 0)`}>
      <Pixels runs={palmRuns} />
    </g>
  );
}

function Lamp({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y - 26} width={1} height={26} fill="#5b6770" />
      <rect x={x - 2} y={y - 28} width={5} height={2} fill="#5b6770" />
      <rect x={x - 1} y={y - 26} width={3} height={1} fill="#fff4c2" />
    </g>
  );
}

const HOUSES: [x: number, w: number, h: number, wall: string][] = [
  [14, 18, 16, '#f1e6cf'],
  [36, 22, 22, '#e9eef2'],
  [62, 14, 14, '#f4ead8'],
  [226, 16, 18, '#f4ead8'],
  [246, 24, 14, '#efe2c6'],
  [278, 18, 20, '#e9eef2'],
];

/** Cena ampliada do lugar: céu, casario ao fundo, a construção e o espelho d'água com o reflexo dela. */
export const PlaceScene = memo(function PlaceScene({ place, time }: { place: CityPlace; time: DayTime }) {
  const night = time === 'night';
  const art = useMemo(() => ({ ...place, x: CX, y: GROUND }), [place]);
  const deco = useMemo(() => {
    const rand = seeded(9);
    const stones = Array.from({ length: 260 }, () => ({ x: Math.round(rand() * W), y: GROUND + 2 + Math.round(rand() * (H - GROUND)), w: 2 + Math.round(rand() * 2) }));
    const stars = Array.from({ length: 50 }, () => [Math.round(rand() * W), Math.round(rand() * 50)]);
    return { stones, stars };
  }, []);
  const sky = night ? ['#0d1b2e', '#23384a'] : time === 'dusk' ? ['#c96aa0', '#f6b26b'] : ['#3d8ee0', '#bfe6f5'];
  const pool = { x: CX - 56, w: 124 };
  const glass = night ? '#ffd76a' : '#7fb8d6';

  return (
    <svg className="visit-art" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden>
      <defs>
        <linearGradient id="visit-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
        <clipPath id="visit-pool">
          <rect x={pool.x + 2} y={GROUND + 6} width={pool.w - 4} height={14} />
        </clipPath>
      </defs>
      <rect width={W} height={H} fill="url(#visit-sky)" />
      {night && deco.stars.map(([x, y], i) => <rect key={i} className={i % 3 ? undefined : 'twinkle'} x={x} y={y} width={1} height={1} fill="#e2f6f5" />)}
      <g className="clouds" fill={night ? '#3a5068' : '#ffffff'} opacity={night ? 0.5 : 0.9}>
        <g className="cloud c1">
          <rect x={40} y={14} width={26} height={5} />
          <rect x={46} y={10} width={12} height={4} />
        </g>
        <g className="cloud c2">
          <rect x={210} y={22} width={30} height={5} />
          <rect x={218} y={18} width={14} height={4} />
        </g>
      </g>

      {/* Morros e casario ao fundo */}
      <path
        d={`M0 ${GROUND - 26} H30 V${GROUND - 30} H80 V${GROUND - 24} H120 V${GROUND - 22} H200 V${GROUND - 27} H250 V${GROUND - 32} H290 V${GROUND - 25} H${W} V${GROUND} H0 Z`}
        fill={night ? '#1d4a35' : '#3aa655'}
      />
      {HOUSES.map(([x, w, h, wall]) => (
        <g key={x}>
          <rect x={x - 1} y={GROUND - h - 5} width={w + 2} height={h + 5} fill="#1b2b33" />
          <rect x={x} y={GROUND - h} width={w} height={h} fill={wall} />
          <rect x={x - 1} y={GROUND - h - 4} width={w + 2} height={4} fill="#c0573e" />
          <rect x={x + 3} y={GROUND - h + 4} width={4} height={4} fill={glass} />
          <rect x={x + w - 7} y={GROUND - h + 4} width={4} height={4} fill={glass} />
        </g>
      ))}
      {[6, 30, 56, 88, 220, 244, 272, 300].map((x) => (
        <g key={x} transform={`translate(${x - 9} ${GROUND - 21}) scale(2)`}>
          <Pixels runs={treeRuns} />
        </g>
      ))}

      {/* Praça: calçada portuguesa */}
      <rect y={GROUND} width={W} height={H - GROUND} fill="#ddd2b6" />
      {deco.stones.map((s, i) => (
        <rect key={i} x={s.x} y={s.y} width={s.w} height={1} fill={i % 3 ? '#cbbf9f' : '#e9e0c8'} />
      ))}
      <rect y={GROUND} width={W} height={2} fill="#6fae3c" />
      <PlaceArt p={art} night={night} />

      {/* Espelho d'água com o reflexo */}
      <rect x={pool.x - 2} y={GROUND + 4} width={pool.w + 4} height={18} fill="#b9b29c" />
      <rect x={pool.x - 1} y={GROUND + 5} width={pool.w + 2} height={16} fill="#e3dccb" />
      <rect x={pool.x + 2} y={GROUND + 6} width={pool.w - 4} height={14} fill={night ? '#0b4f5c' : '#1e8fb0'} />
      <g clipPath="url(#visit-pool)">
        <g transform={`translate(0 ${2 * (GROUND + 4)}) scale(1 -1)`} opacity={0.42}>
          <PlaceArt p={art} night={night} />
        </g>
      </g>
      <g className="river-shine" fill="#bfeaf2" opacity={0.8}>
        {[
          [pool.x + 12, 90],
          [pool.x + 40, 94],
          [pool.x + 74, 92],
          [pool.x + 100, 97],
        ].map(([x, y]) => (
          <rect key={x} x={x} y={y} width={8} height={1} />
        ))}
      </g>

      {/* Canteiros, palmeiras, postes e bancos */}
      {[
        [40, 46],
        [234, 46],
      ].map(([x, w]) => (
        <g key={x}>
          <rect x={x} y={GROUND + 14} width={w} height={8} fill="#1b2b33" />
          <rect x={x + 1} y={GROUND + 15} width={w - 2} height={6} fill="#5e9a35" />
          {Array.from({ length: 6 }, (_, i) => (
            <rect key={i} x={x + 4 + i * 7} y={GROUND + 16} width={3} height={2} fill={i % 2 ? '#f2b705' : '#ec6a8c'} />
          ))}
        </g>
      ))}
      <Palm x={62} y={GROUND + 16} />
      <Palm x={258} y={GROUND + 16} flip />
      <Lamp x={28} y={GROUND + 8} />
      <Lamp x={290} y={GROUND + 8} />
      {[
        [8, GROUND + 18],
        [300, GROUND + 18],
      ].map(([x, y]) => (
        <g key={x}>
          <rect x={x} y={y} width={14} height={2} fill="#b9b29c" />
          <rect x={x + 1} y={y + 2} width={2} height={3} fill="#8a8f88" />
          <rect x={x + 11} y={y + 2} width={2} height={3} fill="#8a8f88" />
        </g>
      ))}
      {night && <rect width={W} height={H} fill="#0d1b2e" opacity={0.28} />}
    </svg>
  );
});
