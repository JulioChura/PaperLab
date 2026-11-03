import React, { useState } from 'react';
import { 
  Triangle, 
  Sparkles, 
  Activity
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioJuice } from '../../utils/audioJuice';
import { AROverlayHUD } from '../AROverlayHUD';

interface MathModuleProps {
  isRealCamera: boolean;
  onToggleRealCamera: () => void;
}

export const MathModule: React.FC<MathModuleProps> = ({
  isRealCamera,
  onToggleRealCamera
}) => {
  const [subMode, setSubMode] = useState<'pythagoras' | 'trigonometry' | 'functions'>('pythagoras');
  
  // Pythagoras state
  const [sideA, setSideA] = useState<number>(3); // Cateto A
  const [sideB, setSideB] = useState<number>(4); // Cateto B

  // Trigonometry state
  const [angleDeg, setAngleDeg] = useState<number>(45);

  // Pythagoras calculations
  const sideC = Math.sqrt(sideA * sideA + sideB * sideB);
  const areaA = sideA * sideA;
  const areaB = sideB * sideB;
  const areaC = areaA + areaB;

  // Angles in degrees
  const angleAlpha = Math.round((Math.atan(sideA / sideB) * 180) / Math.PI);
  const angleBeta = 90 - angleAlpha;

  // Trigonometry calculations
  const rad = (angleDeg * Math.PI) / 180;
  const sinVal = Math.sin(rad);
  const cosVal = Math.cos(rad);
  const tanVal = Math.tan(rad);

  const triggerCelebrate = () => {
    audioJuice.playSuccess();
    try {
      confetti({
        particleCount: 65,
        spread: 80,
        origin: { y: 0.65 },
        colors: ['#a855f7', '#c084fc', '#00f0ff', '#ffffff']
      });
    } catch {
      // failsafe
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-400/20 text-purple-300 border border-purple-400/30">
              <Triangle className="w-5 h-5" />
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Matemáticas & Geometría Holográfica
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-400 border border-purple-800">
              Pitágoras 3D
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Traza triángulos y ejes cartesianos con regla y lápiz en tu hoja cuadriculada. PaperLab proyecta las áreas de Pitágoras y calcula ángulos en tiempo real.
          </p>
        </div>

        {/* Mode selector */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
          {[
            { id: 'pythagoras', label: 'Pitágoras Visual' },
            { id: 'trigonometry', label: 'Círculo Trigonométrico' },
            { id: 'functions', label: 'Funciones f(x)' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                audioJuice.playPaperFlip();
                setSubMode(tab.id as 'pythagoras' | 'trigonometry' | 'functions');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                subMode === tab.id
                  ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Viewfinder & Dynamic Math Geometry Canvas (8 cols) */}
        <div className="lg:col-span-8 relative">
          <div className="relative rounded-3xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl min-h-[480px]">
            <AROverlayHUD
              moduleName="Geometría Euclidiana"
              accentColor="#a855f7"
              isRealCamera={isRealCamera}
              onToggleRealCamera={onToggleRealCamera}
            />

            {/* Geometric Proof Overlay */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 600 420" fill="none">
                {subMode === 'pythagoras' && (
                  <g transform="translate(180, 190)">
                    {/* Scale factor for drawing */}
                    {(() => {
                      const scale = 26;
                      const aPx = sideA * scale;
                      const bPx = sideB * scale;

                      return (
                        <>
                          {/* Square on side B (bottom) */}
                          <rect
                            x={0}
                            y={0}
                            width={bPx}
                            height={bPx}
                            fill="rgba(56, 189, 248, 0.15)"
                            stroke="#38bdf8"
                            strokeWidth="2"
                            strokeDasharray="4 2"
                          />
                          <text x={bPx / 2 - 18} y={bPx / 2 + 5} fill="#38bdf8" fontSize="13" fontFamily="JetBrains Mono" fontWeight="bold">
                            b² = {areaB}
                          </text>

                          {/* Square on side A (left) */}
                          <rect
                            x={-aPx}
                            y={-aPx}
                            width={aPx}
                            height={aPx}
                            fill="rgba(245, 158, 11, 0.15)"
                            stroke="#f59e0b"
                            strokeWidth="2"
                            strokeDasharray="4 2"
                          />
                          <text x={-aPx / 2 - 18} y={-aPx / 2 + 5} fill="#f59e0b" fontSize="13" fontFamily="JetBrains Mono" fontWeight="bold">
                            a² = {areaA}
                          </text>

                          {/* Central Right Triangle drawn on paper */}
                          <polygon
                            points={`0,0 ${bPx},0 0,${-aPx}`}
                            fill="rgba(168, 85, 247, 0.25)"
                            stroke="#ffffff"
                            strokeWidth="3.5"
                          />

                          {/* Right Angle Marker */}
                          <rect x="0" y="-14" width="14" height="14" stroke="#a855f7" strokeWidth="2" fill="none" />

                          {/* Angle alpha & beta arcs */}
                          <text x={bPx - 42} y="-8" fill="#c084fc" fontSize="11" fontFamily="Caveat" fontWeight="bold">
                            α={angleAlpha}° β={angleBeta}°
                          </text>

                          {/* Hypotenuse label (c) */}
                          <text x={bPx / 2 - 10} y={-aPx / 2 - 12} fill="#ffffff" fontSize="14" fontFamily="JetBrains Mono" fontWeight="bold">
                            c = {sideC.toFixed(2)}
                          </text>

                          {/* Projected Hypotenuse Area c^2 note */}
                          <text x={bPx + 15} y={-aPx / 2} fill="#c084fc" fontSize="13" fontFamily="Caveat" fontWeight="bold">
                            c² = {areaC} (¡{areaA} + {areaB}!)
                          </text>
                        </>
                      );
                    })()}
                  </g>
                )}

                {subMode === 'trigonometry' && (
                  <g transform="translate(300, 210)">
                    {/* Unit Circle */}
                    <circle cx="0" cy="0" r="120" stroke="#64748b" strokeWidth="2" strokeDasharray="4 2" fill="none" />
                    {/* Cartesian axes */}
                    <line x1="-150" y1="0" x2="150" y2="0" stroke="#64748b" strokeWidth="1.5" />
                    <line x1="0" y1="-150" x2="0" y2="150" stroke="#64748b" strokeWidth="1.5" />

                    {/* Radius Vector */}
                    {(() => {
                      const px = 120 * cosVal;
                      const py = -120 * sinVal;

                      return (
                        <>
                          <line x1="0" y1="0" x2={px} y2={py} stroke="#ffffff" strokeWidth="3" />
                          <circle cx={px} cy={py} r="6" fill="#a855f7" stroke="#ffffff" strokeWidth="2" />

                          {/* Cosine line (Horizontal) */}
                          <line x1="0" y1="0" x2={px} y2="0" stroke="#f59e0b" strokeWidth="3" />
                          <text x={px / 2 - 15} y="18" fill="#f59e0b" fontSize="12" fontFamily="JetBrains Mono" fontWeight="bold">
                            cos = {cosVal.toFixed(2)}
                          </text>

                          {/* Sine line (Vertical) */}
                          <line x1={px} y1="0" x2={px} y2={py} stroke="#00f0ff" strokeWidth="3" />
                          <text x={px + 8} y={py / 2} fill="#00f0ff" fontSize="12" fontFamily="JetBrains Mono" fontWeight="bold">
                            sin = {sinVal.toFixed(2)}
                          </text>

                          {/* Angle arc */}
                          <path d="M 30 0 A 30 30 0 0 0 25 -15" stroke="#a855f7" strokeWidth="2" fill="none" />
                          <text x="36" y="-10" fill="#a855f7" fontSize="12" fontFamily="Caveat" fontWeight="bold">
                            θ = {angleDeg}°
                          </text>
                        </>
                      );
                    })()}
                  </g>
                )}

                {subMode === 'functions' && (
                  <g transform="translate(100, 210)">
                    {/* Cartesian grid */}
                    <line x1="0" y1="0" x2="420" y2="0" stroke="#64748b" strokeWidth="2" />
                    <line x1="210" y1="-140" x2="210" y2="140" stroke="#64748b" strokeWidth="2" />
                    <text x="405" y="-10" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono">X</text>
                    <text x="218" y="-125" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono">Y = sin(x)</text>

                    {/* Sinewave plot on paper */}
                    <path
                      d={Array.from({ length: 420 }, (_, i) => {
                        const x = i;
                        const y = -Math.sin((x - 210) * 0.04) * 80;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')}
                      stroke="#a855f7"
                      strokeWidth="3.5"
                      fill="none"
                    />
                  </g>
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* Right: Interactive Sliders & Proof Verification (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Proof Summary Card */}
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-purple-400" />
              Demostración en Tiempo Real
            </h3>

            {subMode === 'pythagoras' ? (
              <div>
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 mb-4">
                  <div className="text-[11px] text-slate-400 font-mono">Ecuación Fundamental:</div>
                  <div className="text-xl font-mono font-black text-purple-300 mt-0.5">
                    a² + b² = c²
                  </div>
                  <div className="text-xs font-mono text-cyan-400 mt-1">
                    {areaA} + {areaB} = <strong className="text-white">{areaC}</strong>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-amber-400">Cateto a:</span>
                      <span className="text-white font-bold">{sideA} cm</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="7"
                      value={sideA}
                      onChange={(e) => {
                        setSideA(Number(e.target.value));
                        audioJuice.playTap();
                      }}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-cyan-400">Cateto b:</span>
                      <span className="text-white font-bold">{sideB} cm</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="7"
                      value={sideB}
                      onChange={(e) => {
                        setSideB(Number(e.target.value));
                        audioJuice.playTap();
                      }}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 mb-4 space-y-1 font-mono text-xs">
                  <div className="text-cyan-300">sen({angleDeg}°) = {sinVal.toFixed(3)}</div>
                  <div className="text-amber-300">cos({angleDeg}°) = {cosVal.toFixed(3)}</div>
                  <div className="text-purple-300">tan({angleDeg}°) = {tanVal.toFixed(3)}</div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-400">Ángulo (θ):</span>
                    <span className="text-purple-400 font-bold">{angleDeg}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={angleDeg}
                    onChange={(e) => {
                      setAngleDeg(Number(e.target.value));
                      audioJuice.playTap();
                    }}
                    className="w-full accent-purple-400 cursor-pointer"
                  />
                </div>
              </div>
            )}

            <button
              onClick={triggerCelebrate}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Validar Teorema de Euclides</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
