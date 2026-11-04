import React from 'react';
import { ArrowRight, Sun, Moon, Volume2, VolumeX } from 'lucide-react';
import { Logo } from './Logo';
import { audioJuice } from '../utils/audioJuice';

interface SplashScreenProps {
  onEnter: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onEnter, 
  isDarkMode, 
  onToggleTheme 
}) => {
  const [isMuted, setIsMuted] = React.useState(audioJuice.getMuted());

  const handleToggleSound = () => {
    const muted = audioJuice.toggleMute();
    setIsMuted(muted);
  };

  const handleStart = () => {
    audioJuice.playTap();
    onEnter();
  };

  return (
    <div className="relative min-h-screen w-full bg-[#f5f0e6] dark:bg-[#070a11] text-[#14171f] dark:text-[#f8fafc] bg-optics-grid flex flex-col justify-between p-4 sm:p-8 md:p-12 transition-colors select-none">
      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between pb-6 border-b border-[#d8cebd] dark:border-[#212c42]">
        <Logo size="md" />

        <div className="flex items-center gap-3">
          {/* Day / Night Theme Button */}
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[#d8cebd] dark:border-[#212c42] bg-white dark:bg-[#0e1422] text-xs font-telemetry hover:border-slate-400 dark:hover:border-slate-500 transition-all cursor-pointer shadow-xs"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Modo Día</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" />
                <span className="hidden sm:inline">Modo Noche</span>
              </>
            )}
          </button>

          <button
            onClick={handleToggleSound}
            className="p-2 rounded-lg border border-[#d8cebd] dark:border-[#212c42] bg-white dark:bg-[#0e1422] hover:border-slate-400 dark:hover:border-slate-500 transition-all cursor-pointer shadow-xs"
            title={isMuted ? "Sonido desactivado" : "Sonido activado"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
          </button>
        </div>
      </header>

      {/* Main Hero: Architectural Split Layout */}
      <main className="w-full max-w-6xl mx-auto my-auto py-8 sm:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Column: Bold Typography & Manifesto */}
        <div className="lg:col-span-7 flex flex-col items-start text-left">
          <div className="inline-flex items-center gap-2 text-xs font-telemetry text-cyan-700 dark:text-cyan-400 uppercase tracking-widest mb-4">
            <span className="w-2 h-2 rounded-full bg-cyan-600 dark:bg-cyan-400 animate-pulse" />
            <span>WebAR 100% en el celular • Cero pantallas pasivas</span>
          </div>

          <h1 className="font-display font-black text-5xl sm:text-7xl lg:text-8xl leading-[0.95] tracking-tight text-slate-900 dark:text-white mb-6">
            Dibuja con lápiz. <br />
            <span className="text-cyan-700 dark:text-cyan-400">Mira la física</span> <br />
            sobre tu papel.
          </h1>

          <p className="text-base sm:text-xl text-slate-700 dark:text-slate-300 max-w-xl font-normal leading-relaxed mb-8">
            El alumno dibuja circuitos, planos inclinados y teoremas a mano en su cuaderno escolar. La cámara de su móvil reconoce los trazos y superpone el comportamiento real sin cables ni sensores caros.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
            <button
              onClick={handleStart}
              className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-slate-950 font-display font-black text-base tracking-wide transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              <span>Abrir Laboratorio</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Optical Reticle Preview */}
        <div className="lg:col-span-5 relative">
          <div className="relative rounded-2xl border border-[#d8cebd] dark:border-[#212c42] bg-white dark:bg-[#0e1422] p-6 shadow-xl overflow-hidden text-left">
            {/* Holographic Laser Line */}
            <div className="absolute left-0 right-0 h-0.5 bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_12px_#00f0ff] z-20 pointer-events-none animate-laser" />

            {/* Corner Framing Marks */}
            <div className="flex justify-between text-[11px] font-telemetry text-slate-400 dark:text-slate-500 mb-4">
              <span>PAPEL FÍSICO</span>
              <span>ESTADO: LISTO</span>
            </div>

            {/* Visual Diagram Preview: Notebook Paper under AR */}
            <div className="relative w-full h-56 rounded-xl bg-[#faf7ee] dark:bg-[#090d16] bg-notebook-grid border border-slate-300 dark:border-slate-800 p-4 flex flex-col justify-between overflow-hidden">
              <div className="text-[10px] font-telemetry text-slate-500">
                // DETECCIÓN ÓPTICA DE GRAFITO
              </div>

              {/* Hand-drawn Ramp with Live AR Vector Projection */}
              <svg className="w-full h-32" viewBox="0 0 240 120" fill="none">
                {/* Pencil Drawn Ramp */}
                <path d="M 20 100 L 180 30 L 180 100 Z" stroke="#64748b" strokeWidth="2.5" strokeDasharray="4 2" fill="none" />
                <text x="140" y="94" fill="#94a3b8" fontSize="10" fontFamily="DM Mono">θ = 30°</text>

                {/* Augmented Ball with dynamic velocity arrow */}
                <circle cx="100" cy="65" r="9" className="fill-cyan-500 dark:fill-cyan-400" />
                <line x1="100" y1="65" x2="65" y2="80" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                <text x="50" y="98" fill="#f59e0b" fontSize="10" fontFamily="DM Mono" fontWeight="bold">v = 3.2 m/s</text>
              </svg>

              <div className="flex items-center justify-between text-[10px] font-telemetry text-cyan-700 dark:text-cyan-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Trazo Reconocido</span>
                </span>
                <span>WebAR Activo</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs font-telemetry text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span>4 Áreas de Simulación</span>
              <span className="text-slate-900 dark:text-white font-bold">Lápiz B2/HB</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs font-telemetry text-slate-500 dark:text-slate-400 pt-6 border-t border-[#d8cebd] dark:border-[#212c42] gap-2">
        <span>MOTOR WEBAR OFFLINE • PRIVACIDAD 100% LOCAL</span>
        <span>PAPERLAB EXPERIMENTAL OPTICS</span>
      </footer>
    </div>
  );
};
