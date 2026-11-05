/**
 * Progreso del alumno (gamificación): XP, niveles, logros, racha diaria, misiones cumplidas y ajustes
 * de accesibilidad. Vive en localStorage del dispositivo (no requiere cuenta) y se expone como store
 * reactivo para React.
 */
import { useSyncExternalStore } from 'react';
import { MISSIONS, dailyMissionId, missionById } from './missions';
import { notify } from './notify';

export interface Settings {
  autoNarrate: boolean;
  nativeNotifications: boolean;
}

export interface ProgressState {
  version: 1;
  xp: number;
  completedMissions: string[];
  achievements: Record<string, number>;
  activeMissionId: string | null;
  greeted: boolean;
  stats: {
    scans: number;
    scansByModule: Record<string, number>;
    exerciseTypes: string[];
    mistakesFound: number;
    narrations: number;
    funFacts: number;
    hints: number;
    level2: number;
    days: string[];
    streak: number;
  };
  settings: Settings;
}

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  xp: number;
  test(s: ProgressState): boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_scan', icon: '✏️', title: 'Primer trazo vivo', description: 'Escanea tu primer ejercicio.', xp: 20, test: (s) => s.stats.scans >= 1 },
  { id: 'ten_scans', icon: '🔬', title: 'Laboratorio en marcha', description: 'Escanea 10 ejercicios.', xp: 50, test: (s) => s.stats.scans >= 10 },
  { id: 'all_modules', icon: '🧭', title: 'Multidisciplinar', description: 'Escanea en los 4 módulos: física, circuitos, algoritmos y matemáticas.', xp: 80, test: (s) => ['physics', 'circuits', 'flowcharts', 'math'].every((m) => (s.stats.scansByModule[m] ?? 0) > 0) },
  { id: 'explorer', icon: '🗺️', title: 'Explorador de fenómenos', description: 'Simula 8 tipos de ejercicio distintos.', xp: 60, test: (s) => s.stats.exerciseTypes.length >= 8 },
  { id: 'first_mistake', icon: '🧠', title: 'Aprender del error', description: 'Lumi detectó un error en tu dibujo y te hizo pensar.', xp: 30, test: (s) => s.stats.mistakesFound >= 1 },
  { id: 'five_mistakes', icon: '🕵️', title: 'Cazador de errores', description: 'Descubre 5 errores conceptuales.', xp: 70, test: (s) => s.stats.mistakesFound >= 5 },
  { id: 'socratic', icon: '💡', title: 'Pensador socrático', description: 'Pide 3 pistas al tutor.', xp: 30, test: (s) => s.stats.hints >= 3 },
  { id: 'curious', icon: '✨', title: 'Mente curiosa', description: 'Escucha o lee 5 datos curiosos de Lumi.', xp: 30, test: (s) => s.stats.funFacts >= 5 },
  { id: 'listener', icon: '🔊', title: 'Oído científico', description: 'Usa la audio-explicación de una simulación.', xp: 20, test: (s) => s.stats.narrations >= 1 },
  { id: 'level2', icon: '🏔️', title: 'Sin miedo al reto', description: 'Resuelve un ejercicio de nivel 2.', xp: 40, test: (s) => s.stats.level2 >= 1 },
  { id: 'first_mission', icon: '🎯', title: '¡Misión cumplida!', description: 'Completa tu primera misión.', xp: 40, test: (s) => s.completedMissions.length >= 1 },
  { id: 'three_missions', icon: '🚀', title: 'Agente de campo', description: 'Completa 3 misiones.', xp: 80, test: (s) => s.completedMissions.length >= 3 },
  { id: 'all_missions', icon: '🏆', title: 'Leyenda de PaperLab', description: 'Completa todas las misiones.', xp: 250, test: (s) => MISSIONS.every((m) => s.completedMissions.includes(m.id)) },
  { id: 'streak3', icon: '🔥', title: 'Constancia', description: 'Practica 3 días seguidos.', xp: 60, test: (s) => s.stats.streak >= 3 },
];

export const LEVELS = [
  { xp: 0, title: 'Aprendiz de laboratorio' },
  { xp: 100, title: 'Explorador de trazos' },
  { xp: 250, title: 'Cazador de errores' },
  { xp: 450, title: 'Ingeniero de papel' },
  { xp: 700, title: 'Científico holográfico' },
  { xp: 1000, title: 'Maestro del cuaderno' },
  { xp: 1400, title: 'Inventor PaperLab' },
  { xp: 1900, title: 'Leyenda STEM' },
];

export function levelInfo(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  return {
    level: i + 1,
    title: cur.title,
    from: cur.xp,
    to: next?.xp ?? cur.xp,
    progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1,
    max: !next,
  };
}

const KEY = 'paperlab-progress-v1';

const fresh = (): ProgressState => ({
  version: 1,
  xp: 0,
  completedMissions: [],
  achievements: {},
  activeMissionId: null,
  greeted: false,
  stats: { scans: 0, scansByModule: {}, exerciseTypes: [], mistakesFound: 0, narrations: 0, funFacts: 0, hints: 0, level2: 0, days: [], streak: 0 },
  settings: { autoNarrate: false, nativeNotifications: false },
});

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    const base = fresh();
    return { ...base, ...parsed, stats: { ...base.stats, ...(parsed.stats ?? {}) }, settings: { ...base.settings, ...(parsed.settings ?? {}) } };
  } catch {
    return fresh();
  }
}

let state: ProgressState = typeof window === 'undefined' ? fresh() : load();
const listeners = new Set<() => void>();

function commit(next: ProgressState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // modo privado o almacenamiento lleno: el progreso vive solo en esta sesión
  }
  listeners.forEach((l) => l());
}

export const getProgress = () => state;

export function useProgress(): ProgressState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Suma XP, desbloquea logros y avisa de subidas de nivel. */
function award(next: ProgressState, xp: number, reason?: string): ProgressState {
  const before = levelInfo(next.xp).level;
  let s = { ...next, xp: next.xp + xp };
  if (xp > 0 && reason) notify({ kind: 'xp', icon: '⚡', title: `+${xp} XP`, body: reason, xp }, { native: false });
  // logros (pueden encadenarse: un logro da XP que no desbloquea otros por XP, así que una pasada basta)
  const unlocked: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!s.achievements[a.id] && a.test(s)) {
      s = { ...s, achievements: { ...s.achievements, [a.id]: Date.now() }, xp: s.xp + a.xp };
      unlocked.push(a);
    }
  }
  for (const a of unlocked) {
    notify({ kind: 'achievement', icon: a.icon, title: `Logro desbloqueado: ${a.title}`, body: `${a.description} · +${a.xp} XP`, xp: a.xp }, { native: s.settings.nativeNotifications });
  }
  const after = levelInfo(s.xp);
  if (after.level > before) {
    notify({ kind: 'level', icon: '⭐', title: `¡Subiste al nivel ${after.level}!`, body: after.title }, { native: s.settings.nativeNotifications });
  }
  return s;
}

function touchDay(s: ProgressState): ProgressState {
  const t = today();
  if (s.stats.days.includes(t)) return s;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const streak = s.stats.days.includes(today(y)) ? s.stats.streak + 1 : 1;
  return { ...s, stats: { ...s.stats, days: [...s.stats.days.slice(-30), t], streak } };
}

export interface ScanEvent {
  module: string;
  exerciseType: string;
  hasError: boolean;
  level?: 1 | 2 | 'error' | 'mission';
}

export const progress = {
  recordScan(e: ScanEvent) {
    let s = touchDay(state);
    const newType = !s.stats.exerciseTypes.includes(e.exerciseType);
    s = {
      ...s,
      stats: {
        ...s.stats,
        scans: s.stats.scans + 1,
        scansByModule: { ...s.stats.scansByModule, [e.module]: (s.stats.scansByModule[e.module] ?? 0) + 1 },
        exerciseTypes: newType ? [...s.stats.exerciseTypes, e.exerciseType] : s.stats.exerciseTypes,
        mistakesFound: s.stats.mistakesFound + (e.hasError ? 1 : 0),
        level2: s.stats.level2 + (e.level === 2 ? 1 : 0),
      },
    };
    const xp = 10 + (newType ? 15 : 0) + (e.hasError ? 20 : 0);
    const reason = e.hasError ? 'Aprendiste de un error' : newType ? 'Nuevo fenómeno simulado' : 'Simulación completada';
    commit(award(s, xp, reason));
  },
  recordNarration() {
    commit(award({ ...state, stats: { ...state.stats, narrations: state.stats.narrations + 1 } }, state.stats.narrations === 0 ? 5 : 0));
  },
  recordFunFact() {
    commit(award({ ...state, stats: { ...state.stats, funFacts: state.stats.funFacts + 1 } }, 0));
  },
  recordHint() {
    commit(award({ ...state, stats: { ...state.stats, hints: state.stats.hints + 1 } }, 0));
  },
  /** Devuelve los XP ganados (doble si es la misión del día; 0 si ya estaba cumplida). */
  completeMission(id: string): number {
    const m = missionById(id);
    if (!m || state.completedMissions.includes(id)) {
      commit({ ...state, activeMissionId: null });
      return 0;
    }
    const xp = id === dailyMissionId() ? m.xp * 2 : m.xp;
    const s = { ...state, completedMissions: [...state.completedMissions, id], activeMissionId: null };
    notify({ kind: 'mission', icon: '🎯', title: `¡Misión cumplida! ${m.title}`, body: `+${xp} XP${xp > m.xp ? ' (misión del día ×2)' : ''}`, xp }, { native: state.settings.nativeNotifications, force: false });
    commit(award(s, xp));
    return xp;
  },
  setActiveMission(id: string | null) {
    commit({ ...state, activeMissionId: id });
  },
  setGreeted() {
    if (!state.greeted) commit({ ...state, greeted: true });
  },
  setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    commit({ ...state, settings: { ...state.settings, [key]: value } });
  },
  reset() {
    commit({ ...fresh(), greeted: true, settings: state.settings });
  },
};
