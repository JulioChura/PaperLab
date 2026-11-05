import type { TutorMood } from './types';

const MOOD_COLOR: Record<TutorMood, string> = {
  happy: '#22d3ee',
  thinking: '#a78bfa',
  warning: '#f59e0b',
  surprised: '#38bdf8',
  celebrating: '#34d399',
  curious: '#facc15',
  sad: '#94a3b8',
};

export const moodColor = (m: TutorMood) => MOOD_COLOR[m];
