/**
 * Lado del alumno del modo aula: unirse con un código, recibir el estado de la sesión y
 * reportar cada intento (escaneo) al docente.
 *
 * Prototipo: si el docente está en otra pestaña del mismo navegador, la conexión es real
 * (BroadcastChannel). Si no responde nadie, el alumno puede entrar a una sala de demostración.
 */
import { useSyncExternalStore } from 'react';
import { MISSIONS, missionById } from '../game/missions';
import { progress } from '../game/progress';
import { pushToast } from '../game/notify';
import { CHANNEL } from './teacherStore';
import { CODE_RE, rand } from './sim';
import type { Device, PublicSession, WireMessage } from './types';

export type JoinStep = 'idle' | 'searching' | 'handshake' | 'joined' | 'error';
export type JoinError = 'format' | 'not_found' | 'ended' | 'network';

export interface ClassLinkState {
  step: JoinStep;
  error?: JoinError;
  code?: string;
  name?: string;
  ping?: number;
  session?: PublicSession;
  missionIdx: number;
  solved: string[];
  lastHint?: string;
}

const KEY = 'paperlab-class-link';
const clientId = (() => {
  try {
    const saved = sessionStorage.getItem('paperlab-client-id');
    if (saved) return saved;
    const id = `stu-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('paperlab-client-id', id);
    return id;
  } catch {
    return `stu-${Math.random().toString(36).slice(2, 9)}`;
  }
})();

let state: ClassLinkState = load();
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;
let pending: ((msg: WireMessage) => void) | null = null;

function load(): ClassLinkState {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as ClassLinkState | null;
    if (s?.step === 'joined') return s;
  } catch {
    /* sin almacenamiento: empezar de cero */
  }
  return { step: 'idle', missionIdx: 0, solved: [] };
}

function set(next: Partial<ClassLinkState>) {
  state = { ...state, ...next };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* opcional */
  }
  listeners.forEach((l) => l());
}

function detectDevice(): Device {
  const ua = navigator.userAgent;
  if (/iPhone|iPod/.test(ua)) return 'iPhone';
  if (/iPad|Tablet/.test(ua)) return 'Tablet';
  if (/Android/.test(ua)) return 'Android';
  if (/CrOS/.test(ua)) return 'Chromebook';
  return 'Laptop';
}

function ensureChannel() {
  if (channel || typeof BroadcastChannel === 'undefined') return;
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (ev: MessageEvent<WireMessage>) => {
    const msg = ev.data;
    pending?.(msg);
    if (state.step !== 'joined' || !state.session) return;
    if (msg.t === 'state' && msg.code === state.code) {
      const was = state.session.status;
      set({ session: { ...msg.session, receivedAtMs: Date.now() } });
      if (was === 'lobby' && msg.session.status === 'live') {
        activateCurrentMission();
        pushToast({ kind: 'mission', icon: '🔔', title: '¡Tu profe inició la misión!', body: currentMission()?.title });
      }
      if (msg.session.status === 'ended' && was !== 'ended') {
        pushToast({ kind: 'info', icon: '🏁', title: 'La sesión terminó', body: 'Tu docente cerró la clase. ¡Buen trabajo!' });
      }
    }
    if (msg.t === 'hint' && msg.clientId === clientId) {
      set({ lastHint: msg.text });
      pushToast({ kind: 'info', icon: '💬', title: 'Pista de tu docente', body: msg.text }, 9000);
    }
  };
}

function currentMission() {
  const id = state.session?.missionIds[state.missionIdx];
  return id ? missionById(id) : null;
}

function activateCurrentMission() {
  const m = currentMission();
  if (m && state.session?.status !== 'lobby') progress.setActiveMission(m.id);
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sala de demostración (cuando no hay docente en este navegador). */
function demoSession(code: string): PublicSession {
  return {
    code,
    name: '5° B · Física (demo)',
    missionIds: [MISSIONS[0].id, MISSIONS[1].id],
    status: 'live',
    durationMin: 30,
    startedAtMs: Date.now() - 4 * 60 * 1000,
    teacher: 'Prof. Rivera',
    demo: true,
  };
}

export const classLink = {
  clientId,

  async join(rawCode: string, name: string): Promise<void> {
    const code = rawCode.trim().toLowerCase();
    if (!CODE_RE.test(code)) {
      set({ step: 'error', error: 'format', code });
      return;
    }
    ensureChannel();
    set({ step: 'searching', error: undefined, code, name, ping: undefined });
    await wait(rand(500, 900));

    // pregunta a la red local (otras pestañas); espera la respuesta del docente
    const reply = await new Promise<WireMessage | null>((resolve) => {
      const timeout = window.setTimeout(() => {
        pending = null;
        resolve(null);
      }, 1600);
      pending = (msg) => {
        if ((msg.t === 'welcome' || msg.t === 'reject') && msg.clientId === clientId) {
          window.clearTimeout(timeout);
          pending = null;
          resolve(msg);
        }
      };
      const t0 = performance.now();
      channel?.postMessage({ t: 'join', code, clientId, name, device: detectDevice() } satisfies WireMessage);
      set({ ping: Math.round(performance.now() - t0 + rand(12, 40)) });
    });

    if (!reply) {
      set({ step: 'error', error: 'not_found' });
      return;
    }
    if (reply.t === 'reject') {
      set({ step: 'error', error: reply.reason === 'ended' ? 'ended' : 'not_found' });
      return;
    }
    if (reply.t !== 'welcome') return;
    set({ step: 'handshake', ping: Math.round(rand(14, 38)) });
    await wait(rand(400, 700));
    set({ step: 'joined', session: { ...reply.session, receivedAtMs: Date.now() }, missionIdx: 0, solved: [] });
    activateCurrentMission();
  },

  async joinDemo(name: string) {
    const code = state.code && CODE_RE.test(state.code) ? state.code : 'dem-oaul-apl';
    set({ step: 'handshake', name, code, error: undefined, ping: Math.round(rand(30, 70)) });
    await wait(rand(600, 900));
    set({ step: 'joined', session: demoSession(code), missionIdx: 0, solved: [] });
    activateCurrentMission();
  },

  reset() {
    set({ step: 'idle', error: undefined });
  },

  leave() {
    if (state.code) channel?.postMessage({ t: 'leave', code: state.code, clientId } satisfies WireMessage);
    progress.setActiveMission(null);
    state = { step: 'idle', missionIdx: 0, solved: [] };
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* opcional */
    }
    listeners.forEach((l) => l());
  },

  /** El escaneo empezó (el docente ve "escaneando…"). */
  reportScanning() {
    if (state.step !== 'joined' || !state.code || state.session?.demo) return;
    channel?.postMessage({ t: 'scanning', code: state.code, clientId } satisfies WireMessage);
  },

  /** Resultado de un intento sobre la misión de la clase. */
  reportAttempt(a: { missionId: string; ok: boolean; errorCode?: string; measure?: string; aiMs: number }) {
    if (state.step !== 'joined' || !state.code || !state.session) return;
    const isClassMission = state.session.missionIds[state.missionIdx] === a.missionId;
    if (!state.session.demo) channel?.postMessage({ t: 'attempt', code: state.code, clientId, ...a } satisfies WireMessage);
    if (a.ok && isClassMission) {
      const solved = [...state.solved, a.missionId];
      const missionIdx = state.missionIdx + 1;
      set({ solved, missionIdx });
      const next = currentMission();
      if (next) {
        // después de que la cámara marque la misión como cumplida (que limpia la misión activa)
        window.setTimeout(() => progress.setActiveMission(next.id), 60);
        pushToast({ kind: 'mission', icon: '➡️', title: 'Siguiente misión de la clase', body: next.title });
      } else {
        pushToast({ kind: 'mission', icon: '🏆', title: '¡Completaste todas las misiones de la clase!', body: 'Tu docente ya lo ve en su tablero.' });
      }
    }
  },

  currentMission,
};

export function useClassLink(): ClassLinkState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

// Si se recargó la página estando en clase, reabrimos el canal
if (state.step === 'joined') ensureChannel();
