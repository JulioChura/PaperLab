import React, { useState } from 'react';
import { X, Copy, Check, Volume2, Sparkles, Smartphone, Layers, Eye } from 'lucide-react';
import { paperLabPalette, moduleThemeConfig } from '../data/colorPalette';
import { audioJuice } from '../utils/audioJuice';

interface PaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaletteModal: React.FC<PaletteModalProps> = ({ isOpen, onClose }) => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    audioJuice.playTap();
    setTimeout(() => setCopiedHex(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Sistema de Diseño & Paleta PaperLab
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                La intersección entre la calidez del papel físico y la fluorescencia WebAR holográfica
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              audioJuice.playTap();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Narrative Concept */}
        <div className="my-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-800/30 to-amber-950/30 border border-cyan-500/20">
          <h3 className="text-base font-bold text-cyan-300 flex items-center gap-2 mb-2">
            <Layers className="w-5 h-5 text-cyan-400" /> Filosofía de Diseño: "Grafito & Fotones"
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            PaperLab no reemplaza el cuaderno escolar; lo potencia. El alumno no mira pasivamente una pantalla: dibuja a mano con lápiz de grafito sobre papel real, y la aplicación mediante <strong>WebAR 100% offline</strong> proyecta física, voltaje, algoritmos y geometría directamente sobre el papel con colores holográficos de alto contraste.
          </p>
        </div>

        {/* Color Palette Tokens Grid */}
        <div className="my-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping"></span>
            Tokens de Color Oficiales
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paperLabPalette.map((color) => (
              <div
                key={color.name}
                className="group relative bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-500 rounded-2xl p-4 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl shadow-md border border-white/20 flex items-center justify-center font-bold text-xs"
                    style={{ backgroundColor: color.hex, boxShadow: `0 0 16px ${color.glow}` }}
                  ></div>
                  <button
                    onClick={() => copyToClipboard(color.hex)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors"
                  >
                    {copiedHex === color.hex ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> {color.hex}
                      </>
                    )}
                  </button>
                </div>
                <h4 className="font-bold text-sm text-white">{color.name}</h4>
                <p className="text-xs text-cyan-400 font-mono mt-0.5">{color.role}</p>
                <p className="text-xs text-slate-400 mt-2 leading-snug">{color.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Module Color Harmony */}
        <div className="my-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-400" />
            Identidad Cromática de los 4 Módulos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.values(moduleThemeConfig).map((mod) => (
              <div 
                key={mod.id} 
                className="p-4 rounded-2xl border bg-slate-800/40 relative overflow-hidden"
                style={{ borderColor: `${mod.accent}40` }}
              >
                <div 
                  className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none opacity-40"
                  style={{ backgroundColor: mod.accent }}
                />
                <div className="flex items-center gap-3">
                  <span 
                    className="w-4 h-4 rounded-full shadow-lg"
                    style={{ backgroundColor: mod.accent, boxShadow: `0 0 12px ${mod.accent}` }}
                  />
                  <div>
                    <h4 className="font-bold text-white text-sm sm:text-base">{mod.title}</h4>
                    <span 
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded-full inline-block mt-1"
                      style={{ backgroundColor: `${mod.accent}20`, color: mod.accent }}
                    >
                      {mod.badge}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 mt-3">{mod.summary}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Soundboard - Game Juice Synth */}
        <div className="my-6 p-5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-cyan-400" /> Soundboard: Game Juice Sonoro (Web Audio Sintetizado)
            </h3>
            <span className="text-xs bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-full font-mono">
              Zero Assets MP3
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Cada sonido es sintetizado en tiempo real matemáticamente con osciladores y filtros para garantizar 0ms de retardo:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { label: 'Tap Táctil', fn: () => audioJuice.playTap(), color: 'hover:border-cyan-400' },
              { label: 'Hoja de Papel', fn: () => audioJuice.playPaperFlip(), color: 'hover:border-amber-400' },
              { label: 'Escáner Láser', fn: () => audioJuice.playLaserScan(), color: 'hover:border-cyan-400' },
              { label: 'Chispa Grafito', fn: () => audioJuice.playSpark(), color: 'hover:border-amber-400' },
              { label: 'Rebote Físico', fn: () => audioJuice.playBounce(), color: 'hover:border-emerald-400' },
              { label: 'Fanfarria Logro', fn: () => audioJuice.playSuccess(), color: 'hover:border-purple-400' }
            ].map((snd) => (
              <button
                key={snd.label}
                onClick={snd.fn}
                className={`px-3 py-2 text-xs font-bold rounded-xl bg-slate-900 border border-slate-700 ${snd.color} active:scale-95 text-slate-200 hover:text-white transition-all`}
              >
                ▶ {snd.label}
              </button>
            ))}
          </div>
        </div>

        {/* WebAR Offline Architecture Note */}
        <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 flex items-start gap-3">
          <Smartphone className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300">
            <strong className="text-cyan-300 block mb-0.5">Optimizado para Móvil & 100% Offline:</strong>
            PaperLab utiliza visión por computador local para detectar las marcas del cuaderno (cuadrícula de 5mm, esquinas de página, y trazos de lápiz B2/HB), ejecutando la simulación a 60 FPS sin necesidad de servidores ni conexión a internet.
          </div>
        </div>
      </div>
    </div>
  );
};

