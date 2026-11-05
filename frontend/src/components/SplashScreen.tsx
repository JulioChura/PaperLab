import React from 'react';
import { ArrowRight, Sun, Moon, Volume2, VolumeX } from 'lucide-react';
import { Logo } from './Logo';
import { audioJuice } from '../utils/audioJuice';
import { LumiAvatar } from '../tutor/LumiAvatar';

interface SplashScreenProps {
  onEnter: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

/** Palabra que entra con gelatina y luego reacciona al hover. */
const Jelly: React.FC<{ i: number; children: React.ReactNode; className?: string }> = ({ i, children, className = '' }) => {
  const [done, setDone] = React.useState(false);
  return (
    <span
      className={`jelly-word ${done ? 'done' : ''} ${className}`}
      style={{ ['--i' as string]: i }}
      onAnimationEnd={() => setDone(true)}
    >
      {children}
    </span>
  );
};

/** Formas de tinta que flotan en el fondo. */
const FloatingShapes: React.FC = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
    <svg className="floaty absolute -left-10 top-28 w-40 h-40 opacity-90 hidden sm:block" style={{ ['--dur' as string]: '9s', ['--fy' as string]: '-20px' }} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="var(--riso-blue)" opacity="0.9" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--ink)" strokeWidth="3" transform="translate(-4 -3)" />
    </svg>
    <svg className="floaty absolute right-[46%] top-24 w-14 h-14 hidden sm:block" style={{ ['--dur' as string]: '6s', ['--rest' as string]: '12deg' }} viewBox="0 0 20 20">
      <path d="M10 1 L12.4 7.6 L19 10 L12.4 12.4 L10 19 L7.6 12.4 L1 10 L7.6 7.6 Z" fill="var(--riso-yellow)" stroke="var(--ink)" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
    <svg className="floaty absolute left-[42%] bottom-24 w-20 h-20 hidden md:block" style={{ ['--dur' as string]: '8s', ['--rest' as string]: '-14deg', ['--fx' as string]: '-10px' }} viewBox="0 0 40 40">
      <path d="M20 4 L36 34 L4 34 Z" fill="var(--riso-pink)" stroke="var(--ink)" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
    <svg className="floaty absolute right-[3%] bottom-36 w-28 h-10 hidden sm:block" style={{ ['--dur' as string]: '7s' }} viewBox="0 0 80 20">
      <path d="M4 10 Q14 0 24 10 T44 10 T64 10 T78 10" fill="none" stroke="var(--riso-green)" strokeWidth="6" strokeLinecap="round" />
    </svg>
    <svg className="spin-slow absolute -right-16 -bottom-16 w-64 h-64 opacity-60 hidden lg:block" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="44" fill="none" stroke="var(--riso-pink)" strokeWidth="2.5" strokeDasharray="2 9" strokeLinecap="round" />
    </svg>
  </div>
);

const Marquee: React.FC = () => {
  const items = ['física', 'circuitos', 'algoritmos', 'geometría', 'lápiz HB', 'cero sensores', 'todo en tu cel'];
  const row = (
    <div className="flex items-center shrink-0">
      {items.map((t, i) => (
        <span key={t} className="flex items-center font-display text-2xl sm:text-3xl px-5 text-[#fffaf0]">
          {t}
          <svg className="w-6 h-6 ml-10" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 1 L12.4 7.6 L19 10 L12.4 12.4 L10 19 L7.6 12.4 L1 10 L7.6 7.6 Z" fill={['#ffc81f', '#ff4f9e', '#12a96e'][i % 3]} stroke="#211a33" strokeWidth="1.5" />
          </svg>
        </span>
      ))}
    </div>
  );
  return (
    <div className="relative z-10 -mx-4 sm:-mx-8 md:-mx-12 border-y-[2.5px] border-[var(--ink)] bg-[#2f4bf0] py-3 overflow-hidden -rotate-1 shadow-[0_5px_0_var(--hard-shadow)]">
      <div className="marquee-track">
        {row}
        {row}
      </div>
    </div>
  );
};

export const SplashScreen: React.FC<SplashScreenProps> = ({ onEnter, isDarkMode, onToggleTheme }) => {
  const [isMuted, setIsMuted] = React.useState(audioJuice.getMuted());

  const handleToggleSound = () => setIsMuted(audioJuice.toggleMute());

  const handleStart = () => {
    audioJuice.playTap();
    // deja respirar el confeti antes de cambiar de vista
    window.setTimeout(onEnter, 220);
  };

  return (
    <div className="riso-grain relative min-h-screen w-full overflow-hidden bg-[var(--bg-ground)] text-[var(--text-primary)] bg-optics-grid flex flex-col justify-between p-4 sm:p-8 md:p-12 transition-colors select-none">
      <FloatingShapes />

      {/* Top bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between pb-4">
        <div className="pop-in" style={{ ['--r' as string]: '-12deg' }}>
          <Logo size="md" />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleTheme}
            data-juice
            className="juicy ink-chip flex items-center gap-2 px-3.5 py-2 text-xs font-telemetry cursor-pointer"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" strokeWidth={2.6} />
                <span className="hidden sm:inline">Día</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-cyan-600" strokeWidth={2.6} />
                <span className="hidden sm:inline">Noche</span>
              </>
            )}
          </button>

          <button
            onClick={handleToggleSound}
            data-juice
            className="juicy ink-chip p-2.5 cursor-pointer"
            title={isMuted ? 'Sonido desactivado' : 'Sonido activado'}
            aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" strokeWidth={2.6} /> : <Volume2 className="w-4 h-4 text-fuchsia-500" strokeWidth={2.6} />}
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 w-full max-w-6xl mx-auto my-auto py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 flex flex-col items-start text-left">
          <span
            className="pop-in inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full border-2 border-[var(--ink)] bg-[var(--riso-green)] text-[#fffaf0] font-telemetry text-[11px] uppercase tracking-wider shadow-[3px_3px_0_var(--hard-shadow)]"
            style={{ ['--r' as string]: '8deg', ['--rest' as string]: '-2deg', transform: 'rotate(-2deg)' }}
          >
            <span className="w-2 h-2 rounded-full bg-[#ffc81f] border border-[#211a33] animate-pulse" />
            WebAR en el celular · sin cables
          </span>

          <h1 className="font-display text-[3.4rem] sm:text-7xl lg:text-[5.6rem] leading-[0.92] text-[var(--ink)] mb-10">
            <Jelly i={0}>Dibuja</Jelly> <Jelly i={1}>con</Jelly> <Jelly i={2}>lápiz.</Jelly>
            <br />
            <Jelly i={3} className="relative mt-1">
              <span className="absolute -inset-x-3 inset-y-1 -z-10 -rotate-2 rounded-[14px] bg-[var(--riso-pink)] border-[2.5px] border-[var(--ink)] shadow-[4px_4px_0_var(--hard-shadow)]" />
              <span className="px-1 text-[#fffaf0]">Mira la física</span>
            </Jelly>
            <br />
            <Jelly i={4}>sobre</Jelly> <Jelly i={5}>tu</Jelly> <Jelly i={6}><span className="squiggle">papel.</span></Jelly>
          </h1>

          <p className="pop-in text-lg sm:text-xl text-[var(--text-secondary)] max-w-xl leading-snug mb-9" style={{ ['--i' as string]: 6, ['--r' as string]: '0deg' }}>
            Haz rampas, circuitos y teoremas a mano en tu cuaderno. La cámara
            reconoce el trazo y le da vida <span className="font-hand text-2xl text-[var(--riso-blue)]">encima del papel</span>, sin sensores caros.
          </p>

          <div className="pop-in" style={{ ['--i' as string]: 8, ['--r' as string]: '-4deg' }}>
          <button
            onClick={handleStart}
            data-juice="big"
            className="juicy btn-ink group px-9 py-4 text-xl bg-[var(--riso-yellow)] text-[#211a33]"
          >
            <span>Abrir el laboratorio</span>
            <span className="grid place-items-center w-9 h-9 rounded-full bg-[#211a33] text-[#ffc81f] transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover:translate-x-1 group-hover:-rotate-12">
              <ArrowRight className="w-5 h-5" strokeWidth={3} />
            </span>
          </button>
          </div>

          {/* Lumi */}
          <div className="pop-in mt-10 flex items-end gap-2 max-w-xl" style={{ ['--i' as string]: 10 }}>
            <div className="wobble-hover shrink-0">
              <LumiAvatar mood="happy" size={72} />
            </div>
            <div className="relative ink-card rounded-[22px] rounded-bl-md px-4 py-3">
              <p className="font-heading text-base text-[var(--ink)] leading-tight">¡Hola! Soy Lumi, tu tutor.</p>
              <p className="text-sm text-[var(--text-secondary)] leading-snug mt-0.5">
                Si te equivocas no te doy la respuesta: te hago una pregunta. 😉
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5 font-telemetry text-[10px]">
                {[
                  ['detecta errores', 'bg-[#ffdcec] text-[#8d164d]'],
                  ['audio-explicación', 'bg-[#dde3ff] text-[#1f2f9c]'],
                  ['misiones y logros', 'bg-[#fff2c2] text-[#7f4d10]'],
                ].map(([t, c], i) => (
                  <span key={t} className={`px-2 py-0.5 rounded-full border-[1.5px] border-[#211a33] ${c}`} style={{ transform: `rotate(${[-2, 1.5, -1][i]}deg)` }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Polaroid del cuaderno */}
        <div className="lg:col-span-5 relative pop-in" style={{ ['--i' as string]: 4, ['--r' as string]: '10deg', ['--rest' as string]: '2.5deg' }}>
          <div className="relative rotate-[2.5deg] transition-transform duration-700 [transition-timing-function:var(--ease-spring)] hover:rotate-[-1deg] hover:scale-[1.02]">
            {/* cinta adhesiva */}
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 -rotate-3 z-20 w-28 h-8 bg-[#ffc81f]/80 border-2 border-[#211a33]/40" />

            <div className="ink-card p-4 pb-5 rounded-[10px]">
              <div className="relative w-full h-64 rounded-md bg-[#fffaf0] bg-notebook-grid border-2 border-[#211a33] overflow-hidden">
                {/* margen rojo del cuaderno */}
                <span className="absolute inset-y-0 left-8 w-0.5 bg-[#ff5435]/50" />
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 260 200" fill="none">
                  {/* rampa a lápiz */}
                  <path d="M24 168 L206 62 L206 168 Z" stroke="#433a4f" strokeWidth="2.6" strokeLinejoin="round" strokeDasharray="5 3" />
                  <path d="M180 168 A 26 26 0 0 0 178 152" stroke="#433a4f" strokeWidth="2" />
                  <text x="150" y="160" fill="#433a4f" fontSize="15" fontFamily="Gochi Hand">θ=30°</text>

                  {/* bola aumentada rodando */}
                  <g>
                    <circle r="11" fill="#2f4bf0" stroke="#211a33" strokeWidth="2.6">
                      <animateMotion dur="2.6s" repeatCount="indefinite" path="M196 56 L44 145" keyPoints="0;1" keyTimes="0;1" keySplines="0.55 0 1 0.6" calcMode="spline" />
                    </circle>
                  </g>
                  {/* vector velocidad */}
                  <g>
                    <path d="M0 0 L-46 27" stroke="#ff4f9e" strokeWidth="4" strokeLinecap="round" />
                    <path d="M-46 27 L-34 27 M-46 27 L-40 17" stroke="#ff4f9e" strokeWidth="4" strokeLinecap="round" />
                    <animateMotion dur="2.6s" repeatCount="indefinite" path="M190 50 L38 139" keyPoints="0;1" keyTimes="0;1" keySplines="0.55 0 1 0.6" calcMode="spline" />
                  </g>
                  <text x="36" y="66" fill="#ff4f9e" fontSize="18" fontFamily="Gochi Hand">v = 3.2 m/s</text>
                  <path d="M60 72 Q70 92 88 96" stroke="#ff4f9e" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 4" />
                </svg>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="font-hand text-2xl text-[var(--ink)]">plano inclinado ✏️</span>
                <span className="font-telemetry text-[10px] px-2 py-1 rounded-full bg-[#12a96e] text-[#fffaf0] border-2 border-[#211a33]">trazo ok</span>
              </div>
            </div>

            {/* sticker estallido */}
            <div className="absolute -top-8 -right-6 z-30 w-24 h-24 rotate-12 wobble-hover" style={{ ['--rest' as string]: '12deg' }}>
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full spin-slow">
                <path
                  d="M50 2 L58 18 L75 8 L76 27 L95 26 L86 43 L100 52 L84 62 L92 80 L73 78 L70 97 L56 85 L44 99 L38 81 L20 90 L22 71 L3 66 L16 52 L4 36 L23 32 L22 13 L40 20 Z"
                  fill="#ff4f9e"
                  stroke="#211a33"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="absolute inset-0 grid place-items-center font-display text-[#fffaf0] text-lg leading-[0.9] text-center">
                ¡en
                <br />
                vivo!
              </span>
            </div>
          </div>
        </div>
      </main>

      <Marquee />

      <footer className="relative z-10 w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between font-telemetry text-[10px] uppercase tracking-wider text-[var(--text-secondary)] pt-6 gap-2">
        <span>motor webar offline · privacidad 100% local</span>
        <span>paperlab · hecho a lápiz</span>
      </footer>
    </div>
  );
};
