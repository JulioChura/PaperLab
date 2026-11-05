import React, { useMemo } from 'react';
import qrcode from 'qrcode-generator';
import { AlertTriangle, Camera, Check, CircleDashed, LifeBuoy, Loader2, PenLine, Trophy, WifiOff, Wifi, Armchair } from 'lucide-react';
import type { Student, StudentStatus } from '../classroom/types';
import { initials, pingQuality } from '../classroom/sim';

export const STATUS_META: Record<StudentStatus, { label: string; icon: React.FC<{ className?: string }>; cls: string }> = {
  connecting: { label: 'Conectando', icon: Loader2, cls: 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]' },
  lobby: { label: 'En la sala', icon: Armchair, cls: 'bg-[var(--surface-secondary)] text-[var(--text-primary)]' },
  drawing: { label: 'Dibujando', icon: PenLine, cls: 'bg-[#dde3ff] text-[#1f2f9c]' },
  scanning: { label: 'Escaneando', icon: Camera, cls: 'bg-[#2f4bf0] text-[#fffaf0]' },
  error: { label: 'Con error', icon: AlertTriangle, cls: 'bg-[#ffe0d9] text-[#a3260f]' },
  stuck: { label: 'Atascado', icon: LifeBuoy, cls: 'bg-[#ff5435] text-[#fffaf0]' },
  solved: { label: 'Resolvió', icon: Check, cls: 'bg-[#12a96e] text-[#fffaf0]' },
  done: { label: 'Terminó', icon: Trophy, cls: 'bg-[#cdf5e1] text-[#0b6d48]' },
  reconnecting: { label: 'Reconectando', icon: Wifi, cls: 'bg-[#fff2c2] text-[#7f4d10]' },
  offline: { label: 'Desconectado', icon: WifiOff, cls: 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] line-through' },
};

export const StatusPill: React.FC<{ status: StudentStatus; small?: boolean }> = ({ status, small }) => {
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border-[1.5px] border-[#211a33] font-telemetry ${small ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'} ${m.cls}`}>
      <Icon className={`${small ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${status === 'connecting' ? 'animate-spin' : ''}`} />
      {m.label}
    </span>
  );
};

export const Avatar: React.FC<{ s: Pick<Student, 'name' | 'color' | 'real'>; size?: number; ring?: boolean }> = ({ s, size = 36, ring }) => (
  <span
    className="relative grid place-items-center shrink-0 rounded-full border-2 border-[#211a33] font-heading text-[#fffaf0]"
    style={{
      width: size,
      height: size,
      background: s.color,
      fontSize: size * 0.36,
      boxShadow: ring ? '0 0 0 3px var(--riso-pink)' : undefined,
      color: s.color === '#ffc81f' ? '#211a33' : '#fffaf0',
    }}
    title={s.name}
  >
    {initials(s.name)}
    {s.real && (
      <span className="absolute -bottom-1 -right-1 px-1 rounded-full bg-[#ff4f9e] border border-[#211a33] text-[7px] font-telemetry leading-tight text-[#fffaf0]">REAL</span>
    )}
  </span>
);

export const PingBars: React.FC<{ ms: number }> = ({ ms }) => {
  const q = pingQuality(ms);
  const n = q === 'good' ? 3 : q === 'fair' ? 2 : 1;
  const color = q === 'good' ? '#12a96e' : q === 'fair' ? '#d18900' : '#ff5435';
  return (
    <span className="inline-flex items-end gap-[2px]" title={`${ms} ms · ${q === 'good' ? 'buena' : q === 'fair' ? 'regular' : 'mala'} conexión`} aria-label={`Latencia ${ms} ms`}>
      {[1, 2, 3].map((i) => (
        <i key={i} className="w-[3px] rounded-[1px] inline-block" style={{ height: 3 + i * 3, background: i <= n ? color : 'var(--chart-track)' }} />
      ))}
    </span>
  );
};

export const Card: React.FC<{ title?: React.ReactNode; right?: React.ReactNode; className?: string; children: React.ReactNode; pad?: boolean }> = ({
  title,
  right,
  className = '',
  children,
  pad = true,
}) => (
  <section className={`ink-card ${pad ? 'p-4 sm:p-5' : ''} ${className}`}>
    {(title || right) && (
      <header className={`flex items-center justify-between gap-3 ${pad ? 'mb-3' : 'px-4 sm:px-5 pt-4 mb-3'}`}>
        {title && <h3 className="font-heading text-base sm:text-lg text-[var(--ink)] leading-tight">{title}</h3>}
        {right}
      </header>
    )}
    {children}
  </section>
);

/** Tarjeta de métrica: número grande + contexto. */
export const Stat: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: string; i?: number }> = ({ label, value, sub, accent, i = 0 }) => (
  <div className="pop-in ink-card !rounded-[18px] px-4 py-3 relative overflow-hidden" style={{ ['--i' as string]: i, ['--r' as string]: '0deg' }}>
    {accent && <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: accent }} />}
    <p className="font-telemetry text-[9.5px] uppercase tracking-wider text-[var(--text-secondary)]">{label}</p>
    <p className="font-heading text-[28px] leading-none mt-1.5 text-[var(--ink)] tabular-nums">{value}</p>
    {sub && <p className="text-[11.5px] text-[var(--text-secondary)] mt-1 leading-snug">{sub}</p>}
  </div>
);

export const QR: React.FC<{ text: string; size?: number }> = ({ text, size = 168 }) => {
  const cells = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    const rects: string[] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) rects.push(`M${c},${r}h1v1h-1z`);
    return { n, d: rects.join('') };
  }, [text]);
  return (
    <svg width={size} height={size} viewBox={`-2 -2 ${cells.n + 4} ${cells.n + 4}`} shapeRendering="crispEdges" role="img" aria-label={`Código QR para unirse: ${text}`} className="rounded-xl bg-white">
      <rect x="-2" y="-2" width={cells.n + 4} height={cells.n + 4} fill="#ffffff" />
      <path d={cells.d} fill="#211a33" />
    </svg>
  );
};

export const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="flex items-center gap-2 text-sm text-[var(--text-secondary)] py-3">
    <CircleDashed className="w-4 h-4" />
    {children}
  </p>
);

export const fmtClock = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
