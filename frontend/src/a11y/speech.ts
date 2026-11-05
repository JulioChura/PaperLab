/**
 * Audio-Explicación STEM con la Web Speech API nativa (window.speechSynthesis): 0 KB de dependencias.
 * - Elige una voz en español (es-PE / es-419 / es-MX / es-ES… la que tenga el dispositivo).
 * - Trocea el texto por frases: Chrome corta las locuciones largas (~15 s) si van en un solo bloque.
 * - Expone un estado global (hablando / no) para que el avatar mueva la boca.
 */
import { useSyncExternalStore } from 'react';

export const speechSupported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

type Listener = () => void;
const listeners = new Set<Listener>();
let speaking = false;
let speakingId: string | null = null;
let session = 0;

const emit = () => listeners.forEach((l) => l());
const setSpeaking = (v: boolean, id: string | null) => {
  speaking = v;
  speakingId = v ? id : null;
  emit();
};

const PREFERRED = ['es-PE', 'es-419', 'es-US', 'es-MX', 'es-CO', 'es-AR', 'es-CL', 'es-ES'];

function pickVoice(): SpeechSynthesisVoice | null {
  if (!speechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  const es = voices.filter((v) => v.lang?.toLowerCase().startsWith('es'));
  for (const lang of PREFERRED) {
    const v = es.find((x) => x.lang.toLowerCase() === lang.toLowerCase() && /google|natural|online/i.test(x.name))
      ?? es.find((x) => x.lang.toLowerCase() === lang.toLowerCase());
    if (v) return v;
  }
  return es[0] ?? null;
}

/** Divide en frases cortas (máx. ~220 caracteres) respetando la puntuación. */
export function chunkText(text: string, max = 220): string[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?¿¡;:])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const s of sentences) {
    if (s.length <= max) {
      out.push(s);
      continue;
    }
    let rest = s;
    while (rest.length > max) {
      const cut = rest.lastIndexOf(',', max) > 40 ? rest.lastIndexOf(',', max) + 1 : rest.lastIndexOf(' ', max);
      out.push(rest.slice(0, cut > 0 ? cut : max).trim());
      rest = rest.slice(cut > 0 ? cut : max).trim();
    }
    if (rest) out.push(rest);
  }
  return out;
}

export interface SpeakOptions {
  /** Identifica quién habla (para que solo ese botón muestre "detener"). */
  id?: string;
  rate?: number;
  onEnd?: () => void;
}

export function speak(text: string, { id = 'default', rate = 0.98, onEnd }: SpeakOptions = {}): boolean {
  if (!speechSupported() || !text.trim()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const mine = ++session;
  const chunks = chunkText(text);
  const voice = pickVoice();
  setSpeaking(true, id);
  chunks.forEach((chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk);
    u.lang = voice?.lang ?? 'es-ES';
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = 1.05;
    const last = i === chunks.length - 1;
    u.onend = () => {
      if (last && mine === session) {
        setSpeaking(false, null);
        onEnd?.();
      }
    };
    u.onerror = () => {
      if (mine === session) setSpeaking(false, null);
    };
    synth.speak(u);
  });
  return true;
}

export function stopSpeaking() {
  if (!speechSupported()) return;
  session++;
  window.speechSynthesis.cancel();
  setSpeaking(false, null);
}

if (speechSupported()) {
  // Algunas plataformas cargan las voces de forma asíncrona
  window.speechSynthesis.addEventListener?.('voiceschanged', () => undefined);
}

const subscribe = (l: Listener) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Estado reactivo de la voz: `speakingId` dice qué botón inició la locución. */
export function useSpeechState(): { speaking: boolean; speakingId: string | null } {
  const isSpeaking = useSyncExternalStore(subscribe, () => speaking, () => false);
  const id = useSyncExternalStore(subscribe, () => speakingId, () => null);
  return { speaking: isSpeaking, speakingId: id };
}
