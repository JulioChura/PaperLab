import React, { useState } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Layers, 
  Home, 
  Sparkles
} from 'lucide-react';
import { audioJuice } from '../utils/audioJuice';

interface HeaderProps {
  currentModule: string | null;
  onGoHome: () => void;
  onOpenPalette: () => void;
  onGoSplash: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentModule,
  onGoHome,
  onOpenPalette,
  onGoSplash
}) => {
  const [isMuted, setIsMuted] = useState(audioJuice.getMuted());

  const handleToggleSound = () => {
    const muted = audioJuice.toggleMute();
    setIsMuted(muted);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0a0e1a]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              audioJuice.playPaperFlip();
              onGoHome();
            }}
            className="flex items-center gap-2 group text-left cursor-pointer"
          >
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-slate-950 shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <span className="font-mono text-base font-black">P</span>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-slate-900" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight text-white flex items-center gap-1 leading-none">
                Paper<span className="text-cyan-400">Lab</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5 leading-none">
                AR sobre Papel
              </span>
            </div>
          </button>

          {currentModule && (
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-800 text-xs">
              <button
                onClick={() => {
                  audioJuice.playTap();
                  onGoHome();
                }}
                className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 font-semibold"
              >
                <Home className="w-3.5 h-3.5" /> Menú
              </button>
              <span className="text-slate-600">/</span>
              <span className="text-cyan-400 font-mono font-bold capitalize">
                {currentModule === 'physics' && 'Simulaciones de Física'}
                {currentModule === 'circuits' && 'Circuitos Eléctricos'}
                {currentModule === 'flowcharts' && 'Diagramas de Flujo'}
                {currentModule === 'math' && 'Matemáticas & Geometría'}
              </span>
              <span className="text-amber-400 font-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800/80">
                En Construcción
              </span>
            </div>
          )}
        </div>

        {/* Global Controls & Game Juice Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Design System & Palette Modal */}
          <button
            onClick={() => {
              audioJuice.playTap();
              onOpenPalette();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
            title="Ver Sistema de Diseño y Paleta"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Paleta & Colores</span>
            <span className="sm:hidden">Paleta</span>
          </button>

          {/* Sound FX Mute Toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-2 rounded-xl text-xs border transition-all cursor-pointer ${
              isMuted
                ? 'bg-slate-800/60 border-slate-700 text-slate-500'
                : 'bg-cyan-950/40 border-cyan-800 text-cyan-400 hover:border-cyan-600'
            }`}
            title={isMuted ? "Sonidos Silenciados" : "Game Juice Sonoro Activado"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Intro Splash return button */}
          <button
            onClick={() => {
              audioJuice.playTap();
              onGoSplash();
            }}
            className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-cyan-400 px-2 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Splash</span>
          </button>
        </div>
      </div>
    </header>
  );
};
