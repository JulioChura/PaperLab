import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  showText = true,
  className = '' 
}) => {
  const sizeMap = {
    sm: { icon: 26, text: 'text-lg', sub: 'text-[9px]' },
    md: { icon: 34, text: 'text-2xl', sub: 'text-[10px]' },
    lg: { icon: 46, text: 'text-4xl', sub: 'text-xs' }
  };

  const { icon, text, sub } = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Precision Geometric Logo Mark: Folded Paper Plane + Optic Aperture */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform hover:scale-105"
      >
        {/* Outer Hexagonal Framing Caliper */}
        <polygon
          points="22,3 39,13 39,31 22,41 5,31 5,13"
          className="stroke-slate-300 dark:stroke-slate-700/80 fill-slate-100/50 dark:fill-slate-900/60"
          strokeWidth="1.5"
        />

        {/* Isometric Folded Paper Geometry */}
        <polygon
          points="22,6 36,14 22,23 8,14"
          className="fill-cyan-500/15 dark:fill-cyan-400/20 stroke-cyan-600 dark:stroke-cyan-400"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <polygon
          points="8,14 22,23 22,38 8,30"
          className="fill-slate-200/80 dark:fill-slate-800/80 stroke-slate-400 dark:stroke-slate-600"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <polygon
          points="22,23 36,14 36,30 22,38"
          className="fill-slate-300/60 dark:fill-slate-700/60 stroke-slate-400 dark:stroke-slate-600"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        {/* Optical Sensor Aperture */}
        <circle
          cx="22"
          cy="23"
          r="5.5"
          className="fill-white dark:fill-slate-950 stroke-cyan-600 dark:stroke-cyan-400"
          strokeWidth="1.8"
        />
        <circle
          cx="22"
          cy="23"
          r="2"
          className="fill-cyan-600 dark:fill-cyan-400"
        />
      </svg>

      {/* Distinctive Typography */}
      {showText && (
        <div className="flex flex-col text-left">
          <span className={`font-display font-black tracking-tight leading-none text-slate-900 dark:text-white ${text}`}>
            Paper<span className="text-cyan-600 dark:text-cyan-400">Lab</span>
          </span>
          <span className={`font-telemetry tracking-widest uppercase text-slate-500 dark:text-slate-400 mt-1 leading-none ${sub}`}>
            Augmented Paper
          </span>
        </div>
      )}
    </div>
  );
};
