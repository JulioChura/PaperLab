import React, { useEffect, useState } from 'react';
import { HelpCircle, Lightbulb, Sparkles, Square, Volume2, X } from 'lucide-react';
import { LumiAvatar } from './LumiAvatar';
import { moodColor } from './moods';
import type { TutorMessage } from './types';
import { speak, speechSupported, stopSpeaking, useSpeechState } from '../a11y/speech';
import { humanize } from '../a11y/narration';
import { randomFunFact } from './knowledge';
import { progress } from '../game/progress';

interface Props {
  message: TutorMessage;
  module: string;
  /** 'ar' = arriba a la izquierda (deja libre el panel de la simulación). */
  placement: 'live' | 'ar';
  autoSpeak?: boolean;
  dockRef?: React.Ref<HTMLDivElement>;
}

const TONE_BORDER: Record<TutorMessage['tone'], string> = {
  neutral: 'border-cyan-400/40',
  error: 'border-amber-400/70',
  success: 'border-emerald-400/70',
  mission: 'border-fuchsia-400/60',
};

/**
 * Lumi siempre está ahí: un avatar flotante que comenta lo que pasa (consejos, errores, misiones)
 * y responde con un dato curioso cuando el alumno lo pide.
 */
export const TutorDock: React.FC<Props> = ({ message, module, placement, autoSpeak = false, dockRef }) => {
  const [open, setOpen] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [fact, setFact] = useState<string | null>(null);
  const { speaking, speakingId } = useSpeechState();
  const talking = speaking && speakingId === 'tutor';
  const [prevKey, setPrevKey] = useState(message.key);

  // Mensaje nuevo: se reabre el globo y se reinicia su estado (ajuste de estado durante el render)
  if (prevKey !== message.key) {
    setPrevKey(message.key);
    setOpen(true);
    setShowHint(false);
    setFact(null);
  }

  const spoken = [message.title, message.text, message.question].filter(Boolean).join('. ');

  useEffect(() => {
    if (autoSpeak && speechSupported() && message.tone !== 'neutral') speak(humanize(spoken), { id: 'tutor' });
    // solo al cambiar de mensaje
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.key]);

  useEffect(() => () => stopSpeaking(), []);

  const toggleSpeak = () => {
    if (talking) return stopSpeaking();
    const text = fact ? `Dato curioso. ${fact}` : spoken + (showHint && message.hint ? `. Pista: ${message.hint}` : '');
    if (speak(humanize(text), { id: 'tutor' })) progress.recordNarration();
  };

  const showFact = () => {
    const next = fact ? randomFunFact(module, Date.now()) : message.funFact ?? randomFunFact(module, Date.now());
    setFact(next === fact ? randomFunFact(module, Date.now() + 7) : next);
    progress.recordFunFact();
  };

  const color = moodColor(message.mood);
  const pos = placement === 'ar' ? 'top-[6.75rem] left-3 sm:top-28 sm:left-4' : 'bottom-24 left-3 sm:left-5';

  return (
    <div ref={dockRef} className={`absolute ${pos} z-30 flex items-end gap-2 max-w-[calc(100%-1.5rem)] pointer-events-none`} data-testid="tutor-dock">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto shrink-0 rounded-full p-0.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        style={{ background: `radial-gradient(circle, ${color}33, transparent 70%)` }}
        aria-label={open ? 'Ocultar el mensaje de Lumi' : 'Mostrar el mensaje de Lumi'}
        aria-expanded={open}
      >
        <LumiAvatar mood={message.mood} talking={talking} size={placement === 'ar' ? 60 : 72} />
      </button>

      {open && (
        <div
          key={message.key}
          role="status"
          aria-live="polite"
          className={`pointer-events-auto animate-bubble-in relative w-[min(19rem,calc(100vw-6.5rem))] rounded-2xl rounded-bl-md bg-slate-950/90 border ${TONE_BORDER[message.tone]} backdrop-blur-xl shadow-2xl text-white p-3`}
          data-testid="tutor-bubble"
          data-tone={message.tone}
        >
          <div className="flex items-start gap-2 mb-1">
            <p className="flex-1 font-display font-bold text-sm leading-tight" style={{ color: message.tone === 'error' ? '#fbbf24' : '#fff' }}>
              {message.title}
            </p>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white cursor-pointer -mt-0.5" aria-label="Cerrar mensaje">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {fact ? (
            <p className="text-[12px] leading-snug text-slate-200 max-h-36 overflow-y-auto" data-testid="tutor-fact">
              <Sparkles className="inline w-3.5 h-3.5 mr-1 text-yellow-300 -mt-0.5" />
              {fact}
            </p>
          ) : (
            <div className="max-h-44 overflow-y-auto space-y-1.5">
              <p className="text-[12px] leading-snug text-slate-200" data-testid="tutor-text">{message.text}</p>
              {message.question && (
                <p
                  className="text-[12px] leading-snug font-semibold rounded-lg px-2 py-1.5 bg-white/5 border border-white/10"
                  style={{ color: message.tone === 'error' ? '#fde68a' : '#a5f3fc' }}
                  data-testid="tutor-question"
                >
                  <HelpCircle className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                  {message.question}
                </p>
              )}
              {showHint && message.hint && (
                <p className="text-[11px] leading-snug text-emerald-200" data-testid="tutor-hint">
                  <Lightbulb className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                  {message.hint}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 mt-2.5 font-telemetry text-[10.5px]">
            {speechSupported() && (
              <button
                onClick={toggleSpeak}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-600 hover:border-cyan-300 text-slate-200 cursor-pointer"
                aria-label={talking ? 'Detener la lectura en voz alta' : 'Leer el mensaje en voz alta'}
              >
                {talking ? <Square className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                {talking ? 'Detener' : 'Escuchar'}
              </button>
            )}
            {message.hint && !fact && (
              <button
                onClick={() => {
                  if (!showHint) progress.recordHint();
                  setShowHint((v) => !v);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-600 hover:border-emerald-300 text-slate-200 cursor-pointer"
                aria-expanded={showHint}
              >
                <Lightbulb className="w-3 h-3" /> {showHint ? 'Ocultar pista' : 'Pista'}
              </button>
            )}
            <button
              onClick={showFact}
              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-600 hover:border-yellow-300 text-slate-200 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" /> {fact ? 'Otro dato' : 'Dato curioso'}
            </button>
            {fact && (
              <button onClick={() => setFact(null)} className="px-2 py-1 rounded-lg border border-slate-600 hover:border-slate-300 text-slate-300 cursor-pointer">
                Volver
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
