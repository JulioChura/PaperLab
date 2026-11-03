import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  ArrowRight, 
  Layers, 
  Atom, 
  Zap, 
  GitBranch, 
  Triangle 
} from 'lucide-react';
import { audioJuice } from '../utils/audioJuice';

interface SplashScreenProps {
  onEnter: () => void;
  onOpenPalette: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onEnter, onOpenPalette }) => {
  const [isOpening, setIsOpening] = useState(false);

  const handleOpenNotebook = () => {
    setIsOpening(true);
    audioJuice.playPowerUp();

    try {
      confetti({
        particleCount: 50,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#f59e0b', '#10b981', '#a855f7', '#ffffff']
      });
    } catch {
      // failsafe
    }

    setTimeout(() => {
      onEnter();
    }, 550);
  };

  return (
    <div className="relative min-h-screen w-full bg-drafting-mat flex flex-col justify-between p-4 sm:p-8 overflow-hidden select-none">
      {/* Top Technical Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between text-xs font-mono text-slate-400 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold text-white">PAPERLAB</span>
          <span className="text-slate-600">•</span>
          <span>WEBAR OFFLINE (MOTOR LOCAL)</span>
        </div>

        <button
          onClick={() => {
            audioJuice.playTap();
            onOpenPalette();
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Sistema de Diseño</span>
        </button>
      </header>

      {/* Center: The Physical Lab Field Notebook Cover */}
      <main className="w-full max-w-2xl mx-auto my-auto flex flex-col items-center">
        <div className="w-full rounded-3xl bg-[#1a1f2c] border-2 border-slate-700/80 p-8 sm:p-12 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden text-left">
          
          {/* Subtle notebook stitching / edge seam */}
          <div className="absolute top-0 bottom-0 left-6 w-[2px] border-r border-dashed border-slate-600/60 pointer-events-none" />

          {/* Technical Laboratory Spec Plate */}
          <div className="pl-6">
            <div className="font-mono text-[11px] text-cyan-400 uppercase tracking-widest mb-1">
              REGISTRO EXPERIMENTAL • EDICIÓN 2026
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none mb-3">
              PaperLab
            </h1>

            <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-lg mb-6">
              El laboratorio de ciencias que no necesita pantallas táctiles. Dibuja a mano con lápiz sobre tu cuaderno real y la Realidad Aumentada superpone la física en vivo.
            </p>

            {/* 4 Disciplines Summary Pill List */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
              {[
                { name: 'Física', icon: Atom, color: '#00f0ff' },
                { name: 'Circuitos', icon: Zap, color: '#f59e0b' },
                { name: 'Algoritmos', icon: GitBranch, color: '#10b981' },
                { name: 'Geometría', icon: Triangle, color: '#a855f7' }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.name}
                    className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-2 text-xs font-mono text-slate-200"
                  >
                    <Icon className="w-4 h-4 shrink-0" style={{ color: item.color }} />
                    <span className="font-bold">{item.name}</span>
                  </div>
                );
              })}
            </div>

            {/* Open Notebook CTA */}
            <button
              onClick={handleOpenNotebook}
              disabled={isOpening}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-sm tracking-wide transition-all shadow-xl shadow-cyan-400/25 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>{isOpening ? 'Abriendo Cuaderno...' : 'Abrir Cuaderno de Trabajo'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto flex items-center justify-between text-[11px] font-mono text-slate-500 pt-4 border-t border-slate-800">
        <span>TECNOLOGÍA: WEBAR 100% EN DISPOSITIVO</span>
        <span className="font-hand text-sm text-slate-400">"El lápiz es el mejor sensor"</span>
      </footer>
    </div>
  );
};
