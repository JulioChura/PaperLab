/**
 * MODO AULA (prototipo): el docente abre una sesión tipo "Meet", los alumnos se unen con un
 * código y resuelven misiones dibujando. La red y los alumnos virtuales se SIMULAN en el
 * navegador del docente; los alumnos reales en otras pestañas del mismo navegador se conectan
 * de verdad mediante BroadcastChannel.
 */

export type StudentStatus =
  | 'connecting'
  | 'lobby'
  | 'drawing'
  | 'scanning'
  | 'error'
  | 'solved'
  | 'stuck'
  | 'reconnecting'
  | 'offline'
  | 'done';

export type Device = 'Android' | 'iPhone' | 'Chromebook' | 'Laptop' | 'Tablet';

export interface Attempt {
  /** Segundo de la sesión (reloj simulado) en que llegó el resultado. */
  at: number;
  missionId: string;
  ok: boolean;
  errorCode?: string;
  /** Tiempo que tardó la IA en resolver el dibujo (ms). */
  aiMs: number;
  measure?: string;
}

export interface Student {
  id: string;
  name: string;
  color: string;
  device: Device;
  ping: number;
  real: boolean;
  joinedAt: number | null;
  status: StudentStatus;
  statusSince: number;
  /** Índice de la misión que está resolviendo. */
  missionIdx: number;
  attempts: Attempt[];
  /** missionId → segundo en que la resolvió. */
  solvedAt: Record<string, number>;
  /** missionId → segundo en que empezó a trabajarla. */
  startedAt: Record<string, number>;
  lumiHints: number;
  teacherHints: number;
  lastError?: string;
  reconnects: number;
  // --- internos de la simulación ---
  skill: number;
  joinAt: number;
  nextAt: number;
  boost: number;
  resumeStatus?: StudentStatus;
}

export type FeedKind =
  | 'join'
  | 'leave'
  | 'reconnect'
  | 'scan'
  | 'ok'
  | 'error'
  | 'hint'
  | 'lumi'
  | 'stuck'
  | 'ai_retry'
  | 'system';

export interface FeedEvent {
  id: number;
  at: number;
  kind: FeedKind;
  studentId?: string;
  text: string;
  errorCode?: string;
}

export interface SessionConfig {
  name: string;
  missionIds: string[];
  durationMin: number;
  classSize: number;
  allowLumiHints: boolean;
}

export type SessionStatus = 'creating' | 'lobby' | 'live' | 'paused' | 'ended';

export interface TimelinePoint {
  t: number;
  attempts: number;
  solved: number;
}

export interface Session {
  code: string;
  config: SessionConfig;
  createdAtMs: number;
  status: SessionStatus;
  /** Reloj simulado en segundos desde que se abrió la sala. */
  clock: number;
  startedClock: number | null;
  endedClock: number | null;
  speed: number;
  students: Student[];
  feed: FeedEvent[];
  timeline: TimelinePoint[];
  aiLatencies: number[];
  aiRetries: number;
}

/** Mensajes entre pestañas (alumno ↔ docente). */
export type WireMessage =
  | { t: 'join'; code: string; clientId: string; name: string; device: Device }
  | { t: 'welcome'; clientId: string; session: PublicSession }
  | { t: 'reject'; clientId: string; reason: 'not_found' | 'ended' | 'full' }
  | { t: 'state'; code: string; session: PublicSession }
  | { t: 'scanning'; code: string; clientId: string }
  | { t: 'attempt'; code: string; clientId: string; missionId: string; ok: boolean; errorCode?: string; measure?: string; aiMs: number }
  | { t: 'leave'; code: string; clientId: string }
  | { t: 'hint'; code: string; clientId: string; text: string };

/** Lo que ve el alumno de la sesión. */
export interface PublicSession {
  code: string;
  name: string;
  missionIds: string[];
  status: SessionStatus;
  durationMin: number;
  /** ms de reloj real en que empezó (para el cronómetro del alumno). */
  startedAtMs: number | null;
  teacher: string;
  /** Segundos de clase que quedan (reloj del docente) y velocidad de la simulación. */
  remainingSec?: number | null;
  speed?: number;
  /** ms (reloj local del alumno) en que llegó este estado. */
  receivedAtMs?: number;
  demo?: boolean;
}
