import React from 'react';
import { Sun, Moon, ArrowLeft } from 'lucide-react';
import { Logo } from './Logo';
import { XpChip } from '../game/GameUI';

interface HeaderProps {
  currentModule: string | null;
  onGoHome: () => void;
  onGoSplash: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentModule,
  onGoHome,
  onGoSplash,
  isDarkMode,
  onToggleTheme,
  onOpenProfile,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#f5f0e6]/90 dark:bg-[#070a11]/90 backdrop-blur-md border-b border-[#d8cebd] dark:border-[#212c42] px-4 sm:px-8 py-3 transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onGoSplash}
            className="cursor-pointer hover:opacity-90 transition-opacity"
            title="Inicio PaperLab"
          >
            <Logo size="sm" />
          </button>

          {currentModule && (
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-300 dark:border-slate-800 text-xs font-telemetry">
              <button
                onClick={onGoHome}
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
          <XpChip onOpen={onOpenProfile} />
          {/* Day / Night Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d8cebd] dark:border-[#212c42] bg-white dark:bg-[#0e1422] text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-all text-xs font-telemetry cursor-pointer shadow-xs"
            title={isDarkMode ? "Cambiar a modo día" : "Cambiar a modo noche"}
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
        </div>
      </div>
    </header>
  );
};
