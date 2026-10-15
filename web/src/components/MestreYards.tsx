import type { CSSProperties, ReactNode } from 'react';
import { fromAscii, outline, toRuns, type Run } from '../lib/pixel';
import type { Place } from '../lib/world';
import { Pixels } from './Scene';

/*
 * O quintal de cada Mestre do Saber no mapa, na frente da casa:
 * - Seu Zico: fazendinha com horta cercada, espantalho, galinheiro, galinhas e pintinhos,
 *   bananeira, latão de leite e a Pipoca, cachorrinha caramelo;
 * - Sektor: papelão de break no chão, caixa de som, skate e caixote de discos;
 * - Dona Cida: canteiro de flores com cerquinha branca, regador e o banquinho da porta.
 * `yardGround` é pintado no chão (por baixo de tudo); `yardProps` entra na ordem de profundidade
 * do mapa. Peças com `tap` respondem ao toque: o mestre comenta e a peça faz barulho.
 */

const INK = '#1b2b33';

const sprite = (rows: string[], pal: Record<string, string>) => toRuns(outline(fromAscii(['.'.repeat(rows[0].length + 2), ...rows.map((r) => `.${r}.`), '.'.repeat(rows[0].length + 2)], pal), INK));

/* ---- Bichos e coisas da roça ---- */

const HEN_UP = ['......r..', '.....rbb.', '.....bkbY', 'bb...bbr.', 'bbb.bbbb.', '.bbbBBbb.', '.bbBBBbb.', '..bbbbb..', '...y.y...'];
const HEN_DOWN = ['.........', '.........', '.........', 'bb....r..', 'bbb..rbb.', '.bbbBbkbY', '.bbBBBbbr', '..bbbbb..', '...y.y...'];
const henPal = (b: string, B: string) => ({ b, B, r: '#d64545', k: INK, Y: '#f2b705', y: '#e8a33a' });
const HENS = {
  brown: { up: sprite(HEN_UP, henPal('#c9762b', '#8a4a17')), down: sprite(HEN_DOWN, henPal('#c9762b', '#8a4a17')) },
  white: { up: sprite(HEN_UP, henPal('#f4f1e6', '#c9c0a6')), down: sprite(HEN_DOWN, henPal('#f4f1e6', '#c9c0a6')) },
};

const ROOSTER = sprite(
  ['.......r..', '......rrr.', '.g....okoY', 'gGg...ooor', 'gGGg..ooo.', '.gGg.oOOO.', '..gwwOOOw.', '..wwwOOww.', '...wwwww..', '....y.y...', '...yy.yy..'],
  { r: '#d64545', g: '#1f4f3f', G: '#2c8a6a', o: '#e8772e', k: INK, Y: '#f2b705', w: '#a8432a', O: '#d9a066', y: '#e8a33a' },
);

const CHICK = sprite(['..yy.', '.yyko', 'yyyy.', '.yy..'], { y: '#ffe27a', k: INK, o: '#e8772e' });

const SCARECROW = sprite(
  ['...hhh...', '..hhbhh..', '.HHHHHHH.', '...sss...', '...ksk...', '...sks...', 'yrRrRrRry', '...rRr...', '...RpR...', '...rRr...', '....c....', '....c....', '....c....', '....c....'],
  { h: '#ecc96a', H: '#c79a3c', b: '#d64545', s: '#d9b98a', k: INK, r: '#2f5fb3', R: '#6fa0e0', y: '#ecc96a', p: '#c58b4a', c: '#6b4423' },
);

const COOP = sprite(
  [
    '........RR........',
    '.......RrrR.......',
    '......RrrrrR......',
    '.....RrrrrrrR.....',
    '....RrrrrrrrrR....',
    '...RrrrrrrrrrrR...',
    '..RRRRRRRRRRRRRR..',
    '...wWwwWwwWwwWw...',
    '...wWwkkkkkwwWw...',
    '...wWwkheehwwWw...',
    '...wWwkhhhhwwWw...',
    '...wWwwWwwWwwWw...',
    '...dddddddddddd...',
    '...p..aaaaa...p...',
    '...p..AAAAA...p...',
    '...p.aaaaaaa..p...',
  ],
  { R: '#8f3e2c', r: '#c4553a', w: '#c58b4a', W: '#a0703e', k: '#2a1a12', e: '#fdf6e3', h: '#ecc96a', d: '#6b4423', p: '#6b4423', a: '#d9a066', A: '#b07a40' },
);

const BANANA = sprite(
  [
    '......L........',
    '..ll..LL...ll..',
    '.llll.LLL.llll.',
    'lllLll.LL.llLll',
    'll..lllLLlll..l',
    'l....llLLll...l',
    'l.....tLt.....l',
    '......ttt.yy...',
    '......ttyyyy...',
    '......tt.yyY...',
    '......ttt.r....',
    '......tTt......',
    '......ttt......',
    '......tTt......',
    '......ttt......',
    '.....ttttt.....',
  ],
  { l: '#3aa655', L: '#8cc63f', t: '#7f9a4a', T: '#5f7a34', y: '#f2d43a', Y: '#c9a227', r: '#7a2f5a' },
);

const MILK_CAN = sprite(['.MMM.', '.mwm.', '.mmm.', 'mmmmm', 'mwmmm', 'mwmmm', 'MMMMM', 'mmmmm'], { m: '#cfd8dc', M: '#7f8a91', w: '#ffffff' });

const DOG = sprite(['..CC.......', '.cccC......', 'kckcc......', '.wccccccc..', '..cwccccccc', '..cc..cc.cc'], { c: '#d9963a', C: '#a8661e', k: INK, w: '#f4e2c0' });

/* ---- Coisas do Hip Hop ---- */

const BOOMBOX = sprite(
  ['..kkkkkkk..', '.k.......k.', 'GGGGGGGGGGG', 'GssGGtGGssG', 'GsSsGtGsSsG', 'GssGGGGGssG', 'GGGGGGGGGGG'],
  { k: '#3c4a52', G: '#5c6970', s: '#2a2a2a', S: '#9aa5ad', t: '#ec6a8c' },
);

const SKATE = sprite(['.ddddddddd.', 'dDDDDDDDDDd', '.w.......w.'], { d: '#6b4fa0', D: '#f2b705', w: '#f4f4f4' });

const CRATE = sprite(
  ['.vvvvvvv.', '.vRvBvYv.', 'ccccccccc', 'cCcCcCcCc', 'ccccccccc', 'cCcCcCcCc'],
  { v: '#1b1b1b', R: '#d64545', B: '#12a3a0', Y: '#f2b705', c: '#d9a066', C: '#a0703e' },
);

/* ---- Coisas do bordado ---- */

const WATERING_CAN = sprite(['.....hh.', 'g..hhh..', '.gbbbbb.', '..bbBbb.', '..bbbbb.'], { h: '#2f7f8a', g: '#2f7f8a', b: '#3f9aa7', B: '#9ad6dc' });

const BENCH = sprite(['wwwwwwwwww', 'WWWWWWWWWW', '.p......p.', '.p......p.'], { w: '#a0703e', W: '#7a4a25', p: '#5c3a1c' });

export interface YardTap {
  /** O que o mestre fala quando a criança toca nessa peça. */
  lines: string[];
  sound: 'chirp' | 'pop' | 'rustle' | 'ok';
  /** Cor dos brilhinhos que saem da peça. */
  c: string;
}

export interface YardProp {
  key: string;
  /** Pé da peça (ordem de profundidade). */
  y: number;
  /** Ponto de onde saem os brilhinhos do toque. */
  x: number;
  node: ReactNode;
  tap?: YardTap;
}

const at = (x: number, y: number, runs: Run[]) => (
  <g transform={`translate(${x} ${y})`}>
    <Pixels runs={runs} />
  </g>
);

const shadow = (cx: number, cy: number, rx: number) => <ellipse cx={cx} cy={cy} rx={rx} ry={1.2} fill="#000" opacity={0.16} />;

/** Galinha ciscando: anda de um lado pro outro (virando no fim) e bica o chão. */
function Hen({ x, y, kind, dur, delay }: { x: number; y: number; kind: keyof typeof HENS; dur: number; delay: number }) {
  const s = { animationDuration: `${dur}s`, animationDelay: `${delay}s` };
  return (
    <g>
      <g className="yd-roam" style={s}>
        {shadow(x + 5.5, y, 3.5)}
        <g className="yd-face" style={s}>
          <g className="yd-peck-a" style={{ animationDelay: `${delay * 0.7}s` }}>{at(x, y - 10, HENS[kind].up)}</g>
          <g className="yd-peck-b" style={{ animationDelay: `${delay * 0.7}s` }}>{at(x, y - 10, HENS[kind].down)}</g>
        </g>
      </g>
    </g>
  );
}

/* ---- Fazendinha do Seu Zico ---- */

const FARM = { x0: -30, x1: -2, y0: 9, y1: 31 };

function rocaGround(p: Place) {
  const { x, y } = p;
  const fx0 = x + FARM.x0;
  const fy0 = y + FARM.y0;
  const w = FARM.x1 - FARM.x0;
  const beds = [0, 7, 14];
  const plants: ReactNode[] = [];
  beds.forEach((by, r) => {
    for (let i = 0; i < 6; i++) {
      const px = fx0 + 3 + i * 4;
      const py = fy0 + 3 + by;
      if (r === 0) plants.push(<g key={`c${i}`}>{/* couve */}<rect x={px} y={py} width={3} height={2} fill="#1f7a4d" /><rect x={px + 1} y={py - 1} width={1} height={1} fill="#3aa655" /><rect x={px} y={py} width={1} height={1} fill="#3aa655" /></g>);
      if (r === 1) plants.push(<g key={`a${i}`}>{/* alface */}<rect x={px} y={py} width={3} height={2} fill="#8cc63f" /><rect x={px + 1} y={py} width={1} height={1} fill="#c9e88a" /></g>);
      if (r === 2) plants.push(<g key={`t${i}`}>{/* cenoura */}<rect x={px + 1} y={py - 1} width={1} height={2} fill="#3aa655" /><rect x={px} y={py - 1} width={1} height={1} fill="#3aa655" /><rect x={px} y={py + 1} width={3} height={1} fill="#e8772e" /></g>);
    }
  });
  return (
    <g>
      {/* Terra batida do terreiro e a horta */}
      <ellipse cx={x + 14} cy={y + 22} rx={22} ry={9} fill="#c9a46a" opacity={0.55} />
      <ellipse cx={x + 14} cy={y + 22} rx={16} ry={6} fill="#b8915a" opacity={0.35} />
      <rect x={fx0} y={fy0} width={w} height={FARM.y1 - FARM.y0} fill="#8f6a3a" />
      {beds.map((by) => (
        <g key={by}>
          <rect x={fx0 + 2} y={fy0 + 2 + by} width={w - 4} height={4} fill="#5c3a1c" />
          <rect x={fx0 + 2} y={fy0 + 2 + by} width={w - 4} height={1} fill="#7a4a25" />
          <rect x={fx0 + 2} y={fy0 + 5 + by} width={w - 4} height={1} fill="#4a2c17" />
        </g>
      ))}
      {plants}
      {/* Cerca de trás e dos lados */}
      <rect x={fx0 - 1} y={fy0 - 2} width={w + 2} height={1} fill="#8a5a2b" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={fx0 - 1 + i * 4} y={fy0 - 4} width={1} height={4} fill="#6b4423" />
      ))}
      <rect x={fx0 - 1} y={fy0 - 2} width={1} height={FARM.y1 - FARM.y0 + 2} fill="#6b4423" />
      <rect x={fx0 + w} y={fy0 - 2} width={1} height={FARM.y1 - FARM.y0 - 6} fill="#6b4423" />
      {/* Milho que a galinhada cisca */}
      {[[8, 20], [11, 24], [16, 21], [20, 26], [25, 22], [13, 28]].map(([dx, dy]) => (
        <rect key={`${dx}:${dy}`} x={x + dx} y={y + dy} width={1} height={1} fill="#f2c45c" />
      ))}
    </g>
  );
}

function rocaProps(p: Place): YardProp[] {
  const { x, y } = p;
  const fx0 = x + FARM.x0;
  const fy1 = y + FARM.y1;
  const w = FARM.x1 - FARM.x0;
  const hen = (k: string, hx: number, hy: number, kind: keyof typeof HENS, dur: number, delay: number): YardProp => ({
    key: k,
    x: hx + 5,
    y: hy,
    node: <Hen x={hx} y={hy} kind={kind} dur={dur} delay={delay} />,
    tap: {
      lines: ['Essa é a Filó! Bota ovo todo dia, sô! 🥚', 'Có-có-ri-có! 🐔', 'Galinha caipira, da roça! 🐔', 'Ela tá ciscando o milho! 🌽'],
      sound: 'chirp',
      c: '#ffe27a',
    },
  });
  return [
    {
      key: 'banana',
      x: x - 27,
      y: y + 1,
      node: (
        <g className="cw-sway" style={{ animationDuration: '4.2s', '--a': '2deg' } as CSSProperties}>
          {shadow(x - 26, y + 1, 6)}
          {at(x - 35, y - 17, BANANA)}
        </g>
      ),
      tap: { lines: ['Pé de banana! 🍌', 'Banana-prata, docinha que só! 🍌', 'Plantei faz tempo, uai! 🍌'], sound: 'rustle', c: '#f2d43a' },
    },
    {
      key: 'dog',
      x: x + 12,
      y: y + 7,
      node: (
        <g>
          {shadow(x + 14, y + 7, 6)}
          {at(x + 7, y - 1, DOG)}
          <g className="yd-wag">
            <rect x={x + 19} y={y + 1} width={1} height={1} fill={INK} />
            <rect x={x + 20} y={y} width={1} height={2} fill={INK} />
            <rect x={x + 19} y={y + 2} width={1} height={1} fill="#d9963a" />
          </g>
        </g>
      ),
      tap: { lines: ['Essa é a Pipoca, minha cachorrinha! 🐶', 'Au, au! 🐶', 'A Pipoca toma conta da horta! 🐶'], sound: 'pop', c: '#ffffff' },
    },
    {
      key: 'scarecrow',
      x: fx0 + 14,
      y: fy1 - 6,
      node: (
        <g className="cw-sway" style={{ animationDuration: '3.4s', '--a': '3deg' } as CSSProperties}>
          {at(fx0 + 9, fy1 - 22, SCARECROW)}
        </g>
      ),
      tap: { lines: ['É o espantalho! Ele espanta os passarinhos da horta. 🌱', 'Que susto, sô! 😄', 'Ele cuida da couve e da alface! 🥬'], sound: 'rustle', c: '#ecc96a' },
    },
    {
      key: 'fence',
      x: fx0 + 14,
      y: fy1 + 1,
      node: (
        <g>
          <rect x={fx0 - 1} y={fy1 - 2} width={w + 2} height={1} fill="#8a5a2b" />
          <rect x={fx0 - 1} y={fy1 - 4} width={w + 2} height={1} fill="#a0703e" />
          {Array.from({ length: 8 }, (_, i) => (
            <g key={i}>
              <rect x={fx0 - 1 + i * 4} y={fy1 - 5} width={1} height={6} fill="#6b4423" />
              <rect x={fx0 - 1 + i * 4} y={fy1 - 5} width={1} height={1} fill="#8a5a2b" />
            </g>
          ))}
          <rect x={fx0 + w} y={fy1 - 5} width={1} height={6} fill="#6b4423" />
        </g>
      ),
    },
    {
      key: 'coop',
      x: x + 16,
      y: y + 25,
      node: (
        <g>
          {shadow(x + 16, y + 25, 10)}
          {at(x + 6, y + 7, COOP)}
        </g>
      ),
      tap: { lines: ['É o galinheiro! De noite as galinhas dormem aí. 🌙', 'Tem ovo fresquinho no ninho! 🥚', 'Quer ovo? Tem pra janta! 🍳'], sound: 'chirp', c: '#fdf6e3' },
    },
    {
      key: 'rooster',
      x: x + 32,
      y: y + 17,
      node: (
        <g>
          {shadow(x + 32, y + 17, 4)}
          <g className="yd-crow">{at(x + 26, y + 6, ROOSTER)}</g>
        </g>
      ),
      tap: { lines: ['Cocoricóóó! 🐓', 'É o Galo Juca! Ele me acorda cedinho! ☀️', 'Galo que canta cedo, sô! 🐓'], sound: 'ok', c: '#e8772e' },
    },
    {
      key: 'can',
      x: x + 26,
      y: y + 6,
      node: (
        <g>
          {shadow(x + 26, y + 6, 3)}
          {at(x + 22, y - 4, MILK_CAN)}
        </g>
      ),
      tap: { lines: ['Latão de leite! A vaca Mimosa deu leite hoje. 🥛', 'Leite fresquinho, pro café com leite! ☕'], sound: 'pop', c: '#ffffff' },
    },
    hen('hen1', x + 1, y + 26, 'brown', 7, -1),
    hen('hen2', x + 29, y + 28, 'white', 9, -4),
    hen('hen3', x + 18, y + 34, 'brown', 8, -6),
    ...[0, 1, 2].map((i) => ({
      key: `chick${i}`,
      x: x + 8 + i * 4,
      y: y + 32,
      node: (
        <g className="yd-roam" style={{ animationDuration: `${7 - i}s`, animationDelay: `${-i * 2}s` }}>
          <g className="yd-hop" style={{ animationDelay: `${-i * 0.3}s` }}>{at(x + 5 + i * 4, y + 26 - (i % 2), CHICK)}</g>
        </g>
      ),
      tap: { lines: ['Piu, piu! 🐣', 'Os pintinhos da Filó! 🐥', 'Cuidado pra não pisar neles, viu? 🐥'], sound: 'chirp' as const, c: '#ffe27a' },
    })),
  ];
}

/* ---- Roda de break do Sektor ---- */

function hiphopGround(p: Place) {
  const { x, y } = p;
  const x0 = x + 4;
  const y0 = y + 3;
  return (
    <g>
      {/* Papelão de break, com fita adesiva e dobras */}
      <rect x={x0} y={y0} width={22} height={8} fill="#b08a55" />
      <rect x={x0 + 1} y={y0} width={20} height={7} fill="#c9a46a" />
      <rect x={x0 + 11} y={y0} width={1} height={8} fill="#9c7a48" />
      <rect x={x0} y={y0 + 3} width={22} height={1} fill="#e8d9a8" opacity={0.8} />
      {[[3, 1], [15, 5], [7, 6], [18, 2]].map(([dx, dy]) => (
        <rect key={`${dx}${dy}`} x={x0 + dx} y={y0 + dy} width={2} height={1} fill="#9c7a48" />
      ))}
      {/* Marcas de tênis girando */}
      <rect x={x0 + 5} y={y0 + 2} width={1} height={1} fill="#8a6a3a" />
      <rect x={x0 + 16} y={y0 + 5} width={1} height={1} fill="#8a6a3a" />
    </g>
  );
}

function hiphopProps(p: Place): YardProp[] {
  const { x, y } = p;
  return [
    {
      key: 'boombox',
      x: x + 30,
      y: y + 9,
      node: (
        <g>
          {shadow(x + 31, y + 9, 6)}
          <g className="yd-bump">{at(x + 24, y, BOOMBOX)}</g>
        </g>
      ),
      tap: { lines: ['Solta o som! 🔊', 'Tum-tá, tum-tum-tá! 🥁', 'Essa caixa toca a batida da roda! 🎵'], sound: 'ok', c: '#ec6a8c' },
    },
    {
      key: 'skate',
      x: x - 4,
      y: y + 12,
      node: at(x - 10, y + 8, SKATE),
      tap: { lines: ['Meu skate! 🛹', 'Rolê de skate na praça, firmeza! 🛹'], sound: 'pop', c: '#f2b705' },
    },
    {
      key: 'crate',
      x: x + 17,
      y: y,
      node: (
        <g>
          {shadow(x + 17, y, 5)}
          {at(x + 11, y - 8, CRATE)}
        </g>
      ),
      tap: { lines: ['Caixote de discos de vinil! 💿', 'Cada disco é uma batida diferente! 💿'], sound: 'pop', c: '#12a3a0' },
    },
  ];
}

/* ---- Jardim da Dona Cida ---- */

const FLOWERS: [dx: number, dy: number, c: string, kind: 'rose' | 'ball' | 'daisy'][] = [
  [-27, 4, '#d64545', 'rose'],
  [-23, 6, '#ec6a8c', 'ball'],
  [8, 4, '#7fb8ff', 'ball'],
  [12, 6, '#ffffff', 'daisy'],
  [16, 4, '#d64545', 'rose'],
  [20, 6, '#b48ae0', 'ball'],
  [24, 4, '#ffffff', 'daisy'],
  [28, 6, '#ec6a8c', 'rose'],
];

function bordadoGround(p: Place) {
  const { x, y } = p;
  return (
    <g>
      {/* Canteiros de terra dos dois lados da porta */}
      <rect x={x + 6} y={y + 1} width={26} height={8} fill="#7a4a25" />
      <rect x={x + 6} y={y + 1} width={26} height={1} fill="#5c3a1c" />
      <rect x={x - 30} y={y + 1} width={10} height={8} fill="#7a4a25" />
      <rect x={x - 30} y={y + 1} width={10} height={1} fill="#5c3a1c" />
      {/* Caminho de pedras até a porta */}
      {[[-2, 2], [1, 5], [-3, 8], [0, 11]].map(([dx, dy]) => (
        <rect key={`${dx}${dy}`} x={x + dx} y={y + dy} width={3} height={2} fill="#d9d2bf" />
      ))}
    </g>
  );
}

function Flower({ x, y, c, kind }: { x: number; y: number; c: string; kind: 'rose' | 'ball' | 'daisy' }) {
  return (
    <g>
      <rect x={x + 1} y={y - 3} width={1} height={3} fill="#2c8a3a" />
      <rect x={x} y={y - 2} width={1} height={1} fill="#3aa655" />
      {kind === 'rose' && (
        <>
          <rect x={x} y={y - 5} width={3} height={2} fill={c} />
          <rect x={x + 1} y={y - 6} width={1} height={1} fill={c} />
          <rect x={x + 1} y={y - 5} width={1} height={1} fill="#8f2a2a" />
        </>
      )}
      {kind === 'ball' && (
        <>
          <rect x={x - 1} y={y - 6} width={5} height={3} fill={c} />
          <rect x={x} y={y - 7} width={3} height={1} fill={c} />
          <rect x={x} y={y - 6} width={1} height={1} fill="#ffffff" opacity={0.6} />
        </>
      )}
      {kind === 'daisy' && (
        <>
          <rect x={x} y={y - 5} width={3} height={1} fill={c} />
          <rect x={x + 1} y={y - 6} width={1} height={3} fill={c} />
          <rect x={x + 1} y={y - 5} width={1} height={1} fill="#f2b705" />
        </>
      )}
    </g>
  );
}

function bordadoProps(p: Place): YardProp[] {
  const { x, y } = p;
  const picket = (x0: number, n: number) =>
    Array.from({ length: n }, (_, i) => (
      <g key={i}>
        <rect x={x0 + i * 2} y={y + 9} width={1} height={4} fill="#fbf7ee" />
        <rect x={x0 + i * 2} y={y + 13} width={1} height={1} fill="#c9c0a6" />
      </g>
    ));
  return [
    {
      key: 'flowers',
      x: x + 18,
      y: y + 8,
      node: (
        <g className="cw-sway" style={{ animationDuration: '3s', '--a': '1.5deg' } as CSSProperties}>
          {FLOWERS.map(([dx, dy, c, k]) => (
            <Flower key={`${dx}`} x={x + dx} y={y + dy + 2} c={c} kind={k} />
          ))}
        </g>
      ),
      tap: { lines: ['Minhas rosas! Rego todo dia de manhã. 🌹', 'Hortênsia azul, que nem o céu! 💙', 'Flor bonita a gente borda também! 🌸'], sound: 'rustle', c: '#ec6a8c' },
    },
    {
      key: 'picket',
      x: x + 18,
      y: y + 14,
      node: (
        <g>
          <rect x={x + 5} y={y + 10} width={28} height={1} fill="#e9e1d3" />
          <rect x={x - 31} y={y + 10} width={12} height={1} fill="#e9e1d3" />
          <rect x={x + 5} y={y + 12} width={28} height={1} fill="#e9e1d3" />
          <rect x={x - 31} y={y + 12} width={12} height={1} fill="#e9e1d3" />
          {picket(x + 5, 14)}
          {picket(x - 31, 6)}
        </g>
      ),
    },
    {
      key: 'can',
      x: x - 36,
      y: y + 6,
      node: at(x - 41, y - 1, WATERING_CAN),
      tap: { lines: ['Meu regador! Planta também tem sede. 💧', 'Água fresquinha pras flores! 💧'], sound: 'pop', c: '#7fb8ff' },
    },
    {
      key: 'bench',
      x: x - 25,
      y: y - 1,
      node: (
        <g>
          {shadow(x - 25, y, 6)}
          {at(x - 31, y - 6, BENCH)}
          {/* Almofadinha de fuxico no banco */}
          <rect x={x - 27} y={y - 7} width={3} height={2} fill="#ec6a8c" />
          <rect x={x - 26} y={y - 7} width={1} height={1} fill="#ffe27a" />
        </g>
      ),
      tap: { lines: ['Aqui eu sento pra bordar de tardinha. 🧵', 'Senta aqui, minha flor! 🌸'], sound: 'pop', c: '#ffe27a' },
    },
  ];
}

/** Chão do quintal (por baixo de tudo). */
export function yardGround(p: Place): ReactNode {
  if (p.kind !== 'mestre') return null;
  if (p.variant === 'hiphop') return hiphopGround(p);
  if (p.variant === 'bordado') return bordadoGround(p);
  return rocaGround(p);
}

/** Peças do quintal que entram na ordem de profundidade do mapa. */
export function yardProps(p: Place): YardProp[] {
  if (p.kind !== 'mestre') return [];
  const list = p.variant === 'hiphop' ? hiphopProps(p) : p.variant === 'bordado' ? bordadoProps(p) : rocaProps(p);
  return list.map((it) => ({ ...it, key: `${p.id}:${it.key}` }));
}

/** Área do quintal (sem árvores nem tufos de grama por cima): [x0, y0, x1, y1]. */
export function yardZone(p: Place): [number, number, number, number] | null {
  if (p.kind !== 'mestre') return null;
  if (p.variant === 'hiphop') return [p.x - 24, p.y, p.x + 40, p.y + 16];
  if (p.variant === 'bordado') return [p.x - 34, p.y, p.x + 42, p.y + 16];
  return [p.x - 40, p.y - 4, p.x + 38, p.y + 40];
}
