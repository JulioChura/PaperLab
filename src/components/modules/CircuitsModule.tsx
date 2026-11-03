import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  ToggleLeft, 
  ToggleRight, 
  Sliders, 
  Sparkles, 
  Gauge
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioJuice } from '../../utils/audioJuice';
import { AROverlayHUD } from '../AROverlayHUD';

interface CircuitsModuleProps {
  isRealCamera: boolean;
  onToggleRealCamera: () => void;
}

export const CircuitsModule: React.FC<CircuitsModuleProps> = ({
  isRealCamera,
  onToggleRealCamera
}) => {
  const [circuitType, setCircuitType] = useState<'single' | 'series' | 'parallel'>('single');
  const [isSwitchClosed, setIsSwitchClosed] = useState<boolean>(true);
  const [voltage, setVoltage] = useState<number>(9); // 3V, 9V, 12V
  const [resistance, setResistance] = useState<number>(220); // Ohms
  const [electronOffset, setElectronOffset] = useState<number>(0);

  // Ohm's Law calculations
  const ledForwardVoltage = 2.0; // Typical Red/Amber LED forward drop
  const effectiveVoltage = Math.max(0, voltage - ledForwardVoltage);
  const currentAmps = isSwitchClosed ? effectiveVoltage / resistance : 0;
  const currentMilliAmps = currentAmps * 1000;
  const powerMilliWatts = currentAmps * voltage * 1000;
  const isOverloaded = currentMilliAmps > 60; // LED danger threshold

  // Electron animation
  useEffect(() => {
    let animId: number;
    const animateElectrons = () => {
      if (isSwitchClosed && currentMilliAmps > 0) {
        setElectronOffset((prev) => (prev + currentMilliAmps * 0.08) % 1000);
      }
      animId = requestAnimationFrame(animateElectrons);
    };
    animId = requestAnimationFrame(animateElectrons);
    return () => cancelAnimationFrame(animId);
  }, [isSwitchClosed, currentMilliAmps]);

  const toggleSwitch = () => {
    audioJuice.playSpark();
    setIsSwitchClosed(!isSwitchClosed);
  };

  const triggerCelebrate = () => {
    audioJuice.playSuccess();
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#f59e0b', '#fbbf24', '#ffffff', '#00f0ff']
      });
    } catch {
      // failsafe
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <Zap className="w-5 h-5 animate-bounce" />
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Circuitos sobre Grafito
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
              Electrónica Viva
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            El grafito del lápiz es semiconductor. Dibuja pistas, baterías y componentes en tu cuaderno: PaperLab calcula la Ley de Ohm y enciende el circuito.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
          {[
            { id: 'single', label: 'LED Simple' },
            { id: 'series', label: 'Circuito Serie' },
            { id: 'parallel', label: 'Circuito Paralelo' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                audioJuice.playPaperFlip();
                setCircuitType(tab.id as 'single' | 'series' | 'parallel');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                circuitType === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* AR Viewfinder / Notebook Circuit Schematic Canvas (8 cols) */}
        <div className="lg:col-span-8 relative">
          <div className="relative rounded-3xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl min-h-[480px]">
            <AROverlayHUD
              moduleName="Circuitos Eléctricos"
              accentColor="#f59e0b"
              isRealCamera={isRealCamera}
              onToggleRealCamera={onToggleRealCamera}
            />

            {/* Circuit Overlay */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 600 420" fill="none">
                {/* Pencil graphite drawn tracks (Background trace) */}
                <rect
                  x="80"
                  y="70"
                  width="440"
                  height="260"
                  rx="16"
                  stroke="#475569"
                  strokeWidth="6"
                  strokeDasharray="10 4"
                  fill="none"
                />

                {/* Animated Glowing Electron Stream (when closed) */}
                {isSwitchClosed && currentMilliAmps > 0 && (
                  <rect
                    x="80"
                    y="70"
                    width="440"
                    height="260"
                    rx="16"
                    stroke="#fbbf24"
                    strokeWidth="3"
                    strokeDasharray="14 26"
                    strokeDashoffset={-electronOffset}
                    fill="none"
                    className="shadow-md shadow-amber-400"
                  />
                )}

                {/* Left Branch: Battery */}
                <g transform="translate(80, 200)">
                  {/* Battery Plates */}
                  <line x1="-20" y1="-25" x2="20" y2="-25" stroke="#ffffff" strokeWidth="6" />
                  <line x1="-10" y1="25" x2="10" y2="25" stroke="#f59e0b" strokeWidth="4" />
                  <text x="-48" y="-20" fill="#ffffff" fontSize="13" fontFamily="JetBrains Mono" fontWeight="bold">+</text>
                  <text x="-46" y="30" fill="#f59e0b" fontSize="13" fontFamily="JetBrains Mono" fontWeight="bold">-</text>
                  <text x="-65" y="5" fill="#f59e0b" fontSize="15" fontFamily="Caveat" fontWeight="bold">{voltage}V</text>
                </g>

                {/* Top Branch: Resistor */}
                <g transform="translate(300, 70)">
                  <rect x="-45" y="-14" width="90" height="28" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2.5" />
                  {/* Resistor color bands */}
                  <line x1="-25" y1="-14" x2="-25" y2="14" stroke="#ef4444" strokeWidth="4" />
                  <line x1="-10" y1="-14" x2="-10" y2="14" stroke="#ef4444" strokeWidth="4" />
                  <line x1="5" y1="-14" x2="5" y2="14" stroke="#b45309" strokeWidth="4" />
                  <line x1="20" y1="-14" x2="20" y2="14" stroke="#fbbf24" strokeWidth="3" />
                  <text x="-25" y="-22" fill="#38bdf8" fontSize="12" fontFamily="JetBrains Mono" fontWeight="bold">{resistance}Ω</text>
                </g>

                {/* Right Branch: LED Light Bulb */}
                <g transform="translate(520, 200)">
                  {/* LED Triangle and diode symbol */}
                  <circle
                    cx="0"
                    cy="0"
                    r={isSwitchClosed && currentMilliAmps > 0 ? 22 : 16}
                    fill={isSwitchClosed && currentMilliAmps > 0 ? '#fbbf24' : '#334155'}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    className={isSwitchClosed && currentMilliAmps > 0 ? 'animate-spark shadow-2xl shadow-amber-400' : ''}
                  />
                  {isSwitchClosed && currentMilliAmps > 0 && (
                    <>
                      {/* Glow emission rays */}
                      <line x1="22" y1="-15" x2="36" y2="-25" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="26" y1="0" x2="42" y2="0" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="22" y1="15" x2="36" y2="25" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
                    </>
                  )}
                  <text x="28" y="42" fill="#fbbf24" fontSize="13" fontFamily="Caveat" fontWeight="bold">LED Neón</text>
                </g>

                {/* Bottom Branch: Interactive Pencil Switch */}
                <g transform="translate(300, 330)">
                  {/* Two terminal contacts */}
                  <circle cx="-35" cy="0" r="5" fill="#f59e0b" />
                  <circle cx="35" cy="0" r="5" fill="#f59e0b" />
                  {/* Switch lever arm */}
                  <line
                    x1="-35"
                    y1="0"
                    x2="35"
                    y2={isSwitchClosed ? 0 : -32}
                    stroke="#00f0ff"
                    strokeWidth="4"
                    strokeLinecap="round"
                    className="transition-all duration-200"
                  />
                  <text x="-40" y="28" fill="#94a3b8" fontSize="11" fontFamily="Caveat">
                    {isSwitchClosed ? 'Interruptor: CERRADO (Toca para abrir)' : 'Interruptor: ABIERTO (Toca para cerrar)'}
                  </text>
                </g>
              </svg>
            </div>

            {/* Quick Interactive Switch Button Overlay */}
            <button
              onClick={toggleSwitch}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-amber-500/50 shadow-xl text-white font-bold text-xs transition-all active:scale-95 cursor-pointer"
            >
              {isSwitchClosed ? (
                <>
                  <ToggleRight className="w-5 h-5 text-amber-400" />
                  <span>Interruptor en Papel [ON]</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5 text-slate-400" />
                  <span>Interruptor en Papel [OFF]</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Multimeter & Circuit Parameters (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Digital Multimeter Card */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Gauge className="w-4 h-4 text-amber-400" /> Multímetro WebAR
              </h3>
              <span className="text-[10px] font-mono bg-amber-950 text-amber-400 px-2 py-0.5 rounded border border-amber-800">
                Kirchhoff Vivo
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono">Tensión (V)</div>
                <div className="text-xl font-mono font-black text-amber-400">
                  {isSwitchClosed ? voltage.toFixed(1) : '0.0'} V
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400 font-mono">Corriente (I)</div>
                <div className={`text-xl font-mono font-black ${isOverloaded ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
                  {currentMilliAmps.toFixed(1)} mA
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Potencia Disipada (P):</span>
                <span className="text-white font-bold">{powerMilliWatts.toFixed(0)} mW</span>
              </div>
            </div>

            {/* Overload Warning if any */}
            {isOverloaded && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-950/60 border border-red-500/50 text-[11px] text-red-300">
                ⚠️ <strong>¡Sobrecorriente!</strong> La corriente supera los 60mA. Aumenta la resistencia para proteger el LED dibujado.
              </div>
            )}
          </div>

          {/* Component Controls */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" /> Valores de Componentes
            </h3>

            {/* Voltage Picker */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-mono">
                Batería dibujada:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 3, label: '3V (Botón)' },
                  { v: 9, label: '9V (Cuadrada)' },
                  { v: 12, label: '12V (Lab)' }
                ].map((item) => (
                  <button
                    key={item.v}
                    onClick={() => {
                      audioJuice.playTap();
                      setVoltage(item.v);
                    }}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                      voltage === item.v
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>{item.v}V</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Resistor Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Resistencia (R):</span>
                <span className="text-amber-400 font-bold">{resistance} Ω</span>
              </div>
              <input
                type="range"
                min="50"
                max="1000"
                step="10"
                value={resistance}
                onChange={(e) => {
                  setResistance(Number(e.target.value));
                  audioJuice.playTap();
                }}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <button
              onClick={triggerCelebrate}
              className="mt-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Verificar Ley de Ohm (V = I · R)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
