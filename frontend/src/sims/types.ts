import type { FigureCanvas } from './figureCanvas';

export type ControlIcon = 'play' | 'pause' | 'reset' | 'prev' | 'next' | 'switch' | 'charge' | 'bolt';

export interface SimControl {
  id: string;
  kind: 'button' | 'toggle' | 'slider';
  label: string;
  icon?: ControlIcon;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface Readout {
  label: string;
  value: string;
}

/** Estado vivo de una simulación dibujada sobre la hoja. */
export interface FigureRuntime {
  controls: SimControl[];
  /** Valor actual de toggles y sliders (lo lee la interfaz). */
  values: Record<string, number | boolean>;
  onControl(id: string, value?: number | boolean): void;
  /** Avanza el estado físico/lógico. */
  update(dt: number): void;
  /** Dibuja el fotograma actual (el lienzo ya viene limpio). */
  draw(fc: FigureCanvas): void;
  readouts(): Readout[];
  /** Texto destacado bajo los controles (p. ej. qué hace el paso actual del debugger). */
  caption?(): string;
  /** true = la figura cambia con el tiempo y debe redibujarse cada fotograma. */
  animated: boolean;
}

export interface FigureSpec {
  /** Relación ancho/alto del área que necesita la figura. */
  aspect: number;
  /** Ancho mínimo en alturas de letra (por debajo no se entiende). */
  minWidthChars: number;
  title: string;
  create(): FigureRuntime;
}

/** Utilidades compartidas. */
export const fmtNum = (v: number, d = 2) => {
  if (!Number.isFinite(v)) return '—';
  const r = Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : String(parseFloat(v.toFixed(d)));
  return r.replace('-', '–');
};

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const num = (v: unknown, fallback: number): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
};
