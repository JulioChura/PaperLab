/** Lámina de expresiones de Lumi (la usa `scripts/export-examples.mjs`; no forma parte de la app). */
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { LumiAvatar } from './LumiAvatar';
import type { TutorMood } from './types';

export const MOODS: { mood: TutorMood; label: string }[] = [
  { mood: 'happy', label: 'Feliz' },
  { mood: 'thinking', label: 'Pensando' },
  { mood: 'warning', label: '¡Cuidado!' },
  { mood: 'surprised', label: 'Sorprendido' },
  { mood: 'celebrating', label: '¡Misión cumplida!' },
  { mood: 'curious', label: 'Dato curioso' },
  { mood: 'sad', label: 'No pude leerlo' },
];

export function renderSheet(host: HTMLElement) {
  const root = createRoot(host);
  flushSync(() =>
    root.render(
      <div id="sheet" style={{ display: 'flex', gap: 28, padding: 32, background: '#070a11', color: '#e2e8f0', font: '600 15px system-ui', width: 'max-content' }}>
        {MOODS.map(({ mood, label }) => (
          <div key={mood} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <LumiAvatar mood={mood} size={150} />
            <span>{label}</span>
          </div>
        ))}
      </div>,
    ),
  );
}
