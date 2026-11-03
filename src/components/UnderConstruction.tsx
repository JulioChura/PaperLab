import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Construction, 
  Pencil, 
  Check, 
  Compass, 
  Stamp,
  Bell
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { moduleThemeConfig } from '../data/colorPalette';
import { audioJuice } from '../utils/audioJuice';

interface UnderConstructionProps {
  moduleId: string;
  onBack: () => void;
}

export const UnderConstruction: React.FC<UnderConstructionProps> = ({ moduleId, onBack }) => {
  const [stamped, setStamped] = useState(false);
  const [notified, setNotified] = useState(false);

  // Get active module configuration
  const mod = moduleThemeConfig[moduleId as keyof typeof moduleThemeConfig] || moduleThemeConfig.physics;

  const handleStamp = () => {
    audioJuice.playBounce(1.4);
    setStamped(true);
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.6 },
        colors: [mod.accent, '#f59e0b', '#ffffff']
      });
    } catch {
      // failsafe
    }
  };

  const handleNotify = () => {
    audioJuice.playSuccess();
    setNotified(true);
    setTimeout(() => setNotified(false), 3000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-14 flex flex-col items-center text-center">
      {/* Back Button */}
      <div className="w-full flex justify-start mb-6">
        <button
          onClick={() => {
            audioJuice.playPaperFlip();
            onBack();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Volver al Menú de Opciones</span>
        </button>
      </div>

      {/* Main Blueprint / Paper Card */}
      <div className="relative w-full rounded-3xl p-6 sm:p-12 border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Paper Notebook Grid Texture */}
        <div className="absolute inset-0 bg-notebook-grid opacity-25 pointer-events-none" />

        {/* Ambient Module Glow */}
        <div 
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: mod.accent }}
        />

        {/* Diagonal Hand-Drawn Caution Tape Header */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider mb-6 animate-pulse">
          <Construction className="w-4 h-4 text-amber-400" />
          <span>Zona de Prototipado • Módulo en Construcción</span>
        </div>

        {/* Module Badge & Title */}
        <div className="flex flex-col items-center">
          <div 
            className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl mb-4 relative"
            style={{
              backgroundColor: `${mod.accent}20`,
              borderColor: `${mod.accent}60`,
              borderWidth: 2,
              boxShadow: `0 0 30px ${mod.accent}30`
            }}
          >
            <Pencil 
              className="w-10 h-10 animate-bounce"
              style={{ color: mod.accent, animationDuration: '2.5s' }}
            />
            {/* Stamp Overlay if user pressed the stamp button */}
            {stamped && (
              <div className="absolute -top-3 -right-4 bg-red-600 text-white font-black text-[10px] uppercase font-mono px-2 py-0.5 rounded rotate-12 border border-red-300 shadow-lg animate-scaleIn">
                APROBADO
              </div>
            )}
          </div>

          <span 
            className="text-xs font-mono font-extrabold uppercase px-3 py-1 rounded-full border mb-2"
            style={{
              backgroundColor: `${mod.accent}15`,
              borderColor: `${mod.accent}40`,
              color: mod.accent
            }}
          >
            {mod.title}
          </span>

          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-1">
            ¡Estamos afilando los lápices!
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
            Nuestros científicos e ingenieros están calibrando los trazos de grafito y ajustando la visión por computadora WebAR para este módulo.
          </p>

          <p className="mt-2 font-hand text-base sm:text-lg text-amber-300/90 max-w-lg">
            "Pronto podrás dibujar tus experimentos a mano y verlos cobrar vida aquí en segundos..." 📐🔬
          </p>
        </div>

        {/* Blueprint Sketch Box */}
        <div className="my-8 p-5 sm:p-6 rounded-2xl bg-slate-950/80 border border-dashed border-slate-700/80 text-left relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Plano Técnico: <strong>EXP-{moduleId.toUpperCase()}-2026</strong></span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
              Estado: En Desarrollo
            </span>
          </div>

          <div className="mt-4 space-y-2.5 text-xs text-slate-300 font-mono">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">✔</span>
              <span>Reconocimiento de marcas de lápiz HB/2B: <strong>Completado</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">✔</span>
              <span>Sincronización WebAR Offline 60 FPS: <strong>Completado</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 animate-pulse">⏳</span>
              <span>Superposición holográfica de {mod.title}: <strong>En Proceso</strong></span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-5">
            <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1.5">
              <span>Progreso de Ensamblaje:</span>
              <span className="font-bold text-white">78%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000 shadow-sm"
                style={{ 
                  width: '78%', 
                  backgroundColor: mod.accent,
                  boxShadow: `0 0 12px ${mod.accent}`
                }}
              />
            </div>
          </div>
        </div>

        {/* Interactive Game Juice Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleStamp}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Stamp className="w-4 h-4 text-red-400" />
            <span>{stamped ? '¡Plano Sellado!' : 'Sellar Plano de Trabajo'}</span>
          </button>

          <button
            onClick={handleNotify}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-cyan-500/20 active:scale-95 cursor-pointer"
          >
            {notified ? (
              <>
                <Check className="w-4 h-4" />
                <span>¡Te avisaremos apenas esté listo!</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                <span>Avisarme cuando esté listo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
