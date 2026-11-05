import React from 'react';
import type { TutorMood } from './types';
import { moodColor } from './moods';

/**
 * Lumi: el tutor holográfico de PaperLab. Una linterna-robot con pantalla por cara.
 * Vectorial (0 KB de imágenes), con 7 expresiones, parpadeo, flotación y boca que habla
 * mientras suena la audio-explicación.
 */
interface Props {
  mood: TutorMood;
  size?: number;
  talking?: boolean;
  className?: string;
  title?: string;
}

const EYE = '#e0fbff';

function Eyes({ mood }: { mood: TutorMood }) {
  const L = 47;
  const R = 73;
  const Y = 52;
  switch (mood) {
    case 'happy':
      return (
        <g className="lumi-blink">
          <ellipse cx={L} cy={Y} rx={6} ry={7.5} fill={EYE} />
          <ellipse cx={R} cy={Y} rx={6} ry={7.5} fill={EYE} />
          <circle cx={L + 2} cy={Y - 3} r={2} fill="#fff" />
          <circle cx={R + 2} cy={Y - 3} r={2} fill="#fff" />
        </g>
      );
    case 'celebrating':
      return (
        <g fill="none" stroke={EYE} strokeWidth={3.6} strokeLinecap="round">
          <path d={`M${L - 7} ${Y + 2} Q${L} ${Y - 8} ${L + 7} ${Y + 2}`} />
          <path d={`M${R - 7} ${Y + 2} Q${R} ${Y - 8} ${R + 7} ${Y + 2}`} />
        </g>
      );
    case 'thinking':
      return (
        <g className="lumi-blink">
          <ellipse cx={L} cy={Y} rx={5.5} ry={6.5} fill={EYE} />
          <ellipse cx={R} cy={Y} rx={5.5} ry={6.5} fill={EYE} />
          <circle cx={L + 2.5} cy={Y - 3} r={2.4} fill="#0b1220" />
          <circle cx={R + 2.5} cy={Y - 3} r={2.4} fill="#0b1220" />
          <path d={`M${R - 7} ${Y - 11} L${R + 7} ${Y - 13}`} stroke={EYE} strokeWidth={2.4} strokeLinecap="round" />
        </g>
      );
    case 'warning':
      return (
        <g>
          <circle cx={L} cy={Y + 1} r={7} fill={EYE} />
          <circle cx={R} cy={Y + 1} r={7} fill={EYE} />
          <circle cx={L} cy={Y + 2} r={3} fill="#0b1220" />
          <circle cx={R} cy={Y + 2} r={3} fill="#0b1220" />
          <g stroke={EYE} strokeWidth={2.6} strokeLinecap="round">
            <path d={`M${L - 8} ${Y - 12} L${L + 6} ${Y - 8}`} />
            <path d={`M${R + 8} ${Y - 12} L${R - 6} ${Y - 8}`} />
          </g>
        </g>
      );
    case 'surprised':
      return (
        <g>
          <circle cx={L} cy={Y} r={8} fill={EYE} />
          <circle cx={R} cy={Y} r={8} fill={EYE} />
          <circle cx={L} cy={Y} r={3.2} fill="#0b1220" />
          <circle cx={R} cy={Y} r={3.2} fill="#0b1220" />
          <g stroke={EYE} strokeWidth={2.4} strokeLinecap="round" fill="none">
            <path d={`M${L - 7} ${Y - 14} Q${L} ${Y - 18} ${L + 7} ${Y - 14}`} />
            <path d={`M${R - 7} ${Y - 14} Q${R} ${Y - 18} ${R + 7} ${Y - 14}`} />
          </g>
        </g>
      );
    case 'curious':
      return (
        <g className="lumi-blink">
          <ellipse cx={L} cy={Y + 1} rx={5.5} ry={6} fill={EYE} />
          <ellipse cx={R} cy={Y - 1} rx={7} ry={8} fill={EYE} />
          <circle cx={L - 2} cy={Y + 1} r={2.2} fill="#0b1220" />
          <circle cx={R - 2} cy={Y - 1} r={2.8} fill="#0b1220" />
          <path d={`M${R - 7} ${Y - 14} Q${R} ${Y - 19} ${R + 8} ${Y - 13}`} stroke={EYE} strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </g>
      );
    case 'sad':
      return (
        <g>
          <ellipse cx={L} cy={Y + 2} rx={5.5} ry={5} fill={EYE} />
          <ellipse cx={R} cy={Y + 2} rx={5.5} ry={5} fill={EYE} />
          <g stroke={EYE} strokeWidth={2.4} strokeLinecap="round">
            <path d={`M${L - 7} ${Y - 6} L${L + 6} ${Y - 9}`} />
            <path d={`M${R + 7} ${Y - 6} L${R - 6} ${Y - 9}`} />
          </g>
          <path d={`M${R + 6} ${Y + 8} q2 5 0 7 q-2 -2 0 -7z`} fill="#7dd3fc" />
        </g>
      );
  }
}

function Mouth({ mood, talking }: { mood: TutorMood; talking: boolean }) {
  const cx = 60;
  const cy = 68;
  if (talking) {
    return <ellipse className="lumi-talk" cx={cx} cy={cy} rx={6} ry={4} fill={EYE} />;
  }
  switch (mood) {
    case 'happy':
      return <path d={`M${cx - 8} ${cy - 2} Q${cx} ${cy + 7} ${cx + 8} ${cy - 2}`} stroke={EYE} strokeWidth={3} fill="none" strokeLinecap="round" />;
    case 'celebrating':
      return <path d={`M${cx - 10} ${cy - 3} Q${cx} ${cy + 11} ${cx + 10} ${cy - 3} Z`} fill={EYE} />;
    case 'thinking':
      return <path d={`M${cx - 6} ${cy + 1} L${cx + 5} ${cy - 1}`} stroke={EYE} strokeWidth={3} strokeLinecap="round" />;
    case 'warning':
      return <path d={`M${cx - 8} ${cy + 3} Q${cx - 4} ${cy - 2} ${cx} ${cy + 2} Q${cx + 4} ${cy + 6} ${cx + 8} ${cy + 1}`} stroke={EYE} strokeWidth={3} fill="none" strokeLinecap="round" />;
    case 'surprised':
      return <ellipse cx={cx} cy={cy + 1} rx={4.5} ry={5.5} fill={EYE} />;
    case 'curious':
      return <path d={`M${cx - 6} ${cy} Q${cx + 1} ${cy + 5} ${cx + 8} ${cy - 3}`} stroke={EYE} strokeWidth={3} fill="none" strokeLinecap="round" />;
    case 'sad':
      return <path d={`M${cx - 7} ${cy + 4} Q${cx} ${cy - 3} ${cx + 7} ${cy + 4}`} stroke={EYE} strokeWidth={3} fill="none" strokeLinecap="round" />;
  }
}

export const LumiAvatar: React.FC<Props> = ({ mood, size = 64, talking = false, className = '', title }) => {
  const c = moodColor(mood);
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const raised = mood === 'celebrating';
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`lumi ${className}`}
      role="img"
      aria-label={title ?? `Lumi, tutor de PaperLab (${mood})`}
      data-mood={mood}
    >
      <defs>
        <linearGradient id={`body-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#cbd5e1" />
        </linearGradient>
        <radialGradient id={`glow-${uid}`}>
          <stop offset="0" stopColor={c} stopOpacity="0.55" />
          <stop offset="1" stopColor={c} stopOpacity="0" />
        </radialGradient>
        <pattern id={`scan-${uid}`} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="1.3" fill="#ffffff" opacity="0.06" />
        </pattern>
      </defs>

      {/* halo holográfico y sombra */}
      <circle cx="60" cy="58" r="56" fill={`url(#glow-${uid})`} className="lumi-halo" />
      <ellipse cx="60" cy="114" rx="22" ry="3.5" fill="#000" opacity="0.25" className="lumi-shadow" />

      <g className="lumi-float">
        {/* antena con bombilla (de ahí su nombre) */}
        <path d="M60 22 Q60 14 64 9" stroke="#94a3b8" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="65" cy="8" r="5.5" fill={c} className="lumi-bulb" />
        <circle cx="66.5" cy="6.5" r="1.8" fill="#fff" opacity="0.8" />

        {/* brazos */}
        <g stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" fill="none">
          {raised ? (
            <>
              <path d="M24 84 Q12 74 10 60" className="lumi-wave-l" />
              <path d="M96 84 Q108 74 110 60" className="lumi-wave-r" />
            </>
          ) : mood === 'thinking' ? (
            <>
              <path d="M24 88 Q14 96 18 104" />
              <path d="M96 86 Q104 80 92 74" />
            </>
          ) : (
            <>
              <path d="M24 88 Q14 96 18 104" />
              <path d="M96 88 Q106 96 102 104" />
            </>
          )}
        </g>

        {/* cuerpo */}
        <rect x="36" y="86" width="48" height="20" rx="10" fill={`url(#body-${uid})`} stroke="#94a3b8" strokeWidth="1.5" />
        <circle cx="60" cy="96" r="4" fill={c} className="lumi-bulb" />

        {/* orejas */}
        <rect x="9" y="44" width="11" height="22" rx="5" fill={c} opacity="0.85" />
        <rect x="100" y="44" width="11" height="22" rx="5" fill={c} opacity="0.85" />

        {/* cabeza */}
        <rect x="17" y="21" width="86" height="68" rx="24" fill={`url(#body-${uid})`} stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="26" y="31" width="68" height="48" rx="17" fill="#0b1220" />
        <rect x="26" y="31" width="68" height="48" rx="17" fill={`url(#scan-${uid})`} />
        <rect x="26" y="31" width="68" height="48" rx="17" fill="none" stroke={c} strokeOpacity="0.55" strokeWidth="1.5" />

        <Eyes mood={mood} />
        <Mouth mood={mood} talking={talking} />

        {(mood === 'happy' || mood === 'celebrating') && (
          <g fill="#fb7185" opacity="0.45">
            <ellipse cx="36" cy="64" rx="4.5" ry="2.8" />
            <ellipse cx="84" cy="64" rx="4.5" ry="2.8" />
          </g>
        )}

        {/* símbolos por estado */}
        {mood === 'warning' && (
          <g className="lumi-pop">
            <path d="M100 6 L114 30 L86 30 Z" fill="#f59e0b" stroke="#0b1220" strokeWidth="1.5" strokeLinejoin="round" />
            <rect x="98.6" y="13" width="2.8" height="9" rx="1.4" fill="#0b1220" />
            <circle cx="100" cy="25.5" r="1.7" fill="#0b1220" />
          </g>
        )}
        {mood === 'thinking' && (
          <g fill="#c4b5fd" className="lumi-dots">
            <circle cx="96" cy="16" r="2.6" />
            <circle cx="104" cy="10" r="3.2" />
            <circle cx="113" cy="4" r="3.8" />
          </g>
        )}
        {mood === 'curious' && (
          <g className="lumi-pop">
            <circle cx="103" cy="14" r="8" fill="#fde047" />
            <rect x="99.5" y="21" width="7" height="5" rx="1.5" fill="#a16207" />
            <path d="M100 13 q3 -5 6 0" stroke="#a16207" strokeWidth="1.5" fill="none" />
          </g>
        )}
        {mood === 'celebrating' && (
          <g className="lumi-sparkle">
            <path d="M14 18 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#facc15" />
            <path d="M104 14 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" fill="#34d399" />
            <circle cx="108" cy="40" r="2.5" fill="#f472b6" />
            <circle cx="10" cy="40" r="2" fill="#22d3ee" />
          </g>
        )}
        {mood === 'surprised' && (
          <g fill="#7dd3fc" className="lumi-pop">
            <rect x="104" y="8" width="3.4" height="14" rx="1.7" />
            <circle cx="105.7" cy="27" r="2" />
          </g>
        )}
      </g>
    </svg>
  );
};
