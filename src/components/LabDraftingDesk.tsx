import React, { useState } from 'react';
import { 
  Atom, 
  Zap, 
  GitBranch, 
  Triangle, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Bell, 
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { moduleThemeConfig } from '../data/colorPalette';
import { audioJuice } from '../utils/audioJuice';

interface LabDraftingDeskProps {
  activeModuleId: string | null;
  onSelectModule: (id: string) => void;
  onGoBackToIndex: () => void;
  onOpenPalette: () => void;
}

export const LabDraftingDesk: React.FC<LabDraftingDeskProps> = ({
  activeModuleId,
  onSelectModule,
  onGoBackToIndex,
  onOpenPalette
}) => {
  const [stamped, setStamped] = useState(false);
  const [notified, setNotified] = useState(false);
  const [laserActive, setLaserActive] = useState(true);

  const tabs = [
    { id: 'physics', label: '1. Física', color: '#00f0ff', icon: Atom },
    { id: 'circuits', label: '2. Circuitos', color: '#f59e0b', icon: Zap },
    { id: 'flowcharts', label: '3. Algoritmos', color: '#10b981', icon: GitBranch },
    { id: 'math', label: '4. Geometría', color: '#a855f7', icon: Triangle }
  ];

  const activeModConfig = activeModuleId
    ? moduleThemeConfig[activeModuleId as keyof typeof moduleThemeConfig] || moduleThemeConfig.physics
    : null;

  const handleStamp = () => {
    audioJuice.playBounce(1.5);
    setStamped(true);
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.6 },
        colors: [activeModConfig?.accent || '#00f0ff', '#ef4444', '#ffffff']
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
    <div className="relative w-full min-h-[calc(100vh-64px)] bg-drafting-mat p-3 sm:p-6 md:p-8 flex flex-col items-center justify-start overflow-hidden">
      {/* Top Desk Status Bar: Technical HUD */}
      <div className="w-full max-w-5xl flex items-center justify-between text-xs font-mono text-slate-400 mb-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>MESA DE TRABAJO // WEBAR LOCAL (OFFLINE)</span>
          <span className="hidden md:inline text-slate-600">•</span>
          <span className="hidden md:inline text-slate-500">CALIBRACIÓN: CUADRÍCULA 5.0mm</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              audioJuice.playTap();
              setLaserActive(!laserActive);
            }}
            className="hover:text-cyan-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>LÁSER AR:</span>
            <strong className={laserActive ? 'text-cyan-400' : 'text-slate-600'}>
              {laserActive ? '[ACTIVO]' : '[STANDBY]'}
            </strong>
          </button>

          <button
            onClick={() => {
              audioJuice.playTap();
              onOpenPalette();
            }}
            className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Paleta Técnica</span>
          </button>
        </div>
      </div>

      {/* Main Container: Physical Spiral Notebook */}
      <div className="relative w-full max-w-5xl flex flex-col md:flex-row items-stretch justify-center my-auto">
        
        {/* Left Side: Twin-Ring Metal Spiral Binding Simulation */}
        <div className="hidden md:flex flex-col justify-around py-8 -mr-3 z-30 pointer-events-none select-none">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="flex items-center h-4 my-1">
              {/* Hole punch */}
              <div className="w-3.5 h-3.5 rounded-full bg-[#0a0d14] border border-slate-700 shadow-inner" />
              {/* Silver Wire Loop */}
              <div className="w-6 h-2 rounded-r-full bg-gradient-to-r from-slate-400 via-slate-200 to-slate-500 shadow-md border-t border-white/50 -ml-1" />
            </div>
          ))}
        </div>

        {/* Notebook Body */}
        <div className="relative flex-1 rounded-2xl md:rounded-r-3xl overflow-hidden border border-slate-700/80 shadow-2xl transition-all">
          
          {/* Laser Scanning Beam over Paper */}
          {laserActive && (
            <div className="absolute left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_12px_#00f0ff] z-20 pointer-events-none animate-laser-sweep" />
          )}

          {/* AR Target Markers at corners */}
          <div className="absolute top-2 left-4 text-[10px] font-mono text-cyan-500/70 pointer-events-none z-10">[ + ] 0,0</div>
          <div className="absolute top-2 right-4 text-[10px] font-mono text-cyan-500/70 pointer-events-none z-10">[ + ] 210,0</div>
          <div className="absolute bottom-2 left-4 text-[10px] font-mono text-cyan-500/70 pointer-events-none z-10">[ + ] 0,297</div>
          <div className="absolute bottom-2 right-4 text-[10px] font-mono text-cyan-500/70 pointer-events-none z-10">[ + ] 210,297 DIN-A4</div>

          {/* VIEW A: NOTEBOOK INDEX (4 Real Disciplines Ledger) */}
          {!activeModuleId ? (
            <div className="paper-notebook-sheet p-6 sm:p-10 text-slate-900 min-h-[520px] flex flex-col justify-between">
              <div>
                {/* Official Technical Sheet Header */}
                <div className="border-b-2 border-slate-800/80 pb-4 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-slate-600 uppercase tracking-widest block">
                      Laboratorio de Ciencias Aumentadas • Cuaderno de Campo
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight mt-0.5">
                      Índice de Experimentos
                    </h1>
                  </div>
                  <div className="text-left sm:text-right font-mono text-[11px] text-slate-600">
                    <div>ESCALA: 1:1 REAL</div>
                    <div className="text-cyan-700 font-bold">PAPEL: CUADRÍCULA 5mm</div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 max-w-2xl leading-relaxed mb-6">
                  Dibuja en tu cuaderno real con lápiz de grafito. Selecciona una materia para calibrar el reconocimiento WebAR:
                </p>

                {/* 4 Disciplines Structured Scientific Ledger */}
                <div className="divide-y divide-slate-300 border-y border-slate-400/80">
                  {tabs.map((tab, idx) => {
                    const mod = moduleThemeConfig[tab.id as keyof typeof moduleThemeConfig];
                    const Icon = tab.icon;

                    return (
                      <div
                        key={tab.id}
                        onClick={() => {
                          audioJuice.playPaperFlip();
                          onSelectModule(tab.id);
                        }}
                        className="group py-4 px-3 sm:px-4 flex items-center justify-between gap-4 hover:bg-slate-900/5 transition-all cursor-pointer rounded-xl"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-sm font-black text-slate-400 group-hover:text-slate-900 transition-colors w-6">
                            0{idx + 1}
                          </span>

                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm transition-transform group-hover:scale-110"
                            style={{ 
                              backgroundColor: `${tab.color}18`,
                              borderColor: `${tab.color}80`
                            }}
                          >
                            <Icon className="w-5 h-5" style={{ color: tab.color }} />
                          </div>

                          <div>
                            <h2 className="text-base sm:text-lg font-bold text-slate-950 group-hover:text-cyan-800 transition-colors flex items-center gap-2">
                              {mod.title}
                            </h2>
                            <p className="text-xs text-slate-600 font-hand text-sm mt-0.5">
                              {mod.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span 
                            className="hidden sm:inline-block font-mono text-[11px] font-bold px-2.5 py-1 rounded-md border"
                            style={{ 
                              backgroundColor: `${tab.color}15`, 
                              borderColor: `${tab.color}60`,
                              color: '#0f172a'
                            }}
                          >
                            {mod.badge}
                          </span>
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center group-hover:translate-x-1 transition-transform">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Hand-drawn footnote note in authentic pencil style */}
              <div className="mt-8 pt-4 border-t border-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-600 gap-2">
                <span className="font-hand text-base text-slate-800">
                  Nota de laboratorio: El grafito 2B ofrece el contraste óptimo para la detección óptica en celular.
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  FOLIO #01-A4
                </span>
              </div>
            </div>
          ) : (
            /* VIEW B: BLUEPRINT UNDER CONSTRUCTION SHEET (Módulo en Construcción) */
            <div className="blueprint-sheet p-6 sm:p-10 text-white min-h-[520px] flex flex-col justify-between relative">
              {/* Masking tape on top-left and top-right */}
              <div className="absolute -top-3 left-10 w-24 h-7 masking-tape -rotate-3 pointer-events-none z-10" />
              <div className="absolute -top-3 right-10 w-24 h-7 masking-tape rotate-2 pointer-events-none z-10" />

              <div>
                {/* Back Link */}
                <div className="mb-4">
                  <button
                    onClick={() => {
                      audioJuice.playPaperFlip();
                      onGoBackToIndex();
                    }}
                    className="inline-flex items-center gap-2 text-xs font-mono text-cyan-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>[ ← REGRESAR AL ÍNDICE ]</span>
                  </button>
                </div>

                {/* Blueprint Header */}
                <div className="border-b border-cyan-500/30 pb-4 mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest block">
                      PLANO TÉCNICO // EXPERIMENTO EN DESARROLLO
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-0.5">
                      {activeModConfig?.title}
                    </h2>
                  </div>

                  <div className="font-mono text-[11px] text-cyan-300">
                    <div>EXP-ID: #{activeModuleId.toUpperCase()}-2026</div>
                    <div className="text-amber-400 font-bold">ESTADO: EN CONSTRUCCIÓN</div>
                  </div>
                </div>

                {/* Main Construction Notice */}
                <div className="relative border border-cyan-500/30 rounded-xl p-6 bg-slate-950/60 my-6">
                  {/* Red Rubber Stamp Imprint */}
                  {stamped && (
                    <div className="absolute top-4 right-4 ink-stamp px-3 py-1 text-xs rotate-6 animate-scaleIn pointer-events-none">
                      APROBADO PARA PRODUCCIÓN
                    </div>
                  )}

                  <h3 className="text-lg font-bold text-white mb-2">
                    Calibrando la Detección sobre Papel
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                    Este módulo está en fase de trazado técnico. El motor WebAR está siendo ajustado para proyectar las simulaciones de {activeModConfig?.title} directamente sobre el grafito de tu libreta.
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                    <span>Ensamblaje del modelo de visión:</span>
                    <strong className="text-cyan-400">78% Completado</strong>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-cyan-400 transition-all duration-700"
                      style={{ width: '78%' }}
                    />
                  </div>
                </div>

                {/* Action Buttons with Game Juice */}
                <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
                  <button
                    onClick={handleStamp}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-red-500/50 hover:border-red-400 bg-red-950/40 text-red-200 text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer shadow-md"
                  >
                    <span>{stamped ? '✓ Plano Sellado' : 'Estampar Sello de Aprobación'}</span>
                  </button>

                  <button
                    onClick={handleNotify}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md shadow-cyan-400/20"
                  >
                    {notified ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>¡Te notificaremos!</span>
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

              {/* Bottom Blueprint Footer */}
              <div className="mt-8 pt-4 border-t border-cyan-500/30 flex items-center justify-between text-[11px] font-mono text-cyan-400/70">
                <span>PAPERLAB WEBAR OFFLINE ARCHITECTURE</span>
                <span>HOJA TÉCNICA DIN-A4</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Physical Divider Tabs (Pestañas de Separador) */}
        <div className="flex md:flex-col justify-start gap-1.5 md:gap-2 mt-3 md:mt-12 md:-ml-1 z-30">
          {tabs.map((tab) => {
            const isCurrent = activeModuleId === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  audioJuice.playPaperFlip();
                  onSelectModule(tab.id);
                }}
                className={`flex items-center gap-2 px-3 py-2 md:py-2.5 rounded-b-xl md:rounded-b-none md:rounded-r-xl font-mono text-xs font-bold transition-all shadow-md cursor-pointer border ${
                  isCurrent
                    ? 'bg-slate-900 text-white border-cyan-400 translate-x-1'
                    : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
                style={{
                  borderLeftColor: tab.color,
                  borderLeftWidth: 3
                }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: tab.color }} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

