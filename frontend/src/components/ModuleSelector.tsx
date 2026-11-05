import React, { useState } from 'react';
import { 
  Atom, 
  Zap, 
  GitBranch, 
  Triangle, 
  Camera, 
  ArrowRight,
  ChevronRight,
  Upload,
  Target
} from 'lucide-react';
import { audioJuice } from '../utils/audioJuice';
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

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 select-none animate-entrance">
      {/* Header */}
      <div className="border-b border-[#d8cebd] dark:border-[#212c42] pb-6 mb-8 text-left">
        <h2 className="font-display font-black text-3xl sm:text-4xl text-slate-900 dark:text-white tracking-tight">
          Selecciona tu experimento
        </h2>
        <p className="font-telemetry text-xs text-slate-500 dark:text-slate-400 mt-1">
          Elige una disciplina para ver los ejercicios canónicos listos para escaneo y simulación.
        </p>
      </div>

      {/* Main Layout: Master-Detail Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left">
        
        {/* Left Column (4 Cols): Discipline Switcher */}
        <div className="lg:col-span-4 flex flex-col gap-2.5">
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
                      {d.exerciseCount} ejercicios disponibles
                    </span>
                  </div>
                </div>

                <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-slate-900 dark:text-cyan-400 translate-x-0.5' : 'text-slate-400'}`} />
              </div>
            );
          })}
        </div>

        {/* Right Column (8 Cols): Exercise Cards Grid */}
        <div className="lg:col-span-8 rounded-2xl border border-[#d8cebd] dark:border-[#212c42] bg-white dark:bg-[#0e1422] p-6 sm:p-7 shadow-xl flex flex-col justify-between min-h-[460px]">
          <div>
            {/* Discipline Header & Action Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 gap-3">
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

              <button
                onClick={() => {
                  audioJuice.playTap();
                  onSelectModule(currentDiscipline.id);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-400 dark:hover:bg-cyan-300 text-white dark:text-slate-950 font-display font-bold text-xs tracking-wide transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Activar Cámara o Subir Foto</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Grid of Implemented Exercise Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-6">
              {currentExercises.map((ex) => (
                <div
                  key={ex.id}
                  onClick={() => {
                    audioJuice.playTap();
                    onSelectModule(currentDiscipline.id);
                  }}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#fbf9f4] dark:bg-[#080c14] hover:border-cyan-500/60 dark:hover:border-cyan-400/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="mb-2.5">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xl shrink-0">{ex.emoji}</span>
                        <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                          {ex.name}
                        </h4>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                      {ex.drawnSyntax}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between font-telemetry text-[11px]">
                    <span className="text-cyan-700 dark:text-cyan-400 font-mono font-medium truncate max-w-[200px]">
                      {ex.formula}
                    </span>
                    <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform text-[10px]">
                      Escanear →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Misiones de la disciplina */}
          <div className="mb-6 rounded-xl border border-fuchsia-300/60 dark:border-fuchsia-500/30 bg-fuchsia-50/60 dark:bg-fuchsia-500/[0.04] p-4" data-testid="menu-missions">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-300" />
                Misiones en papel
              </h4>
              <button onClick={onOpenMissions} className="font-telemetry text-[11px] text-fuchsia-700 dark:text-fuchsia-300 hover:underline cursor-pointer">
                Ver todas →
              </button>
            </div>
            <ul className="space-y-2 [&_li]:bg-slate-950 [&_li]:text-white">
              {missionsFor(currentDiscipline.id).map((m) => (
                <MissionCard key={m.id} m={m} onStart={onStartMission} compact />
              ))}
            </ul>
          </div>

          {/* Quick Footer Info */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-telemetry text-slate-500 dark:text-slate-400">
            <span>Dibuja cualquiera de estos ejercicios en tu cuaderno físico.</span>
            <button
              onClick={() => {
                audioJuice.playPaperFlip();
                onSelectModule(currentDiscipline.id);
              }}
              className="inline-flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>O sube una foto directamente</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
