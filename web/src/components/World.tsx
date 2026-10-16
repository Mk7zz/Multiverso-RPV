import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { BRAND } from '../brand';
import { useAuth } from '../lib/auth';
import { useGame } from '../lib/game';
import { useApi } from '../lib/hooks';
import { useNotifications } from '../lib/notifications';
import { fromAscii, seeded, shade, toRuns, type Run } from '../lib/pixel';
import type { AvatarConfig, PublicUser } from '../lib/types';
import { BOUNDS, BRIDGE, inRiver, MAIN_PATH, PLACES, riverX, RIVER_HALF, SPAWN, WORLD_H, WORLD_W, type Place } from '../lib/world';
import { Avatar, AvatarSprite, SPRITE_H, SPRITE_W } from './Avatar';
import { Dialogue } from './Dialogue';
import { bridgeParts, chacaraParts, culturalParts, hotelParts, memorialParts, museumParts, painelParts, stationParts } from './Landmarks';
import { mestreParts } from './MestreHouses';
import { LevelBadge, XpBar } from './Game';
import { iconRuns, PixelIcon } from './PixelIcon';
import { birdDown, birdUp, Pixels, treeRuns, TREE_H, TREE_W, useDayTime, type DayTime } from './Scene';

const INK = '#1b2b33';
const AVATAR_SCALE = 0.7;
const TREE_SCALE = 1.6;
const SPEED = 72;

type Part = [x: number, y: number, w: number, h: number, fill: string];

/** Corpo com contorno único em volta da silhueta, depois detalhes com contorno próprio. */
function Block({ body, details = [], under }: { body: Part[]; details?: Part[]; under?: ReactNode }) {
  return (
    <>
      {body.map(([x, y, w, h], i) => (
        <rect key={`o${i}`} x={x - 1} y={y - 1} width={w + 2} height={h + 2} fill={INK} />
      ))}
      {body.map(([x, y, w, h, f], i) => (
        <rect key={`b${i}`} x={x} y={y} width={w} height={h} fill={f} />
      ))}
      {under}
      {details.map(([x, y, w, h, f], i) => (
        <g key={`d${i}`}>
          <rect x={x - 1} y={y - 1} width={w + 2} height={h + 2} fill={INK} />
          <rect x={x} y={y} width={w} height={h} fill={f} />
        </g>
      ))}
    </>
  );
}

function Sign({ x, y, icon }: { x: number; y: number; icon: string }) {
  return (
    <g>
      <rect x={x - 1} y={y - 1} width={12} height={12} fill={INK} />
      <rect x={x} y={y} width={10} height={10} fill="#fdf6e3" />
      <g transform={`translate(${x + 1} ${y + 1}) scale(${8 / 12})`}>
        <Pixels runs={iconRuns(icon)} />
      </g>
    </g>
  );
}

function roofSteps(x0: number, top: number, w: number, roof: string, rows = 11): Part[] {
  const dark = shade(roof, -0.22);
  return Array.from({ length: rows }, (_, i) => [x0 - 3 + i, top - 1 - i, w + 6 - 2 * i, 1, i % 3 === 0 ? dark : roof] as Part);
}

/** Painel de azulejos da fachada da Igreja de Santa Rita (meia largura, espelhada). */
const TILE_HALF = [
  'BBBBBBBBBBBBBBBB',
  'Bl.l.l.l.l.l.l.l',
  'B.............bb',
  'B.....ll.....b..',
  'B..b...lll...b..',
  'B.bbb...llll.bbb',
  'B.b.b..llllllbbb',
  'B.bbb....llllbbb',
  'B..........lbbbb',
  'B.llll......bbbb',
  'Bllllllllllbbbbb',
  'Bl.l.l.l.l.l.l.l',
  'BBBBBBBBBBBBBBBB',
];
const tileRuns = toRuns(fromAscii(TILE_HALF.map((r) => r + [...r].reverse().join('')), { B: '#1d3f86', b: '#2f5fb3', l: '#8db6e8', '.': '#f4f8ff' }));

/** Igreja de Santa Rita (Cataguases): fachada curva com azulejos, torre pontuda branca, marquise ondulada e espelho d'água. */
function churchParts(x: number, y: number, night: boolean, yard: boolean): { body: Part[]; details: Part[]; sign: [number, number]; extra: ReactNode } {
  const wall = '#e6c77f';
  const wallDark = '#c9a75c';
  const white = '#f7f6ef';
  const x0 = x - 20;
  const sx = x - 4;
  const spireW = [10, 10, 8, 8, 6, 6, 4, 4, 2];
  const spire: Part[] = [[sx - 6, y - 38, 12, 6, white], ...spireW.map((w, i) => [sx - w / 2, y - 40 - 2 * i, w, 2, white] as Part)];
  return {
    body: [
      ...spire,
      [sx - 1, y - 63, 2, 7, white],
      [sx - 3, y - 61, 6, 2, white],
      [x + 18, y - 20, 16, 20, wall],
      [x + 14, y - 24, 22, 4, white],
      [x + 14, y - 25, 16, 1, white],
      [x0, y - 32, 40, 32, wall],
      [x0 + 2, y - 34, 36, 2, wall],
      [x0 + 6, y - 35, 28, 1, wall],
      [x0 - 3, y - 13, 58, 2, white],
    ],
    details: [
      [x0 + 4, y - 31, 32, 13, '#f4f8ff'],
      [x - 15, y - 10, 30, 10, night ? '#ffd76a' : '#3d5560'],
      [x + 20, y - 19, 12, 3, '#cfd8dc'],
    ],
    sign: [x + 22, y - 38],
    extra: (
      <g>
        {spire.slice(1).map(([px, py, w, h], i) => (
          <rect key={i} x={px + w / 2} y={py} width={w / 2} height={h} fill="#d9dcd6" />
        ))}
        <rect x={sx} y={y - 38} width={6} height={4} fill="#d9dcd6" />
        <rect x={sx - 2} y={y - 47} width={4} height={5} fill="#2a3a44" />
        <rect className="w-bell" x={sx - 1} y={y - 45} width={2} height={2} fill="#f2b705" />
        <g transform={`translate(${x0 + 4} ${y - 31})`}>
          <Pixels runs={tileRuns} />
        </g>
        <rect x={x0} y={y - 16} width={40} height={1} fill={wallDark} />
        <rect x={x + 18} y={y - 20} width={16} height={1} fill={wallDark} />
        {Array.from({ length: 5 }, (_, k) => (
          <rect key={`m${k}`} x={x - 15 + 6 * (k + 0.5)} y={y - 10} width={1} height={10} fill="#22303a" />
        ))}
        {Array.from({ length: 14 }, (_, k) => (
          <rect key={`s${k}`} x={x0 - 2 + 4 * k} y={y - 11} width={2} height={1} fill={white} />
        ))}
        <rect x={x0 - 2} y={y - 11} width={1} height={11} fill="#8a8f88" />
        <rect x={x + 33} y={y - 11} width={1} height={11} fill="#8a8f88" />
        {yard && (
          <g>
            {[x - 27, x + 9].map((px) => (
              <g key={px}>
                <rect x={px - 1} y={y + 3} width={20} height={7} fill="#d9d2bf" />
                <rect x={px} y={y + 4} width={18} height={5} fill="#12a3a0" />
                <rect className="river-shine" x={px + 3} y={y + 5} width={5} height={1} fill="#7fd8d4" />
              </g>
            ))}
            <rect x={x + 40} y={y - 14} width={2} height={14} fill="#8a5a2b" />
            <rect x={x + 35} y={y - 17} width={12} height={2} fill="#3aa655" />
            <rect x={x + 38} y={y - 19} width={6} height={2} fill="#1f7a4d" />
            <rect x={x + 34} y={y - 15} width={2} height={2} fill="#3aa655" />
            <rect x={x + 46} y={y - 15} width={2} height={2} fill="#3aa655" />
          </g>
        )}
      </g>
    ),
  };
}

/** Desenho de cada tipo de construção (porta em p.x, p.y). Retorna também as janelas para a iluminação noturna. */
export function buildingParts(p: Place, glass: string, yard = true): { body: Part[]; details: Part[]; sign: [number, number]; under?: ReactNode; extra?: ReactNode } {
  const { x, y } = p;
  const wood = '#7a4a25';
  switch (p.kind) {
    case 'church':
      return churchParts(x, y, glass === '#ffd76a', yard);
    case 'tower': {
      const x0 = x - 10;
      const top = y - 40;
      const roof = p.roof ?? '#1f7a4d';
      return {
        body: [
          [x0, top, 20, 40, '#cfd8d3'],
          [x0 - 2, top - 4, 24, 4, '#b8c4be'],
          ...Array.from({ length: 9 }, (_, i) => [x0 - 1 + i, top - 5 - i, 22 - 2 * i, 1, i % 3 === 0 ? shade(roof, -0.22) : roof] as Part),
          [x, top - 26, 1, 12, INK],
          [x + 1, top - 26, 7, 4, '#8cc63f'],
        ],
        details: [
          [x - 2, top + 5, 4, 6, glass],
          [x - 4, y - 12, 8, 12, wood],
          [x0 + 2, top + 30, 3, 2, '#b8c4be'],
          [x0 + 15, top + 20, 3, 2, '#b8c4be'],
        ],
        sign: [x - 5, top + 15],
      };
    }
    case 'board':
      return {
        body: [
          [x - 15, y - 20, 3, 20, '#8a5a2b'],
          [x + 12, y - 20, 3, 20, '#8a5a2b'],
          [x - 17, y - 28, 34, 3, '#8a5a2b'],
          [x - 16, y - 25, 32, 15, '#c58b4a'],
        ],
        details: [
          [x - 13, y - 23, 7, 9, '#fdf6e3'],
          [x - 3, y - 24, 7, 8, '#fff6d6'],
          [x + 7, y - 22, 6, 8, '#e2f6f5'],
        ],
        sign: [x - 5, y - 41],
      };
    case 'fountain': {
      const cy = y - 8;
      return {
        body: [
          [x - 12, cy - 2, 24, 6, '#b9b29c'],
          [x - 14, cy, 28, 3, '#d9d2bf'],
          [x - 2, cy - 14, 4, 12, '#cfd8d3'],
          [x - 6, cy - 15, 12, 2, '#b9b29c'],
        ],
        details: [[x - 10, cy - 1, 20, 2, '#12a3a0']],
        sign: [x - 5, cy - 29],
        extra: (
          <g className="spout" fill="#7fd8d4">
            <rect x={x - 1} y={cy - 19} width={2} height={4} />
            <rect x={x - 4} y={cy - 17} width={1} height={2} />
            <rect x={x + 3} y={cy - 17} width={1} height={2} />
          </g>
        ),
      };
    }
    case 'arena': {
      const x0 = x - 23;
      return {
        body: [
          [x0, y - 22, 46, 22, '#c9b38a'],
          [x0 - 2, y - 25, 50, 4, '#a8916a'],
          [x0 - 2, y - 28, 4, 3, '#a8916a'],
          [x - 2, y - 28, 4, 3, '#a8916a'],
          [x0 + 44, y - 28, 4, 3, '#a8916a'],
          [x0, y - 38, 1, 10, INK],
          [x0 + 46, y - 38, 1, 10, INK],
          [x0 + 1, y - 38, 6, 4, '#d64545'],
          [x0 + 47, y - 38, 6, 4, '#12a3a0'],
        ],
        details: [
          [x - 6, y - 13, 12, 13, '#4a3220'],
          [x0 + 5, y - 19, 5, 9, '#d64545'],
          [x0 + 36, y - 19, 5, 9, '#12a3a0'],
        ],
        sign: [x - 5, y - 41],
      };
    }
    case 'mestre':
      return mestreParts(p, glass);
    case 'bridge':
      return bridgeParts(p, glass === '#ffd76a');
    case 'museum':
      return museumParts(p, glass);
    case 'station':
      return stationParts(p, glass);
    case 'chacara':
      return chacaraParts(p, glass);
    case 'cultural':
      return culturalParts(p, glass);
    case 'memorial':
      return memorialParts(p, glass);
    case 'painel':
      return painelParts(p, glass);
    case 'hotel':
      return hotelParts(p, glass);
    case 'stage': {
      const x0 = x - 22;
      return {
        body: [
          [x0, y - 33, 44, 3, '#23384a'],
          [x0, y - 30, 2, 22, '#23384a'],
          [x0 + 42, y - 30, 2, 22, '#23384a'],
          [x0 + 2, y - 30, 40, 20, '#d64545'],
          [x0, y - 10, 44, 3, '#c58b4a'],
          [x0, y - 7, 44, 7, '#8a5a2b'],
        ],
        details: [
          [x - 8, y - 28, 16, 17, '#2a1a12'],
          [x0 + 5, y - 30, 2, 20, '#a83232'],
          [x0 + 37, y - 30, 2, 20, '#a83232'],
        ],
        sign: [x - 5, y - 46],
      };
    }
    default: {
      // house, post, hall
      const w = p.w ?? (p.kind === 'post' ? 28 : 40);
      const x0 = x - Math.round(w / 2);
      const wallH = p.kind === 'hall' ? 20 : 18;
      const top = y - wallH;
      const wall = p.wall ?? (p.kind === 'hall' ? '#fdf6e3' : '#efe2c6');
      const roof = p.roof ?? '#12a3a0';
      const details: Part[] = [[x - 4, y - 12, 8, 12, '#7a4a25']];
      if (p.kind === 'hall') {
        for (const cx of [x0 + 3, x0 + 9, x0 + w - 12, x0 + w - 6]) details.push([cx, top + 2, 3, wallH - 3, '#ffffff']);
      } else {
        details.push([x0 + 4, top + 4, 7, 5, glass], [x0 + w - 11, top + 4, 7, 5, glass]);
      }
      if (p.kind === 'post') details.push([x + 16, y - 10, 6, 5, '#d64545']);
      return {
        body: [[x0, top, w, wallH, wall], [x0, y - 2, w, 2, shade(wall, -0.2)], ...roofSteps(x0, top, w, roof, Math.min(11, Math.floor(w / 4)))],
        details,
        sign: [x - 5, top - 9],
        extra: p.kind === 'post' ? <rect x={x + 18} y={y - 5} width={2} height={5} fill={INK} /> : undefined,
      };
    }
  }
}

/** Construção solta (sem placa nem clique), para cenas ampliadas fora do mapa. */
export function PlaceArt({ p, night = false }: { p: Place; night?: boolean }) {
  const parts = buildingParts(p, night ? '#ffd76a' : '#bfe9f2', false);
  return (
    <g>
      <Block body={parts.body} details={parts.details} under={parts.under} />
      {parts.extra}
    </g>
  );
}

export const Building = memo(function Building({ p, night, onEnter, highlight, noSign }: { p: Place; night: boolean; onEnter: (p: Place) => void; highlight: boolean; noSign?: boolean }) {
  const parts = buildingParts(p, night ? '#ffd76a' : '#bfe9f2');
  return (
    <g
      className={`w-building ${highlight ? 'near' : ''} ${p.soon ? 'soon' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onEnter(p);
      }}
      role="link"
      aria-label={`${p.label}: ${p.hint}`}
    >
      <Block body={parts.body} details={parts.details} under={parts.under} />
      {parts.extra}
      {!noSign && <Sign x={parts.sign[0]} y={parts.sign[1]} icon={p.soon ? 'lock' : p.icon} />}
    </g>
  );
});

function Tree({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - (TREE_W * TREE_SCALE) / 2} ${y - TREE_H * TREE_SCALE}) scale(${TREE_SCALE})`}>
      <Pixels runs={treeRuns} />
    </g>
  );
}

/** Chão do mundo: céu e serras ao fundo, grama, caminhos, praça, rio e ponte. Estático. */
const Ground = memo(function Ground({ time }: { time: DayTime }) {
  const g = useMemo(() => {
    const rand = seeded(42);
    const patches = Array.from({ length: 140 }, () => ({ x: Math.round(rand() * WORLD_W), y: 40 + Math.round(rand() * 140), c: rand() > 0.5 ? '#6fae3c' : '#8ccb52' }));
    const flowers = Array.from({ length: 46 }, () => ({ x: Math.round(rand() * WORLD_W), y: 50 + Math.round(rand() * 128), c: rand() > 0.6 ? '#f2b705' : rand() > 0.5 ? '#ffffff' : '#ec9a8c' }));
    const ridge = (base: number, peaks: [number, number][]) =>
      Array.from({ length: WORLD_W }, (_, x) => Math.round(Math.min(base, ...peaks.map(([px, py]) => py + Math.abs(x - px) * 0.8))));
    const far = ridge(40, [[40, 10], [130, 4], [220, 14], [300, 6]]);
    const near = ridge(42, [[90, 22], [180, 18], [270, 24]]);
    const river: Part[] = [];
    for (let y = 36; y < WORLD_H; y++) river.push([riverX(y) - RIVER_HALF, y, RIVER_HALF * 2, 1, '#12a3a0']);
    return { patches, flowers, far, near, river };
  }, []);
  const stepped = (h: number[], bottom: number) => `M0 ${bottom}${h.map((v, x) => ` V${v} H${x + 1}`).join('')} V${bottom} Z`;
  const sky = time === 'night' ? ['#0d1b2e', '#23384a'] : time === 'dusk' ? ['#f0a35e', '#fde6b6'] : ['#7fd0e6', '#dff5f1'];
  const pathC = '#e3cf9a';
  const bx = riverX(MAIN_PATH.y + 4);

  return (
    <g>
      <defs>
        <linearGradient id="w-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
      </defs>
      <rect width={WORLD_W} height={46} fill="url(#w-sky)" />
      <path d={stepped(g.far, 46)} fill={time === 'night' ? '#2c5a46' : '#a9d67a'} />
      <path d={stepped(g.near, 46)} fill={time === 'night' ? '#1d4a35' : '#3aa655'} />
      {[[90, 22], [180, 18], [270, 24]].map(([x, y]) => (
        <rect key={x} className="node" x={x - 1} y={y - 1} width={3} height={3} fill={time === 'night' ? '#f2b705' : '#ffffff'} />
      ))}
      <rect y={40} width={WORLD_W} height={WORLD_H - 40} fill="#7dbb45" />
      <rect y={40} width={WORLD_W} height={3} fill="#5e9a35" />
      {g.patches.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={2} height={1} fill={p.c} />
      ))}
      {/* Caminhos */}
      <rect x={10} y={MAIN_PATH.y} width={WORLD_W - 20} height={MAIN_PATH.h} fill={pathC} />
      <rect x={10} y={MAIN_PATH.y + MAIN_PATH.h} width={WORLD_W - 20} height={1} fill="#c9b27a" />
      {PLACES.filter((p) => p.kind !== 'fountain').map((p) => {
        const y0 = Math.min(p.y, MAIN_PATH.y);
        const y1 = Math.max(p.y, MAIN_PATH.y + MAIN_PATH.h);
        return <rect key={p.id} x={p.x - 4} y={y0} width={8} height={y1 - y0} fill={pathC} />;
      })}
      <ellipse cx={150} cy={130} rx={24} ry={12} fill="#d9d2bf" />
      <ellipse cx={150} cy={130} rx={24} ry={12} fill="none" stroke="#bdb49a" strokeWidth={1} />
      {g.flowers.map((f, i) => (
        <rect key={i} x={f.x} y={f.y} width={1} height={1} fill={f.c} />
      ))}
      {/* Rio e ponte */}
      {g.river.map(([x, y, w, h], i) => (
        <g key={i}>
          <rect x={x - 1} y={y} width={w + 2} height={h} fill="#2c7f42" />
          <rect x={x} y={y} width={w} height={h} fill="#12a3a0" />
        </g>
      ))}
      <g className="river-shine" fill="#7fd8d4">
        {[56, 74, 92, 140, 158, 172].map((y, i) => (
          <rect key={y} x={riverX(y) - 3 + (i % 3)} y={y} width={4} height={1} />
        ))}
      </g>
      <rect x={bx - 11} y={BRIDGE.y0 + 1} width={22} height={BRIDGE.y1 - BRIDGE.y0 - 1} fill="#a0703e" />
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={i} x={bx - 11 + i * 5} y={BRIDGE.y0 + 1} width={1} height={BRIDGE.y1 - BRIDGE.y0 - 1} fill="#7a4a25" />
      ))}
      <rect x={bx - 12} y={BRIDGE.y0} width={24} height={2} fill="#5c3a1c" />
      <rect x={bx - 12} y={BRIDGE.y1} width={24} height={2} fill="#5c3a1c" />
    </g>
  );
});

const NPC_SPOTS = [
  [118, 148],
  [184, 150],
  [112, 104],
  [190, 108],
];

const WIDE: Place['kind'][] = ['house', 'hall', 'arena', 'stage', 'mestre', 'museum', 'station', 'chacara', 'memorial', 'painel', 'hotel'];

/** Árvores espalhadas sem invadir caminhos, rio e construções. */
export function makeTrees(places: Place[] = PLACES, seed = 1234) {
  const rand = seeded(seed);
  const trees: { x: number; y: number }[] = [];
  const blocked = (x: number, y: number) =>
    y < 54 ||
    x < 6 ||
    x > WORLD_W - 6 ||
    Math.abs(y - (MAIN_PATH.y + 6)) < 12 ||
    Math.abs(x - riverX(y)) < 14 ||
    Math.hypot((x - 150) / 30, (y - 132) / 18) < 1 ||
    Math.hypot(x - SPAWN.x, y - SPAWN.y) < 18 ||
    NPC_SPOTS.some(([nx, ny]) => Math.abs(x - nx) < 14 && Math.abs(y - ny) < 16) ||
    places.some((p) =>
      p.kind === 'church'
        ? x > p.x - 34 && x < p.x + 54 && y > p.y - 70 && y < p.y + 20
        : Math.abs(x - p.x) < (WIDE.includes(p.kind) ? 34 : 24) && y > p.y - 52 && y < p.y + (p.kind === 'mestre' ? 30 : 16),
    ) ||
    places.some((p) => Math.abs(x - p.x) < 10 && y > Math.min(p.y, MAIN_PATH.y) - 4 && y < Math.max(p.y, MAIN_PATH.y) + 14) ||
    trees.some((t) => Math.abs(t.x - x) < 11 && Math.abs(t.y - y) < 8);
  for (let x = 4; x < WORLD_W; x += 13) if (!blocked(x, 56)) trees.push({ x, y: 56 + Math.round(rand() * 4) });
  for (let i = 0; i < 400 && trees.length < 46; i++) {
    const x = Math.round(rand() * WORLD_W);
    const y = 56 + Math.round(rand() * 124);
    if (!blocked(x, y)) trees.push({ x, y });
  }
  return trees;
}

const TREES = makeTrees();

export function Character({ x, y, config, frame, name, me }: { x: number; y: number; config: AvatarConfig | null; frame: 0 | 1 | 2; name?: string; me?: boolean }) {
  const w = SPRITE_W * AVATAR_SCALE;
  const h = SPRITE_H * AVATAR_SCALE;
  return (
    <g className={`w-char ${me ? 'me' : 'npc'}`} transform={`translate(${(x - w / 2).toFixed(2)} ${(y - h).toFixed(2)})`}>
      <ellipse cx={w / 2} cy={h - 0.5} rx={5} ry={1.6} fill="#000" opacity={0.18} />
      <g className={frame === 0 ? 'w-idle' : undefined} transform={`scale(${AVATAR_SCALE})`}>
        <AvatarSprite config={config} frame={frame} />
      </g>
      {name && (
        <text x={w / 2} y={-2} className="w-name" textAnchor="middle">
          {name}
        </text>
      )}
    </g>
  );
}

function Bird({ x, y, flap }: { x: number; y: number; flap: boolean }) {
  return (
    <g transform={`translate(${(x - 6).toFixed(2)} ${(y - 10).toFixed(2)}) scale(0.7)`} className="w-bird">
      <Pixels runs={(flap ? birdUp : birdDown) as Run[]} />
    </g>
  );
}

const INTRO_KEY = 'mv:world-intro';

/** Mundo 2D da base: o personagem anda entre os lugares da plataforma. */
export function World({ welcome }: { welcome?: boolean }) {
  const { user } = useAuth();
  const { summary } = useGame();
  const { unreadMessages } = useNotifications();
  const navigate = useNavigate();
  const time = useDayTime();
  const night = time === 'night';
  const ranking = useApi<{ ranking: (PublicUser & { is_me: boolean })[] }>('/gamification/ranking?period=all&scope=all');

  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const pos = useRef({ ...SPAWN });
  const bird = useRef({ x: SPAWN.x + 14, y: SPAWN.y - 20 });
  const keys = useRef(new Set<string>());
  const target = useRef<{ x: number; y: number; enter?: Place } | null>(null);
  const waypoints = useRef<{ x: number; y: number }[]>([]);
  const [view, setView] = useState({ x: SPAWN.x, y: SPAWN.y, frame: 0 as 0 | 1 | 2, bx: bird.current.x, by: bird.current.y, flap: false });
  const [talk, setTalk] = useState<{ id: number; text: string } | null>(null);
  const [intro, setIntro] = useState<number | null>(() => {
    try {
      return welcome || !localStorage.getItem(INTRO_KEY) ? 0 : null;
    } catch {
      return null;
    }
  });

  const first = user?.name.split(' ')[0] ?? '';
  const introLines = [
    `Bem-vindo(a) ao ${BRAND.world.name}, ${first}! Esta é a sua base: cada construção leva a uma parte da plataforma.`,
    'Ande com as setas ou W A S D, ou toque no chão para caminhar. Chegue perto de um lugar e aperte E (ou toque nele) para entrar.',
    'Comece pela Academia e escolha um curso. Cada aula vale XP, e o Quadro de Missões tem recompensas novas todos os dias.',
  ];
  const closeIntro = () => {
    setIntro(null);
    try {
      localStorage.setItem(INTRO_KEY, '1');
    } catch {
      /* ignorado */
    }
    box.current?.focus({ preventScroll: true });
  };

  const goTo = useCallback((x: number, y: number, enter?: Place) => {
    const side = (px: number, py: number) => px < riverX(py);
    const from = pos.current;
    waypoints.current = [];
    if (side(from.x, from.y) !== side(x, y)) {
      const by = MAIN_PATH.y + 4;
      const bx = riverX(by);
      const dir = side(from.x, from.y) ? 1 : -1;
      waypoints.current = [
        { x: bx - dir * 16, y: by },
        { x: bx + dir * 16, y: by },
      ];
    }
    target.current = { x, y, enter };
  }, []);

  const enter = useCallback((p: Place) => goTo(p.x, p.y + 3, p), [goTo]);

  // Laço do jogo: teclado/clique → movimento, animação de passos e a pomba seguindo.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let walk = 0;
    let stuck = 0;
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const k = keys.current;
      let dx = (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0);
      let dy = (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('w') ? 1 : 0);
      const p = pos.current;
      if (dx || dy) {
        target.current = null;
        waypoints.current = [];
      } else if (target.current) {
        const wp = waypoints.current[0] ?? target.current;
        const vx = wp.x - p.x;
        const vy = wp.y - p.y;
        const dist = Math.hypot(vx, vy);
        if (dist < 1.5) {
          if (waypoints.current.length) waypoints.current.shift();
          else {
            const dest = target.current.enter;
            target.current = null;
            if (dest) navigate(dest.to);
          }
        } else {
          dx = vx / dist;
          dy = vy / dist;
        }
      }
      const moving = !!(dx || dy);
      if (moving) {
        const n = Math.hypot(dx, dy);
        const nx = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, p.x + (dx / n) * SPEED * dt));
        const ny = Math.max(BOUNDS.y0, Math.min(BOUNDS.y1, p.y + (dy / n) * SPEED * dt));
        const before = p.x + p.y;
        if (!inRiver(nx, p.y)) p.x = nx;
        if (!inRiver(p.x, ny)) p.y = ny;
        stuck = Math.abs(p.x + p.y - before) < 0.01 ? stuck + 1 : 0;
        if (stuck > 20) {
          target.current = null;
          waypoints.current = [];
        }
        walk += dt;
      } else walk = 0;
      const b = bird.current;
      const bx = p.x + 13;
      const by = p.y - 22;
      b.x += (bx - b.x) * Math.min(1, dt * 3);
      b.y += (by - b.y) * Math.min(1, dt * 3);
      const flapping = Math.hypot(bx - b.x, by - b.y) > 2;
      const frame = (moving ? (Math.floor(walk / 0.14) % 2) + 1 : 0) as 0 | 1 | 2;
      setView((v) =>
        v.x === p.x && v.y === p.y && v.frame === frame && Math.abs(v.bx - b.x) < 0.05 && Math.abs(v.by - b.y) < 0.05
          ? v
          : { x: p.x, y: p.y, frame, bx: b.x, by: b.y, flap: flapping && Math.floor(t / 120) % 2 === 0 },
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [navigate]);

  useEffect(() => {
    box.current?.focus({ preventScroll: true });
  }, []);

  const near = PLACES.find((p) => Math.abs(view.x - p.x) < 13 && view.y >= p.y - 6 && view.y <= p.y + 12) ?? null;

  const onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (intro !== null) {
      if (key === 'enter' || key === ' ') {
        e.preventDefault();
        if (intro < introLines.length - 1) setIntro(intro + 1);
        else closeIntro();
      }
      return;
    }
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
    if ((key === 'e' || key === 'enter' || key === ' ') && near) return navigate(near.to);
    keys.current.add(key);
  };
  const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());

  const onGroundClick = (e: MouseEvent<SVGSVGElement>) => {
    const r = svg.current!.getBoundingClientRect();
    goTo(((e.clientX - r.left) / r.width) * WORLD_W, ((e.clientY - r.top) / r.height) * WORLD_H);
    box.current?.focus({ preventScroll: true });
  };

  const npcs = (ranking.data?.ranking ?? []).filter((r) => !r.is_me).slice(0, NPC_SPOTS.length);

  const entities: { key: string; y: number; node: ReactNode }[] = [
    ...PLACES.map((p) => ({ key: p.id, y: p.y, node: <Building p={p} night={night} onEnter={enter} highlight={near?.id === p.id} /> })),
    ...TREES.map((t, i) => ({ key: `t${i}`, y: t.y, node: <Tree x={t.x} y={t.y} /> })),
    ...npcs.map((n, i) => {
      const [x, y] = NPC_SPOTS[i];
      return {
        key: `n${n.id}`,
        y,
        node: (
          <g
            onClick={(e) => {
              e.stopPropagation();
              setTalk({ id: n.id, text: `${n.name.split(' ')[0]} · nível ${n.level.level}, ${n.level.name}` });
              setTimeout(() => setTalk((cur) => (cur?.id === n.id ? null : cur)), 2600);
            }}
            className="w-npc"
          >
            <Character x={x} y={y} config={n.avatar} frame={0} />
          </g>
        ),
      };
    }),
    { key: 'me', y: view.y + 0.1, node: <Character x={view.x} y={view.y} config={user?.avatar ?? null} frame={view.frame} me /> },
  ].sort((a, b) => a.y - b.y);

  const pct = (x: number, y: number) => ({ left: `${(x / WORLD_W) * 100}%`, top: `${(y / WORLD_H) * 100}%` });
  const badges: Record<string, number | string | undefined> = {
    quadro: summary?.claimableQuests ? '!' : undefined,
    correio: unreadMessages || undefined,
  };

  return (
    <>
    <div
      className={`world time-${time}`}
      ref={box}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={() => keys.current.clear()}
      aria-label={`${BRAND.world.name}: use as setas para andar e E para entrar nos lugares`}
    >
      <svg ref={svg} className="world-canvas" viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} shapeRendering="crispEdges" onClick={onGroundClick}>
        <Ground time={time} />
        {entities.map((e) => (
          <g key={e.key}>{e.node}</g>
        ))}
        <Bird x={view.bx} y={view.by} flap={view.flap} />
        {night && <rect className="night-tint" width={WORLD_W} height={WORLD_H} fill="#0d1b2e" opacity={0.32} pointerEvents="none" />}
      </svg>

      {/* Placas e avisos sobre os lugares */}
      {PLACES.map((p) => (
        <div key={p.id} className={`w-label ${near?.id === p.id ? 'show' : ''}`} style={pct(p.x, p.y + 4)}>
          {p.label}
        </div>
      ))}
      {PLACES.filter((p) => badges[p.id]).map((p) => (
        <span key={p.id} className="w-alert" style={pct(p.x + 8, p.y - (p.kind === 'board' ? 44 : 34))}>
          {badges[p.id]}
        </span>
      ))}
      {talk &&
        npcs.map((n, i) =>
          n.id === talk.id ? (
            <div key={n.id} className="w-bubble" style={pct(NPC_SPOTS[i][0], NPC_SPOTS[i][1] - 18)}>
              {talk.text}
            </div>
          ) : null,
        )}

      {/* HUD */}
      {user && (
        <div className="hud-panel hud-player">
          <Avatar config={user.avatar} name={user.name} size={44} />
          <div className="grow">
            <strong className="truncate">{first}</strong>
            {summary && (
              <>
                <span className="hud-line">
                  <LevelBadge level={summary.level} size="sm" /> {summary.level.name}
                </span>
                <XpBar level={summary.level} points={summary.points} compact />
              </>
            )}
          </div>
        </div>
      )}
      {summary && (
        <div className="hud-panel hud-stats">
          <span title="Sequência de dias estudando">
            <PixelIcon name="flame" size={16} /> {summary.currentStreak}
          </span>
          <span title="XP total">
            <PixelIcon name="coin" size={16} /> {summary.points.toLocaleString('pt-BR')}
          </span>
          {summary.rank && (
            <span title="Posição no ranking">
              <PixelIcon name="crown" size={16} /> #{summary.rank}
            </span>
          )}
        </div>
      )}
      {near && intro === null && (
        <button className="hud-prompt" onClick={() => navigate(near.to)}>
          <PixelIcon name={near.icon} size={18} />
          <span>
            <strong>{near.label}</strong> · {near.hint}
          </span>
          <kbd>E</kbd>
        </button>
      )}
      {!near && intro === null && <div className="hud-hint">Setas ou WASD para andar · toque no chão para ir · E para entrar</div>}
      {intro !== null && (
        <div className="world-dialogue">
          <Dialogue key={intro} text={introLines[intro]}>
            {intro < introLines.length - 1 ? (
              <button className="btn accent sm" onClick={() => setIntro(intro + 1)}>
                Próximo ›
              </button>
            ) : (
              <button className="btn accent sm" onClick={closeIntro}>
                Vamos lá ›
              </button>
            )}
            <button className="btn ghost sm" onClick={closeIntro}>
              Pular
            </button>
          </Dialogue>
        </div>
      )}
    </div>
      <nav className="world-quicknav" aria-label="Atalhos dos lugares">
        {PLACES.map((p) => (
          <Link key={p.id} to={p.to} title={p.hint}>
            <PixelIcon name={p.icon} size={16} /> {p.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
