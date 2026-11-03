import React from 'react';
import { Sun, Moon, Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { Logo } from './Logo';
import { audioJuice } from '../utils/audioJuice';

interface HeaderProps {
  currentModule: string | null;
  onGoHome: () => void;
  onGoSplash: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentModule,
  onGoHome,
  onGoSplash,
  isDarkMode,
  onToggleTheme
}) => {
  const [isMuted, setIsMuted] = React.useState(audioJuice.getMuted());

  const handleToggleSound = () => {
    const muted = audioJuice.toggleMute();
    setIsMuted(muted);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#f5f0e6]/90 dark:bg-[#070a11]/90 backdrop-blur-md border-b border-[#d8cebd] dark:border-[#212c42] px-4 sm:px-8 py-3 transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              audioJuice.playTap();
              onGoSplash();
            }}
            className="cursor-pointer hover:opacity-90 transition-opacity"
            title="Inicio PaperLab"
          >
            <Logo size="sm" />
          </button>

          {currentModule && (
            <div className="flex items-center gap-2 pl-3 border-l border-slate-300 dark:border-slate-800 text-xs font-telemetry">
              <button
                onClick={() => {
                  audioJuice.playTap();
                  onGoHome();
                }}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Índice</span>
              </button>
              <span className="text-slate-400">/</span>
              <span className="text-cyan-700 dark:text-cyan-400 font-bold uppercase">
                {currentModule}
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Day / Night Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d8cebd] dark:border-[#212c42] bg-white dark:bg-[#0e1422] text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-all text-xs font-telemetry cursor-pointer shadow-xs"
            title={isDarkMode ? "Cambiar a modo día (estudio papel)" : "Cambiar a modo noche (óptica lab)"}
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Día</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" />
                <span className="hidden sm:inline">Noche</span>
              </>
            )}
          </button>

          {/* Sound Mute Toggle */}
          <button
            onClick={handleToggleSound}
            className="p-1.5 rounded-lg border border-[#d8cebd] dark:border-[#212c42] bg-white dark:bg-[#0e1422] text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 transition-all cursor-pointer shadow-xs"
            title={isMuted ? "Sonido desactivado" : "Sonido activado"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};
