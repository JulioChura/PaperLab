import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { NormRect } from '../../ar/paperVision';
import type { MediaSource } from '../../ar/arScene';
import type { TutorFeedback } from '../../tutor/types';
import { errorLabel } from '../../tutor/types';

interface Props {
  host: HTMLElement | null;
  media: MediaSource;
  /** Zona del dibujo en coordenadas normalizadas del fotograma. */
  box: NormRect | null;
  tutor: TutorFeedback;
}

interface Px {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Convierte la caja normalizada del fotograma a píxeles de pantalla según el object-fit del medio. */
function toScreen(host: HTMLElement, media: MediaSource, b: NormRect): Px {
  const cw = host.clientWidth || 1;
  const ch = host.clientHeight || 1;
  const scale = media.fit === 'cover' ? Math.max(cw / media.width, ch / media.height) : Math.min(cw / media.width, ch / media.height);
  const ox = (cw - media.width * scale) / 2;
  const oy = (ch - media.height * scale) / 2;
  const pad = 10;
  let left = ox + b.x * media.width * scale - pad;
  let top = oy + b.y * media.height * scale - pad;
  let width = b.w * media.width * scale + pad * 2;
  let height = b.h * media.height * scale + pad * 2;
  // dentro de la pantalla y con un tamaño mínimo legible
  width = Math.max(140, Math.min(width, cw - 16));
  height = Math.max(90, Math.min(height, ch - 16));
  left = Math.min(Math.max(8, left), cw - width - 8);
  top = Math.min(Math.max(64, top), ch - height - 8);
  return { left, top, width, height };
}

/**
 * Holograma de advertencia superpuesto al dibujo cuando el Tutor Socrático detecta un error:
 * marco parpadeante con esquinas, franja de peligro y el nombre del error.
 */
export const WarningHologram: React.FC<Props> = ({ host, media, box, tutor }) => {
  const [rect, setRect] = useState<Px | null>(null);
  const critical = tutor.mistakes?.some((m) => m.severity === 'critical') || ['short_circuit', 'infinite_loop', 'impossible_triangle', 'negative_angle', 'impossible_value'].includes(tutor.error_type ?? '');

  useEffect(() => {
    if (!host) return;
    const b = box ?? { x: 0.12, y: 0.08, w: 0.5, h: 0.3 };
    const update = () => setRect(toScreen(host, media, b));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(host);
    return () => ro.disconnect();
  }, [host, media, box]);

  if (!rect) return null;
  const accent = critical ? '#fb7185' : '#fbbf24';
  return (
    <div
      className={`absolute z-20 pointer-events-none rounded-xl holo-warning ${critical ? 'critical' : ''}`}
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
      data-testid="warning-hologram"
      aria-hidden="true"
    >
      {(['top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-xl', 'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-xl', 'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-xl', 'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-xl'] as const).map((c) => (
        <span key={c} className={`absolute w-5 h-5 ${c}`} style={{ borderColor: accent }} />
      ))}
      <div className="absolute -top-3 left-3 flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-md bg-slate-950/90 border font-telemetry text-[10px] font-bold uppercase tracking-wider" style={{ borderColor: accent, color: accent }}>
        <span className="hazard-stripes w-4 h-3 rounded-sm" />
        <AlertTriangle className="w-3 h-3" />
        <span>{errorLabel(tutor.error_type)}</span>
      </div>
      <div className="absolute inset-0 rounded-xl holo-scanlines opacity-60" style={{ backgroundImage: `linear-gradient(to bottom, transparent 0, ${accent}22 50%, transparent 100%)`, backgroundSize: '100% 24px' }} />
    </div>
  );
};
