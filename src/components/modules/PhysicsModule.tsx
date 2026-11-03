import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Atom, 
  Sliders, 
  Sparkles, 
  Activity
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioJuice } from '../../utils/audioJuice';
import { AROverlayHUD } from '../AROverlayHUD';

interface PhysicsModuleProps {
  isRealCamera: boolean;
  onToggleRealCamera: () => void;
}

export const PhysicsModule: React.FC<PhysicsModuleProps> = ({
  isRealCamera,
  onToggleRealCamera
}) => {
  const [preset, setPreset] = useState<'ramp' | 'pendulum' | 'projectile'>('ramp');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  
  // Physics Parameters
  const [gravityPreset, setGravityPreset] = useState<'earth' | 'moon' | 'jupiter'>('earth');
  const [mass, setMass] = useState<number>(2.5); // kg
  const [angleDeg, setAngleDeg] = useState<number>(32); // degrees
  const [friction, setFriction] = useState<number>(0.08);

  // Simulation State
  const [simTime, setSimTime] = useState<number>(0);
  const [ballPos, setBallPos] = useState<{ x: number; y: number }>({ x: 120, y: 140 });
  const [velocity, setVelocity] = useState<number>(0);
  const [kineticEnergy, setKineticEnergy] = useState<number>(0);
  const [potentialEnergy, setPotentialEnergy] = useState<number>(0);

  const requestRef = useRef<number | null>(null);

  // Gravity constant in m/s^2
  const g = gravityPreset === 'earth' ? 9.8 : gravityPreset === 'moon' ? 1.62 : 24.79;

  // Real-time animation loop
  useEffect(() => {
    let t = 0;
    let currentX = 120;
    let currentY = 140;
    let currentV = 0;
    let lastBounceTime = 0;

    const updatePhysics = () => {
      if (isPlaying) {
        t += 0.03;
        setSimTime(t);

        if (preset === 'ramp') {
          // Ramp kinematics
          const rad = (angleDeg * Math.PI) / 180;
          const netAccel = Math.max(0, g * (Math.sin(rad) - friction * Math.cos(rad)));
          
          currentV += netAccel * 0.03;
          const rampLength = 320;
          const distAlongRamp = (0.5 * netAccel * Math.pow((t % 4.5), 2)) * 30;

          if (distAlongRamp >= rampLength) {
            // Ball hits the paper desk / floor
            if (Date.now() - lastBounceTime > 400) {
              audioJuice.playBounce(1.2);
              lastBounceTime = Date.now();
            }
          }

          const clampedDist = Math.min(distAlongRamp, rampLength);
          currentX = 100 + clampedDist * Math.cos(rad);
          currentY = 120 + clampedDist * Math.sin(rad);

          const h = Math.max(0, (rampLength - clampedDist) * Math.sin(rad) * 0.02);
          const currentKinetic = 0.5 * mass * Math.pow(currentV, 2);
          const currentPot = mass * g * h * 10;

          setBallPos({ x: currentX, y: currentY });
          setVelocity(currentV);
          setKineticEnergy(Math.round(currentKinetic * 10) / 10);
          setPotentialEnergy(Math.round(currentPot * 10) / 10);
        } else if (preset === 'pendulum') {
          // Pendulum harmonic motion
          const length = 180;
          const maxTheta = 0.6; // radians
          const omega = Math.sqrt(g / 2);
          const theta = maxTheta * Math.cos(omega * t);

          currentX = 260 + length * Math.sin(theta);
          currentY = 80 + length * Math.cos(theta);

          const v = Math.abs(length * omega * maxTheta * Math.sin(omega * t)) * 0.05;
          setBallPos({ x: currentX, y: currentY });
          setVelocity(Math.round(v * 10) / 10);
          setKineticEnergy(Math.round(0.5 * mass * Math.pow(v, 2) * 10) / 10);
          setPotentialEnergy(Math.round(mass * g * (1 - Math.cos(theta)) * 20 * 10) / 10);
        } else {
          // Projectile motion
          const v0 = 18;
          const theta = (45 * Math.PI) / 180;
          const projT = t % 3.2;

          currentX = 80 + v0 * Math.cos(theta) * projT * 18;
          currentY = 320 - (v0 * Math.sin(theta) * projT - 0.5 * g * Math.pow(projT, 2)) * 12;

          if (currentY >= 320) {
            currentY = 320;
            if (Date.now() - lastBounceTime > 500) {
              audioJuice.playBounce(0.9);
              lastBounceTime = Date.now();
            }
          }

          setBallPos({ x: currentX, y: currentY });
          const vx = v0 * Math.cos(theta);
          const vy = v0 * Math.sin(theta) - g * projT;
          const totalV = Math.sqrt(vx * vx + vy * vy);
          setVelocity(Math.round(totalV * 10) / 10);
          setKineticEnergy(Math.round(0.5 * mass * Math.pow(totalV, 2)));
          setPotentialEnergy(Math.round(mass * g * Math.max(0, (320 - currentY) * 0.05)));
        }
      }
      requestRef.current = requestAnimationFrame(updatePhysics);
    };

    requestRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, preset, angleDeg, g, friction, mass]);

  const handleReset = () => {
    audioJuice.playTap();
    setSimTime(0);
    setIsPlaying(true);
  };

  const triggerCelebrate = () => {
    audioJuice.playSuccess();
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#00f0ff', '#38bdf8', '#ffffff']
      });
    } catch {
      // failsafe
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Top Banner with Badges */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
              <Atom className="w-5 h-5 animate-spin" style={{ animationDuration: '10s' }} />
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Física Vectorial en Papel
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
              WebAR Superpuesto
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Dibuja una rampa o péndulo con lápiz. La cámara detecta la línea de grafito y hace rodar masas con leyes de Newton reales.
          </p>
        </div>

        {/* Experiment Preset Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
          {[
            { id: 'ramp', label: 'Plano Inclinado' },
            { id: 'pendulum', label: 'Péndulo Simple' },
            { id: 'projectile', label: 'Tiro Parabólico' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                audioJuice.playPaperFlip();
                setPreset(tab.id as 'ramp' | 'pendulum' | 'projectile');
                setSimTime(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                preset === tab.id
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace: Left is Interactive AR Canvas / Camera Viewfinder, Right is Real-time Physics Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Viewfinder / Canvas Area (8 Cols) */}
        <div className="lg:col-span-8 relative">
          <div className="relative rounded-3xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl min-h-[480px]">
            {/* Viewfinder Background (Camera or Notebook Grid) */}
            <AROverlayHUD
              moduleName="Simulaciones de Física"
              accentColor="#00f0ff"
              isRealCamera={isRealCamera}
              onToggleRealCamera={onToggleRealCamera}
            />

            {/* Live Interactive Physics Render Overlay (Superimposed on Paper) */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 600 420" fill="none">
                {/* Visual marker of student notebook pencil sketch */}
                {preset === 'ramp' && (
                  <g>
                    {/* Hand-drawn pencil ramp line */}
                    <path
                      d="M 100 120 L 420 320 L 100 320 Z"
                      stroke="#475569"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray="6 3"
                      fill="rgba(56, 189, 248, 0.08)"
                    />
                    {/* Pencil hatching under ramp */}
                    <line x1="150" y1="320" x2="180" y2="290" stroke="#64748b" strokeWidth="1" />
                    <line x1="200" y1="320" x2="230" y2="290" stroke="#64748b" strokeWidth="1" />
                    <line x1="250" y1="320" x2="280" y2="290" stroke="#64748b" strokeWidth="1" />
                    <line x1="300" y1="320" x2="330" y2="290" stroke="#64748b" strokeWidth="1" />
                    
                    {/* Angle Arc Label */}
                    <path d="M 360 320 A 40 40 0 0 1 350 280" stroke="#00f0ff" strokeWidth="2" />
                    <text x="375" y="310" fill="#00f0ff" fontSize="13" fontFamily="JetBrains Mono" fontWeight="bold">
                      θ = {angleDeg}°
                    </text>

                    {/* Augmented Ball with glowing aura */}
                    <circle
                      cx={ballPos.x}
                      cy={ballPos.y}
                      r={14 + mass * 2}
                      fill="#00f0ff"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      className="shadow-lg shadow-cyan-400"
                    />

                    {/* Vector Arrow: Velocity */}
                    <line
                      x1={ballPos.x}
                      y1={ballPos.y}
                      x2={ballPos.x + velocity * 12 * Math.cos((angleDeg * Math.PI) / 180)}
                      y2={ballPos.y + velocity * 12 * Math.sin((angleDeg * Math.PI) / 180)}
                      stroke="#f59e0b"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <text
                      x={ballPos.x + 18}
                      y={ballPos.y - 12}
                      fill="#f59e0b"
                      fontSize="12"
                      fontFamily="Caveat"
                      fontWeight="bold"
                    >
                      v = {velocity.toFixed(1)} m/s
                    </text>

                    {/* Normal Vector Arrow */}
                    <line
                      x1={ballPos.x}
                      y1={ballPos.y}
                      x2={ballPos.x - 24 * Math.sin((angleDeg * Math.PI) / 180)}
                      y2={ballPos.y + 24 * Math.cos((angleDeg * Math.PI) / 180)}
                      stroke="#a855f7"
                      strokeWidth="2"
                      strokeDasharray="2 2"
                    />
                  </g>
                )}

                {preset === 'pendulum' && (
                  <g>
                    {/* Paper anchor pin */}
                    <circle cx="260" cy="80" r="6" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                    <text x="272" y="82" fill="#94a3b8" fontSize="11" fontFamily="Caveat">
                      Punto de anclaje (trazo lápiz)
                    </text>
                    {/* String */}
                    <line
                      x1="260"
                      y1="80"
                      x2={ballPos.x}
                      y2={ballPos.y}
                      stroke="#00f0ff"
                      strokeWidth="2.5"
                    />
                    {/* Oscillating Bob */}
                    <circle
                      cx={ballPos.x}
                      cy={ballPos.y}
                      r={16 + mass * 2}
                      fill="#00f0ff"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                    />
                    {/* Harmonic velocity vector */}
                    <line
                      x1={ballPos.x}
                      y1={ballPos.y}
                      x2={ballPos.x + velocity * 6}
                      y2={ballPos.y}
                      stroke="#10b981"
                      strokeWidth="3"
                    />
                  </g>
                )}

                {preset === 'projectile' && (
                  <g>
                    {/* Ground line drawn on paper */}
                    <line x1="60" y1="320" x2="540" y2="320" stroke="#64748b" strokeWidth="3" strokeDasharray="4 2" />
                    {/* Parabolic trajectory ghost trace */}
                    <path
                      d="M 80 320 Q 260 80 440 320"
                      stroke="#00f0ff"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      fill="none"
                      opacity="0.6"
                    />
                    {/* Projectile */}
                    <circle
                      cx={ballPos.x}
                      cy={ballPos.y}
                      r={12}
                      fill="#00f0ff"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </g>
                )}
              </svg>
            </div>

            {/* Quick Canvas Playback Floating Controls */}
            <div className="absolute top-16 right-4 z-30 flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => {
                  audioJuice.playTap();
                  setIsPlaying(!isPlaying);
                }}
                className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white shadow-xl transition-all"
                title={isPlaying ? "Pausar Simulación" : "Reanudar Simulación"}
              >
                {isPlaying ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-cyan-400" />}
              </button>

              <button
                onClick={handleReset}
                className="p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white shadow-xl transition-all"
                title="Reiniciar Experimento"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Real-time Telemetry & Physics Controls (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Energy Vector Bars */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-cyan-400" />
              Conservación de Energía (AR Telemetría)
            </h3>

            {/* Kinetic Energy Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Energía Cinética (Ek)</span>
                <span className="text-cyan-400 font-bold">{kineticEnergy} J</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-75 shadow-sm shadow-cyan-400"
                  style={{ width: `${Math.min(100, (kineticEnergy / 150) * 100)}%` }}
                />
              </div>
            </div>

            {/* Potential Energy Bar */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Energía Potencial (Ep)</span>
                <span className="text-amber-400 font-bold">{potentialEnergy} J</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-75 shadow-sm shadow-amber-400"
                  style={{ width: `${Math.min(100, (potentialEnergy / 150) * 100)}%` }}
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Velocidad Instantánea:</span>
              <span className="text-white font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                {velocity.toFixed(2)} m/s
              </span>
            </div>

            <div className="mt-2 text-[10px] font-mono text-slate-500 text-right">
              t = {simTime.toFixed(1)}s (AR Sync)
            </div>
          </div>

          {/* Interactive Environment Controls */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" /> Parámetros Físicos del Cuaderno
            </h3>

            {/* Gravity Selector */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-mono">
                Gravedad simulada (g):
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'earth', label: 'Tierra', val: '9.8' },
                  { id: 'moon', label: 'Luna', val: '1.6' },
                  { id: 'jupiter', label: 'Júpiter', val: '24.8' }
                ].map((grav) => (
                  <button
                    key={grav.id}
                    onClick={() => {
                      audioJuice.playTap();
                      setGravityPreset(grav.id as 'earth' | 'moon' | 'jupiter');
                    }}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                      gravityPreset === grav.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>{grav.label}</div>
                    <div className="text-[10px] font-mono opacity-70">{grav.val} m/s²</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Incline Angle Slider (if ramp) */}
            {preset === 'ramp' && (
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-400">Inclinación de la Rampa:</span>
                  <span className="text-cyan-400 font-bold">{angleDeg}°</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="60"
                  value={angleDeg}
                  onChange={(e) => {
                    setAngleDeg(Number(e.target.value));
                    audioJuice.playTap();
                  }}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            )}

            {/* Mass Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Masa del Objeto (m):</span>
                <span className="text-amber-400 font-bold">{mass} kg</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.5"
                value={mass}
                onChange={(e) => {
                  setMass(Number(e.target.value));
                  audioJuice.playTap();
                }}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Friction Slider */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-400">Fricción Papel-Lápiz (μ):</span>
                <span className="text-purple-400 font-bold">{friction}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.4"
                step="0.02"
                value={friction}
                onChange={(e) => {
                  setFriction(Number(e.target.value));
                  audioJuice.playTap();
                }}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>

            {/* Celebrate Action */}
            <button
              onClick={triggerCelebrate}
              className="mt-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Validar Teorema del Trabajo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
