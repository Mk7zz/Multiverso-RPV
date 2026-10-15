import type { ReactNode } from 'react';
import { BRIDGE, MAIN_PATH, type Place } from '../lib/world';
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
