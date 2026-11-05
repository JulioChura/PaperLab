import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Clock, Copy, ExternalLink, History, Play, Sparkles, Trash2, Users, Wifi } from 'lucide-react';
import { MISSIONS, missionById } from '../game/missions';
import { teacher, useHistory, useTeacherSession } from '../classroom/teacherStore';
import { computeStats } from '../classroom/stats';
import type { Session, SessionConfig } from '../classroom/types';
import { audioJuice } from '../utils/audioJuice';
import { Avatar, Card, PingBars, QR, StatusPill } from './parts';
import { LiveDashboard } from './LiveDashboard';
import { SessionReport } from './SessionReport';

const MODULES: { id: string; label: string; ink: string; fg: string }[] = [
  { id: 'physics', label: 'Física', ink: '#2f4bf0', fg: '#fffaf0' },
  { id: 'circuits', label: 'Circuitos', ink: '#ffc81f', fg: '#211a33' },
  { id: 'flowcharts', label: 'Algoritmos', ink: '#12a96e', fg: '#fffaf0' },
  { id: 'math', label: 'Matemáticas', ink: '#ff4f9e', fg: '#fffaf0' },
];
export const moduleInk = (id: string) => MODULES.find((m) => m.id === id) ?? MODULES[0];

export const joinUrl = (code: string) => `${window.location.origin}${window.location.pathname}?sala=${code}`;

export const TeacherView: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const session = useTeacherSession();
  if (!session) return <TeacherHome onExit={onExit} />;
  if (session.status === 'creating') return <CreatingRoom session={session} />;
  if (session.status === 'lobby') return <Lobby session={session} />;
  if (session.status === 'ended') return <SessionReport session={session} />;
  return <LiveDashboard session={session} />;
};

// ============================================================================ inicio / crear
const TeacherHome: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const history = useHistory();
  const [name, setName] = useState('5° B · Física');
  const [missionIds, setMissionIds] = useState<string[]>([MISSIONS[0].id]);
  const [duration, setDuration] = useState(30);
  const [classSize, setClassSize] = useState(28);
  const [hints, setHints] = useState(true);
  const [busy, setBusy] = useState(false);

  const toggleMission = (id: string) => {
    audioJuice.playTap();
    setMissionIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 3 ? cur : [...cur, id]));
  };

  const create = async () => {
    if (!missionIds.length || busy) return;
    setBusy(true);
    const cfg: SessionConfig = { name: name.trim() || 'Mi clase', missionIds, durationMin: duration, classSize, allowLumiHints: hints };
    await teacher.create(cfg);
    setBusy(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-10 text-left">
      <button onClick={onExit} data-juice className="juicy ink-chip inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-telemetry cursor-pointer mb-6">
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={3} /> Volver
      </button>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="pop-in inline-block font-hand text-2xl text-[var(--riso-pink)]" style={{ ['--rest' as string]: '-3deg' }}>modo docente</span>
          <h2 className="pop-in font-display text-4xl sm:text-6xl text-[var(--ink)] leading-[0.95]" style={{ ['--i' as string]: 1 }}>
            Abre una <span className="squiggle">sala</span> para tu clase
          </h2>
        </div>
        <p className="pop-in text-sm text-[var(--text-secondary)] max-w-sm" style={{ ['--i' as string]: 2 }}>
          Tus alumnos se unen con un código, resuelven misiones dibujando en su cuaderno y tú ves en vivo quién va bien, quién se traba y en qué error.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Card className="lg:col-span-8 pop-in" title="Nueva sesión">
          <label className="block mb-5">
            <span className="font-telemetry text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Nombre de la sesión</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--surface-secondary)] px-4 py-3 font-heading text-lg text-[var(--ink)] outline-none focus:shadow-[4px_4px_0_var(--riso-pink)] transition-shadow"
              maxLength={40}
              data-testid="session-name"
            />
          </label>

          <div className="mb-5">
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-telemetry text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Misiones (hasta 3, en orden)</span>
              <span className="font-telemetry text-[10px] text-[var(--text-secondary)]">{missionIds.length}/3</span>
            </div>
            <div className="space-y-3">
              {MODULES.map((mod) => (
                <div key={mod.id}>
                  <p className="text-xs font-heading mb-1.5 text-[var(--text-secondary)]">{mod.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {MISSIONS.filter((m) => m.module === mod.id).map((m) => {
                      const idx = missionIds.indexOf(m.id);
                      const on = idx >= 0;
                      return (
                        <button
                          key={m.id}
                          data-juice
                          onClick={() => toggleMission(m.id)}
                          aria-pressed={on}
                          data-testid={`pick-${m.id}`}
                          className="juicy inline-flex items-center gap-2 rounded-full border-2 border-[#211a33] px-3 py-1.5 text-[13px] font-semibold cursor-pointer"
                          style={{
                            background: on ? mod.ink : 'var(--surface)',
                            color: on ? mod.fg : 'var(--text-primary)',
                            boxShadow: on ? '3px 3px 0 var(--hard-shadow)' : 'none',
                          }}
                        >
                          {on ? <span className="grid place-items-center w-5 h-5 rounded-full bg-[#211a33] text-[#fffaf0] text-[10px] font-telemetry">{idx + 1}</span> : null}
                          {m.title}
                          <span className="font-telemetry text-[9px] opacity-70">{'★'.repeat(m.difficulty)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
            <div>
              <span className="font-telemetry text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Duración</span>
              <div className="mt-1.5 flex rounded-full border-[2.5px] border-[var(--ink)] overflow-hidden">
                {[15, 30, 45].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 py-2 text-sm font-heading cursor-pointer transition-colors ${duration === d ? 'bg-[var(--ink)] text-[var(--bg-ground)]' : 'text-[var(--text-primary)]'}`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="font-telemetry text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Alumnos simulados: {classSize}</span>
              <input type="range" min={0} max={40} value={classSize} onChange={(e) => setClassSize(Number(e.target.value))} className="mt-3 w-full accent-[#ff4f9e]" data-testid="class-size" />
              <span className="text-[11px] text-[var(--text-secondary)]">+ los alumnos reales que se unan</span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer mt-5 sm:mt-6">
              <input type="checkbox" checked={hints} onChange={(e) => setHints(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#12a96e]" />
              <span className="text-sm leading-tight">
                Permitir pistas de Lumi
                <span className="block text-[11px] text-[var(--text-secondary)]">Si las apagas, solo recibirán la pregunta socrática.</span>
              </span>
            </label>
          </div>

          <button
            data-juice="big"
            onClick={create}
            disabled={!missionIds.length || busy}
            className="juicy btn-ink px-7 py-3.5 text-lg bg-[var(--riso-yellow)] text-[#211a33] disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="create-session"
          >
            <Sparkles className="w-5 h-5" strokeWidth={2.6} />
            {busy ? 'Creando sala…' : 'Crear sala'}
          </button>
        </Card>

        <Card className="lg:col-span-4 pop-in" title={<span className="flex items-center gap-2"><History className="w-4 h-4" /> Sesiones anteriores</span>}>
          {!history.length && <p className="text-sm text-[var(--text-secondary)]">Aquí aparecerán los reportes de tus clases.</p>}
          <ul className="space-y-2.5">
            {history.map((h) => (
              <HistoryRow key={h.code} h={h} />
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};

const HistoryRow: React.FC<{ h: Session }> = ({ h }) => {
  const st = computeStats(h);
  return (
    <li className="flex items-center gap-2 rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface-secondary)] px-3 py-2">
      <button onClick={() => teacher.openFromHistory(h.code)} className="flex-1 min-w-0 text-left cursor-pointer">
        <p className="font-heading text-sm truncate">{h.config.name}</p>
        <p className="font-telemetry text-[10px] text-[var(--text-secondary)]">
          {new Date(h.createdAtMs).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })} · {st.joined} alumnos · {st.joined ? Math.round((st.solvedAll / st.joined) * 100) : 0}% completó
        </p>
      </button>
      <button onClick={() => teacher.deleteHistory(h.code)} className="p-1.5 text-[var(--text-secondary)] hover:text-[#ff5435] cursor-pointer" aria-label="Borrar sesión">
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );
};

// ============================================================================ creando
const CreatingRoom: React.FC<{ session: Session }> = ({ session }) => {
  const steps = ['Reservando sala en el servidor', 'Generando código de acceso', 'Preparando a Lumi para la clase'];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((v) => Math.min(steps.length - 1, v + 1)), 420);
    return () => window.clearInterval(t);
  }, [steps.length]);
  return (
    <div className="flex-1 grid place-items-center px-4 py-20">
      <div className="ink-card p-8 w-full max-w-md text-left pop-in">
        <p className="font-telemetry text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-2">{session.config.name}</p>
        <h2 className="font-display text-3xl mb-5">Abriendo tu sala…</h2>
        <ul className="space-y-3">
          {steps.map((s, k) => (
            <li key={s} className={`flex items-center gap-3 text-sm transition-opacity ${k <= i ? 'opacity-100' : 'opacity-35'}`}>
              <span className={`grid place-items-center w-6 h-6 rounded-full border-2 border-[#211a33] ${k < i ? 'bg-[#12a96e] text-white' : k === i ? 'bg-[#ffc81f]' : ''}`}>
                {k < i ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : k === i ? <span className="w-2 h-2 rounded-full bg-[#211a33] animate-pulse" /> : null}
              </span>
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// ============================================================================ sala de espera (tipo Meet)
const Lobby: React.FC<{ session: Session }> = ({ session }) => {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const joined = session.students.filter((s) => s.joinedAt !== null);
  const pending = session.students.filter((s) => s.joinedAt === null && s.status === 'connecting').length;
  const url = joinUrl(session.code);
  const copy = async (what: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(what === 'code' ? session.code : url);
    } catch {
      /* portapapeles bloqueado: no pasa nada */
    }
    setCopied(what);
    window.setTimeout(() => setCopied(null), 1400);
  };
  const avgPing = joined.length ? Math.round(joined.reduce((a, s) => a + s.ping, 0) / joined.length) : null;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="font-telemetry text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Sala de espera</p>
          <h2 className="font-display text-3xl sm:text-5xl leading-none">{session.config.name}</h2>
        </div>
        <button onClick={() => teacher.close()} className="juicy ink-chip px-3 py-1.5 text-xs font-telemetry cursor-pointer">Cancelar sala</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Código y QR */}
        <Card className="lg:col-span-5 pop-in">
          <p className="text-sm text-[var(--text-secondary)] mb-2">Pide a tus alumnos que abran PaperLab y toquen <b>«Unirme a una clase»</b>, o que escaneen el QR.</p>
          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-5 mt-4">
            <div className="p-2 rounded-2xl border-[2.5px] border-[#211a33] bg-white shadow-[5px_5px_0_var(--hard-shadow)] rotate-[-2deg]">
              <QR text={url} />
            </div>
            <div className="flex-1 min-w-0 w-full">
              <p className="font-telemetry text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Código de la sala</p>
              <button onClick={() => copy('code')} data-juice className="group mt-1 flex items-center gap-2 cursor-pointer" data-testid="room-code">
                <span className="font-telemetry font-extrabold text-[19px] sm:text-[22px] whitespace-nowrap text-[var(--ink)]">{session.code}</span>
                {copied === 'code' ? <Check className="w-5 h-5 text-[#12a96e]" /> : <Copy className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--ink)]" />}
              </button>
              <button onClick={() => copy('link')} className="mt-2 text-[12px] text-[var(--riso-blue)] underline underline-offset-2 cursor-pointer break-all text-left">
                {copied === 'link' ? '¡Enlace copiado!' : url.replace(/^https?:\/\//, '')}
              </button>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 juicy ink-chip inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-telemetry"
                data-testid="open-student-tab"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Probar como alumno (otra pestaña)
              </a>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t-2 border-dashed border-[var(--ink)]/30 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="font-heading text-xl">{session.config.missionIds.length}</p>
              <p className="font-telemetry text-[9px] uppercase text-[var(--text-secondary)]">misiones</p>
            </div>
            <div>
              <p className="font-heading text-xl flex items-center justify-center gap-1"><Clock className="w-4 h-4" />{session.config.durationMin}′</p>
              <p className="font-telemetry text-[9px] uppercase text-[var(--text-secondary)]">duración</p>
            </div>
            <div>
              <p className="font-heading text-xl flex items-center justify-center gap-1"><Wifi className="w-4 h-4" />{avgPing ?? '—'}</p>
              <p className="font-telemetry text-[9px] uppercase text-[var(--text-secondary)]">ms promedio</p>
            </div>
          </div>
        </Card>

        {/* Alumnos llegando */}
        <Card
          className="lg:col-span-7 pop-in"
          title={
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5" /> En la sala
              <span className="font-telemetry text-sm px-2 py-0.5 rounded-full bg-[var(--riso-pink)] text-[#fffaf0] border-2 border-[#211a33]" data-testid="joined-count">
                {joined.length}
              </span>
            </span>
          }
          right={pending > 0 ? <span className="font-telemetry text-[10px] text-[var(--text-secondary)]">{pending} conectándose…</span> : null}
        >
          {!joined.length && <p className="text-sm text-[var(--text-secondary)] py-6 text-center">Esperando a que entre el primer alumno…</p>}
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1">
            {joined.map((s) => (
              <li key={s.id} className="pop-in flex items-center gap-2 rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface-secondary)] px-2 py-1.5" style={{ ['--r' as string]: '-8deg' }}>
                <Avatar s={s} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold truncate leading-tight">{s.name}</p>
                  <p className="font-telemetry text-[9px] text-[var(--text-secondary)] flex items-center gap-1">
                    {s.device} · {s.ping} ms <PingBars ms={s.ping} />
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-[12px] text-[var(--text-secondary)]">
              <p className="font-heading text-[var(--ink)] text-sm mb-0.5">Misiones de hoy</p>
              {session.config.missionIds.map((id, k) => (
                <p key={id}>{k + 1}. {missionById(id)?.title}</p>
              ))}
            </div>
            <button
              data-juice="big"
              onClick={() => {
                audioJuice.playTap();
                teacher.start();
              }}
              disabled={!joined.length}
              className="juicy btn-ink px-7 py-3.5 text-lg bg-[#12a96e] text-[#fffaf0] disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="start-session"
            >
              <Play className="w-5 h-5" fill="currentColor" /> Iniciar misión
            </button>
          </div>
        </Card>
      </div>

      {/* registro de conexiones */}
      <Card className="mt-6" title="Registro de conexión">
        <ul className="font-telemetry text-[11px] space-y-1 max-h-40 overflow-y-auto">
          {session.feed.slice(0, 30).map((f) => (
            <li key={f.id} className="flex gap-3 text-[var(--text-secondary)]">
              <span className="tabular-nums shrink-0">{fmtSec(f.at)}</span>
              <span className="text-[var(--text-primary)]">{f.text}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

const fmtSec = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export { StatusPill };
