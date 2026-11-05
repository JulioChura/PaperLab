/**
 * Gráficos del tablero docente (SVG a mano, sin librerías):
 * marcas finas, grilla discreta, una paleta validada (azul/rosa) y tooltip al pasar el mouse.
 */
import React, { useMemo, useRef, useState } from 'react';
import type { TimelinePoint } from '../classroom/types';

const A = 'var(--chart-a)';
const B = 'var(--chart-b)';

const niceMax = (v: number) => {
  if (v <= 5) return 5;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};

const Tip: React.FC<{ x: number; y: number; w: number; children: React.ReactNode }> = ({ x, y, w, children }) => (
  <div
    className="pointer-events-none absolute z-10 rounded-xl border-2 border-[#211a33] bg-[#fffaf0] px-2.5 py-1.5 text-[11px] text-[#211a33] shadow-[3px_3px_0_#211a33] whitespace-nowrap"
    style={{ left: Math.min(Math.max(x, 8), w - 8), top: y, transform: 'translate(-50%, calc(-100% - 10px))' }}
  >
    {children}
  </div>
);

// ------------------------------------------------------------------ progreso en el tiempo
export const ProgressChart: React.FC<{ data: TimelinePoint[]; height?: number }> = ({ data, height = 210 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [box, setBox] = useState({ w: 1, h: 1 });
  const W = 640;
  const H = height;
  const pad = { l: 34, r: 92, t: 14, b: 26 };
  const pts = data.length ? data : [{ t: 0, attempts: 0, solved: 0 }];
  const tMax = Math.max(60, pts[pts.length - 1].t);
  const yMax = niceMax(Math.max(...pts.map((p) => p.attempts), 4));
  const x = (t: number) => pad.l + (t / tMax) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / yMax) * (H - pad.t - pad.b);
  const path = (k: 'attempts' | 'solved') => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ');
  const area = `${path('solved')} L${x(pts[pts.length - 1].t)},${y(0)} L${x(0)},${y(0)} Z`;
  const ticks = [0, yMax / 2, yMax];
  const minuteStep = tMax > 1200 ? 300 : tMax > 600 ? 120 : 60;
  const xt: number[] = [];
  for (let t = 0; t <= tMax; t += minuteStep) xt.push(t);
  const last = pts[pts.length - 1];
  const hp = hover !== null ? pts[hover] : null;

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const sx = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    for (let i = 1; i < pts.length; i++) if (Math.abs(x(pts[i].t) - sx) < Math.abs(x(pts[best].t) - sx)) best = i;
    setHover(best);
    setBox({ w: r.width, h: r.height });
  };

  return (
    <div ref={ref} className="relative w-full" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label={`Progreso de la clase: ${last.attempts} intentos y ${last.solved} resoluciones`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" strokeWidth="1" />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--text-secondary)" fontFamily="Martian Mono">{v}</text>
          </g>
        ))}
        {xt.map((t) => (
          <text key={t} x={x(t)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--text-secondary)" fontFamily="Martian Mono">{Math.round(t / 60)}′</text>
        ))}
        <path d={area} fill={B} opacity="0.12" />
        <path d={path('attempts')} fill="none" stroke={A} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <path d={path('solved')} fill="none" stroke={B} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* etiquetas directas al final de cada serie */}
        <circle cx={x(last.t)} cy={y(last.attempts)} r="4.5" fill={A} stroke="var(--surface)" strokeWidth="2" />
        <circle cx={x(last.t)} cy={y(last.solved)} r="4.5" fill={B} stroke="var(--surface)" strokeWidth="2" />
        <text x={x(last.t) + 9} y={y(last.attempts) + 4} fontSize="12" fill="var(--text-primary)" fontWeight="700">{last.attempts} intentos</text>
        <text x={x(last.t) + 9} y={Math.max(y(last.solved) + 4, y(last.attempts) + 18)} fontSize="12" fill="var(--text-primary)" fontWeight="700">{last.solved} resueltas</text>
        {hp && (
          <g>
            <line x1={x(hp.t)} x2={x(hp.t)} y1={pad.t} y2={H - pad.b} stroke="var(--text-secondary)" strokeDasharray="3 3" />
            <circle cx={x(hp.t)} cy={y(hp.attempts)} r="4" fill={A} stroke="var(--surface)" strokeWidth="2" />
            <circle cx={x(hp.t)} cy={y(hp.solved)} r="4" fill={B} stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hp && (
        <Tip x={(x(hp.t) / W) * box.w} y={(y(hp.attempts) / H) * box.h} w={box.w}>
          <b className="font-telemetry">min {Math.floor(hp.t / 60)}:{String(Math.round(hp.t % 60)).padStart(2, '0')}</b>
          <span className="flex items-center gap-1.5 mt-0.5"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: A }} />{hp.attempts} intentos</span>
          <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: B }} />{hp.solved} resueltas</span>
        </Tip>
      )}
      <div className="flex gap-4 mt-1 text-[11px] font-telemetry text-[var(--text-secondary)]">
        <span className="flex items-center gap-1.5"><i className="w-3 h-[3px] rounded-full inline-block" style={{ background: A }} />Intentos (acumulado)</span>
        <span className="flex items-center gap-1.5"><i className="w-3 h-[3px] rounded-full inline-block" style={{ background: B }} />Misiones resueltas</span>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ barras horizontales
export interface BarDatum {
  key: string;
  label: string;
  value: number;
  /** texto a la derecha de la barra */
  display?: string;
  sub?: string;
  tip?: string;
}

export const BarList: React.FC<{ data: BarDatum[]; max?: number; color?: string; onSelect?: (key: string) => void; selected?: string | null }> = ({
  data,
  max,
  color = A,
  onSelect,
  selected,
}) => {
  const m = max ?? Math.max(1, ...data.map((d) => d.value));
  const [hover, setHover] = useState<string | null>(null);
  return (
    <ul className="space-y-2.5">
      {data.map((d) => {
        const active = selected === d.key;
        return (
          <li key={d.key}>
            <button
              type="button"
              onClick={() => onSelect?.(d.key)}
              onPointerEnter={() => setHover(d.key)}
              onPointerLeave={() => setHover(null)}
              className={`group relative w-full text-left ${onSelect ? 'cursor-pointer' : 'cursor-default'}`}
              aria-pressed={onSelect ? active : undefined}
            >
              <div className="flex items-baseline justify-between gap-3 text-[13px] leading-tight">
                <span className={`truncate ${active ? 'font-black' : 'font-semibold'} text-[var(--text-primary)]`}>{d.label}</span>
                <span className="font-telemetry text-[11px] text-[var(--text-primary)] shrink-0">{d.display ?? d.value}</span>
              </div>
              {d.sub && <div className="text-[11px] text-[var(--text-secondary)] truncate">{d.sub}</div>}
              <div className="mt-1 h-2.5 rounded-full bg-[var(--chart-track)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-700 [transition-timing-function:var(--ease-spring)]"
                  style={{ width: `${Math.max(2, (d.value / m) * 100)}%`, background: color, opacity: selected && !active ? 0.45 : 1 }}
                />
              </div>
              {hover === d.key && d.tip && (
                <div className="pointer-events-none absolute right-0 -top-2 -translate-y-full z-10 max-w-[18rem] whitespace-normal rounded-xl border-2 border-[#211a33] bg-[#fffaf0] px-2.5 py-1.5 text-[11px] text-[#211a33] shadow-[3px_3px_0_#211a33]">
                  {d.tip}
                </div>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
};

// ------------------------------------------------------------------ histograma
export const Histogram: React.FC<{ values: number[]; binSec?: number; height?: number }> = ({ values, binSec = 60, height = 150 }) => {
  const [hover, setHover] = useState<number | null>(null);
  const bins = useMemo(() => {
    if (!values.length) return [] as number[];
    const n = Math.min(14, Math.max(4, Math.ceil(Math.max(...values) / binSec)));
    const b = new Array(n).fill(0);
    for (const v of values) b[Math.min(n - 1, Math.floor(v / binSec))]++;
    return b;
  }, [values, binSec]);
  if (!bins.length) return <p className="text-sm text-[var(--text-secondary)]">Aún no hay resoluciones.</p>;
  const W = 420;
  const H = height;
  const pad = { l: 26, r: 6, t: 10, b: 24 };
  const m = niceMax(Math.max(...bins));
  const bw = (W - pad.l - pad.r) / bins.length;
  const y = (v: number) => pad.t + (1 - v / m) * (H - pad.t - pad.b);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label="Distribución del tiempo de resolución">
        {[0, m / 2, m].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--chart-grid)" />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="var(--text-secondary)" fontFamily="Martian Mono">{v}</text>
          </g>
        ))}
        {bins.map((c, i) => {
          const x = pad.l + i * bw + 1;
          const h = y(0) - y(c);
          return (
            <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              {c > 0 && <path d={`M${x},${y(0)} V${y(c) + 4} q0,-4 4,-4 H${x + bw - 6} q4,0 4,4 V${y(0)} Z`} fill={A} opacity={hover === null || hover === i ? 1 : 0.5} />}
              {i % Math.ceil(bins.length / 7) === 0 && (
                <text x={pad.l + i * bw + bw / 2} y={H - 7} textAnchor="middle" fontSize="10" fill="var(--text-secondary)" fontFamily="Martian Mono">{Math.round((i * binSec) / 60)}′</text>
              )}
              {hover === i && h >= 0 && (
                <text x={pad.l + i * bw + bw / 2} y={y(c) - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text-primary)">{c}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <p className="absolute right-0 top-0 font-telemetry text-[10px] text-[var(--text-secondary)]">
          {Math.round((hover * binSec) / 60)}–{Math.round(((hover + 1) * binSec) / 60)} min: {bins[hover]} alumno{bins[hover] === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ anillo de progreso (hero)
export const Ring: React.FC<{ value: number; size?: number; label?: string }> = ({ value, size = 76, label }) => {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${Math.round(value * 100)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--chart-track)" strokeWidth="9" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={B}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${c * Math.min(1, value)} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 700ms var(--ease-spring)' }}
      />
      <text x="50%" y="54%" textAnchor="middle" fontSize={size / 4.4} fontWeight="900" fill="var(--text-primary)" fontFamily="Gabarito">{Math.round(value * 100)}%</text>
    </svg>
  );
};
