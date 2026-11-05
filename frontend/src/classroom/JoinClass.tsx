import React, { useEffect, useState } from 'react';
import { Check, Clock, DoorOpen, LogOut, Radio, Target, Users, X } from 'lucide-react';
import { classLink, useClassLink } from './studentLink';
import { CODE_RE, normalizeCode } from './sim';
import { missionById } from '../game/missions';
import { audioJuice } from '../utils/audioJuice';

const NAME_KEY = 'paperlab-student-name';

export const JoinClassModal: React.FC<{ initialCode?: string; onClose: () => void; onJoined: (module: string) => void }> = ({ initialCode = '', onClose, onJoined }) => {
  const link = useClassLink();
  const [code, setCode] = useState(normalizeCode(initialCode));
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    if (link.step === 'joined' && link.session) {
      const m = missionById(link.session.missionIds[link.missionIdx] ?? link.session.missionIds[0]);
      const t = window.setTimeout(() => onJoined(m?.module ?? 'physics'), 900);
      return () => window.clearTimeout(t);
    }
  }, [link.step, link.session, link.missionIdx, onJoined]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      localStorage.setItem(NAME_KEY, name.trim());
    } catch {
      /* opcional */
    }
    audioJuice.playTap();
    void classLink.join(code, name.trim());
  };

  const busy = link.step === 'searching' || link.step === 'handshake';
  const ok = CODE_RE.test(code) && name.trim().length >= 2;

  const STEPS = [
    { id: 'searching', label: 'Buscando la sala' },
    { id: 'handshake', label: `Conectando${link.ping ? ` · ${link.ping} ms` : ''}` },
    { id: 'joined', label: '¡Dentro de la clase!' },
  ] as const;
  const stepIdx = STEPS.findIndex((s) => s.id === link.step);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="join-title">
      <button
        className="absolute inset-0 bg-[#211a33]/50 backdrop-blur-[2px] cursor-default"
        onClick={() => {
          if (!busy) {
            classLink.reset();
            onClose();
          }
        }}
        aria-label="Cerrar"
      />
      <div className="relative w-full max-w-md ink-card p-6 text-left pop-in" style={{ ['--r' as string]: '-4deg' }}>
        <button onClick={() => { classLink.reset(); onClose(); }} className="absolute top-4 right-4 p-1 cursor-pointer" aria-label="Cerrar" disabled={busy}>
          <X className="w-5 h-5" />
        </button>
        <span className="grid place-items-center w-12 h-12 rounded-2xl bg-[#ff4f9e] border-[2.5px] border-[#211a33] -rotate-6 shadow-[3px_3px_0_#211a33] mb-3">
          <DoorOpen className="w-6 h-6 text-[#fffaf0]" strokeWidth={2.6} />
        </span>
        <h2 id="join-title" className="font-display text-3xl leading-none mb-1">Unirme a una clase</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-5">Escribe el código que te dio tu profe (como en Meet).</p>

        {link.step === 'idle' || link.step === 'error' ? (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="font-telemetry text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Código de la sala</span>
              <input
                value={code}
                onChange={(e) => setCode(normalizeCode(e.target.value))}
                placeholder="abc-defg-hij"
                autoFocus={!initialCode}
                inputMode="text"
                autoCapitalize="none"
                spellCheck={false}
                className="mt-1.5 w-full rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--surface-secondary)] px-4 py-3 font-telemetry text-xl tracking-wider text-[var(--ink)] outline-none focus:shadow-[4px_4px_0_var(--riso-pink)]"
                data-testid="join-code"
              />
            </label>
            <label className="block">
              <span className="font-telemetry text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">Tu nombre</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre y apellido"
                autoFocus={!!initialCode}
                maxLength={32}
                className="mt-1.5 w-full rounded-2xl border-[2.5px] border-[var(--ink)] bg-[var(--surface-secondary)] px-4 py-3 text-lg text-[var(--ink)] outline-none focus:shadow-[4px_4px_0_var(--riso-pink)]"
                data-testid="join-name"
              />
            </label>

            {link.step === 'error' && (
              <div className="rounded-2xl border-2 border-[#211a33] bg-[#ffe0d9] text-[#7a1d0b] px-4 py-3 text-sm" role="alert" data-testid="join-error">
                {link.error === 'format' && 'El código tiene 10 letras con el formato abc-defg-hij.'}
                {link.error === 'ended' && 'Esa sesión ya terminó. Pídele a tu profe un código nuevo.'}
                {(link.error === 'not_found' || link.error === 'network') && (
                  <>
                    <b>No encontramos esa sala.</b> Revisa el código o que tu profe la tenga abierta.
                    <span className="block text-[12px] mt-1 opacity-80">
                      Prototipo: la sincronización entre dispositivos se simula; solo conecta pestañas del mismo navegador.
                    </span>
                    <button
                      type="button"
                      onClick={() => name.trim() && void classLink.joinDemo(name.trim())}
                      className="mt-2 juicy ink-chip px-3 py-1.5 text-[11px] font-telemetry cursor-pointer text-[#211a33]"
                      data-testid="join-demo"
                    >
                      Entrar a la sala de demostración
                    </button>
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              data-juice="big"
              disabled={!ok}
              className="w-full juicy btn-ink px-6 py-3.5 text-lg bg-[var(--riso-yellow)] text-[#211a33] disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="join-submit"
            >
              Unirme
            </button>
          </form>
        ) : (
          <ol className="space-y-3 py-2" aria-live="polite">
            {STEPS.map((s, k) => (
              <li key={s.id} className={`flex items-center gap-3 transition-opacity ${k <= stepIdx ? 'opacity-100' : 'opacity-35'}`}>
                <span className={`grid place-items-center w-7 h-7 rounded-full border-2 border-[#211a33] ${k < stepIdx || link.step === 'joined' ? 'bg-[#12a96e] text-white' : k === stepIdx ? 'bg-[#ffc81f]' : ''}`}>
                  {k < stepIdx || link.step === 'joined' ? <Check className="w-4 h-4" strokeWidth={3} /> : k === stepIdx ? <Radio className="w-3.5 h-3.5 text-[#211a33] animate-pulse" /> : null}
                </span>
                <span className="font-heading">{s.label}</span>
              </li>
            ))}
            {link.step === 'joined' && link.session && (
              <li className="pt-3 mt-2 border-t-2 border-dashed border-[var(--ink)]/30 pop-in">
                <p className="font-heading text-lg">{link.session.name}</p>
                <p className="text-sm text-[var(--text-secondary)]">{link.session.teacher} · {link.session.missionIds.length} misiones</p>
              </li>
            )}
          </ol>
        )}
      </div>
    </div>
  );
};

/** Franja con la clase activa (en el menú y en la cámara). */
export const ClassBanner: React.FC = () => {
  const link = useClassLink();
  const [, force] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => force((v) => v + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  if (link.step !== 'joined' || !link.session) return null;
  const s = link.session;
  const m = missionById(s.missionIds[link.missionIdx]);
  const now = Date.now();
  const left =
    s.remainingSec != null && s.receivedAtMs
      ? Math.max(0, s.remainingSec - ((now - s.receivedAtMs) / 1000) * (s.status === 'live' ? s.speed ?? 1 : 0))
      : s.startedAtMs
        ? Math.max(0, s.durationMin * 60 - (now - s.startedAtMs) / 1000)
        : null;
  const done = link.missionIdx >= s.missionIds.length;
  return (
    <div className="w-full bg-[#211a33] text-[#fffaf0] border-b-[2.5px] border-[#211a33] px-4 sm:px-8 py-2" data-testid="class-banner">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
        <span className="flex items-center gap-1.5 font-heading">
          <span className="w-2 h-2 rounded-full bg-[#ff4f9e] animate-pulse" />
          <Users className="w-4 h-4" /> {s.name}
        </span>
        {s.status === 'lobby' ? (
          <span className="text-[#ffd84f]">Esperando a que tu profe inicie la misión…</span>
        ) : s.status === 'ended' ? (
          <span className="text-[#9eeac6]">La sesión terminó</span>
        ) : done ? (
          <span className="text-[#9eeac6] flex items-center gap-1"><Check className="w-4 h-4" /> ¡Completaste las {s.missionIds.length} misiones!</span>
        ) : (
          <span className="flex items-center gap-1.5 min-w-0">
            <Target className="w-4 h-4 text-[#ff8dc2] shrink-0" />
            <span className="truncate">Misión {link.missionIdx + 1}/{s.missionIds.length}: <b>{m?.title}</b></span>
          </span>
        )}
        <span className="ml-auto flex items-center gap-3 font-telemetry text-[10.5px]">
          {left !== null && s.status !== 'ended' && (
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{String(Math.floor(left / 60)).padStart(2, '0')}:{String(Math.floor(left % 60)).padStart(2, '0')}</span>
          )}
          {s.demo && <span className="px-1.5 rounded bg-[#ffc81f] text-[#211a33]">DEMO</span>}
          <button onClick={() => classLink.leave()} className="flex items-center gap-1 hover:text-[#ff8dc2] cursor-pointer" data-testid="leave-class">
            <LogOut className="w-3.5 h-3.5" /> Salir
          </button>
        </span>
      </div>
    </div>
  );
};
