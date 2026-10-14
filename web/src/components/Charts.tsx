import { useEffect, useRef, useState } from 'react';

// Gráficos de série única: cor da marca, sem legenda (o título do card nomeia a série),
// tooltip ao passar o mouse e alternativa em tabela para acessibilidade.

interface Datum {
  label: string;
  value: number;
  title?: string;
}

/** Colunas verticais, usadas para séries temporais curtas (ex.: últimos 14 dias). */
export function ColumnChart({ data, height = 180, format = (v: number) => String(v) }: { data: Datum[]; height?: number; format?: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(480);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(240, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height;
  const pad = { top: 12, right: 8, bottom: 26, left: 36 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = niceMax(max);
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const step = innerW / Math.max(1, data.length);
  const barW = Math.max(4, Math.min(28, step - 6));
  const ticks = [0, nice / 2, nice];
  const y = (v: number) => pad.top + innerH - (v / nice) * innerH;

  return (
    <div className="chart" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="Gráfico de colunas">
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid-line" x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} />
            <text className="axis-label" x={pad.left - 6} y={y(t)} dy="0.32em" textAnchor="end">
              {format(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.left + i * step + (step - barW) / 2;
          const top = y(d.value);
          const h = pad.top + innerH - top;
          const r = Math.min(4, barW / 2, h);
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.left + i * step} y={pad.top} width={step} height={innerH} fill="transparent" />
              {d.value > 0 && (
                <path
                  className={`bar ${hover === i ? 'hover' : ''}`}
                  d={`M${x},${top + h} V${top + r} q0,-${r} ${r},-${r} H${x + barW - r} q${r},0 ${r},${r} V${top + h} Z`}
                />
              )}
              {(i % Math.ceil(data.length / 7) === 0 || i === data.length - 1) && (
                <text className="axis-label" x={x + barW / 2} y={H - 8} textAnchor="middle">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${((pad.left + hover * step + step / 2) / W) * 100}%`, top: `${(y(data[hover].value) / H) * 100}%` }}>
          <strong>{format(data[hover].value)}</strong> · {data[hover].title ?? data[hover].label}
        </div>
      )}
      <table className="sr-only">
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th>{d.title ?? d.label}</th>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Barras horizontais para rankings (cursos mais acessados, municípios). */
export function BarList({ data, format = (v: number) => String(v), limit = 10 }: { data: Datum[]; format?: (v: number) => string; limit?: number }) {
  const rows = data.slice(0, limit);
  const max = Math.max(1, ...rows.map((d) => d.value));
  if (!rows.length) return <p className="muted small">Sem dados ainda.</p>;
  return (
    <div role="list">
      {rows.map((d) => (
        <div className="hbar" role="listitem" key={d.label} title={`${d.title ?? d.label}: ${format(d.value)}`}>
          <span className="truncate">{d.label}</span>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="hbar-value">{format(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

function niceMax(v: number) {
  const mag = 10 ** Math.floor(Math.log10(v));
  const n = v / mag;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * mag;
}
