import React from 'react';
import { Sun, Moon, ArrowLeft, DoorOpen, GraduationCap } from 'lucide-react';
import { Logo } from './Logo';
import { XpChip } from '../game/GameUI';

interface HeaderProps {
  currentModule: string | null;
  onGoHome: () => void;
  onGoSplash: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenProfile: () => void;
  teacherMode?: boolean;
  inClass?: boolean;
  onJoinClass?: () => void;
  onTeacher?: () => void;
}

const MODULE_LABEL: Record<string, { label: string; ink: string }> = {
  physics: { label: 'Física', ink: '#2f4bf0' },
  circuits: { label: 'Circuitos', ink: '#ffc81f' },
  flowcharts: { label: 'Algoritmos', ink: '#12a96e' },
  math: { label: 'Matemáticas', ink: '#ff4f9e' },
};

export const Header: React.FC<HeaderProps> = ({
  currentModule,
  onGoHome,
  onGoSplash,
  isDarkMode,
  onToggleTheme,
  onOpenProfile,
  teacherMode,
  inClass,
  onJoinClass,
}) => {
  const mod = currentModule ? MODULE_LABEL[currentModule] : null;
  const darkText = currentModule === 'circuits';

  return (
    <header className="sticky top-0 z-40 w-full bg-[var(--bg-ground)]/90 backdrop-blur-md border-b-[2.5px] border-[var(--ink)] px-4 sm:px-8 py-2.5 transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onGoSplash} className="cursor-pointer" title="Inicio PaperLab">
            <Logo size="sm" />
          </button>

          {currentModule && (
            <div className="hidden sm:flex items-center gap-2 pl-3 text-xs font-telemetry">
              <button
                onClick={onGoHome}
                data-juice
                className="juicy ink-chip flex items-center gap-1.5 px-3 py-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={3} />
                <span>Índice</span>
              </button>
              <span
                className="px-3 py-1.5 rounded-full border-2 border-[#211a33] font-bold uppercase -rotate-2 shadow-[2.5px_2.5px_0_var(--hard-shadow)] pop-in"
                style={{
                  background: mod?.ink ?? 'var(--riso-blue)',
                  color: darkText ? '#211a33' : '#fffaf0',
                  ['--rest' as string]: '-2deg',
                }}
              >
                {mod?.label ?? currentModule}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {teacherMode ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-telemetry rounded-full border-2 border-[#211a33] bg-[#12a96e] text-[#fffaf0] shadow-[2.5px_2.5px_0_var(--hard-shadow)]" data-testid="teacher-badge">
              <GraduationCap className="w-4 h-4" strokeWidth={2.6} /> Docente
            </span>
          ) : (
            <>
              {!inClass && onJoinClass && (
                <button onClick={onJoinClass} data-juice className="juicy ink-chip flex items-center gap-1.5 px-3 py-1.5 text-xs font-telemetry cursor-pointer" data-testid="open-join">
                  <DoorOpen className="w-4 h-4 text-fuchsia-500" strokeWidth={2.6} />
                  <span className="hidden md:inline">Unirme a clase</span>
                </button>
              )}
              <XpChip onOpen={onOpenProfile} />
            </>
          )}
          <button
            onClick={onToggleTheme}
            data-juice
            className="juicy ink-chip flex items-center gap-1.5 px-3 py-1.5 text-xs font-telemetry cursor-pointer"
            title={isDarkMode ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
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
        </div>
      </div>
    </header>
  );
};
