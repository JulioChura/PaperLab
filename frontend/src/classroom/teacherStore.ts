/**
 * Motor de la sesión del docente. Corre en la pestaña del docente:
 * - Reloj simulado con velocidad ×1 / ×5 / ×20 (para que la demo dure minutos, no una clase).
 * - Alumnos virtuales: se conectan con latencia, dibujan, escanean, se equivocan, piden pistas,
 *   se desconectan y reconectan, se atascan y (casi siempre) resuelven.
 * - Alumnos reales: otras pestañas que se unen por BroadcastChannel con el mismo código.
 */
import { useSyncExternalStore } from 'react';
import { MISSIONS, missionById } from '../game/missions';
import { errorLabel } from '../tutor/types';
import type { Attempt, FeedKind, PublicSession, Session, SessionConfig, Student, StudentStatus, WireMessage } from './types';
import {
  AVATAR_INKS, DEVICES, STUDENT_NAMES, basePing, clamp, errorsFor, gauss, lognormal, makeCode, pick, rand, randInt, weighted,
} from './sim';

export const CHANNEL = 'paperlab-classroom';
const HISTORY_KEY = 'paperlab-classroom-history';
const TICK_MS = 200;
const TEACHER = 'Prof. Rivera';

type Listener = () => void;
let session: Session | null = null;
let history: Session[] = loadHistory();
const listeners = new Set<Listener>();
let timer: number | null = null;
let channel: BroadcastChannel | null = null;
let feedId = 1;
let broadcastTick = 0;

const emit = () => listeners.forEach((l) => l());

function loadHistory(): Session[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as Session[];
  } catch {
    return [];
  }
}
function saveHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 8)));
  } catch {
    /* almacenamiento lleno o bloqueado: el historial es opcional */
  }
}

// ------------------------------------------------------------------ helpers
function commit(next: Session) {
  session = next;
  emit();
}

function feed(s: Session, kind: FeedKind, text: string, studentId?: string, errorCode?: string) {
  s.feed = [{ id: feedId++, at: s.clock, kind, text, studentId, errorCode }, ...s.feed].slice(0, 160);
}

const firstName = (st: Student) => st.name.split(' ')[0];
const missionOf = (s: Session, st: Student) => s.config.missionIds[st.missionIdx];

function setStatus(st: Student, status: StudentStatus, clock: number) {
  st.status = status;
  st.statusSince = clock;
}

function publicSession(s: Session): PublicSession {
  return {
    code: s.code,
    name: s.config.name,
    missionIds: s.config.missionIds,
    status: s.status,
    durationMin: s.config.durationMin,
    startedAtMs: s.startedClock !== null ? Date.now() - ((s.clock - s.startedClock) / s.speed) * 1000 : null,
    remainingSec: s.startedClock !== null ? Math.max(0, s.config.durationMin * 60 - ((s.endedClock ?? s.clock) - s.startedClock)) : null,
    speed: s.speed,
    teacher: TEACHER,
  };
}

function broadcast(msg: WireMessage) {
  channel?.postMessage(msg);
}

// ------------------------------------------------------------------ comportamiento de un alumno virtual
function difficultyOf(missionId: string) {
  return missionById(missionId)?.difficulty ?? 2;
}

/** Tiempo (s) que tarda en dibujar un intento. */
function drawTime(st: Student, missionId: string, retry: boolean) {
  const base = { 1: 70, 2: 105, 3: 140 }[difficultyOf(missionId)];
  return clamp(lognormal(base * (1.55 - st.skill) * (retry ? 0.55 : 1), 0.38), 18, 600);
}

/** Probabilidad de acertar en este intento. */
function successChance(st: Student, missionId: string) {
  const fails = st.attempts.filter((a) => a.missionId === missionId && !a.ok).length;
  const d = difficultyOf(missionId);
  // mejora con cada intento (aprende de la pregunta de Lumi), pero con techo según su habilidad
  const ceiling = 0.35 + st.skill * 0.6;
  return clamp(0.1 + 0.5 * st.skill - 0.1 * (d - 2) + 0.07 * fails + st.boost, 0.04, Math.min(0.9, ceiling + st.boost));
}

function startMission(s: Session, st: Student) {
  const mid = missionOf(s, st);
  if (!mid) {
    setStatus(st, 'done', s.clock);
    st.nextAt = Infinity;
    return;
  }
  st.startedAt[mid] = s.clock;
  setStatus(st, 'drawing', s.clock);
  st.nextAt = s.clock + drawTime(st, mid, false);
}

function stepStudent(s: Session, st: Student) {
  if (st.real) return;
  const live = s.status === 'live';

  // Conexión inicial
  if (st.status === 'connecting' && s.clock >= st.nextAt) {
    st.joinedAt = s.clock;
    feed(s, 'join', `${st.name} se unió desde ${st.device} · ${st.ping} ms`, st.id);
    if (live) startMission(s, st);
    else {
      setStatus(st, 'lobby', s.clock);
      st.nextAt = Infinity;
    }
    return;
  }

  if (!live) return;

  // Cortes de red: más probables con mala latencia
  if (!['connecting', 'offline', 'reconnecting', 'done'].includes(st.status) && st.joinedAt !== null) {
    const pDrop = (st.ping > 200 ? 0.004 : st.ping > 100 ? 0.0016 : 0.0006) * (TICK_MS / 1000) * s.speed;
    if (Math.random() < pDrop) {
      st.resumeStatus = st.status;
      const resumeIn = st.nextAt - s.clock;
      setStatus(st, 'reconnecting', s.clock);
      st.reconnects++;
      // si se cae varias veces, a veces ya no vuelve
      const lost = st.reconnects >= 3 && Math.random() < 0.35;
      st.nextAt = s.clock + (lost ? Infinity : rand(6, 28));
      (st as Student & { resumeIn?: number }).resumeIn = resumeIn;
      feed(s, 'leave', `${firstName(st)} perdió la conexión${lost ? ' y no volvió' : ', reintentando…'}`, st.id);
      if (lost) {
        setStatus(st, 'offline', s.clock);
      }
      return;
    }
  }

  if (s.clock < st.nextAt) return;
  const mid = missionOf(s, st);

  switch (st.status) {
    case 'lobby':
      startMission(s, st);
      break;

    case 'reconnecting': {
      const resumeIn = (st as Student & { resumeIn?: number }).resumeIn ?? 5;
      setStatus(st, st.resumeStatus ?? 'drawing', s.clock);
      st.ping = basePing(st.device);
      st.nextAt = s.clock + Math.max(2, resumeIn);
      feed(s, 'reconnect', `${firstName(st)} se reconectó · ${st.ping} ms`, st.id);
      break;
    }

    case 'drawing':
    case 'stuck': {
      // empieza a escanear: la IA tarda (y a veces Gemini se satura)
      setStatus(st, 'scanning', s.clock);
      let ms = clamp(lognormal(2600 + st.ping * 4, 0.3), 1100, 9000);
      if (Math.random() < 0.05) {
        ms += rand(2500, 4500);
        s.aiRetries++;
        feed(s, 'ai_retry', `IA saturada al resolver el dibujo de ${firstName(st)}: reintento automático con modelo alterno`, st.id);
      }
      (st as Student & { aiMs?: number }).aiMs = ms;
      st.nextAt = s.clock + ms / 1000;
      break;
    }

    case 'scanning': {
      const aiMs = Math.round((st as Student & { aiMs?: number }).aiMs ?? 2500);
      s.aiLatencies.push(aiMs);
      const ok = Math.random() < successChance(st, mid);
      const attempt: Attempt = { at: s.clock, missionId: mid, ok, aiMs };
      if (ok) {
        st.attempts.push(attempt);
        st.solvedAt[mid] = s.clock;
        const tries = st.attempts.filter((a) => a.missionId === mid).length;
        const t = s.clock - (st.startedAt[mid] ?? s.clock);
        const recovered = tries > 1 ? ' tras corregir con Lumi' : ' al primer intento';
        feed(s, 'ok', `${firstName(st)} resolvió «${missionById(mid)?.title}»${recovered} · ${fmtDur(t)}`, st.id);
        setStatus(st, 'solved', s.clock);
        st.boost = 0;
        st.lastError = undefined;
        st.nextAt = s.clock + rand(6, 14);
      } else {
        const err = weighted(errorsFor(mid).map((e) => ({ w: e.w, v: e })));
        attempt.errorCode = err.code;
        st.attempts.push(attempt);
        st.lastError = err.code;
        feed(s, 'error', `Lumi detectó «${errorLabel(err.code)}» en ${firstName(st)}: ${err.what.toLowerCase()}`, st.id, err.code);
        const fails = st.attempts.filter((a) => a.missionId === mid && !a.ok).length;
        if (fails >= 3 && fails % 3 === 0) {
          setStatus(st, 'stuck', s.clock);
          feed(s, 'stuck', `${firstName(st)} lleva ${fails} intentos fallidos en «${missionById(mid)?.title}»`, st.id);
          // los que tienen menos base a veces se frustran y casi dejan de intentar (salvo que el docente intervenga)
          const frustrated = st.boost < 0.2 && Math.random() < (st.skill < 0.35 ? 0.55 : 0.18);
          st.nextAt = s.clock + drawTime(st, mid, true) * (frustrated ? 5 : 1.6);
        } else {
          setStatus(st, 'error', s.clock);
          st.nextAt = s.clock + rand(8, 22);
        }
      }
      break;
    }

    case 'error': {
      // lee la pregunta de Lumi; a veces pide la pista
      if (s.config.allowLumiHints && Math.random() < 0.38) {
        st.lumiHints++;
        st.boost += 0.08;
        feed(s, 'lumi', `${firstName(st)} pidió una pista a Lumi`, st.id);
      }
      setStatus(st, 'drawing', s.clock);
      st.nextAt = s.clock + drawTime(st, mid, true);
      break;
    }

    case 'solved':
      st.missionIdx++;
      startMission(s, st);
      break;
  }
}

/** ¿El alumno está ahora mismo trabado en ese error (de esa misión)? Mismo criterio para contar y para enviar pistas. */
export function isInError(s: Session, st: Student, code?: string, missionId?: string) {
  if (!code || st.lastError !== code || ['done', 'offline', 'solved'].includes(st.status)) return false;
  return !missionId || s.config.missionIds[st.missionIdx] === missionId;
}

export const fmtDur = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
};

function makeStudent(i: number, joinAt: number): Student {
  const device = weighted(DEVICES);
  return {
    id: `bot-${i}-${Math.random().toString(36).slice(2, 7)}`,
    name: STUDENT_NAMES[i % STUDENT_NAMES.length],
    color: AVATAR_INKS[i % AVATAR_INKS.length],
    device,
    ping: basePing(device),
    real: false,
    joinedAt: null,
    status: 'connecting',
    statusSince: 0,
    missionIdx: 0,
    attempts: [],
    solvedAt: {},
    startedAt: {},
    lumiHints: 0,
    teacherHints: 0,
    reconnects: 0,
    skill: clamp(gauss(0.55, 0.2), 0.08, 0.97),
    joinAt,
    nextAt: joinAt,
    boost: 0,
  };
}

// ------------------------------------------------------------------ bucle
function tick() {
  if (!session || session.status === 'ended' || session.status === 'creating') return;
  const s: Session = { ...session, students: session.students.map((st) => ({ ...st })) };
  if (s.status === 'paused') return;

  s.clock += (TICK_MS / 1000) * s.speed;
  // jitter de latencia, cada alumno
  for (const st of s.students) {
    if (!st.real && st.joinedAt !== null && Math.random() < 0.05) {
      st.ping = Math.round(clamp(st.ping + gauss(0, 12), 12, 480));
    }
    stepStudent(s, st);
  }

  // cada ~2 s reales, los alumnos reales reciben el estado (cronómetro al día aunque la demo vaya a ×20)
  if (++broadcastTick % 10 === 0 && s.status !== 'lobby') broadcast({ t: 'state', code: s.code, session: publicSession(s) });

  if (s.status === 'live' && s.startedClock !== null) {
    const elapsed = s.clock - s.startedClock;
    const last = s.timeline[s.timeline.length - 1];
    if (!last || elapsed - last.t >= 10) {
      s.timeline = [...s.timeline, sampleTimeline(s, elapsed)];
    }
    if (elapsed >= s.config.durationMin * 60) {
      commit(s);
      teacher.end();
      return;
    }
  }
  commit(s);
}

function sampleTimeline(s: Session, t: number) {
  let attempts = 0;
  let solved = 0;
  for (const st of s.students) {
    attempts += st.attempts.length;
    solved += Object.keys(st.solvedAt).length;
  }
  return { t, attempts, solved };
}

function ensureLoop() {
  if (timer === null) timer = window.setInterval(tick, TICK_MS);
}
function stopLoop() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
}

// ------------------------------------------------------------------ canal con alumnos reales
function ensureChannel() {
  if (channel || typeof BroadcastChannel === 'undefined') return;
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (ev: MessageEvent<WireMessage>) => {
    const msg = ev.data;
    if (!session) return;
    const s: Session = { ...session, students: session.students.map((st) => ({ ...st })) };

    if (msg.t === 'join') {
      if (msg.code !== s.code) return; // otra sala: no respondemos (el alumno hará timeout)
      if (s.status === 'ended') return broadcast({ t: 'reject', clientId: msg.clientId, reason: 'ended' });
      let st = s.students.find((x) => x.id === msg.clientId);
      if (!st) {
        st = {
          ...makeStudent(s.students.length, s.clock),
          id: msg.clientId,
          name: msg.name,
          device: msg.device,
          real: true,
          color: '#211a33',
          skill: 0.5,
          nextAt: Infinity,
        };
        s.students = [st, ...s.students];
      }
      st.joinedAt = s.clock;
      st.ping = randInt(8, 30);
      if (s.status === 'live' || s.status === 'paused') {
        const mid = missionOf(s, st);
        if (mid) st.startedAt[mid] ??= s.clock;
        setStatus(st, 'drawing', s.clock);
      } else setStatus(st, 'lobby', s.clock);
      feed(s, 'join', `${st.name} se unió desde ${st.device} · alumno real en otra pestaña`, st.id);
      commit(s);
      broadcast({ t: 'welcome', clientId: msg.clientId, session: publicSession(s) });
      return;
    }

    if (!('code' in msg) || msg.code !== s.code) return;
    const st = s.students.find((x) => x.id === (msg as { clientId?: string }).clientId);
    if (!st) return;

    if (msg.t === 'scanning') {
      setStatus(st, 'scanning', s.clock);
    } else if (msg.t === 'attempt') {
      s.aiLatencies.push(Math.round(msg.aiMs));
      st.attempts.push({ at: s.clock, missionId: msg.missionId, ok: msg.ok, errorCode: msg.errorCode, aiMs: msg.aiMs, measure: msg.measure });
      const mid = missionOf(s, st);
      if (msg.ok) {
        st.solvedAt[msg.missionId] = s.clock;
        feed(s, 'ok', `${firstName(st)} resolvió «${missionById(msg.missionId)?.title}»${msg.measure ? ` · ${msg.measure}` : ''}`, st.id);
        if (msg.missionId === mid) {
          st.missionIdx++;
          const next = missionOf(s, st);
          if (next) {
            st.startedAt[next] = s.clock;
            setStatus(st, 'drawing', s.clock);
          } else setStatus(st, 'done', s.clock);
        }
      } else {
        st.lastError = msg.errorCode;
        feed(s, 'error', `Lumi detectó «${errorLabel(msg.errorCode)}» en ${firstName(st)}`, st.id, msg.errorCode);
        setStatus(st, 'error', s.clock);
      }
    } else if (msg.t === 'leave') {
      setStatus(st, 'offline', s.clock);
      feed(s, 'leave', `${firstName(st)} salió de la sala`, st.id);
    }
    commit(s);
  };
}

// ------------------------------------------------------------------ API pública
export const teacher = {
  /** Crea la sala: simula la latencia de aprovisionarla en el servidor. */
  async create(config: SessionConfig): Promise<string> {
    ensureChannel();
    const code = makeCode();
    commit({
      code,
      config,
      createdAtMs: Date.now(),
      status: 'creating',
      clock: 0,
      startedClock: null,
      endedClock: null,
      speed: 1,
      students: [],
      feed: [],
      timeline: [],
      aiLatencies: [],
      aiRetries: 0,
    });
    await new Promise((r) => setTimeout(r, rand(900, 1500)));
    const s = { ...session! };
    s.status = 'lobby';
    // la mayoría llega en el primer minuto; algunos tarde (ya iniciada la clase)
    s.students = Array.from({ length: config.classSize }, (_, i) => {
      const late = Math.random() < 0.12;
      return makeStudent(i, late ? rand(70, 260) : clamp(lognormal(14, 0.7), 2, 60));
    });
    feed(s, 'system', `Sala ${code} abierta · esperando a ${config.classSize} alumnos`);
    commit(s);
    ensureLoop();
    broadcast({ t: 'state', code, session: publicSession(s) });
    return code;
  },

  start() {
    if (!session || session.status !== 'lobby') return;
    const s: Session = { ...session, students: session.students.map((st) => ({ ...st })) };
    s.status = 'live';
    s.startedClock = s.clock;
    s.timeline = [{ t: 0, attempts: 0, solved: 0 }];
    for (const st of s.students) {
      if (st.status === 'lobby') {
        if (st.real) {
          const mid = missionOf(s, st);
          if (mid) st.startedAt[mid] = s.clock;
          setStatus(st, 'drawing', s.clock);
        } else {
          // cada uno arranca con su propio ritmo
          st.nextAt = s.clock + rand(1, 8);
        }
      }
    }
    feed(s, 'system', `Misión iniciada: ${s.config.missionIds.map((id) => `«${missionById(id)?.title}»`).join(', ')}`);
    commit(s);
    broadcast({ t: 'state', code: s.code, session: publicSession(s) });
  },

  togglePause() {
    if (!session || (session.status !== 'live' && session.status !== 'paused')) return;
    const s: Session = { ...session, status: session.status === 'live' ? 'paused' : 'live' };
    feed(s, 'system', s.status === 'paused' ? 'Sesión en pausa' : 'Sesión reanudada');
    commit(s);
    broadcast({ t: 'state', code: s.code, session: publicSession(s) });
  },

  setSpeed(speed: number) {
    if (!session) return;
    commit({ ...session, speed });
  },

  /** Pista del docente: a un alumno o a todos los que tienen cierto error. */
  sendHint(target: { studentId?: string; errorCode?: string; missionId?: string }, text: string) {
    if (!session) return 0;
    const s: Session = { ...session, students: session.students.map((st) => ({ ...st })) };
    const targets = s.students.filter((st) =>
      target.studentId ? st.id === target.studentId : isInError(s, st, target.errorCode, target.missionId),
    );
    for (const st of targets) {
      st.teacherHints++;
      st.boost += 0.22;
      if (st.real) broadcast({ t: 'hint', code: s.code, clientId: st.id, text });
      if (!st.real && (st.status === 'stuck' || st.status === 'error')) st.nextAt = Math.min(st.nextAt, s.clock + rand(10, 30));
    }
    feed(
      s,
      'hint',
      target.studentId
        ? `Enviaste una pista a ${targets[0]?.name ?? 'un alumno'}`
        : `Enviaste una pista a ${targets.length} alumnos con «${errorLabel(target.errorCode)}»`,
    );
    commit(s);
    return targets.length;
  },

  end() {
    if (!session) return;
    const s: Session = { ...session, status: 'ended', endedClock: session.clock };
    for (const st of s.students) if (st.status !== 'offline' && st.status !== 'done' && st.joinedAt !== null) st.status = st.status === 'connecting' ? 'offline' : st.status;
    feed(s, 'system', 'Sesión finalizada');
    commit(s);
    stopLoop();
    broadcast({ t: 'state', code: s.code, session: publicSession(s) });
    history = [s, ...history.filter((h) => h.code !== s.code)].slice(0, 8);
    saveHistory();
    emit();
  },

  /** Vuelve a la pantalla de inicio del docente. */
  close() {
    stopLoop();
    session = null;
    emit();
  },

  openFromHistory(code: string) {
    const h = history.find((x) => x.code === code);
    if (h) commit(h);
  },

  deleteHistory(code: string) {
    history = history.filter((h) => h.code !== code);
    saveHistory();
    emit();
  },

  missions: MISSIONS,
};

export function useTeacherSession(): Session | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => session,
  );
}

let historySnapshot = history;
export function useHistory(): Session[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => {
      if (historySnapshot !== history) historySnapshot = history;
      return historySnapshot;
    },
  );
}

// re-export útil para la UI
export { pick };
