import React, { useState } from 'react';
import { 
  Atom, 
  Zap, 
  GitBranch, 
  Triangle, 
  ArrowRight, 
  Sparkles, 
  Activity, 
  Cpu
} from 'lucide-react';
import { moduleThemeConfig } from '../data/colorPalette';
import { audioJuice } from '../utils/audioJuice';

interface MainMenuProps {
  onSelectModule: (moduleId: string) => void;
  onOpenPalette: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onSelectModule, onOpenPalette }) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const modules = [
    {
      ...moduleThemeConfig.physics,
      iconComponent: Atom,
      soundFn: () => audioJuice.playBounce(),
      previewDoodle: (
        <svg className="w-full h-24 overflow-visible" viewBox="0 0 200 90" fill="none">
          {/* Hand drawn paper ramp */}
          <path d="M 20 75 Q 80 72 170 30" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 2" />
          <line x1="20" y1="75" x2="170" y2="75" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
          {/* Animated Rolling Ball */}
          <circle cx="120" cy="46" r="10" fill="#00f0ff" className="animate-pulse shadow-lg shadow-cyan-400">
            <animate attributeName="cx" values="160;35;160" dur="3s" repeatCount="indefinite" />
            <animate attributeName="cy" values="32;73;32" dur="3s" repeatCount="indefinite" />
          </circle>
          {/* Vector Velocity Arrow */}
          <line x1="120" y1="46" x2="90" y2="56" stroke="#f59e0b" strokeWidth="2.5" markerEnd="url(#arrow)" />
          {/* Handwritten paper note */}
          <text x="135" y="24" fill="#00f0ff" fontSize="11" fontFamily="Caveat" fontWeight="bold">v = 4.2 m/s</text>
          <text x="35" y="88" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono">θ = 32° | μ = 0.05</text>
        </svg>
      )
    },
    {
      ...moduleThemeConfig.circuits,
      iconComponent: Zap,
      soundFn: () => audioJuice.playSpark(),
      previewDoodle: (
        <svg className="w-full h-24 overflow-visible" viewBox="0 0 200 90" fill="none">
          {/* Drawn circuit loop */}
          <rect x="25" y="18" width="150" height="54" rx="8" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 3" />
          {/* Battery symbol */}
          <line x1="25" y1="36" x2="25" y2="54" stroke="#ffffff" strokeWidth="4" />
          <line x1="21" y1="41" x2="21" y2="49" stroke="#f59e0b" strokeWidth="2" />
          {/* Resistor zig-zag */}
          <path d="M 85 18 L 92 12 L 100 24 L 108 12 L 115 18" stroke="#38bdf8" strokeWidth="2.5" fill="none" />
          {/* Glowing LED with emission rays */}
          <circle cx="175" cy="45" r="9" fill="#fbbf24" className="animate-spark" />
          <line x1="186" y1="38" x2="194" y2="34" stroke="#f59e0b" strokeWidth="2" />
          <line x1="188" y1="45" x2="197" y2="45" stroke="#f59e0b" strokeWidth="2" />
          <line x1="186" y1="52" x2="194" y2="56" stroke="#f59e0b" strokeWidth="2" />
          {/* Flowing electrons */}
          <circle cx="60" cy="18" r="3" fill="#ffffff">
            <animate attributeName="cx" values="25;175;175;25;25" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="cy" values="18;18;72;72;18" dur="2.4s" repeatCount="indefinite" />
          </circle>
          {/* Handwritten Ohm's Law */}
          <text x="65" y="85" fill="#f59e0b" fontSize="11" fontFamily="Caveat" fontWeight="bold">I = 9V / 220Ω = 40.9mA</text>
        </svg>
      )
    },
    {
      ...moduleThemeConfig.flowcharts,
      iconComponent: GitBranch,
      soundFn: () => audioJuice.playLaserScan(),
      previewDoodle: (
        <svg className="w-full h-24 overflow-visible" viewBox="0 0 200 90" fill="none">
          {/* Flowchart nodes drawn */}
          <rect x="15" y="32" width="42" height="26" rx="13" stroke="#10b981" strokeWidth="2" fill="rgba(16,185,129,0.1)" />
          <text x="23" y="49" fill="#10b981" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">Inicio</text>
          
          <line x1="57" y1="45" x2="80" y2="45" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow)" />
          
          {/* Decision Diamond */}
          <polygon points="105,25 130,45 105,65 80,45" stroke="#34d399" strokeWidth="2" fill="rgba(52,211,153,0.15)" />
          <text x="91" y="48" fill="#ffffff" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">x &gt; 0?</text>

          <line x1="130" y1="45" x2="155" y2="45" stroke="#10b981" strokeWidth="2" />
          <rect x="155" y="32" width="38" height="26" rx="4" stroke="#10b981" strokeWidth="2" fill="rgba(16,185,129,0.1)" />
          <text x="162" y="48" fill="#10b981" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">Fin</text>

          {/* Animated Glowing Execution Token */}
          <circle cx="35" cy="45" r="4.5" fill="#34d399" className="shadow-lg shadow-emerald-400">
            <animate attributeName="cx" values="35;105;170;35" dur="3s" repeatCount="indefinite" />
          </circle>

          <text x="65" y="85" fill="#34d399" fontSize="11" fontFamily="Caveat" fontWeight="bold">token.val = 42 → IF TRUE</text>
        </svg>
      )
    },
    {
      ...moduleThemeConfig.math,
      iconComponent: Triangle,
      soundFn: () => audioJuice.playSuccess(),
      previewDoodle: (
        <svg className="w-full h-24 overflow-visible" viewBox="0 0 200 90" fill="none">
          {/* Right triangle drawn on paper grid */}
          <polygon points="40,75 140,75 140,25" stroke="#a855f7" strokeWidth="2.5" fill="rgba(168,85,247,0.12)" />
          {/* Right angle symbol */}
          <rect x="128" y="63" width="12" height="12" stroke="#a855f7" strokeWidth="1.5" fill="none" />
          {/* Pythagorean square on side A */}
          <rect x="140" y="25" width="20" height="50" stroke="#c084fc" strokeWidth="1" strokeDasharray="2 2" fill="rgba(192,132,252,0.15)" />
          {/* Pythagorean square on side B */}
          <rect x="40" y="75" width="100" height="12" stroke="#c084fc" strokeWidth="1" strokeDasharray="2 2" fill="rgba(192,132,252,0.15)" />
          {/* Angle arc */}
          <path d="M 60 75 A 20 20 0 0 0 54 68" stroke="#f59e0b" strokeWidth="2" />
          <text x="62" y="66" fill="#f59e0b" fontSize="10" fontFamily="Caveat" fontWeight="bold">α = 26.5°</text>
          
          {/* Hypotenuse label */}
          <text x="75" y="44" fill="#a855f7" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">c² = 111.8</text>
          <text x="50" y="16" fill="#c084fc" fontSize="11" fontFamily="Caveat" fontWeight="bold">3² + 4² = 5² (¡Verificado!)</text>
        </svg>
      )
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Title & Concept Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 sm:mb-12">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 text-xs font-mono mb-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Elige tu Área de Exploración</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Laboratorio de Cuaderno Vivo
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-2xl">
            Selecciona una de las 4 disciplinas. Puedes dibujar en tu cuaderno escolar real con lápiz, o experimentar con nuestro lienzo táctil en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              audioJuice.playTap();
              onOpenPalette();
            }}
            className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Guía de Diseño & Paleta</span>
          </button>
        </div>
      </div>

      {/* 4 Main Interactive Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {modules.map((mod) => {
          const IconComponent = mod.iconComponent;
          const isHovered = hoveredCard === mod.id;

          return (
            <div
              key={mod.id}
              onMouseEnter={() => {
                setHoveredCard(mod.id);
                mod.soundFn();
              }}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => {
                mod.soundFn();
                onSelectModule(mod.id);
              }}
              className={`group relative rounded-3xl p-6 sm:p-7 border bg-gradient-to-b ${mod.bgGradient} ${mod.cardBorder} transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 ${
                isHovered ? mod.glow : 'shadow-xl shadow-black/40'
              }`}
            >
              {/* Subtle Grid texture inside card */}
              <div className="absolute inset-0 bg-notebook-grid opacity-10 pointer-events-none" />

              {/* Holographic corner gradient flare */}
              <div 
                className="absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl pointer-events-none transition-opacity duration-500"
                style={{
                  backgroundColor: mod.accent,
                  opacity: isHovered ? 0.35 : 0.15
                }}
              />

              {/* Card Header: Icon & Badge */}
              <div className="flex items-center justify-between gap-3 relative z-10 mb-4">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110"
                  style={{
                    backgroundColor: `${mod.accent}20`,
                    borderColor: `${mod.accent}50`,
                    borderWidth: 1,
                    boxShadow: `0 0 20px ${mod.accent}30`
                  }}
                >
                  <IconComponent 
                    className="w-7 h-7 transition-transform group-hover:rotate-12"
                    style={{ color: mod.accent }}
                  />
                </div>

                <div className="flex flex-col items-end">
                  <span 
                    className="text-[11px] font-mono font-extrabold uppercase px-3 py-1 rounded-full border shadow-sm"
                    style={{
                      backgroundColor: `${mod.accent}15`,
                      borderColor: `${mod.accent}40`,
                      color: mod.accent
                    }}
                  >
                    {mod.badge}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono mt-1">
                    WebAR 60 FPS
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="relative z-10">
                <h3 className="text-2xl font-black text-white group-hover:text-cyan-300 transition-colors">
                  {mod.title}
                </h3>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-0.5" style={{ color: mod.secondary }}>
                  {mod.subtitle}
                </p>
                <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                  {mod.summary}
                </p>
              </div>

              {/* Interactive Notebook Doodle Preview Box */}
              <div className="relative z-10 mt-5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 group-hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/80">
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: mod.accent }} />
                    Vista Aumentada sobre Papel:
                  </span>
                  <span className="text-[10px] font-hand text-slate-400">
                    Trazo a mano B2
                  </span>
                </div>

                {/* Animated SVG Preview */}
                <div className="py-1">
                  {mod.previewDoodle}
                </div>
              </div>

              {/* Tags and Action Button */}
              <div className="relative z-10 mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {mod.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800/60 text-slate-300 font-mono border border-slate-700/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div 
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-md transition-all group-hover:translate-x-1"
                  style={{
                    backgroundColor: mod.accent,
                    color: '#090d16'
                  }}
                >
                  <span>Abrir</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Student Notebook Tactile Banner */}
      <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/30 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
              ¿Por qué en papel y no puramente en pantalla?
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Estudios pedagógicos demuestran que el trazo motor fino del lápiz refuerza la memoria espacial y la comprensión conceptual. PaperLab une lo mejor del mundo tangible y digital.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-cyan-400 font-mono text-base font-black">0 MB</div>
            <div className="text-[10px] text-slate-400">Datos Cloud</div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-emerald-400 font-mono text-base font-black">100%</div>
            <div className="text-[10px] text-slate-400">En tu Dispositivo</div>
          </div>
        </div>
      </div>
    </div>
  );
};
