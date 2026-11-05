import React, { useMemo, useState } from 'react';
import { Activity, AlertTriangle, Check, Copy, FastForward, LifeBuoy, MessageCircle, Pause, Play, Send, Square, Users, X, Zap } from 'lucide-react';
import { missionById } from '../game/missions';
import { errorLabel } from '../tutor/types';
import { fmtDur, teacher } from '../classroom/teacherStore';
import { computeStats } from '../classroom/stats';
import type { FeedKind, Session, Student, StudentStatus } from '../classroom/types';
import { audioJuice } from '../utils/audioJuice';
import { pushToast } from '../game/notify';
import { BarList, ProgressChart, Ring } from './charts';
import { Avatar, Card, Empty, PingBars, Stat, StatusPill, STATUS_META, fmtClock } from './parts';

const FEED_STYLE: Record<FeedKind, { dot: string; group: 'all' | 'err' | 'ok' | 'net' | 'you' }> = {
  join: { dot: '#2f4bf0', group: 'net' },
  leave: { dot: '#a4957b', group: 'net' },
  reconnect: { dot: '#ffc81f', group: 'net' },
  scan: { dot: '#2f4bf0', group: 'all' },
  ok: { dot: '#12a96e', group: 'ok' },
  error: { dot: '#ff5435', group: 'err' },
  stuck: { dot: '#ff5435', group: 'err' },
  hint: { dot: '#ff4f9e', group: 'you' },
  lumi: { dot: '#ff4f9e', group: 'all' },
  ai_retry: { dot: '#ffc81f', group: 'net' },
  system: { dot: '#211a33', group: 'you' },
};

const FILTERS: { id: 'all' | StudentStatus | 'help'; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'help', label: 'Necesitan ayuda' },
  { id: 'drawing', label: 'Dibujando' },
  { id: 'error', label: 'Con error' },
  { id: 'solved', label: 'Resolvieron' },
  { id: 'offline', label: 'Sin conexión' },
];

export const LiveDashboard: React.FC<{ session: Session }> = ({ session }) => {
  const st = useMemo(() => computeStats(session), [session]);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [feedFilter, setFeedFilter] = useState<'all' | 'err' | 'ok' | 'net' | 'you'>('all');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const paused = session.status === 'paused';
  const remaining = st.remaining;
  const lowTime = remaining < 120;

  const errorKey = (e: { missionId: string; code: string }) => `${e.missionId}:${e.code}`;
  const selErr = st.errors.find((e) => errorKey(e) === selectedError) ?? null;
  const helpIds = new Set(st.needsHelp.map((n) => n.student.id));

  const students = session.students
    .filter((s) => s.joinedAt !== null || s.real)
    .filter((s) => {
      if (filter === 'all') return true;
      if (filter === 'help') return helpIds.has(s.id);
      if (filter === 'error') return s.status === 'error' || s.status === 'stuck';
      if (filter === 'solved') return s.status === 'solved' || s.status === 'done' || Object.keys(s.solvedAt).length > 0;
      if (filter === 'offline') return s.status === 'offline' || s.status === 'reconnecting';
      if (filter === 'drawing') return s.status === 'drawing' || s.status === 'scanning';
      return s.status === filter;
    })
    .sort((a, b) => Number(helpIds.has(b.id)) - Number(helpIds.has(a.id)) || Number(b.real) - Number(a.real));

  const hintFor = (missionId: string) => missionById(missionId)?.hint ?? 'Revisa la condición que pide la misión.';

  const sendGroupHint = () => {
    if (!selErr) return;
    const n = teacher.sendHint({ errorCode: selErr.code, missionId: selErr.missionId }, `${selErr.action} Pista: ${hintFor(selErr.missionId)}`);
    audioJuice.playTap();
    pushToast({ kind: 'info', icon: '💬', title: n ? `Pista enviada a ${n} alumno${n === 1 ? '' : 's'}` : 'Nadie está en ese error ahora', body: selErr.label });
  };

  const sendStudentHint = (s: Student) => {
    const mid = session.config.missionIds[s.missionIdx] ?? session.config.missionIds[0];
    teacher.sendHint({ studentId: s.id }, hintFor(mid));
    audioJuice.playTap();
    pushToast({ kind: 'info', icon: '💬', title: `Pista enviada a ${s.name.split(' ')[0]}`, body: hintFor(mid) });
  };

  const feed = session.feed.filter((f) => feedFilter === 'all' || FEED_STYLE[f.kind].group === feedFilter).slice(0, 40);
  const student = session.students.find((s) => s.id === openStudent) ?? null;

  return (
    <div className="w-full max-w-[1320px] mx-auto px-4 sm:px-6 py-5 text-left">
      {/* ---------------- barra de control ---------------- */}
      <div className="ink-card !rounded-[22px] px-4 sm:px-5 py-3 mb-5 flex flex-wrap items-center gap-x-5 gap-y-3 sticky top-[66px] z-30">
        <div className="min-w-0 mr-auto">
          <div className="flex items-center gap-2">
            {paused ? (
              <span className="px-2 py-0.5 rounded-full border-2 border-[#211a33] bg-[#ffc81f] text-[#211a33] font-telemetry text-[10px]">EN PAUSA</span>
            ) : (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border-2 border-[#211a33] bg-[#ff4f9e] text-[#fffaf0] font-telemetry text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#fffaf0] animate-pulse" /> EN VIVO
              </span>
            )}
            <button
              onClick={() => navigator.clipboard?.writeText(session.code).catch(() => undefined)}
              className="font-telemetry text-[11px] text-[var(--text-secondary)] hover:text-[var(--ink)] inline-flex items-center gap-1 cursor-pointer"
              title="Copiar código"
            >
              {session.code} <Copy className="w-3 h-3" />
            </button>
          </div>
          <h2 className="font-heading text-xl sm:text-2xl leading-tight truncate">{session.config.name}</h2>
        </div>

        <div className="text-right">
          <p className="font-telemetry text-[9px] uppercase tracking-wider text-[var(--text-secondary)]">Tiempo restante</p>
          <p className={`font-telemetry font-extrabold text-2xl tabular-nums leading-none ${lowTime ? 'text-[#ff5435]' : ''}`} data-testid="time-left">{fmtClock(remaining)}</p>
        </div>

        <div className="flex items-center gap-1 rounded-full border-[2.5px] border-[var(--ink)] p-0.5" role="group" aria-label="Velocidad de la simulación">
          <FastForward className="w-3.5 h-3.5 mx-1.5 text-[var(--text-secondary)]" />
          {[1, 5, 20].map((v) => (
            <button
              key={v}
              onClick={() => teacher.setSpeed(v)}
              className={`px-2.5 py-1 rounded-full font-telemetry text-[11px] cursor-pointer ${session.speed === v ? 'bg-[var(--ink)] text-[var(--bg-ground)]' : ''}`}
              aria-pressed={session.speed === v}
              data-testid={`speed-${v}`}
            >
              ×{v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => teacher.togglePause()} data-juice className="juicy ink-chip p-2.5 cursor-pointer" aria-label={paused ? 'Reanudar' : 'Pausar'}>
            {paused ? <Play className="w-4 h-4" fill="currentColor" /> : <Pause className="w-4 h-4" fill="currentColor" />}
          </button>
          <button
            onClick={() => {
              if (window.confirm('¿Finalizar la sesión para toda la clase?')) teacher.end();
            }}
            data-juice="big"
            className="juicy btn-ink px-4 py-2 text-sm bg-[#ff5435] text-[#fffaf0]"
            data-testid="end-session"
          >
            <Square className="w-3.5 h-3.5" fill="currentColor" /> Finalizar
          </button>
        </div>
      </div>

      {/* ---------------- KPIs ---------------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <Stat i={0} label="Conectados" value={<>{st.connected}<span className="text-base text-[var(--text-secondary)]">/{st.joined}</span></>} sub={`${st.working} trabajando ahora${st.avgPing ? ` · ${st.avgPing} ms` : ''}`} accent="#2f4bf0" />
        <div className="pop-in ink-card !rounded-[18px] px-4 py-3 flex items-center gap-3" style={{ ['--i' as string]: 1 }}>
          <Ring value={st.joined ? st.solvedAll / st.joined : 0} size={64} label="Porcentaje que completó" />
          <div className="min-w-0">
            <p className="font-telemetry text-[9.5px] uppercase tracking-wider text-[var(--text-secondary)]">Completaron</p>
            <p className="font-heading text-xl leading-none mt-1">{st.solvedAll} alumnos</p>
            <p className="text-[11px] text-[var(--text-secondary)]">{st.solvedAny} resolvieron ≥ 1</p>
          </div>
        </div>
        <Stat i={2} label="Errores detectados" value={st.attempts - st.okAttempts} sub={`en ${st.hadError} alumnos · ${st.errors.length} tipos`} accent="#ff5435" />
        <Stat i={3} label="Corrigieron solos" value={`${Math.round(st.recoveryRate * 100)}%`} sub={`${st.recovered}/${st.hadError} tras la pregunta de Lumi`} accent="#12a96e" />
        <Stat i={4} label="Tiempo mediano" value={st.medianSolveSec ? fmtDur(st.medianSolveSec) : '—'} sub={`${Math.round(st.firstTryRate * 100)}% al primer intento`} accent="#ffc81f" />
        <Stat
          i={5}
          label="IA · resolución"
          value={st.aiMedianMs ? `${(st.aiMedianMs / 1000).toFixed(1)} s` : '—'}
          sub={`p95 ${st.aiP95Ms ? (st.aiP95Ms / 1000).toFixed(1) : '—'} s · ${session.aiRetries} reintentos`}
          accent="#ff4f9e"
        />
      </div>

      {/* ---------------- progreso + ayuda ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        <Card className="lg:col-span-8" title={<span className="flex items-center gap-2"><Activity className="w-4 h-4" /> Progreso de la clase</span>}>
          <ProgressChart data={session.timeline} />
          {session.config.missionIds.length > 1 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {st.perMission.map((m, k) => (
                <div key={m.id} className="rounded-xl border-2 border-[var(--ink)] bg-[var(--surface-secondary)] px-3 py-2">
                  <p className="text-[12px] font-semibold truncate">{k + 1}. {m.title}</p>
                  <div className="mt-1.5 h-2 rounded-full bg-[var(--chart-track)] overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--chart-b)] transition-[width] duration-700" style={{ width: `${st.joined ? (m.solved / st.joined) * 100 : 0}%` }} />
                  </div>
                  <p className="font-telemetry text-[10px] text-[var(--text-secondary)] mt-1">{m.solved}/{st.joined} · {m.avgSec ? fmtDur(m.avgSec) : '—'} prom.</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          className="lg:col-span-4"
          title={<span className="flex items-center gap-2"><LifeBuoy className="w-4 h-4 text-[#ff5435]" /> Necesitan ayuda</span>}
          right={<span className="font-telemetry text-[11px] px-2 py-0.5 rounded-full border-2 border-[#211a33] bg-[#ff5435] text-[#fffaf0]">{st.needsHelp.length}</span>}
        >
          {!st.needsHelp.length && <Empty>Todos van bien por ahora.</Empty>}
          <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-1" data-testid="needs-help">
            {st.needsHelp.slice(0, 12).map(({ student: s, reason, severity }) => (
              <li key={s.id} className="flex items-center gap-2.5 rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface-secondary)] px-2.5 py-2">
                <button onClick={() => setOpenStudent(s.id)} className="cursor-pointer"><Avatar s={s} size={30} /></button>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate leading-tight">{s.name}</p>
                  <p className={`text-[11px] truncate flex items-center gap-1 ${severity === 'critical' ? 'text-[#e23b1d]' : 'text-[var(--text-secondary)]'}`}>
                    {severity === 'critical' ? <AlertTriangle className="w-3 h-3 shrink-0" /> : null}
                    {reason}
                  </p>
                </div>
                <button onClick={() => sendStudentHint(s)} data-juice className="juicy ink-chip px-2.5 py-1 text-[10px] font-telemetry cursor-pointer inline-flex items-center gap-1" title="Enviar la pista de la misión">
                  <Send className="w-3 h-3" /> Pista
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ---------------- errores + feed ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        <Card className="lg:col-span-7" title={<span className="flex items-center gap-2"><Zap className="w-4 h-4 text-[#ff5435]" /> Errores más comunes</span>} right={<span className="font-telemetry text-[10px] text-[var(--text-secondary)]">% de alumnos que intentaron</span>}>
          {!st.errors.length && <Empty>Lumi aún no detecta errores.</Empty>}
          <BarList
            data={st.errors.slice(0, 6).map((e) => ({
              key: errorKey(e),
              label: e.label,
              sub: `${e.what} · ${missionById(e.missionId)?.title ?? ''}`,
              value: e.students,
              display: `${Math.round(e.share * 100)}% · ${e.students}`,
              tip: e.misconception,
            }))}
            max={Math.max(1, st.attempted)}
            color="var(--chart-a)"
            selected={selectedError}
            onSelect={(k) => setSelectedError((cur) => (cur === k ? null : k))}
          />
          {selErr && (
            <div className="mt-4 rounded-2xl border-[2.5px] border-[#211a33] bg-[#fff2c2] text-[#211a33] p-4 pop-in" style={{ ['--r' as string]: '0deg' }}>
              <p className="font-telemetry text-[10px] uppercase tracking-wider opacity-70">Concepción errónea probable</p>
              <p className="font-heading text-base leading-snug mt-1">{selErr.misconception}</p>
              <p className="text-[13px] mt-2"><b>Sugerencia para la clase:</b> {selErr.action}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={sendGroupHint} data-juice className="juicy btn-ink px-4 py-2 text-sm bg-[#211a33] text-[#fffaf0]" data-testid="group-hint">
                  <MessageCircle className="w-4 h-4" /> Enviar pista a quienes están en este error ({selErr.activeNow})
                </button>
                <button onClick={() => setSelectedError(null)} className="text-[12px] underline cursor-pointer">Cerrar</button>
              </div>
            </div>
          )}
        </Card>

        <Card
          className="lg:col-span-5"
          title={<span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#ff4f9e] animate-pulse" /> En vivo</span>}
          right={
            <div className="flex gap-1 font-telemetry text-[9.5px]">
              {(
                [
                  ['all', 'Todo'],
                  ['err', 'Errores'],
                  ['ok', 'Logros'],
                  ['net', 'Red'],
                ] as const
              ).map(([id, l]) => (
                <button key={id} onClick={() => setFeedFilter(id)} className={`px-2 py-0.5 rounded-full border-[1.5px] border-[var(--ink)] cursor-pointer ${feedFilter === id ? 'bg-[var(--ink)] text-[var(--bg-ground)]' : ''}`}>
                  {l}
                </button>
              ))}
            </div>
          }
        >
          <ul className="space-y-1.5 h-[300px] overflow-y-auto pr-1" aria-live="polite" data-testid="live-feed">
            {feed.map((f) => (
              <li key={f.id} className="flex gap-2.5 text-[12.5px] leading-snug animate-toast-in">
                <span className="font-telemetry text-[10px] text-[var(--text-secondary)] tabular-nums pt-0.5 w-10 shrink-0">{fmtClock(f.at - (session.startedClock ?? 0))}</span>
                <span className="mt-1.5 w-2 h-2 rounded-full shrink-0 border border-[#211a33]" style={{ background: FEED_STYLE[f.kind].dot }} />
                <span className={f.kind === 'ok' ? 'font-semibold' : ''}>{f.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ---------------- alumnos ---------------- */}
      <Card
        title={<span className="flex items-center gap-2"><Users className="w-4 h-4" /> Alumnos</span>}
        right={
          <div className="flex flex-wrap justify-end gap-1 font-telemetry text-[10px]">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-2.5 py-1 rounded-full border-[1.5px] border-[var(--ink)] cursor-pointer ${filter === f.id ? 'bg-[var(--ink)] text-[var(--bg-ground)]' : ''}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      >
        {!students.length && <Empty>Nadie en este filtro.</Empty>}
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5" data-testid="student-grid">
          {students.map((s) => (
            <StudentCard key={s.id} s={s} session={session} help={helpIds.has(s.id)} onOpen={() => setOpenStudent(s.id)} />
          ))}
        </ul>
      </Card>

      {student && <StudentDrawer s={student} session={session} onClose={() => setOpenStudent(null)} onHint={() => sendStudentHint(student)} />}
    </div>
  );
};

const StudentCard: React.FC<{ s: Student; session: Session; help: boolean; onOpen: () => void }> = ({ s, session, help, onOpen }) => {
  const tries = s.attempts.length;
  const errs = s.attempts.filter((a) => !a.ok).length;
  return (
    <li>
      <button
        onClick={onOpen}
        className={`w-full text-left flex items-center gap-2.5 rounded-2xl border-2 px-2.5 py-2 cursor-pointer transition-transform duration-300 hover:-translate-y-0.5 ${
          help ? 'border-[#ff5435] bg-[#ff5435]/10' : 'border-[var(--ink)] bg-[var(--surface-secondary)]'
        } ${s.status === 'offline' ? 'opacity-55' : ''}`}
      >
        <Avatar s={s} size={34} ring={s.status === 'scanning'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[13px] font-semibold truncate leading-tight">{s.name}</p>
            <PingBars ms={s.ping} />
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <StatusPill status={s.status} small />
            <span className="flex gap-[3px] ml-auto" aria-label="Misiones">
              {session.config.missionIds.map((id, k) => (
                <i
                  key={id}
                  className="w-2.5 h-2.5 rounded-full border-[1.5px] border-[#211a33] inline-block"
                  style={{ background: s.solvedAt[id] !== undefined ? '#12a96e' : k === s.missionIdx ? '#ffc81f' : 'transparent' }}
                />
              ))}
            </span>
          </div>
          <p className="font-telemetry text-[9.5px] text-[var(--text-secondary)] mt-1">
            {tries} intento{tries === 1 ? '' : 's'}{errs ? ` · ${errs} con error` : ''}{s.lumiHints ? ` · ${s.lumiHints} pista${s.lumiHints === 1 ? '' : 's'}` : ''}
          </p>
        </div>
      </button>
    </li>
  );
};

const StudentDrawer: React.FC<{ s: Student; session: Session; onClose: () => void; onHint: () => void }> = ({ s, session, onClose, onHint }) => {
  const t0 = session.startedClock ?? 0;
  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label={`Detalle de ${s.name}`}>
      <button className="absolute inset-0 bg-[#211a33]/40 cursor-default" onClick={onClose} aria-label="Cerrar" />
      <aside className="relative w-full max-w-md h-full bg-[var(--surface)] border-l-[2.5px] border-[var(--ink)] p-5 overflow-y-auto animate-toast-in text-left">
        <div className="flex items-start gap-3 mb-4">
          <Avatar s={s} size={52} />
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-xl leading-tight">{s.name}</h3>
            <p className="font-telemetry text-[10px] text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
              {s.device} · {s.ping} ms <PingBars ms={s.ping} /> {s.reconnects ? `· ${s.reconnects} reconexión${s.reconnects > 1 ? 'es' : ''}` : ''}
            </p>
            <div className="mt-1.5"><StatusPill status={s.status} /></div>
          </div>
          <button onClick={onClose} className="p-1 cursor-pointer" aria-label="Cerrar detalle"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5 text-center">
          {[
            ['Intentos', s.attempts.length],
            ['Pistas Lumi', s.lumiHints],
            ['Tus pistas', s.teacherHints],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl border-2 border-[var(--ink)] py-2">
              <p className="font-heading text-xl">{v}</p>
              <p className="font-telemetry text-[9px] uppercase text-[var(--text-secondary)]">{l}</p>
            </div>
          ))}
        </div>

        <h4 className="font-heading text-sm mb-2">Recorrido</h4>
        <ol className="relative border-l-2 border-dashed border-[var(--ink)]/40 ml-2 space-y-3">
          {s.joinedAt !== null && (
            <li className="pl-4 text-[12.5px]"><Dot c="#2f4bf0" />Se unió <Time t={s.joinedAt - t0} /></li>
          )}
          {s.attempts.map((a, k) => (
            <li key={k} className="pl-4 text-[12.5px]">
              <Dot c={a.ok ? '#12a96e' : '#ff5435'} />
              {a.ok ? (
                <span className="font-semibold inline-flex items-center gap-1"><Check className="w-3.5 h-3.5 text-[#12a96e]" /> Resolvió «{missionById(a.missionId)?.title}»</span>
              ) : (
                <span><b>{errorLabel(a.errorCode)}</b> en «{missionById(a.missionId)?.title}»</span>
              )}{' '}
              <Time t={a.at - t0} />
              <span className="block font-telemetry text-[9.5px] text-[var(--text-secondary)]">IA: {(a.aiMs / 1000).toFixed(1)} s{a.measure ? ` · ${a.measure}` : ''}</span>
            </li>
          ))}
          {!s.attempts.length && <li className="pl-4 text-[12.5px] text-[var(--text-secondary)]"><Dot c="#a4957b" />Aún no escanea su dibujo</li>}
        </ol>

        <button onClick={onHint} data-juice className="mt-6 w-full juicy btn-ink px-5 py-3 text-sm bg-[var(--riso-yellow)] text-[#211a33]">
          <Send className="w-4 h-4" /> Enviar la pista de la misión
        </button>
        {s.real && <p className="mt-2 text-[11px] text-[var(--text-secondary)]">Alumno real conectado desde otra pestaña: recibirá la pista como notificación.</p>}
      </aside>
    </div>
  );
};

const Dot: React.FC<{ c: string }> = ({ c }) => <span className="absolute -left-[7px] mt-1 w-3 h-3 rounded-full border-2 border-[#211a33]" style={{ background: c }} />;
const Time: React.FC<{ t: number }> = ({ t }) => <span className="font-telemetry text-[10px] text-[var(--text-secondary)]">· {fmtClock(Math.max(0, t))}</span>;

export { STATUS_META };
