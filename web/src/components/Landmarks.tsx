import type { ReactNode } from 'react';
import { CITY_BRIDGE as BRIDGE, CITY_PATH as MAIN_PATH, type Place } from '../lib/world';
import { shade } from '../lib/pixel';
import type { HouseParts, Part } from './MestreHouses';

/*
 * Pontos focais de Cataguases no mapa (porta em p.x, p.y):
 * - Ponte Metálica (Ponte Velha): treliça vermelha de ferro sobre o Rio Pomba, com as duas torres
 *   em cima dos pilares e o banzo de cima "afundando" entre elas. É desenhada no lado de trás do
 *   tabuleiro (o chão da ponte fica no Ground do mapa), para quem atravessa passar na frente dela.
 * - Museu Energisa: casarão art nouveau amarelo com enfeites brancos, frontão curvo, sacadas de ferro
 *   e o alpendre com escada do lado esquerdo.
 */

const INK = '#1b2b33';
export const BRIDGE_RED = '#c8443a';
export const BRIDGE_DARK = '#8e2f27';
export const BRIDGE_LIGHT = '#e6735f';

/** Meia largura da ponte no mapa e onde ficam as torres (distância do meio). */
export const MAP_BRIDGE = { half: 15, tower: 8 };

/** Altura do banzo de cima acima do tabuleiro (mapa), a `d` pixels do meio da ponte. */
function mapTop(d: number) {
  const { half, tower } = MAP_BRIDGE;
  const a = Math.abs(d);
  if (a <= tower) return 6 + 6 * (a / tower) ** 2;
  const k = (a - tower) / (half - tower);
  return 3 + 9 * (1 - k) ** 2;
}

export function bridgeParts(p: Place, night: boolean): HouseParts {
  const bx = p.x;
  const y0 = BRIDGE.y0;
  const { half, tower } = MAP_BRIDGE;
  const cols: ReactNode[] = [];
  for (let d = -half; d <= half; d++) {
    const h = Math.round(mapTop(d));
    const x = bx + d;
    cols.push(<rect key={`o${d}`} x={x} y={y0 - h - 1} width={1} height={1} fill={INK} />);
    cols.push(<rect key={`c${d}`} x={x} y={y0 - h} width={1} height={1} fill={BRIDGE_RED} />);
    // Treliça: montantes de dois em dois pixels, alternando o tom (parece o "xadrez" das diagonais).
    if (d % 2 === 0) cols.push(<rect key={`v${d}`} x={x} y={y0 - h + 1} width={1} height={h - 1} fill={(d / 2) % 2 ? BRIDGE_DARK : BRIDGE_RED} />);
    else if (h > 4) cols.push(<rect key={`m${d}`} x={x} y={y0 - Math.round(h / 2)} width={1} height={1} fill={BRIDGE_DARK} />);
  }
  return {
    body: [],
    details: [],
    sign: [bx - 5, y0 - 26],
    extra: (
      <g>
        <rect x={bx - half - 1} y={y0 - 15} width={half * 2 + 3} height={BRIDGE.y1 - y0 + 17} fill="transparent" />
        {cols}
        {/* Torres em cima dos pilares, com a lanterninha no alto */}
        {[bx - tower, bx + tower].map((tx) => (
          <g key={tx}>
            <rect x={tx - 1} y={y0 - 15} width={4} height={15} fill={INK} />
            <rect x={tx} y={y0 - 14} width={2} height={14} fill={BRIDGE_RED} />
            <rect x={tx + 1} y={y0 - 14} width={1} height={14} fill={BRIDGE_DARK} />
            <rect x={tx} y={y0 - 16} width={2} height={1} fill={night ? '#ffe27a' : '#f4f1de'} />
          </g>
        ))}
        <rect x={bx - half} y={y0 - 1} width={half * 2 + 1} height={2} fill={BRIDGE_DARK} />
        <rect x={bx - half} y={y0 - 1} width={half * 2 + 1} height={1} fill={BRIDGE_LIGHT} />
      </g>
    ),
  };
}

/** Tabuleiro da ponte no chão do mapa (asfalto, calçadas e o guarda-corpo da frente). */
export function BridgeDeck({ bx }: { bx: number }) {
  const { half } = MAP_BRIDGE;
  const y0 = BRIDGE.y0;
  const y1 = BRIDGE.y1;
  return (
    <g>
      <rect x={bx - half - 1} y={y1 + 2} width={half * 2 + 3} height={3} fill="#000" opacity={0.18} />
      <rect x={bx - half} y={y0 + 1} width={half * 2 + 1} height={y1 - y0} fill="#9d978b" />
      <rect x={bx - half} y={y0 + 1} width={half * 2 + 1} height={2} fill="#cfc6b0" />
      <rect x={bx - half} y={y1 - 2} width={half * 2 + 1} height={2} fill="#cfc6b0" />
      <rect x={bx - half} y={MAIN_PATH.y + 3} width={half * 2 + 1} height={1} fill="#b7b0a1" />
      <rect x={bx - half - 1} y={y1} width={half * 2 + 3} height={2} fill={BRIDGE_RED} />
      <rect x={bx - half - 1} y={y1 + 1} width={half * 2 + 3} height={1} fill={BRIDGE_DARK} />
      {Array.from({ length: half + 1 }, (_, i) => (
        <rect key={i} x={bx - half + i * 2} y={y1 - 2} width={1} height={2} fill={BRIDGE_RED} />
      ))}
    </g>
  );
}

/** Museu Energisa no mapa: alpendre com escada à esquerda e o casarão com frontão no meio. */
export function museumParts(p: Place, glass: string): HouseParts {
  const { x, y } = p;
  const wall = '#f2cf6b';
  const wallDark = '#d9b24e';
  const white = '#fbf7ec';
  const iron = '#6f7d86';
  const x0 = x - 23;
  const xb = x0 + 14;
  const xc = xb + 4;
  const body: Part[] = [
    // Alpendre: parede de baixo, parede do fundo, telhadinho de madeira
    [x0, y - 12, 14, 12, wall],
    [x0 + 1, y - 24, 13, 11, wallDark],
    [x0 - 1, y - 26, 16, 2, '#8a5a2b'],
    // Casarão
    [xb, y - 28, 32, 28, wall],
    [xc, y - 33, 18, 5, wall],
    [xc + 2, y - 35, 14, 2, wall],
    [xc + 5, y - 37, 8, 2, white],
    [xc + 8, y - 39, 2, 2, white],
  ];
  const details: Part[] = [
    // Janelas altas de cima (venezianas brancas) e a do lado direito
    [xc + 3, y - 25, 4, 8, glass],
    [xc + 11, y - 25, 4, 8, glass],
    [xb + 26, y - 25, 4, 8, glass],
    // Janelinhas do porão com grade e a porta
    [xb + 2, y - 10, 3, 5, '#3d5560'],
    [xb + 26, y - 10, 3, 5, '#3d5560'],
    [x - 2, y - 9, 5, 9, '#7a4a25'],
    // Porta do alpendre (lá em cima da escada)
    [x0 + 3, y - 22, 4, 8, white],
  ];
  return {
    body,
    details,
    sign: [x - 5, y - 50],
    under: (
      <g>
        <rect x={xb} y={y - 3} width={32} height={3} fill="#8d969c" />
        <rect x={x0} y={y - 3} width={14} height={3} fill="#8d969c" />
        <rect x={xb - 1} y={y - 15} width={34} height={1} fill={white} />
        <rect x={xb - 1} y={y - 29} width={34} height={1} fill={white} />
        <rect x={xc} y={y - 31} width={18} height={1} fill={white} />
        <rect x={xc + 6} y={y - 34} width={6} height={3} fill={white} />
        <rect x={xc + 7} y={y - 33} width={4} height={1} fill={wallDark} />
        <rect x={xb + 32} y={y - 27} width={1} height={27} fill={wallDark} />
      </g>
    ),
    extra: (
      <g>
        {/* Sacadas de ferro */}
        <rect x={xc + 2} y={y - 17} width={14} height={1} fill={iron} />
        <rect x={xb + 25} y={y - 17} width={6} height={1} fill={iron} />
        {Array.from({ length: 7 }, (_, i) => (
          <rect key={`s${i}`} x={xc + 2 + i * 2} y={y - 16} width={1} height={1} fill={iron} />
        ))}
        {/* Guarda-corpo e colunas do alpendre */}
        <rect x={x0} y={y - 17} width={14} height={1} fill={iron} />
        {Array.from({ length: 7 }, (_, i) => (
          <rect key={`b${i}`} x={x0 + i * 2} y={y - 16} width={1} height={3} fill={iron} />
        ))}
        <rect x={x0} y={y - 13} width={14} height={1} fill={white} />
        <rect x={x0} y={y - 24} width={1} height={11} fill={iron} />
        <rect x={x0 + 12} y={y - 24} width={1} height={11} fill={iron} />
        {/* Logo da Energisa na parede do alpendre */}
        <rect x={x0 + 8} y={y - 22} width={3} height={1} fill="#12a3a0" />
        <rect x={x0 + 8} y={y - 21} width={1} height={1} fill="#e8772e" />
        <rect x={x0 + 10} y={y - 21} width={1} height={1} fill="#e8772e" />
        <rect x={x0 + 8} y={y - 20} width={3} height={1} fill="#8a9aa3" />
        {/* Escada subindo pela esquerda */}
        {Array.from({ length: 6 }, (_, i) => (
          <rect key={`e${i}`} x={x0 - 6 + i} y={y - 2 - i * 2} width={3} height={2} fill={i % 2 ? '#e9e2d0' : white} />
        ))}
      </g>
    ),
  };
}

/** Estação Cataguases no mapa: a fachada de tijolinho com o frontão à esquerda, o prédio comprido e os trilhos na frente. */
export function stationParts(p: Place, glass: string): HouseParts {
  const { x, y } = p;
  const brick = '#c0573e';
  const roof = '#8a5a3a';
  const roofDk = '#6b4423';
  const gx = x - 24;
  const body: Part[] = [
    [gx, y - 14, 16, 14, brick],
    ...Array.from({ length: 8 }, (_, i) => [gx + i, y - 15 - i, 16 - 2 * i, 1, brick] as Part),
    [gx + 16, y - 12, 31, 12, brick],
    ...Array.from({ length: 9 }, (_, i) => [gx + 16 - i, y - 14 - i, 34 + i, 1, i % 3 === 0 ? roofDk : roof] as Part),
  ];
  const details: Part[] = [
    [gx + 2, y - 11, 12, 2, '#f4f1de'],
    [gx + 5, y - 18, 2, 2, '#2a1a12'],
    [gx + 9, y - 18, 2, 2, '#2a1a12'],
    [gx + 6, y - 8, 4, 8, '#3d2a1e'],
    [gx + 20, y - 9, 3, 6, glass],
    [gx + 27, y - 9, 3, 6, glass],
    [x - 2, y - 9, 4, 9, '#3d2a1e'],
    [gx + 41, y - 9, 3, 6, glass],
  ];
  return {
    body,
    details,
    sign: [x - 5, y - 36],
    under: (
      <g>
        <rect x={gx} y={y - 3} width={47} height={3} fill="#d9c9a3" />
        <rect x={gx + 4} y={y - 11} width={8} height={1} fill="#8a6a4a" />
      </g>
    ),
    extra: (
      <g>
        {/* Trilhos na frente da plataforma */}
        <rect x={gx - 8} y={y + 2} width={330 - gx} height={6} fill="#9a8f7a" />
        {Array.from({ length: Math.ceil((330 - gx) / 3) }, (_, i) => (
          <rect key={i} x={gx - 8 + i * 3} y={y + 2} width={2} height={6} fill="#6b4423" />
        ))}
        <rect x={gx - 8} y={y + 3} width={330 - gx} height={1} fill="#5f6d76" />
        <rect x={gx - 8} y={y + 6} width={330 - gx} height={1} fill="#5f6d76" />
      </g>
    ),
  };
}

/** Chácara Dona Catarina no mapa: casa laranja com o frontão de renda branca no meio e as alas dos lados. */
export function chacaraParts(p: Place, glass: string): HouseParts {
  const { x, y } = p;
  const wall = '#f08a24';
  const roof = '#b5523b';
  const white = '#fbf7ec';
  const body: Part[] = [
    [x - 20, y - 13, 40, 13, wall],
    ...Array.from({ length: 6 }, (_, i) => [x - 21 + i, y - 14 - i, 42 - 2 * i, 1, i % 2 ? shade(roof, -0.2) : roof] as Part),
    [x - 7, y - 20, 15, 20, wall],
    ...Array.from({ length: 7 }, (_, i) => [x - 8 + i, y - 21 - i, 17 - 2 * i, 1, wall] as Part),
  ];
  const details: Part[] = [
    [x - 6, y - 15, 3, 9, glass],
    [x - 1, y - 15, 3, 9, '#3d2a1e'],
    [x + 4, y - 15, 3, 9, glass],
    [x - 17, y - 10, 3, 6, glass],
    [x - 12, y - 10, 3, 6, glass],
    [x + 11, y - 10, 3, 6, glass],
    [x + 16, y - 10, 3, 6, glass],
  ];
  return {
    body,
    details,
    sign: [x - 5, y - 40],
    under: (
      <g>
        <rect x={x - 20} y={y - 3} width={40} height={3} fill="#8d969c" />
        <rect x={x - 7} y={y - 20} width={1} height={17} fill={white} />
        <rect x={x + 7} y={y - 20} width={1} height={17} fill={white} />
        <rect x={x - 7} y={y - 21} width={15} height={1} fill={white} />
        <rect x={x} y={y - 25} width={1} height={1} fill={white} />
      </g>
    ),
    extra: (
      <g fill={white}>
        {/* Renda de madeira (lambrequim) na beira do frontão */}
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i}>
            <rect x={x - 9 + i} y={y - 21 - i} width={1} height={i % 2 ? 2 : 1} />
            <rect x={x + 9 - i} y={y - 21 - i} width={1} height={i % 2 ? 2 : 1} />
          </g>
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={`w${i}`} x={x - 20 + i * 4} y={y - 14} width={2} height={1} />
        ))}
      </g>
    ),
  };
}

/** Centro Cultural Humberto Mauro no mapa: prédio pequeno de dois andares com a placa vermelha e a entrada aberta. */
export function culturalParts(p: Place, glass: string): HouseParts {
  const { x, y } = p;
  const wall = '#e6e4c6';
  const red = '#d42a2a';
  const brick = '#9a5a48';
  const night = glass === '#ffd76a';
  const body: Part[] = [
    [x - 15, y - 30, 30, 30, wall],
    [x - 16, y - 32, 32, 2, '#cfcdb0'],
    [x - 17, y - 14, 34, 6, red],
  ];
  const details: Part[] = [
    [x - 12, y - 26, 9, 7, glass],
    [x + 3, y - 26, 9, 7, glass],
    [x - 12, y - 8, 24, 8, night ? glass : '#efe2c4'],
  ];
  return {
    body,
    details,
    sign: [x - 5, y - 44],
    under: <rect x={x - 15} y={y - 3} width={30} height={3} fill="#8d969c" />,
    extra: (
      <g>
        {/* Logo branco e as letrinhas da placa */}
        <rect x={x - 15} y={y - 13} width={3} height={4} fill="#ffffff" />
        <rect x={x - 10} y={y - 12} width={14} height={1} fill="#ffffff" />
        <rect x={x + 6} y={y - 11} width={8} height={1} fill="#ffffff" />
        {/* Elevador vermelho e as cadeiras do teatro lá dentro */}
        <rect x={x - 9} y={y - 7} width={4} height={7} fill="#c8262b" />
        <rect x={x + 3} y={y - 3} width={8} height={2} fill="#c8262b" />
        {/* Pilares de cobogó */}
        {[x - 15, x + 12].map((px) => (
          <g key={px}>
            <rect x={px} y={y - 8} width={3} height={8} fill={brick} />
            <rect x={px + 1} y={y - 7} width={1} height={1} fill="#4a2a22" />
            <rect x={px + 1} y={y - 4} width={1} height={1} fill="#4a2a22" />
          </g>
        ))}
      </g>
    ),
  };
}

/** Memorial Nanzita no mapa: andar de cima com a fileira de janelas, térreo recuado com o pilar em V e o painel colorido. */
export function memorialParts(p: Place, glass: string): HouseParts {
  const { x, y } = p;
  const beige = '#cfc8ae';
  const x0 = x - 21;
  const body: Part[] = [
    [x0 - 2, y - 28, 46, 3, beige],
    [x0, y - 25, 42, 12, '#f4f1de'],
    [x0, y - 13, 42, 2, beige],
    [x0 + 1, y - 11, 40, 11, '#5a5a52'],
    [x0 + 42, y - 27, 4, 27, '#c27a4a'],
  ];
  const details: Part[] = Array.from({ length: 6 }, (_, i) => [x0 + 1 + i * 7, y - 23, 6, 6, glass] as Part);
  const mural = ['#e3cf9a', '#c9a052', '#a89277', '#8aa86a', '#d9c48c', '#e3b341', '#b5523b'];
  return {
    body,
    details,
    sign: [x - 5, y - 41],
    under: <rect x={x0} y={y - 2} width={42} height={2} fill="#8d969c" />,
    extra: (
      <g>
        {/* Cortinas verdes e rosadas */}
        {Array.from({ length: 6 }, (_, i) => (
          <rect key={i} x={x0 + 1 + i * 7} y={y - 23} width={2} height={6} fill={i % 3 === 1 ? '#d9a7a0' : '#6fb5a5'} />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <rect key={`p${i}`} x={x0 + 1 + i * 7} y={y - 16} width={6} height={2} fill="#dfe6dc" />
        ))}
        {/* Pilar em V */}
        <path d={`M${x0 + 3} ${y - 11}L${x0 + 5} ${y - 11}L${x0 + 8} ${y}L${x0 + 6} ${y}Z`} fill="#e9e6dc" />
        <path d={`M${x0 + 11} ${y - 11}L${x0 + 13} ${y - 11}L${x0 + 8} ${y}L${x0 + 6} ${y}Z`} fill="#e9e6dc" />
        {/* Painel de azulejos */}
        {mural.map((c, i) => (
          <rect key={c} x={x0 + 16 + i * 3} y={y - 10} width={3} height={9} fill={c} />
        ))}
        <rect x={x0 + 22} y={y - 7} width={6} height={2} fill="#8a7660" />
      </g>
    ),
  };
}

/**
 * Painel do Educandário, na Praça Santa Rita, no mapa: o muro baixo de azulejos azuis com as pombas
 * brancas voando, o portão azul do lado e o muro de tijolinho; atrás, o sobrado bege de telhado vermelho.
 */
export function painelParts(p: Place, glass: string): HouseParts {
  const { x, y } = p;
  const x0 = x - 18;
  const blue = '#2448a8';
  const body: Part[] = [
    // Sobrado de trás
    [x + 5, y - 20, 17, 9, '#efe2c6'],
    [x + 3, y - 22, 21, 2, '#c4553a'],
    [x + 4, y - 24, 19, 2, '#d9694a'],
    // Muro de tijolinho, portão azul e o painel
    [x0, y - 11, 8, 11, '#c98a52'],
    [x0 + 8, y - 12, 9, 12, '#2f5fb3'],
    [x0 + 17, y - 12, 22, 12, blue],
    [x0, y - 12, 39, 1, '#e9e4da'],
  ];
  const details: Part[] = [
    [x + 7, y - 18, 3, 3, glass],
    [x + 12, y - 18, 3, 3, glass],
    [x + 17, y - 18, 3, 3, glass],
  ];
  /** Pombas brancas (um "v" de asas abertas) espalhadas pelo azul. */
  const doves: [number, number][] = [
    [4, 3],
    [12, 3],
    [19, 4],
    [8, 8],
    [16, 9],
  ];
  return {
    body,
    details,
    sign: [x - 5, y - 36],
    under: <rect x={x0} y={y - 1} width={39} height={1} fill="#8d969c" />,
    extra: (
      <g>
        {/* Tijolinhos e as tábuas do portão */}
        {[y - 9, y - 6, y - 3].map((yy) => (
          <rect key={yy} x={x0} y={yy} width={8} height={0.5} fill="#a86a3a" />
        ))}
        {[2, 5].map((d) => (
          <rect key={d} x={x0 + 8 + d} y={y - 11} width={0.6} height={11} fill="#244a8a" />
        ))}
        {/* Pombas brancas de asas abertas */}
        {doves.map(([dx, dy], i) => {
          const cx = x0 + 17 + dx;
          const cy = y - 12 + dy;
          return <path key={i} d={`M${cx - 3.5} ${cy - 1.5}L${cx} ${cy + 0.5}L${cx + 3.5} ${cy - 1.5}L${cx + 1} ${cy + 1.5}L${cx + 0.5} ${cy + 3}L${cx - 0.5} ${cy + 3}L${cx - 1} ${cy + 1.5}Z`} fill="#f4f6fb" />;
        })}
      </g>
    ),
  };
}

/** Letrinhas 3×5 da placa do hotel no mapa. */
const MINI: Record<string, string[]> = {
  V: ['1.1', '1.1', '1.1', '1.1', '.1.'],
  I: ['1', '1', '1', '1', '1'],
  L: ['1..', '1..', '1..', '1..', '111'],
  A: ['111', '1.1', '111', '1.1', '1.1'],
  S: ['111', '1..', '111', '..1', '111'],
};

function MiniText({ text, x, y, fill }: { text: string; x: number; y: number; fill: string }) {
  const out: ReactNode[] = [];
  let cx = x;
  for (const ch of text) {
    const g = MINI[ch];
    g.forEach((row, r) => [...row].forEach((c, k) => c === '1' && out.push(<rect key={`${cx}-${r}-${k}`} x={cx + k} y={y + r} width={1} height={1} />)));
    cx += g[0].length + 1;
  }
  return <g fill={fill}>{out}</g>;
}

/**
 * Prédio Sicredi (o antigo Grande Hotel Villas) no mapa, em destaque por ser patrocinador: maior que
 * os outros, no canto de cima à direita. Sobrado verde com as pilastras brancas, as janelas em arco
 * (as do meio com sacadinha), as portas brancas, a base de pedra, a cornija, as ameias, a placa
 * "VILLAS" com o enfeite em cima, as bandeirinhas verdes e a placa do Sicredi (acesa à noite).
 */
export function hotelParts(p: Place, glass: string): HouseParts {
  const { x, y } = p;
  const night = glass === '#ffd76a';
  const x0 = x - 32;
  const w = 64;
  const green = '#3f9a52';
  const greenD = '#2f7a40';
  const white = '#f6f5ee';
  const whiteD = '#d9d7cc';
  const bays = [x0 + 6.5, x0 + 19, x0 + 32, x0 + 45, x0 + 57.5];
  const body: Part[] = [
    [x0, y - 39, w, 39, green],
    [x0, y - 33, w, 1, greenD],
    // Cornija, faixa do meio e a base
    [x0 - 2, y - 35, w + 4, 2, white],
    [x0 - 1, y - 18, w + 2, 2, white],
    [x0, y - 6, w, 6, '#e7e5dc'],
    // Ameias
    ...Array.from({ length: 11 }, (_, i) => [x0 + 1 + i * 6, y - 42, 3, 3, white] as Part),
    [x0 - 1, y - 39, w + 2, 1, white],
  ];
  const details: Part[] = [];
  bays.forEach((cx, i) => {
    // Janela de cima em arco (vidro) com o peitoril
    details.push([cx - 2, y - 30, 4, 9, glass], [cx - 1, y - 31, 2, 1, glass], [cx - 3, y - 21, 6, 1, white]);
    // Porta branca em arco com a bandeira de vidro
    details.push([cx - 2.5, y - 13, 5, 13, white], [cx - 1.5, y - 14, 3, 1, white], [cx - 2, y - 12, 4, 3, night ? '#ffe7a8' : '#9fc4c8']);
    if (i === 2) details.push([cx - 0.5, y - 9, 1, 9, whiteD]);
  });
  // Placa do hotel no meio, em cima
  details.push([x - 15, y - 51, 30, 10, white], [x - 14, y - 50, 28, 8, greenD]);
  return {
    body,
    details,
    sign: [x - 5, y - 66],
    under: (
      <g>
        <rect x={x0 - 2} y={y - 1} width={w + 4} height={2} fill="#6b6b62" />
        {/* Calçada com o meio-fio amarelo na frente do prédio */}
        <rect x={x0 - 4} y={y + 1} width={w + 8} height={3} fill="#c9a89a" />
        <rect x={x0 - 4} y={y + 4} width={w + 8} height={1} fill="#e8c62e" />
      </g>
    ),
    extra: (
      <g>
        {/* Pilastras brancas com friso */}
        {[x0, x0 + 12.5, x0 + 25.5, x0 + 38.5, x0 + 51.5, x0 + w - 2].map((px) => (
          <g key={px}>
            <rect x={px} y={y - 33} width={2} height={15} fill={white} />
            <rect x={px} y={y - 16} width={2} height={10} fill={white} />
            <rect x={px + 0.8} y={y - 31} width={0.4} height={11} fill={whiteD} />
          </g>
        ))}
        {/* Sacadinhas de ferro nas três janelas do meio */}
        {bays.slice(1, 4).map((cx) => (
          <g key={cx}>
            <rect x={cx - 3.5} y={y - 24} width={7} height={0.6} fill="#1f2326" />
            {[-3, -1.5, 0, 1.5, 3].map((d) => (
              <rect key={d} x={cx + d - 0.2} y={y - 24} width={0.4} height={3} fill="#1f2326" />
            ))}
          </g>
        ))}
        {/* Pedras da base */}
        {Array.from({ length: 22 }, (_, i) => (
          <rect key={i} x={x0 + 0.5 + i * 2.9} y={y - 5 + (i % 3) * 1.5} width={1.6} height={1} fill={i % 2 ? '#5b5d58' : '#8a8c85'} />
        ))}
        {/* Dentinhos da cornija */}
        {Array.from({ length: 22 }, (_, i) => (
          <rect key={`d${i}`} x={x0 + i * 3} y={y - 33} width={1.5} height={0.8} fill={whiteD} />
        ))}
        {/* Nome na placa e o enfeite de dois laços em cima */}
        <MiniText text="VILLAS" x={x - 11} y={y - 49} fill={white} />
        <circle cx={x - 2} cy={y - 53} r={1.6} fill="none" stroke={white} strokeWidth={0.9} />
        <circle cx={x + 2} cy={y - 53} r={1.6} fill="none" stroke={white} strokeWidth={0.9} />
        {/* Bandeirinhas verdes nas pontas */}
        {[x0 + 1, x0 + w - 2].map((fx, i) => (
          <g key={fx}>
            <rect x={fx} y={y - 52} width={0.8} height={10} fill="#6b6b62" />
            <path d={i ? `M${fx} ${y - 52}L${fx - 6} ${y - 50}L${fx} ${y - 48}Z` : `M${fx + 0.8} ${y - 52}L${fx + 6.8} ${y - 50}L${fx + 0.8} ${y - 48}Z`} fill="#3fae49" />
          </g>
        ))}
        {/* Placa do Sicredi presa na pilastra, com a florzinha */}
        <rect x={x0 + 9} y={y - 18} width={7} height={5} fill={INK} />
        <rect x={x0 + 9.5} y={y - 17.5} width={6} height={4} fill={night ? '#6fe07a' : '#3fae49'} />
        <rect x={x0 + 12} y={y - 16.5} width={1} height={2} fill="#e9fbe9" />
        <rect x={x0 + 11} y={y - 15.5} width={3} height={0.8} fill="#e9fbe9" />
        {/* À noite, as luzes da calçada iluminam a fachada */}
        {night &&
          [x0 + 1, x0 + 13.5, x0 + 26.5, x0 + 39.5, x0 + 52.5, x0 + w - 1].map((lx) => (
            <path key={lx} d={`M${lx - 1} ${y}L${lx - 3} ${y - 30}L${lx + 3} ${y - 30}L${lx + 1} ${y}Z`} fill="#ffe2a0" opacity={0.28} />
          ))}
      </g>
    ),
  };
}
