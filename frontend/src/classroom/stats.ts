/** Métricas derivadas de una sesión: lo que el docente necesita para decidir qué hacer. */
import { missionById } from '../game/missions';
import { errorLabel } from '../tutor/types';
import { errorProfile } from './sim';
import { isInError } from './teacherStore';
import type { Session, Student } from './types';

export interface ErrorStat {
  code: string;
  label: string;
  missionId: string;
  /** alumnos distintos que lo cometieron */
  students: number;
  count: number;
  share: number;
  what: string;
  misconception: string;
  action: string;
  /** alumnos que ahora mismo están en ese error */
  activeNow: number;
}

export interface SessionStats {
  joined: number;
  connected: number;
  working: number;
  attempted: number;
  hadError: number;
  recovered: number;
  solvedAny: number;
  solvedAll: number;
  attempts: number;
  okAttempts: number;
  firstTryRate: number;
  recoveryRate: number;
  avgSolveSec: number | null;
  medianSolveSec: number | null;
  solveTimes: number[];
  aiMedianMs: number | null;
  aiP95Ms: number | null;
  avgPing: number | null;
  errors: ErrorStat[];
  needsHelp: { student: Student; reason: string; severity: 'warning' | 'critical' }[];
  perMission: { id: string; title: string; solved: number; attempted: number; avgSec: number | null }[];
  hintsLumi: number;
  hintsTeacher: number;
  elapsed: number;
  remaining: number;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const pct = (xs: number[], p: number) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};

export function computeStats(s: Session): SessionStats {
  const joined = s.students.filter((st) => st.joinedAt !== null);
  const connected = joined.filter((st) => !['offline', 'reconnecting'].includes(st.status));
  const working = connected.filter((st) => ['drawing', 'scanning', 'error', 'stuck'].includes(st.status));
  const attempted = joined.filter((st) => st.attempts.length > 0);
  const hadError = joined.filter((st) => st.attempts.some((a) => !a.ok));
  const recovered = hadError.filter((st) => st.attempts.some((a, i) => a.ok && st.attempts.slice(0, i).some((b) => !b.ok && b.missionId === a.missionId)));
  const solvedAny = joined.filter((st) => Object.keys(st.solvedAt).length > 0);
  const nMissions = s.config.missionIds.length;
  const solvedAll = joined.filter((st) => Object.keys(st.solvedAt).length >= nMissions);

  let attempts = 0;
  let okAttempts = 0;
  let firstTry = 0;
  let firstTryBase = 0;
  const solveTimes: number[] = [];
  for (const st of joined) {
    attempts += st.attempts.length;
    okAttempts += st.attempts.filter((a) => a.ok).length;
    for (const mid of s.config.missionIds) {
      const tries = st.attempts.filter((a) => a.missionId === mid);
      if (tries.length) {
        firstTryBase++;
        if (tries[0].ok) firstTry++;
      }
      if (st.solvedAt[mid] !== undefined && st.startedAt[mid] !== undefined) solveTimes.push(st.solvedAt[mid] - st.startedAt[mid]);
    }
  }

  // errores agregados
  const map = new Map<string, ErrorStat>();
  for (const st of joined) {
    const seen = new Set<string>();
    for (const a of st.attempts) {
      if (a.ok || !a.errorCode) continue;
      const key = `${a.missionId}:${a.errorCode}`;
      const p = errorProfile(a.missionId, a.errorCode);
      const e =
        map.get(key) ??
        {
          code: a.errorCode,
          label: errorLabel(a.errorCode),
          missionId: a.missionId,
          students: 0,
          count: 0,
          share: 0,
          what: p?.what ?? errorLabel(a.errorCode),
          misconception: p?.misconception ?? '',
          action: p?.action ?? '',
          activeNow: 0,
        };
      e.count++;
      if (!seen.has(key)) {
        e.students++;
        seen.add(key);
      }
      map.set(key, e);
    }
  }
  for (const e of map.values()) e.activeNow = joined.filter((st) => isInError(s, st, e.code, e.missionId)).length;
  const errors = [...map.values()]
    .map((e) => ({ ...e, share: attempted.length ? e.students / attempted.length : 0 }))
    .sort((a, b) => b.students - a.students || b.count - a.count);

  // quién necesita ayuda
  const needsHelp: SessionStats['needsHelp'] = [];
  for (const st of joined) {
    if (st.status === 'done' || st.status === 'offline') continue;
    const mid = s.config.missionIds[st.missionIdx];
    const fails = st.attempts.filter((a) => a.missionId === mid && !a.ok).length;
    const since = st.startedAt[mid] !== undefined ? s.clock - st.startedAt[mid] : 0;
    if (st.status === 'stuck' || fails >= 4) needsHelp.push({ student: st, reason: `${fails} intentos fallidos · ${errorLabel(st.lastError)}`, severity: 'critical' });
    else if (fails >= 2) needsHelp.push({ student: st, reason: `${fails} intentos · ${errorLabel(st.lastError)}`, severity: 'warning' });
    else if (s.status !== 'lobby' && since > 6 * 60 && !st.attempts.some((a) => a.missionId === mid))
      needsHelp.push({ student: st, reason: `${Math.round(since / 60)} min sin escanear`, severity: 'warning' });
  }
  needsHelp.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1));

  const perMission = s.config.missionIds.map((id) => {
    const times = joined.filter((st) => st.solvedAt[id] !== undefined && st.startedAt[id] !== undefined).map((st) => st.solvedAt[id] - st.startedAt[id]);
    return {
      id,
      title: missionById(id)?.title ?? id,
      solved: joined.filter((st) => st.solvedAt[id] !== undefined).length,
      attempted: joined.filter((st) => st.attempts.some((a) => a.missionId === id)).length,
      avgSec: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
    };
  });

  const pings = connected.map((st) => st.ping);
  const elapsed = s.startedClock !== null ? (s.endedClock ?? s.clock) - s.startedClock : 0;

  return {
    joined: joined.length,
    connected: connected.length,
    working: working.length,
    attempted: attempted.length,
    hadError: hadError.length,
    recovered: recovered.length,
    solvedAny: solvedAny.length,
    solvedAll: solvedAll.length,
    attempts,
    okAttempts,
    firstTryRate: firstTryBase ? firstTry / firstTryBase : 0,
    recoveryRate: hadError.length ? recovered.length / hadError.length : 0,
    avgSolveSec: solveTimes.length ? solveTimes.reduce((a, b) => a + b, 0) / solveTimes.length : null,
    medianSolveSec: median(solveTimes),
    solveTimes,
    aiMedianMs: median(s.aiLatencies),
    aiP95Ms: pct(s.aiLatencies, 0.95),
    avgPing: pings.length ? Math.round(pings.reduce((a, b) => a + b, 0) / pings.length) : null,
    errors,
    needsHelp,
    perMission,
    hintsLumi: joined.reduce((a, st) => a + st.lumiHints, 0),
    hintsTeacher: joined.reduce((a, st) => a + st.teacherHints, 0),
    elapsed,
    remaining: Math.max(0, s.config.durationMin * 60 - elapsed),
  };
}

/** Conclusiones en lenguaje de docente para el reporte final. */
export function insights(s: Session, st: SessionStats): { tone: 'good' | 'warn' | 'info'; title: string; body: string }[] {
  const out: { tone: 'good' | 'warn' | 'info'; title: string; body: string }[] = [];
  const top = st.errors[0];
  if (top) {
    out.push({
      tone: 'warn',
      title: `${Math.round(top.share * 100)}% tropezó con «${top.label}»`,
      body: `${top.what} en «${missionById(top.missionId)?.title}». ${top.misconception} Sugerencia: ${top.action}`,
    });
  }
  if (st.hadError > 0) {
    out.push({
      tone: st.recoveryRate >= 0.6 ? 'good' : 'warn',
      title: `${Math.round(st.recoveryRate * 100)}% corrigió su error sin que le dieran la respuesta`,
      body: `${st.recovered} de ${st.hadError} alumnos que se equivocaron llegaron a la solución tras la pregunta socrática de Lumi${st.hintsTeacher ? ` y ${st.hintsTeacher} pistas tuyas` : ''}.`,
    });
  }
  if (st.joined) {
    out.push({
      tone: st.solvedAll / st.joined >= 0.7 ? 'good' : 'info',
      title: `${st.solvedAll} de ${st.joined} completaron todas las misiones`,
      body: `Acierto al primer intento: ${Math.round(st.firstTryRate * 100)}%. Tiempo mediano de resolución: ${st.medianSolveSec ? `${Math.floor(st.medianSolveSec / 60)} min ${Math.round(st.medianSolveSec % 60)} s` : '—'}.`,
    });
  }
  const stuck = st.needsHelp.filter((n) => n.severity === 'critical');
  if (stuck.length) {
    out.push({
      tone: 'warn',
      title: `${stuck.length} alumno${stuck.length > 1 ? 's' : ''} para acompañar la próxima clase`,
      body: stuck.slice(0, 5).map((n) => n.student.name).join(', ') + (stuck.length > 5 ? '…' : '') + '.',
    });
  }
  if (s.aiRetries) {
    out.push({
      tone: 'info',
      title: `La IA se saturó ${s.aiRetries} ${s.aiRetries === 1 ? 'vez' : 'veces'}`,
      body: `Se reintentó sola con el modelo alterno; latencia mediana ${st.aiMedianMs ? (st.aiMedianMs / 1000).toFixed(1) : '—'} s (p95 ${st.aiP95Ms ? (st.aiP95Ms / 1000).toFixed(1) : '—'} s).`,
    });
  }
  return out;
}

export function sessionCsv(s: Session): string {
  const head = ['alumno', 'dispositivo', 'estado', 'intentos', 'errores', 'misiones_resueltas', 'tiempo_total_s', 'pistas_lumi', 'pistas_docente', 'ultimo_error'];
  const rows = s.students
    .filter((st) => st.joinedAt !== null)
    .map((st) => {
      const solved = Object.keys(st.solvedAt);
      const total = solved.reduce((acc, id) => acc + (st.solvedAt[id] - (st.startedAt[id] ?? st.solvedAt[id])), 0);
      return [
        st.name,
        st.device,
        st.status,
        st.attempts.length,
        st.attempts.filter((a) => !a.ok).length,
        solved.length,
        Math.round(total),
        st.lumiHints,
        st.teacherHints,
        st.lastError ? errorLabel(st.lastError) : '',
      ];
    });
  return [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}
