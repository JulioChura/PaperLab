import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, Check, Flame, Lock, Target, Trophy, Volume2, X, Zap } from 'lucide-react';
import { ACHIEVEMENTS, levelInfo, progress, useProgress } from './progress';
import { MISSIONS, dailyMissionId, missionsFor, type Mission } from './missions';
import { dismissToast, nativeSupported, registerNotificationWorker, requestNativePermission, showNative, useToasts, type ToastKind } from './notify';
import { LumiAvatar } from '../tutor/LumiAvatar';

const MODULE_NAME: Record<string, string> = { physics: 'Física', circuits: 'Circuitos', flowcharts: 'Algoritmos', math: 'Matemáticas' };

// ===================================================================================== toasts
const TOAST_STYLE: Record<ToastKind, string> = {
  achievement: 'border-yellow-400/60',
  mission: 'border-fuchsia-400/60',
  level: 'border-cyan-300/70',
  xp: 'border-emerald-400/40',
  info: 'border-slate-500/60',
};

export const Toaster: React.FC = () => {
  const all = useToasts();
  // En móvil solo las 2 más recientes, para no tapar la simulación ni el sello de misión
  const small = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 639px)').matches;
  const toasts = small ? all.slice(-2) : all;
  return (
    <div className="fixed top-16 right-3 z-[70] flex flex-col gap-1.5 sm:gap-2 w-[min(20rem,calc(100vw-1.5rem))] pointer-events-none" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto animate-toast-in flex items-start gap-2.5 rounded-xl bg-slate-950/95 border ${TOAST_STYLE[t.kind]} backdrop-blur-xl px-3 py-1.5 sm:py-2.5 shadow-2xl text-white`}
          data-testid={`toast-${t.kind}`}
        >
          <span className={`text-lg leading-none mt-0.5 ${t.kind === 'xp' ? 'text-emerald-300' : ''}`} aria-hidden="true">{t.icon ?? '•'}</span>
          <div className="flex-1 min-w-0">
            <p className={`font-display font-bold leading-tight ${t.kind === 'xp' ? 'text-xs text-emerald-200' : 'text-sm'}`}>{t.title}</p>
            {t.body && <p className="text-[11px] font-telemetry text-slate-300 leading-snug mt-0.5">{t.body}</p>}
          </div>
          <button onClick={() => dismissToast(t.id)} className="text-slate-500 hover:text-white cursor-pointer" aria-label="Cerrar notificación">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

// ===================================================================================== chip de XP (cabecera)
export const XpChip: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const p = useProgress();
  const lv = levelInfo(p.xp);
  return (
    <button
      onClick={onOpen}
      className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg border border-[#d8cebd] dark:border-[#212c42] bg-white dark:bg-[#0e1422] hover:border-slate-400 dark:hover:border-slate-500 transition-all text-xs font-telemetry cursor-pointer"
      title={`Nivel ${lv.level} · ${lv.title} · ${p.xp} XP`}
      aria-label={`Perfil: nivel ${lv.level}, ${p.xp} puntos de experiencia. Ver logros y misiones`}
      data-testid="xp-chip"
    >
      <span className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-400 to-emerald-400 text-slate-950 font-display font-black text-[11px] flex items-center justify-center">
        {lv.level}
      </span>
      <span className="hidden sm:flex flex-col items-start leading-none gap-1">
        <span className="text-slate-800 dark:text-slate-200 font-bold" data-testid="xp-value">{p.xp} XP</span>
        <span className="relative w-16 h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${Math.round(lv.progress * 100)}%` }} />
        </span>
      </span>
      <span className="sm:hidden text-slate-700 dark:text-slate-200 font-bold">{p.xp}</span>
      {p.stats.streak > 1 && (
        <span className="flex items-center text-orange-500" title={`Racha de ${p.stats.streak} días`}>
          <Flame className="w-3.5 h-3.5" />
          {p.stats.streak}
        </span>
      )}
    </button>
  );
};

// ===================================================================================== modal genérico
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; testId?: string }> = ({ title, onClose, children, testId }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-6" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl max-h-[88vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-2xl bg-[#0b111d] border border-slate-700 text-white shadow-2xl animate-entrance outline-none"
        data-testid={testId}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <h2 className="font-display font-black text-lg">{title}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white cursor-pointer" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
};

// ===================================================================================== perfil
export const ProfilePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const p = useProgress();
  const lv = levelInfo(p.xp);
  const [perm, setPerm] = useState<string>(nativeSupported() ? Notification.permission : 'unsupported');

  const toggleNative = async () => {
    if (p.settings.nativeNotifications) return progress.setSetting('nativeNotifications', false);
    await registerNotificationWorker();
    const r = await requestNativePermission();
    setPerm(r);
    if (r === 'granted') {
      progress.setSetting('nativeNotifications', true);
      void showNative('🔔 Notificaciones activadas', 'Te avisaré cuando desbloquees logros o completes misiones.');
    }
  };

  return (
    <Modal title="Tu laboratorio" onClose={onClose} testId="profile-panel">
      <div className="flex items-center gap-4 mb-5">
        <LumiAvatar mood="celebrating" size={72} />
        <div className="flex-1 min-w-0">
          <p className="font-telemetry text-[11px] text-cyan-300 uppercase tracking-widest">Nivel {lv.level}</p>
          <p className="font-display font-black text-xl leading-tight">{lv.title}</p>
          <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${Math.round(lv.progress * 100)}%` }} />
            <div className="absolute inset-0 xp-shine" />
          </div>
          <p className="mt-1 font-telemetry text-[11px] text-slate-400">
            {p.xp} XP {lv.max ? '· nivel máximo' : `· faltan ${lv.to - p.xp} XP para el nivel ${lv.level + 1}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6 font-telemetry text-center">
        {[
          ['Escaneos', p.stats.scans],
          ['Errores aprendidos', p.stats.mistakesFound],
          ['Misiones', `${p.completedMissions.length}/${MISSIONS.length}`],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-xl bg-white/5 border border-white/10 py-2.5">
            <p className="font-display font-black text-lg">{v}</p>
            <p className="text-[10px] text-slate-400">{k}</p>
          </div>
        ))}
      </div>

      <h3 className="font-display font-bold text-sm mb-2 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-300" /> Logros ({Object.keys(p.achievements).length}/{ACHIEVEMENTS.length})
      </h3>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
        {ACHIEVEMENTS.map((a) => {
          const got = !!p.achievements[a.id];
          return (
            <li key={a.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 border ${got ? 'border-yellow-400/40 bg-yellow-400/5' : 'border-slate-800 bg-white/[0.02]'}`} data-testid={`achievement-${a.id}`} data-unlocked={got}>
              <span className={`text-xl ${got ? '' : 'grayscale opacity-40'}`} aria-hidden="true">{a.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-display font-bold leading-tight ${got ? 'text-white' : 'text-slate-400'}`}>{a.title}</p>
                <p className="text-[11px] font-telemetry text-slate-500 leading-snug">{a.description}</p>
              </div>
              {got ? <Check className="w-4 h-4 text-yellow-300" /> : <Lock className="w-3.5 h-3.5 text-slate-600" />}
            </li>
          );
        })}
      </ul>

      <h3 className="font-display font-bold text-sm mb-2">Accesibilidad y avisos</h3>
      <div className="space-y-2 font-telemetry text-xs">
        <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 px-3 py-2.5 cursor-pointer">
          <span className="flex items-center gap-2"><Volume2 className="w-4 h-4 text-cyan-300" /> Leer en voz alta automáticamente las simulaciones y al tutor</span>
          <input type="checkbox" checked={p.settings.autoNarrate} onChange={(e) => progress.setSetting('autoNarrate', e.target.checked)} className="w-4 h-4 accent-cyan-400" />
        </label>
        <button onClick={() => void toggleNative()} disabled={perm === 'unsupported' || perm === 'denied'} className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-800 px-3 py-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-left">
          <span className="flex items-center gap-2">
            {p.settings.nativeNotifications ? <Bell className="w-4 h-4 text-fuchsia-300" /> : <BellOff className="w-4 h-4 text-slate-400" />}
            Notificaciones del sistema (logros, misiones, niveles)
          </span>
          <span className="text-slate-400">{perm === 'unsupported' ? 'No disponible' : perm === 'denied' ? 'Bloqueadas' : p.settings.nativeNotifications ? 'Activadas' : 'Activar'}</span>
        </button>
        <button
          onClick={() => {
            if (window.confirm('¿Borrar tu XP, logros y misiones de este dispositivo?')) progress.reset();
          }}
          className="text-[11px] text-slate-500 hover:text-rose-300 cursor-pointer pt-1"
        >
          Reiniciar progreso
        </button>
      </div>
    </Modal>
  );
};

// ===================================================================================== misiones
const Stars: React.FC<{ n: number }> = ({ n }) => (
  <span className="text-yellow-300 tracking-tighter" aria-label={`Dificultad ${n} de 3`}>{'★'.repeat(n)}<span className="text-slate-600">{'★'.repeat(3 - n)}</span></span>
);

export const MissionCard: React.FC<{ m: Mission; onStart?: (m: Mission) => void; onDemo?: (m: Mission) => void; compact?: boolean }> = ({ m, onStart, onDemo, compact }) => {
  const p = useProgress();
  const done = p.completedMissions.includes(m.id);
  const active = p.activeMissionId === m.id;
  const daily = dailyMissionId() === m.id;
  return (
    <li className={`rounded-xl border p-3 ${active ? 'border-fuchsia-400/70 bg-fuchsia-500/10' : done ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700 bg-white/[0.03]'}`} data-testid={`mission-${m.id}`}>
      <div className="flex items-start gap-2">
        <Target className={`w-4 h-4 mt-0.5 shrink-0 ${done ? 'text-emerald-300' : 'text-fuchsia-300'}`} />
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm leading-tight flex flex-wrap items-center gap-x-2">
            {m.title}
            {daily && <span className="text-[9px] font-telemetry uppercase px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-200 border border-yellow-400/40">Misión del día ×2</span>}
            {done && <span className="text-[9px] font-telemetry uppercase px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-200">Cumplida</span>}
          </p>
          <p className="text-[12px] text-slate-300 leading-snug mt-1">{m.brief}</p>
          {!compact && <p className="text-[11px] font-telemetry text-slate-400 mt-1">Condición: {m.goal}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-2 font-telemetry text-[11px]">
            <span className="flex items-center gap-1 text-emerald-300"><Zap className="w-3 h-3" />{daily ? m.xp * 2 : m.xp} XP</span>
            <Stars n={m.difficulty} />
            <span className="text-slate-500">· {MODULE_NAME[m.module]}</span>
            <span className="flex-1" />
            {onDemo && (
              <button onClick={() => onDemo(m)} className="px-2 py-1 rounded-lg border border-slate-600 text-slate-300 hover:border-slate-300 cursor-pointer">
                Probar con ejemplo
              </button>
            )}
            {onStart && (
              <button
                onClick={() => (active ? progress.setActiveMission(null) : onStart(m))}
                className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${active ? 'border border-fuchsia-400 text-fuchsia-200' : 'bg-fuchsia-400 text-slate-950 hover:bg-fuchsia-300'}`}
                data-testid={`mission-start-${m.id}`}
              >
                {active ? 'Abandonar' : done ? 'Repetir' : 'Aceptar misión'}
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
};

export const MissionPanel: React.FC<{ module?: string; onClose: () => void; onStart: (m: Mission) => void; onDemo?: (m: Mission) => void }> = ({ module, onClose, onStart, onDemo }) => {
  const list = module ? missionsFor(module) : MISSIONS;
  const others = module ? MISSIONS.filter((m) => m.module !== module) : [];
  return (
    <Modal title="Misiones en papel" onClose={onClose} testId="mission-panel">
      <p className="text-xs font-telemetry text-slate-400 mb-4">Acepta un reto, dibújalo en tu cuaderno y escanéalo. Si tu dibujo cumple la condición física, ¡misión cumplida!</p>
      <ul className="space-y-2.5">
        {list.map((m) => <MissionCard key={m.id} m={m} onStart={onStart} onDemo={onDemo} />)}
      </ul>
      {others.length > 0 && (
        <>
          <p className="mt-6 mb-2 font-display font-bold text-sm text-slate-300">En otros módulos</p>
          <ul className="space-y-2.5 opacity-80">{others.map((m) => <MissionCard key={m.id} m={m} compact />)}</ul>
        </>
      )}
    </Modal>
  );
};

// ===================================================================================== sello + confeti
function Confetti() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    const colors = ['#22d3ee', '#34d399', '#facc15', '#f472b6', '#a78bfa', '#fb923c'];
    const W = canvas.width;
    const H = canvas.height;
    const parts = Array.from({ length: 160 }, (_, i) => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.2,
      y: H * 0.45,
      vx: (Math.random() - 0.5) * 18 * dpr,
      vy: (-Math.random() * 16 - 6) * dpr,
      r: (4 + Math.random() * 5) * dpr,
      a: Math.random() * Math.PI,
      va: (Math.random() - 0.5) * 0.4,
      c: colors[i % colors.length],
      shape: i % 3,
    }));
    const anim = { raf: 0 };
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += 0.45 * dpr;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.a += p.va;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - t / 3.2);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        if (p.shape === 0) ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        else if (p.shape === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, p.r / 1.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -p.r);
          ctx.lineTo(p.r, p.r);
          ctx.lineTo(-p.r, p.r);
          ctx.fill();
        }
        ctx.restore();
      }
      if (t < 3.3) anim.raf = requestAnimationFrame(tick);
    };
    anim.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(anim.raf);
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />;
}

export const MissionStamp: React.FC<{ title: string; xp: number; measure?: string; onDone: () => void }> = ({ title, xp, measure, onDone }) => {
  useEffect(() => {
    const id = window.setTimeout(onDone, 4800);
    return () => window.clearTimeout(id);
  }, [onDone]);
  return (
    <div className="absolute inset-0 z-[45] cursor-pointer" onClick={onDone} role="alert" aria-label={`¡Misión cumplida! ${title}. Más ${xp} XP`} data-testid="mission-stamp">
      <Confetti />
      <div
        className="absolute left-1/2 top-[45%] animate-stamp-in w-[min(20rem,80vw)] aspect-square rounded-full flex flex-col items-center justify-center text-center"
        style={{
          border: '6px double #34d399',
          boxShadow: '0 0 0 3px rgba(52,211,153,0.35), 0 0 60px rgba(52,211,153,0.55), inset 0 0 40px rgba(52,211,153,0.35)',
          background: 'radial-gradient(circle, rgba(6,24,20,0.82) 55%, rgba(6,24,20,0.55) 100%)',
        }}
      >
        <div className="absolute inset-3 rounded-full border-2 border-dashed border-emerald-300/50" />
        <p className="font-telemetry text-[11px] tracking-[0.35em] text-emerald-200 uppercase">PaperLab</p>
        <p className="font-display font-black text-3xl sm:text-4xl leading-none text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.9)] my-2 px-4">¡Misión<br />Cumplida!</p>
        <p className="font-display font-bold text-sm text-white px-6 leading-tight">{title}</p>
        {measure && <p className="font-telemetry text-[11px] text-emerald-200/90 mt-1">{measure}</p>}
        {xp > 0 && <p className="mt-2 px-3 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-display font-black text-lg" data-testid="mission-stamp-xp">+{xp} XP</p>}
      </div>
    </div>
  );
};
