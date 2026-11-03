import React, { useState } from 'react';
import { 
  Atom, 
  Zap, 
  GitBranch, 
  Triangle, 
  Camera, 
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { audioJuice } from '../utils/audioJuice';

interface ModuleSelectorProps {
  onSelectModule: (moduleId: string) => void;
}

export const ModuleSelector: React.FC<ModuleSelectorProps> = ({ onSelectModule }) => {
  const [activeTab, setActiveTab] = useState<string>('physics');

  const disciplines = [
    {
      id: 'physics',
      index: '01',
      title: 'Física Vectorial',
      concept: 'Cinemática, gravedad y planos inclinados',
      accent: '#0284c7',
      darkAccent: '#00f0ff',
      icon: Atom,
      formula: 'v = v₀ + a·t  |  ΣF = m·a',
      description: 'Dibuja una rampa, un péndulo o un proyectil en tu cuaderno. PaperLab detecta la pendiente del grafito y hace rodar masas virtuales calculando vectores en tiempo real.',
      experimentTags: ['Plano inclinado', 'Gravedad lunar/terrestre', 'Fricción μ'],
      preview: (
        <svg className="w-full h-28" viewBox="0 0 200 90" fill="none">
          <line x1="20" y1="75" x2="175" y2="25" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 2" />
          <line x1="20" y1="75" x2="175" y2="75" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
          <circle cx="100" cy="50" r="8" className="fill-cyan-500" />
          <line x1="100" y1="50" x2="70" y2="60" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
          <text x="115" y="45" fill="#f59e0b" fontSize="10" fontFamily="DM Mono">v = 4.2 m/s</text>
        </svg>
      )
    },
    {
      id: 'circuits',
      index: '02',
      title: 'Circuitos en Grafito',
      concept: 'El lápiz como conductor eléctrico y Ley de Ohm',
      accent: '#d97706',
      darkAccent: '#f59e0b',
      icon: Zap,
      formula: 'V = I · R  |  P = V · I',
      description: 'El grafito conduce electricidad. Dibuja pistas, una pila y un LED con lápiz. La cámara reconoce el circuito cerrado y hace fluir electrones neón.',
      experimentTags: ['Ley de Ohm', 'LED con resistencia', 'Interruptores en papel'],
      preview: (
        <svg className="w-full h-28" viewBox="0 0 200 90" fill="none">
          <rect x="25" y="20" width="150" height="50" rx="6" stroke="currentColor" strokeWidth="2" strokeDasharray="6 3" />
          <circle cx="175" cy="45" r="9" fill="#f59e0b" className="animate-pulse" />
          <path d="M 85 20 L 92 14 L 100 26 L 108 14 L 115 20" stroke="#0284c7" strokeWidth="2.5" fill="none" />
          <text x="70" y="82" fill="#d97706" fontSize="10" fontFamily="DM Mono">I = 9V / 220Ω</text>
        </svg>
      )
    },
    {
      id: 'flowcharts',
      index: '03',
      title: 'Diagramas de Flujo',
      concept: 'Algoritmos dibujados que compilan y se ejecutan',
      accent: '#059669',
      darkAccent: '#10b981',
      icon: GitBranch,
      formula: 'SI (condición) ENTONCES ... SINO',
      description: 'Traza rombos de decisión y rectángulos de proceso en tu libreta. PaperLab envía un token de datos que camina por las flechas y genera el código en vivo.',
      experimentTags: ['Bifurcaciones', 'Depurador paso a paso', 'Generador Python/JS'],
      preview: (
        <svg className="w-full h-28" viewBox="0 0 200 90" fill="none">
          <rect x="20" y="32" width="36" height="24" rx="12" stroke="currentColor" strokeWidth="2" />
          <polygon points="100,22 125,44 100,66 75,44" stroke="#10b981" strokeWidth="2" />
          <line x1="56" y1="44" x2="75" y2="44" stroke="currentColor" strokeWidth="2" />
          <line x1="125" y1="44" x2="150" y2="44" stroke="currentColor" strokeWidth="2" />
          <circle cx="100" cy="44" r="4.5" fill="#10b981" className="animate-ping" />
        </svg>
      )
    },
    {
      id: 'math',
      index: '04',
      title: 'Geometría Euclidiana',
      concept: 'Pitágoras visual, ángulos dinámicos y trigonometría',
      accent: '#7c3aed',
      darkAccent: '#a855f7',
      icon: Triangle,
      formula: 'a² + b² = c²  |  α + β + γ = 180°',
      description: 'Traza cualquier triángulo con regla y lápiz en papel cuadriculado. La app proyecta los cuadrados luminosos de Pitágoras y mide ángulos con precisión milimétrica.',
      experimentTags: ['Teorema de Pitágoras', 'Círculo unitario sin/cos', 'Ángulos en vivo'],
      preview: (
        <svg className="w-full h-28" viewBox="0 0 200 90" fill="none">
          <polygon points="45,70 135,70 135,25" stroke="#a855f7" strokeWidth="2.5" />
          <rect x="123" y="58" width="12" height="12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
          <text x="65" y="42" fill="#a855f7" fontSize="10" fontFamily="DM Mono">c = √(a²+b²)</text>
        </svg>
      )
    }
  ];

  const currentDiscipline = disciplines.find(d => d.id === activeTab) || disciplines[0];
  const CurrentIcon = currentDiscipline.icon;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 select-none animate-entrance">
      {/* Console Section Header */}
      <div className="border-b border-[#d8cebd] dark:border-[#212c42] pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 text-left">
        <div>
          <span className="font-telemetry text-xs uppercase tracking-widest text-cyan-700 dark:text-cyan-400 block mb-1">
            CONSOLA DE DETECCIÓN ÓPTICA
          </span>
          <h2 className="font-display font-black text-3xl sm:text-5xl text-slate-900 dark:text-white tracking-tight">
            Selecciona tu experimento
          </h2>
        </div>
        <p className="font-telemetry text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          Al pulsar cualquier área se encenderá la cámara para escanear tu cuaderno físico.
        </p>
      </div>

      {/* Main Architectural Console Layout: Master-Detail Instrument Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left">
        
        {/* Left Column (5 Cols): The 4 Disciplines Switcher */}
        <div className="lg:col-span-5 flex flex-col gap-2.5">
          {disciplines.map((d) => {
            const isSelected = d.id === activeTab;
            const Icon = d.icon;

            return (
              <div
                key={d.id}
                onClick={() => {
                  audioJuice.playPaperFlip();
                  setActiveTab(d.id);
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'border-slate-900 dark:border-cyan-400 bg-white dark:bg-[#101726] shadow-md translate-x-1'
                    : 'border-[#d8cebd] dark:border-[#212c42] bg-[#fdfbf7] dark:bg-[#0c101a] hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className="font-telemetry text-xs font-bold text-slate-400 dark:text-slate-500">
                    {d.index}
                  </span>
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900">
                    <Icon className="w-5 h-5" style={{ color: d.accent }} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-white leading-tight">
                      {d.title}
                    </h3>
                    <span className="font-telemetry text-[11px] text-slate-500 dark:text-slate-400 block">
                      {d.concept}
                    </span>
                  </div>
                </div>

                <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-slate-900 dark:text-cyan-400 translate-x-0.5' : 'text-slate-400'}`} />
              </div>
            );
          })}
        </div>

        {/* Right Column (7 Cols): Selected Discipline Spec Sheet & Camera Trigger */}
        <div className="lg:col-span-7 rounded-2xl border border-[#d8cebd] dark:border-[#212c42] bg-white dark:bg-[#0e1422] p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[420px]">
          {/* Subtle millimeter crosshatch inside preview container */}
          <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <CurrentIcon className="w-6 h-6" style={{ color: currentDiscipline.accent }} />
              </div>
              <div>
                <span className="font-telemetry text-xs text-slate-400">DISCIPLINA {currentDiscipline.index}</span>
                <h3 className="font-display font-black text-2xl text-slate-900 dark:text-white">
                  {currentDiscipline.title}
                </h3>
              </div>
            </div>

            <span className="font-telemetry text-xs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              WebAR 60 FPS
            </span>
          </div>

          {/* Formula & Explanation */}
          <div className="mb-6 space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 font-telemetry text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>FÓRMULA / LEY:</span>
              <strong className="text-cyan-700 dark:text-cyan-400">{currentDiscipline.formula}</strong>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {currentDiscipline.description}
            </p>

            {/* Interactive Schematic Diagram Box */}
            <div className="p-4 rounded-xl bg-[#faf7ee] dark:bg-[#070a11] border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300">
              <div className="text-[10px] font-telemetry text-slate-400 mb-1">
                // VISTA SUPERPUESTA AL ENFOCAR TU CUADERNO:
              </div>
              {currentDiscipline.preview}
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 pt-2">
              {currentDiscipline.experimentTags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-telemetry px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* High Impact Camera Launch CTA */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <span className="font-telemetry text-xs text-slate-500">
              Apunta a la hoja cuadriculada
            </span>

            <button
              onClick={() => {
                audioJuice.playTap();
                onSelectModule(currentDiscipline.id);
              }}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-slate-950 font-display font-black text-sm tracking-wide transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Activar Cámara en Papel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
