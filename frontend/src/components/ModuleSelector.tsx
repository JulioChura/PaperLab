import React, { useState } from 'react';
import { 
  Atom, 
  Zap, 
  GitBranch, 
  Triangle, 
  Camera, 
  ArrowRight,
  Upload,
  Target
} from 'lucide-react';
import { audioJuice } from '../utils/audioJuice';
import { squash } from '../utils/juice';

/** Tinta de cada disciplina: fondo, texto, tono suave y forma del sticker. */
const INKS: Record<string, { bg: string; fg: string; soft: string; radius: string }> = {
  physics: { bg: '#2f4bf0', fg: '#fffaf0', soft: '#bdc9ff', radius: '22px 22px 22px 6px' },
  circuits: { bg: '#ffc81f', fg: '#211a33', soft: '#ffe58a', radius: '6px 26px 22px 22px' },
  flowcharts: { bg: '#12a96e', fg: '#fffaf0', soft: '#9eeac6', radius: '22px 6px 26px 22px' },
  math: { bg: '#ff4f9e', fg: '#fffaf0', soft: '#ffb9da', radius: '26px 22px 6px 22px' },
};
const BLOBS = ['46% 54% 42% 58% / 52% 44% 56% 48%', '60% 40% 55% 45% / 45% 60% 40% 55%', '38% 62% 50% 50% / 60% 40% 60% 40%'];
import { MissionCard } from '../game/GameUI';
import { missionsFor, type Mission } from '../game/missions';

interface ModuleSelectorProps {
  onSelectModule: (moduleId: string) => void;
  onStartMission: (mission: Mission) => void;
  onOpenMissions: () => void;
}

interface ExerciseCardItem {
  id: string;
  emoji: string;
  name: string;
  formula: string;
  drawnSyntax: string;
}

export const ModuleSelector: React.FC<ModuleSelectorProps> = ({ onSelectModule, onStartMission, onOpenMissions }) => {
  const [activeTab, setActiveTab] = useState<string>('physics');

  const disciplines = [
    {
      id: 'physics',
      index: '01',
      title: 'Física Vectorial',
      concept: 'Cinemática, dinámica y oscilaciones',
      accent: '#0284c7',
      darkAccent: '#00f0ff',
      icon: Atom,
      exerciseCount: 6
    },
    {
      id: 'circuits',
      index: '02',
      title: 'Circuitos Eléctricos',
      concept: 'Leyes de Kirchhoff, componentes y lógica',
      accent: '#d97706',
      darkAccent: '#f59e0b',
      icon: Zap,
      exerciseCount: 6
    },
    {
      id: 'flowcharts',
      index: '03',
      title: 'Algoritmos y Flujo',
      concept: 'Diagramas de decisión y debugger de código',
      accent: '#059669',
      darkAccent: '#10b981',
      icon: GitBranch,
      exerciseCount: 6
    },
    {
      id: 'math',
      index: '04',
      title: 'Matemáticas Pre-U',
      concept: 'Geometría 3D, analítica, funciones y álgebra',
      accent: '#7c3aed',
      darkAccent: '#a855f7',
      icon: Triangle,
      exerciseCount: 5
    }
  ];

  const moduleExercises: Record<string, ExerciseCardItem[]> = {
    physics: [
      {
        id: 'physics_inclined_plane',
        emoji: '📐',
        name: 'Plano Inclinado con Fricción',
        formula: 'a = g·(sinθ - μ·cosθ)',
        drawnSyntax: 'Rampa triangular con ángulo θ y bloque apoyado en la pendiente.'
      },
      {
        id: 'physics_pendulum',
        emoji: '⏱️',
        name: 'Péndulo Simple',
        formula: 'T = 2π·√(L / g)',
        drawnSyntax: 'Techo horizontal, cuerda de longitud L y esfera oscilante con ángulo inicial.'
      },
      {
        id: 'physics_projectile',
        emoji: '🚀',
        name: 'Tiro Parabólico',
        formula: 'X_max = (v₀²·sin2θ) / g',
        drawnSyntax: 'Suelo horizontal y vector de velocidad v₀ con ángulo de disparo θ.'
      },
      {
        id: 'physics_spring_hooke',
        emoji: '🌀',
        name: 'Sistema Masa-Resorte (Hooke)',
        formula: 'F = -k·x  |  ω = √(k/m)',
        drawnSyntax: 'Pared vertical rígida, resorte en zigzag k y bloque de masa m.'
      },
      {
        id: 'physics_mru_mruv',
        emoji: '🏎️',
        name: 'Cinemática Rectilínea (MRU / MRUV)',
        formula: 'd = v₀·t + ½·a·t²',
        drawnSyntax: 'Pista recta horizontal con móviles y vectores de velocidad o aceleración.'
      },
      {
        id: 'physics_atwood_pulley',
        emoji: '⚖️',
        name: 'Máquina de Atwood',
        formula: 'a = g·|m₁ - m₂| / (m₁ + m₂)',
        drawnSyntax: 'Polea fija con cuerda en U invertida y dos masas colgantes en contrapeso.'
      }
    ],
    circuits: [
      {
        id: 'circuits_simple_loop',
        emoji: '💡',
        name: 'Malla Única con Carga',
        formula: 'I = V / R  |  P = V·I',
        drawnSyntax: 'Bucle rectangular cerrado con batería (+/-), resistencia y bombilla/LED.'
      },
      {
        id: 'circuits_series',
        emoji: '🔗',
        name: 'Resistencias en Serie',
        formula: 'Req = R₁ + R₂ + R₃',
        drawnSyntax: 'Fuente DC con dos o tres resistores en la misma rama continua.'
      },
      {
        id: 'circuits_parallel',
        emoji: '🔀',
        name: 'Resistencias en Paralelo',
        formula: '1/Req = 1/R₁ + 1/R₂',
        drawnSyntax: 'Nodos de bifurcación donde el trazo se divide en ramas independientes.'
      },
      {
        id: 'circuits_switch',
        emoji: '🔘',
        name: 'Interruptor Interactivo (Switch)',
        formula: 'Conducción vs. Corte',
        drawnSyntax: 'Bornes de contacto con palanca conmutable por toque en pantalla.'
      },
      {
        id: 'circuits_rc',
        emoji: '🔋',
        name: 'Circuito RC (Carga y Descarga)',
        formula: 'τ = R·C  |  Curva exponencial',
        drawnSyntax: 'Batería, resistencia en serie y dos placas paralelas de condensador en μF.'
      },
      {
        id: 'circuits_logic_gates',
        emoji: '🔲',
        name: 'Puertas Lógicas (AND, OR, NOT)',
        formula: 'Y = A·B  |  Y = A+B  |  Y = ¬A',
        drawnSyntax: 'Símbolos esquemáticos digitales con entradas binarias 0/1 y salida evaluada.'
      }
    ],
    flowcharts: [
      {
        id: 'flowchart_sequential',
        emoji: '➡️',
        name: 'Diagrama de Flujo Secuencial',
        formula: 'Inicio → Leer → Proceso → Mostrar',
        drawnSyntax: 'Óvalos de Inicio/Fin, paralelogramos de lectura/salida y rectángulos de proceso.'
      },
      {
        id: 'flowchart_conditional',
        emoji: '🔀',
        name: 'Decisiones IF / ELSE',
        formula: '¿condición? → SÍ | NO',
        drawnSyntax: 'Rombo de decisión con dos salidas rotuladas SÍ / NO.'
      },
      {
        id: 'flowchart_loop',
        emoji: '🔁',
        name: 'Bucles While / For',
        formula: 'mientras i < n: i = i + 1',
        drawnSyntax: 'Rombo con flecha de retorno; Lumi avisa si el bucle nunca termina.'
      },
      {
        id: 'code_step_debugger',
        emoji: '💻',
        name: 'Debugger de Código Manuscrito',
        formula: 'Puntero de ejecución + Memoria',
        drawnSyntax: 'Líneas de pseudocódigo manuscrito tabulado con variables, bucles e inspector.'
      },
      {
        id: 'code_trace_table',
        emoji: '📋',
        name: 'Tabla de Traza',
        formula: 'iteración | variables | condición',
        drawnSyntax: 'Tabla con columnas por variable que se completa fila a fila.'
      },
      {
        id: 'flowchart_recursive',
        emoji: '🪆',
        name: 'Recursión y Pila de Llamadas',
        formula: 'fact(n) = n · fact(n − 1)',
        drawnSyntax: 'Función con caso base y llamada recursiva; se anima el call stack.'
      }
    ],
    math: [
      {
        id: 'math_solid_geometry_3d',
        emoji: '🧊',
        name: 'Geometría del Espacio (Sólidos 3D)',
        formula: 'V = π·r²·h  |  V = ⁴⁄₃·π·r³',
        drawnSyntax: 'Perspectiva de cilindros, conos, prismas o esferas con cotas de radio y altura.'
      },
      {
        id: 'math_analytic_geometry',
        emoji: '📈',
        name: 'Geometría Analítica Cartesiana',
        formula: 'd = √((Δx)² + (Δy)²)  |  m = Δy/Δx',
        drawnSyntax: 'Ejes ortogonales XY con puntos A y B, distancia, punto medio y pendiente.'
      },
      {
        id: 'math_function_graph',
        emoji: '📉',
        name: 'Gráfica de Funciones f(x)',
        formula: 'f(x) = ax² + bx + c',
        drawnSyntax: 'Plano cartesiano con fórmula manuscrita al lado y curva matemática superpuesta.'
      },
      {
        id: 'math_equation_solver',
        emoji: '🧮',
        name: 'Solver de Ecuaciones Paso a Paso',
        formula: 'Δ = b² - 4ac  |  Aspa Simple',
        drawnSyntax: 'Ecuación algebraica manuscrita con desglose deductivo y conjunto solución C.S.'
      },
      {
        id: 'math_geometric_angles',
        emoji: '📐',
        name: 'Cálculo de Ángulos en Figuras',
        formula: 'L₁ // L₂  |  θ_ext = α + β',
        drawnSyntax: 'Rectas paralelas cortadas por secante o triángulos con incógnita angular x.'
      }
    ]
  };

  const currentDiscipline = disciplines.find(d => d.id === activeTab) || disciplines[0];
  const CurrentIcon = currentDiscipline.icon;
  const currentExercises = moduleExercises[currentDiscipline.id] || [];
  const ink = INKS[currentDiscipline.id];

  const selectTab = (id: string, el: HTMLElement) => {
    if (id === activeTab) {
      squash(el, 0.6);
      return;
    }
    audioJuice.playPaperFlip();
    squash(el, 1.2);
    setActiveTab(id);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 select-none text-left">
      {/* Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="pop-in inline-block font-hand text-2xl text-[var(--riso-pink)]" style={{ ['--rest' as string]: '-3deg' }}>
            paso 1 →
          </span>
          <h2 className="pop-in font-display text-4xl sm:text-6xl text-[var(--ink)] leading-[0.95]" style={{ ['--i' as string]: 1, ['--r' as string]: '-3deg' }}>
            ¿Qué vas a <span className="squiggle">dibujar</span> hoy?
          </h2>
        </div>
        <p className="pop-in font-telemetry text-[11px] text-[var(--text-secondary)] max-w-xs" style={{ ['--i' as string]: 2 }}>
          Elige una disciplina y dibuja cualquiera de sus ejercicios en tu cuaderno.
        </p>
      </div>

      {/* Stickers de disciplina */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-10">
        {disciplines.map((d, idx) => {
          const isSelected = d.id === activeTab;
          const Icon = d.icon;
          const c = INKS[d.id];
          const tilt = [-2.5, 1.8, -1.2, 2.4][idx];
          return (
            <button
              key={d.id}
              data-juice
              onClick={(e) => selectTab(d.id, e.currentTarget)}
              aria-pressed={isSelected}
              className="pop-in group relative cursor-pointer text-left"
              style={{ ['--i' as string]: idx + 2, ['--r' as string]: `${tilt * 3}deg` }}
            >
              <div
                className="relative h-full border-[2.5px] border-[#211a33] p-4 sm:p-5 transition-all duration-500 [transition-timing-function:var(--ease-spring)] group-hover:-translate-y-1.5"
                style={{
                  background: c.bg,
                  color: c.fg,
                  borderRadius: c.radius,
                  rotate: `${isSelected ? 0 : tilt}deg`,
                  translate: `0 ${isSelected ? -8 : 0}px`,
                  boxShadow: isSelected ? '8px 10px 0 var(--hard-shadow)' : '4px 4px 0 var(--hard-shadow)',
                }}
              >
                <div className="flex items-start justify-between">
                  <span className="grid place-items-center w-12 h-12 rounded-full bg-[#fffaf0] border-[2.5px] border-[#211a33] transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover:rotate-[-14deg] group-hover:scale-110">
                    <Icon className="w-6 h-6" style={{ color: '#211a33' }} strokeWidth={2.6} />
                  </span>
                  <span className="font-display text-3xl sm:text-4xl opacity-90 leading-none">{d.index}</span>
                </div>
                <h3 className="font-heading text-lg sm:text-xl leading-tight mt-4">{d.title}</h3>
                <span className="font-telemetry text-[10px] opacity-80 block mt-1">{d.exerciseCount} ejercicios</span>
                {isSelected && (
                  <span className="absolute -top-3 -right-2 px-2 py-0.5 rounded-full bg-[#211a33] text-[#fffaf0] font-telemetry text-[9px] uppercase pop-in" style={{ ['--rest' as string]: '6deg' }}>
                    elegido
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Panel de la disciplina */}
      <div className="ink-card overflow-hidden !rounded-[26px] animate-entrance" key={currentDiscipline.id}>
        {/* Banda de color */}
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 sm:px-7 py-5 border-b-[2.5px] border-[#211a33] overflow-hidden" style={{ background: ink.bg, color: ink.fg }}>
          <svg aria-hidden="true" className="absolute -right-6 -top-10 w-40 h-40 opacity-25 spin-slow" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray="3 12" strokeLinecap="round" />
          </svg>
          <div className="relative flex items-center gap-3">
            <span className="grid place-items-center w-14 h-14 shrink-0 rounded-[18px] bg-[#fffaf0] border-[2.5px] border-[#211a33] -rotate-6 shadow-[3px_3px_0_#211a33]">
              <CurrentIcon className="w-7 h-7 text-[#211a33]" strokeWidth={2.6} />
            </span>
            <div>
              <span className="font-telemetry text-[10px] uppercase tracking-widest opacity-80">Disciplina {currentDiscipline.index}</span>
              <h3 className="font-display text-3xl sm:text-4xl leading-none">{currentDiscipline.title}</h3>
              <p className="text-sm opacity-85 mt-1">{currentDiscipline.concept}</p>
            </div>
          </div>

          <button
            data-juice="big"
            onClick={() => {
              audioJuice.playTap();
              window.setTimeout(() => onSelectModule(currentDiscipline.id), 180);
            }}
            className="juicy btn-ink relative px-6 py-3 text-base bg-[#fffaf0] text-[#211a33] shrink-0"
          >
            <Camera className="w-5 h-5" strokeWidth={2.6} />
            <span>Abrir cámara</span>
            <ArrowRight className="w-5 h-5" strokeWidth={3} />
          </button>
        </div>

        <div className="p-5 sm:p-7">
          {/* Ejercicios */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {currentExercises.map((ex, i) => (
              <button
                key={ex.id}
                data-juice
                onClick={() => {
                  audioJuice.playTap();
                  window.setTimeout(() => onSelectModule(currentDiscipline.id), 160);
                }}
                className="pop-in group text-left cursor-pointer"
                style={{ ['--i' as string]: i, ['--r' as string]: `${i % 2 ? 6 : -6}deg` }}
              >
                <div className="juicy h-full flex flex-col justify-between rounded-[18px] border-[2.5px] border-[var(--ink)] bg-[var(--surface-secondary)] p-4 shadow-[3px_3px_0_var(--hard-shadow)] hover:shadow-[6px_6px_0_var(--hard-shadow)]">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="grid place-items-center w-11 h-11 shrink-0 text-xl border-[2.5px] border-[#211a33] transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover:scale-125 group-hover:rotate-12"
                        style={{ background: ink.soft, borderRadius: BLOBS[i % BLOBS.length] }}
                      >
                        {ex.emoji}
                      </span>
                      <h4 className="font-heading text-base text-[var(--ink)] leading-tight">{ex.name}</h4>
                    </div>
                    <p className="text-[13px] text-[var(--text-secondary)] leading-snug">{ex.drawnSyntax}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="font-telemetry text-[10px] px-2 py-1 rounded-lg border-[1.5px] border-[#211a33] bg-[#fffaf0] text-[#211a33] truncate max-w-[70%]">
                      {ex.formula}
                    </span>
                    <span className="font-hand text-lg text-[var(--riso-pink)] whitespace-nowrap transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover:translate-x-1 group-hover:-rotate-6">
                      ¡a escanear!
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Misiones */}
          <div className="mb-6 rounded-[20px] border-[2.5px] border-dashed border-[var(--ink)] bg-[var(--bg-ground)] p-4 sm:p-5" data-testid="menu-missions">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="font-heading text-lg text-[var(--ink)] flex items-center gap-2">
                <span className="grid place-items-center w-8 h-8 rounded-full bg-[#ff4f9e] border-2 border-[#211a33] rotate-6">
                  <Target className="w-4 h-4 text-[#fffaf0]" strokeWidth={2.8} />
                </span>
                Misiones en papel
              </h4>
              <button onClick={onOpenMissions} data-juice className="juicy ink-chip font-telemetry text-[10px] px-3 py-1.5 cursor-pointer">
                Ver todas →
              </button>
            </div>
            <ul className="space-y-2 [&_li]:bg-[#211a33] [&_li]:text-[#fffaf0] [&_li]:rounded-2xl">
              {missionsFor(currentDiscipline.id).map((m) => (
                <MissionCard key={m.id} m={m} onStart={onStartMission} compact />
              ))}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-telemetry text-[var(--text-secondary)]">
            <span className="font-hand text-xl text-[var(--ink)]">psst… cualquiera de estos sirve en tu cuaderno ✏️</span>
            <button
              data-juice
              onClick={() => {
                audioJuice.playPaperFlip();
                onSelectModule(currentDiscipline.id);
              }}
              className="juicy ink-chip inline-flex items-center gap-1.5 px-3 py-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" strokeWidth={2.6} />
              <span>O sube una foto</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
