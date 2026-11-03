import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  Terminal,
  FileCode2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioJuice } from '../../utils/audioJuice';
import { AROverlayHUD } from '../AROverlayHUD';

interface FlowchartsModuleProps {
  isRealCamera: boolean;
  onToggleRealCamera: () => void;
}

export const FlowchartsModule: React.FC<FlowchartsModuleProps> = ({
  isRealCamera,
  onToggleRealCamera
}) => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [ageInput, setAgeInput] = useState<number>(20);
  const [codeLanguage, setCodeLanguage] = useState<'python' | 'javascript' | 'pseudocode'>('python');

  const isAdult = ageInput >= 18;

  // Flowchart Nodes configuration
  const nodes = [
    { id: 0, label: 'Inicio', shape: 'oval', x: 80, y: 190, desc: 'Punto de entrada del programa' },
    { id: 1, label: `Leer edad (${ageInput})`, shape: 'rect', x: 200, y: 190, desc: `Asignar variable edad = ${ageInput}` },
    { id: 2, label: '¿edad >= 18?', shape: 'diamond', x: 340, y: 190, desc: `Evaluar: ${ageInput} >= 18 → ${isAdult ? 'VERDADERO' : 'FALSO'}` },
    { 
      id: 3, 
      label: isAdult ? 'Imprimir: "Mayor de Edad"' : 'Imprimir: "Menor de Edad"', 
      shape: 'rect', 
      x: 460, 
      y: isAdult ? 120 : 260, 
      desc: isAdult ? 'Rama SÍ ejecutada' : 'Rama NO ejecutada' 
    },
    { id: 4, label: 'Fin', shape: 'oval', x: 540, y: 190, desc: 'Ejecución terminada con éxito' }
  ];

  // Step Forward Action
  const handleStepForward = () => {
    audioJuice.playLaserScan();
    setActiveStep((prev) => {
      if (prev >= 4) {
        audioJuice.playSuccess();
        return 4;
      }
      return prev + 1;
    });
  };

  const handleReset = () => {
    audioJuice.playTap();
    setActiveStep(0);
    setIsRunning(false);
  };

  // Auto-run loop
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isRunning) {
      timer = setTimeout(() => {
        setActiveStep((prev) => {
          if (prev >= 4) {
            setIsRunning(false);
            audioJuice.playSuccess();
            try {
              confetti({
                particleCount: 50,
                spread: 70,
                origin: { y: 0.65 },
                colors: ['#10b981', '#34d399', '#ffffff']
              });
            } catch {
              // failsafe
            }
            return 4;
          }
          audioJuice.playTap();
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [isRunning, activeStep]);

  // Code Generation Templates
  const getGeneratedCode = () => {
    if (codeLanguage === 'python') {
      return `def verificar_acceso(edad: int):\n    # Reconocido desde cuaderno de papel\n    print(f"Evaluando edad: {edad}")\n    if edad >= 18:\n        print("Acceso Permitido: Mayor de edad")\n        return True\n    else:\n        print("Acceso Denegado: Menor de edad")\n        return False\n\nverificar_acceso(${ageInput})`;
    } else if (codeLanguage === 'javascript') {
      return `function verificarAcceso(edad) {\n  // Extraído por WebAR desde cuaderno\n  console.log(\`Evaluando edad: \${edad}\`);\n  if (edad >= 18) {\n    return "Mayor de edad";\n  } else {\n    return "Menor de edad";\n  }\n}\n\nverificarAcceso(${ageInput});`;
    } else {
      return `ALGORITMO VerificarEdad\n  ENTRADA: edad <- ${ageInput}\n  SI edad >= 18 ENTONCES\n    ESCRIBIR "Mayor de Edad"\n  SINO\n    ESCRIBIR "Menor de Edad"\n  FIN SI\nFIN ALGORITMO`;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
              <GitBranch className="w-5 h-5" />
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Diagramas de Flujo & Código Vivo
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
              Compilación Visual AR
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Dibuja rombos de decisión y rectángulos en tu cuaderno. PaperLab hace caminar un token de datos brillante y compila el pseudocódigo a código real.
          </p>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
          {(['python', 'javascript', 'pseudocode'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => {
                audioJuice.playPaperFlip();
                setCodeLanguage(lang);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                codeLanguage === lang
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Viewfinder & Animated Execution Token (8 cols) */}
        <div className="lg:col-span-8 relative">
          <div className="relative rounded-3xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl min-h-[480px]">
            <AROverlayHUD
              moduleName="Diagramas de Flujo & Algoritmos"
              accentColor="#10b981"
              isRealCamera={isRealCamera}
              onToggleRealCamera={onToggleRealCamera}
            />

            {/* Live Flowchart Overlay Canvas */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 600 400" fill="none">
                {/* Connecting lines drawn with pencil */}
                <line x1="120" y1="190" x2="160" y2="190" stroke="#64748b" strokeWidth="3" strokeDasharray="4 2" />
                <line x1="240" y1="190" x2="300" y2="190" stroke="#64748b" strokeWidth="3" strokeDasharray="4 2" />

                {/* Branches from Diamond (Decision) */}
                <path d="M 340 160 L 340 120 L 410 120" stroke="#10b981" strokeWidth="2.5" strokeDasharray="3 3" />
                <text x="350" y="112" fill="#10b981" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">SÍ (&gt;=18)</text>

                <path d="M 340 220 L 340 260 L 410 260" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3 3" />
                <text x="350" y="275" fill="#f59e0b" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">NO (&lt;18)</text>

                {/* Converging to Fin */}
                <path d="M 500 120 L 530 120 L 530 175" stroke="#64748b" strokeWidth="2" strokeDasharray="4 2" />
                <path d="M 500 260 L 530 260 L 530 205" stroke="#64748b" strokeWidth="2" strokeDasharray="4 2" />

                {/* Nodes on Paper */}
                {/* 1. Inicio Oval */}
                <rect x="50" y="170" width="70" height="40" rx="20" fill={activeStep === 0 ? 'rgba(16,185,129,0.2)' : 'rgba(15,23,42,0.85)'} stroke={activeStep === 0 ? '#10b981' : '#64748b'} strokeWidth="2.5" />
                <text x="65" y="195" fill="#ffffff" fontSize="12" fontFamily="JetBrains Mono" fontWeight="bold">Inicio</text>

                {/* 2. Process Input */}
                <rect x="160" y="165" width="85" height="50" rx="8" fill={activeStep === 1 ? 'rgba(16,185,129,0.2)' : 'rgba(15,23,42,0.85)'} stroke={activeStep === 1 ? '#10b981' : '#64748b'} strokeWidth="2.5" />
                <text x="170" y="188" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono">Leer edad</text>
                <text x="178" y="204" fill="#ffffff" fontSize="11" fontFamily="JetBrains Mono" fontWeight="bold">({ageInput})</text>

                {/* 3. Decision Diamond */}
                <polygon points="340,150 380,190 340,230 300,190" fill={activeStep === 2 ? 'rgba(16,185,129,0.2)' : 'rgba(15,23,42,0.85)'} stroke={activeStep === 2 ? '#10b981' : '#64748b'} strokeWidth="2.5" />
                <text x="312" y="193" fill="#ffffff" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">&gt;= 18 ?</text>

                {/* 4A. True Branch Process */}
                <rect x="410" y="98" width="100" height="44" rx="8" fill={activeStep === 3 && isAdult ? 'rgba(16,185,129,0.3)' : 'rgba(15,23,42,0.8)'} stroke={activeStep === 3 && isAdult ? '#10b981' : '#475569'} strokeWidth="2" />
                <text x="420" y="125" fill="#10b981" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">Mayor de Edad</text>

                {/* 4B. False Branch Process */}
                <rect x="410" y="238" width="100" height="44" rx="8" fill={activeStep === 3 && !isAdult ? 'rgba(245,158,11,0.3)' : 'rgba(15,23,42,0.8)'} stroke={activeStep === 3 && !isAdult ? '#f59e0b' : '#475569'} strokeWidth="2" />
                <text x="420" y="265" fill="#f59e0b" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">Menor de Edad</text>

                {/* 5. Fin Oval */}
                <rect x="520" y="170" width="60" height="40" rx="20" fill={activeStep === 4 ? 'rgba(16,185,129,0.3)' : 'rgba(15,23,42,0.85)'} stroke={activeStep === 4 ? '#10b981' : '#64748b'} strokeWidth="2.5" />
                <text x="538" y="195" fill="#ffffff" fontSize="12" fontFamily="JetBrains Mono" fontWeight="bold">Fin</text>

                {/* Animated Glowing Execution Token */}
                <circle
                  cx={nodes[activeStep].x}
                  cy={nodes[activeStep].y}
                  r="8"
                  fill="#34d399"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  className="shadow-xl shadow-emerald-400 animate-ping"
                  style={{ animationDuration: '2s' }}
                />
              </svg>
            </div>

            {/* Stepper controls bar */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-xl">
              <button
                onClick={() => {
                  audioJuice.playTap();
                  setIsRunning(!isRunning);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isRunning
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                }`}
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isRunning ? 'Pausar' : 'Ejecutar'}</span>
              </button>

              <button
                onClick={handleStepForward}
                disabled={activeStep >= 4}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 transition-all"
              >
                <SkipForward className="w-3.5 h-3.5 text-cyan-400" />
                <span>Paso a Paso</span>
              </button>

              <button
                onClick={handleReset}
                className="p-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all"
                title="Reiniciar"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Variable Inspector & Live Code Output (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Variable State Watcher */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Inspector de Variables en Papel
            </h3>

            <div className="mb-4">
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Variable: <strong className="text-cyan-300">edad</strong></span>
                <span className="text-emerald-400 font-bold">{ageInput} años</span>
              </div>
              <input
                type="range"
                min="5"
                max="65"
                value={ageInput}
                onChange={(e) => {
                  setAgeInput(Number(e.target.value));
                  audioJuice.playTap();
                }}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>5 años</span>
                <span className="text-amber-400 font-bold">Umbral: 18</span>
                <span>65 años</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono">
              <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Paso Actual</div>
              <div className="text-emerald-300 font-bold">{nodes[activeStep].desc}</div>
            </div>
          </div>

          {/* Generated Code Card */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-cyan-400" /> Código Generado WebAR
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                100% Sincronizado
              </span>
            </div>

            <pre className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 text-[11px] font-mono text-slate-200 overflow-x-auto leading-relaxed flex-1">
              <code>{getGeneratedCode()}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
