import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

/**
 * Sticker de PaperLab: una hoja con la esquina doblada que "mira" con un ojo
 * de cámara. Hover = tambaleo de sticker mal pegado.
 */
export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const sizeMap = {
    sm: { icon: 34, text: 'text-xl', sub: 'text-[8px]' },
    md: { icon: 44, text: 'text-[28px]', sub: 'text-[9px]' },
    lg: { icon: 60, text: 'text-5xl', sub: 'text-xs' },
  };
  const { icon, text, sub } = sizeMap[size];

  return (
    <div className={`group inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className="shrink-0 wobble-hover"
        style={{ ['--rest' as string]: '-8deg', transform: 'rotate(-8deg)' }}
      >
        {/* sombra dura */}
        <path d="M9 7 H31 L41 17 V41 H9 Z" transform="translate(3 3)" fill="var(--hard-shadow)" />
        {/* hoja */}
        <path d="M9 7 H31 L41 17 V41 H9 Z" fill="#ffc81f" stroke="#211a33" strokeWidth="2.8" strokeLinejoin="round" />
        {/* esquina doblada */}
        <path d="M31 7 V17 H41 Z" fill="#ff4f9e" stroke="#211a33" strokeWidth="2.8" strokeLinejoin="round" />
        {/* renglones */}
        <path d="M14 34 H34" stroke="#211a33" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
        {/* ojo-lente */}
        <ellipse cx="22" cy="24" rx="9" ry="7" fill="#fffaf0" stroke="#211a33" strokeWidth="2.6" />
        <circle cx="23" cy="24" r="4" fill="#2f4bf0" stroke="#211a33" strokeWidth="2" className="origin-center transition-transform duration-500 group-hover:translate-x-[2px]" />
        <circle cx="24.4" cy="22.6" r="1.3" fill="#fffaf0" />
      </svg>

      {showText && (
        <div className="flex flex-col text-left">
          <span className={`font-display leading-[0.85] text-[var(--ink)] ${text}`}>
            Paper<span className="text-[var(--riso-pink)]">Lab</span>
          </span>
          <span className={`font-telemetry tracking-[0.2em] uppercase text-[var(--text-secondary)] mt-1 leading-none ${sub}`}>
            papel aumentado
          </span>
        </div>
      )}
    </div>
  );
};
