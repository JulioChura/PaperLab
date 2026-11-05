import React, { useEffect, useRef, useState } from 'react';
import {
  Anchor, BatteryCharging, Camera, Check, ChevronDown, ChevronUp, FastForward, Pause, Play, Power, RotateCcw, ScanLine,
  Search, SkipBack, SkipForward, Zap,
} from 'lucide-react';
import { FigureCanvas } from '../../sims/figureCanvas';
import type { ControlIcon, FigureRuntime, Readout } from '../../sims/types';
import { PaperARScene, type MediaSource, type TrackingStatus } from '../../ar/arScene';
import type { HybridPaperTracker } from '../../ar/paperTracker';
import { layoutSolution } from '../../ar/arLayout';
import { ensureHandwritingFont } from '../../ar/handwriting';
import type { NormRect, PaperInkProfile } from '../../ar/paperVision';
import type { SolutionPlan } from '../../ar/mathEngine';

export interface ARSolverSession {
  id: number;
  media: MediaSource;
  profile: PaperInkProfile;
  plan: SolutionPlan;
  /** Espacio de seguimiento (px del fotograma capturado reducido). */
  space: { width: number; height: number };
  /** Rastreador vivo desde el instante de la captura (null en modo foto). */
  tracker: HybridPaperTracker | null;
}

interface Props {
  session: ARSolverSession;
  accent: string;
  mindarProgress: number | null;
  onRescan: () => void;
}

/**
 * Zona de pantalla que tapa el panel, convertida a coordenadas normalizadas del fotograma
 * (según el object-fit del medio), para que el layout no escriba debajo.
 */
function uiBlockedRects(host: HTMLElement, panel: HTMLElement | null, media: MediaSource): NormRect[] {
  if (!panel) return [];
  const hb = host.getBoundingClientRect();
  const pb = panel.getBoundingClientRect();
  const cw = hb.width || 1;
  const ch = hb.height || 1;
  const scale =
    media.fit === 'cover' ? Math.max(cw / media.width, ch / media.height) : Math.min(cw / media.width, ch / media.height);
  const ox = (cw - media.width * scale) / 2;
  const oy = (ch - media.height * scale) / 2;
  const toU = (x: number) => (x - hb.left - ox) / (media.width * scale);
  const toV = (y: number) => (y - hb.top - oy) / (media.height * scale);
  const gap = 10; // px de aire alrededor del panel
  const x0 = toU(pb.left - gap);
  const y0 = toV(pb.top - gap);
  return [{ x: x0, y: y0, w: toU(pb.right + gap) - x0, h: toV(pb.bottom + gap) - y0 }];
}

/** Mezcla un color hex con blanco (para el resaltador). */
function tint(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const STATUS_COPY: Record<TrackingStatus, { label: string; tone: string }> = {
  static: { label: 'Resuelto sobre tu foto', tone: 'text-slate-200 border-slate-600' },
  tracking: { label: 'Anclado a la hoja', tone: 'text-emerald-200 border-emerald-500/50' },
  lost: { label: 'Buscando la hoja…', tone: 'text-amber-200 border-amber-500/50' },
};

export const ARSolverOverlay: React.FC<Props> = ({ session, accent, mindarProgress, onRescan }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<PaperARScene | null>(null);
  const [titles, setTitles] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [done, setDone] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [runtime, setRuntime] = useState<FigureRuntime | null>(null);
  const [simState, setSimState] = useState<{ readouts: Readout[]; caption: string; values: Record<string, number | boolean> }>({
    readouts: [],
    caption: '',
    values: {},
  });
  const [status, setStatus] = useState<TrackingStatus>(
    session.tracker ? (session.tracker.state === 'tracking' ? 'tracking' : 'lost') : 'static',
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const life = { cancelled: false };
    const { profile, plan, media, space, tracker } = session;

    const scene = new PaperARScene(
      host,
      media,
      {
        inkReflectance: profile.inkReflectance,
        inkGrain: profile.inkKind === 'graphite' ? 0.6 : 0.18,
        highlightColor: tint(accent, 0.55),
        pencilColor: accent,
      },
      space,
      tracker,
    );
    sceneRef.current = scene;
    scene.onStatus = (s) => !life.cancelled && setStatus(s);
    scene.onLayerStart = (i) => {
      if (life.cancelled) return;
      setActive(i);
      setDone(false);
    };
    scene.onSequenceEnd = () => {
      if (life.cancelled) return;
      setDone(true);
      setActive(scene.layerCount - 1);
    };

    // La simulación se crea antes del layout: así el panel ya muestra sus controles
    // y su tamaño real se descuenta del espacio disponible en la hoja.
    const rt = plan.figure ? plan.figure.create() : null;
    setRuntime(rt);

    (async () => {
      await ensureHandwritingFont();
      // dejar que el panel termine de pintarse (controles y lecturas) antes de medirlo
      await new Promise((r) => setTimeout(r, 120));
      if (life.cancelled) return;
      const { layers, figure } = layoutSolution(plan, profile, uiBlockedRects(host, panelRef.current, media));
      const titlesList: string[] = [];

      if (rt && plan.figure && figure) {
        const aspect = plan.figure.aspect;
        const W = aspect >= 1 ? 1000 : Math.round(1000 * aspect);
        const H = Math.round(W / aspect);
        const u = figure.charH * (W / figure.place.w);
        const fc = new FigureCanvas(W, H, u, profile.strokeRatio);
        rt.draw(fc);
        const handle = scene.addAnimatedLayer(fc.ink, fc.light, figure.place, 1.8);
        const clock = { acc: 0 };
        scene.onFrame = (dt) => {
          rt.update(dt);
          clock.acc += dt;
          if (clock.acc >= 1 / 30) {
            clock.acc = 0;
            fc.begin();
            rt.draw(fc);
            scene.markDirty(handle);
          }
        };
        titlesList.push(plan.figure.title);
      }
      // la simulación (si hay) se dibuja primero; luego el texto y la gráfica
      layers.forEach((p) => scene.addLayer(p.layer.canvas, p.place, p.duration));
      titlesList.push(...layers.map((p) => p.title));
      setTitles(titlesList);
      scene.play(0);
      console.info('[PaperLab AR] Perfil de tinta:', profile, 'Plan:', plan.summary);
    })();


    return () => {
      life.cancelled = true;
      scene.dispose();
      sceneRef.current = null;
    };
  }, [session, accent]);

  useEffect(() => {
    if (!runtime) return;
    const tick = () =>
      setSimState({ readouts: runtime.readouts(), caption: runtime.caption?.() ?? '', values: { ...runtime.values } });
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [runtime]);

  const control = (id: string, value?: number | boolean) => {
    runtime?.onControl(id, value);
    if (runtime) setSimState((s) => ({ ...s, values: { ...runtime.values }, caption: runtime.caption?.() ?? '' }));
  };

  const statusCopy = STATUS_COPY[status];
  const mindarLabel =
    status === 'lost' && mindarProgress !== null
      ? mindarProgress < 100
        ? `MindAR ${Math.round(mindarProgress)}%`
        : 'MindAR'
      : null;

  return (
    <>
      {/* Host del canvas WebGL: SIN z-index para que mix-blend-mode mezcle con el video */}
      <div ref={hostRef} className="absolute inset-0 pointer-events-none" />

      {/* Estado del anclaje */}
      <div className="absolute top-16 left-4 z-30 pointer-events-none animate-entrance">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/75 border backdrop-blur-md font-telemetry text-[11px] ${statusCopy.tone}`}
        >
          {status === 'tracking' ? (
            <Anchor className="w-3.5 h-3.5" />
          ) : status === 'lost' ? (
            <Search className="w-3.5 h-3.5" />
          ) : (
            <Camera className="w-3.5 h-3.5" />
          )}
          <span>{statusCopy.label}</span>
          {mindarLabel && <span className="text-slate-400">· {mindarLabel}</span>}
        </div>
      </div>

      {/* Panel compacto: paso actual + progreso; la lista completa se despliega a pedido */}
      <div ref={panelRef} className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:w-[22rem] z-30 animate-entrance">
        <div className="rounded-2xl bg-slate-950/80 border border-slate-700/70 backdrop-blur-xl shadow-2xl text-white overflow-hidden">
          {expanded && (
            <ol className="px-2 pt-2 max-h-44 overflow-y-auto border-b border-slate-800">
              {titles.map((title, i) => {
                const written = done || i < active;
                const current = !done && i === active;
                return (
                  <li
                    key={`${title}-${i}`}
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-telemetry ${
                      current ? 'bg-white/10 text-white' : written ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    <span
                      className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] border"
                      style={
                        written
                          ? { background: accent, borderColor: accent, color: '#0b0f19' }
                          : current
                            ? { borderColor: accent, color: accent }
                            : { borderColor: '#334155' }
                      }
                    >
                      {written ? <Check className="w-3 h-3" /> : i + 1}
                    </span>
                    <span className="truncate">{title}</span>
                  </li>
                );
              })}
            </ol>
          )}

          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full px-4 pt-2.5 pb-2 flex items-center gap-3 text-left cursor-pointer"
          >
            <span
              className="shrink-0 w-3 h-3 rounded-full border border-white/30"
              style={{ background: session.profile.inkCss }}
              title={`Tinta detectada: ${session.profile.inkKind === 'graphite' ? 'grafito' : 'lapicero'}`}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-telemetry uppercase tracking-widest truncate" style={{ color: accent }}>
                {session.plan.summary}
              </span>
              <span className="block font-display font-bold text-sm truncate">
                {titles.length ? `${Math.min(active + 1, titles.length)}/${titles.length} · ${titles[active] ?? ''}` : 'Preparando trazos…'}
                {!done && titles.length > 0 && <span className="ml-2 text-[11px] font-telemetry font-normal text-slate-400 animate-pulse">escribiendo</span>}
              </span>
            </span>
            {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
          </button>

          <div className="flex gap-1 px-4 pb-2.5">
            {titles.map((title, i) => (
              <span
                key={`bar-${title}-${i}`}
                className="h-1 flex-1 rounded-full transition-colors duration-300"
                style={{ background: done || i < active ? accent : i === active ? `${accent}88` : '#1e293b' }}
              />
            ))}
          </div>

          {runtime && (
            <div className="px-3 pb-2.5 space-y-2 border-t border-slate-800 pt-2.5">
              {simState.readouts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {simState.readouts.map((r) => (
                    <span key={r.label} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-telemetry text-[11px]">
                      <span className="text-slate-400">{r.label}</span> <span className="text-white">{r.value}</span>
                    </span>
                  ))}
                </div>
              )}
              {simState.caption && (
                <p className="text-[11px] font-telemetry text-slate-200 leading-snug line-clamp-2" style={{ borderLeft: `2px solid ${accent}`, paddingLeft: 8 }}>
                  {simState.caption}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                {runtime.controls
                  .filter((c) => c.kind !== 'slider')
                  .map((c) => {
                    const on = c.kind === 'toggle' && !!simState.values[c.id];
                    return (
                      <button
                        key={c.id}
                        onClick={() => control(c.id)}
                        title={c.label}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-telemetry cursor-pointer transition-colors"
                        style={on ? { background: `${accent}33`, borderColor: accent, color: '#fff' } : { borderColor: '#334155', color: '#cbd5e1' }}
                      >
                        <ControlGlyph icon={c.icon} on={on} />
                        <span>{toggleLabel(c.id, c.label, on)}</span>
                      </button>
                    );
                  })}
              </div>
              {runtime.controls
                .filter((c) => c.kind === 'slider')
                .map((c) => {
                  const v = Number(simState.values[c.id] ?? c.min ?? 0);
                  return (
                    <label key={c.id} className="flex items-center gap-2 text-[11px] font-telemetry text-slate-300">
                      <span className="w-24 shrink-0 truncate">{c.label}</span>
                      <input
                        type="range"
                        min={c.min}
                        max={c.max}
                        step={c.step}
                        value={v}
                        onChange={(e) => control(c.id, Number(e.target.value))}
                        className="flex-1 cursor-pointer"
                        style={{ accentColor: accent }}
                      />
                      <span className="w-16 text-right text-white">
                        {Number.isInteger(c.step) ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, '')}
                        {c.unit ? ` ${c.unit}` : ''}
                      </span>
                    </label>
                  );
                })}
            </div>
          )}

          <div className="grid grid-cols-3 border-t border-slate-800 text-[11px] font-telemetry">
            <button
              onClick={() => sceneRef.current?.play(0)}
              className="flex items-center justify-center gap-1.5 py-2 hover:bg-white/5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Repetir
            </button>
            <button
              onClick={() => sceneRef.current?.showAll()}
              disabled={done}
              className="flex items-center justify-center gap-1.5 py-2 hover:bg-white/5 cursor-pointer border-x border-slate-800 disabled:opacity-40 disabled:cursor-default"
            >
              <FastForward className="w-3.5 h-3.5" /> Mostrar todo
            </button>
            <button
              onClick={onRescan}
              className="flex items-center justify-center gap-1.5 py-2 hover:bg-white/5 cursor-pointer"
              style={{ color: accent }}
            >
              <ScanLine className="w-3.5 h-3.5" /> Escanear
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

function toggleLabel(id: string, label: string, on: boolean): string {
  if (id === 'play') return on ? 'Pausar' : label;
  if (id === 'closed') return on ? 'Abrir' : 'Cerrar';
  if (id === 'charging') return on ? 'Descargar' : 'Cargar';
  return label;
}

const ControlGlyph: React.FC<{ icon?: ControlIcon; on: boolean }> = ({ icon, on }) => {
  const cls = 'w-3.5 h-3.5';
  switch (icon) {
    case 'play':
      return on ? <Pause className={cls} /> : <Play className={cls} />;
    case 'reset':
      return <RotateCcw className={cls} />;
    case 'prev':
      return <SkipBack className={cls} />;
    case 'next':
      return <SkipForward className={cls} />;
    case 'switch':
      return <Power className={cls} />;
    case 'charge':
      return <BatteryCharging className={cls} />;
    case 'bolt':
      return <Zap className={cls} />;
    default:
      return null;
  }
};

