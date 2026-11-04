import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, 
  ChevronRight, 
  ChevronLeft, 
  RotateCcw, 
  Upload, 
  CheckCircle2, 
  Sparkles,
  Camera
} from 'lucide-react';
import { EquationSolverEngine } from '../../simulators/math/EquationSolverEngine';
import { getDefaultPaperStyle } from '../../services/paperTextureSampler';

interface ARSimulatorViewProps {
  initialExerciseId?: string;
  sourceImage?: string | null;
  onBack: () => void;
}

export const ARSimulatorView: React.FC<ARSimulatorViewProps> = ({ 
  sourceImage = null,
  onBack 
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Active notebook photo (either passed from camera view, uploaded here, or default sample)
  const [activePhoto, setActivePhoto] = useState<string | null>(sourceImage);

  // Discrete Step: 1 to 5
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 5;

  // Selected equation coefficients (defaults to 2x² - 7x + 3 = 0 from canonical rubric)
  const [coeffs, setCoeffs] = useState<{ a: number; b: number; c: number }>({ a: 2, b: -7, c: 3 });

  // Engine instance for mathematical resolution
  const [solver] = useState(() => new EquationSolverEngine(getDefaultPaperStyle(), coeffs));
  const stepDetail = solver.getStepDetail(currentStep);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setActivePhoto(dataUrl);
      setCurrentStep(1);
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleReset = () => {
    setCurrentStep(1);
  };

  const handleChangeEquation = (a: number, b: number, c: number) => {
    setCoeffs({ a, b, c });
    solver.setCoefficients(a, b, c);
    setCurrentStep(1);
  };

  return (
    <div className="relative w-full h-[calc(100vh-56px)] bg-[#070a11] overflow-hidden flex flex-col select-none text-white font-sans animate-entrance">
      {/* Hidden file input for photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* TOP BAR: Clean, minimal */}
      <div className="relative z-30 w-full px-4 sm:px-6 py-3 flex items-center justify-between border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white text-xs font-telemetry transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Volver</span>
          </button>

          <div>
            <h2 className="font-display font-bold text-sm sm:text-base text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Solver de Ecuaciones AR</span>
            </h2>
          </div>
        </div>

        {/* Quick Actions: Upload photo & Preset Equations */}
        <div className="flex items-center gap-2 font-telemetry text-xs">
          {/* Equation switcher */}
          <select
            value={`${coeffs.a},${coeffs.b},${coeffs.c}`}
            onChange={(e) => {
              const [a, b, c] = e.target.value.split(',').map(Number);
              handleChangeEquation(a, b, c);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs focus:outline-none cursor-pointer"
          >
            <option value="2,-7,3">2x² - 7x + 3 = 0 (Aspa Simple)</option>
            <option value="1,-5,6">x² - 5x + 6 = 0</option>
            <option value="1,-6,9">x² - 6x + 9 = 0 (Δ = 0)</option>
            <option value="1,2,5">x² + 2x + 5 = 0 (Δ &lt; 0)</option>
          </select>

          {/* Subir foto button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs transition-all cursor-pointer shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Subir Foto de Cuaderno</span>
          </button>
        </div>
      </div>

      {/* MAIN VIEWPORT: RESOLVING DIRECTLY ON TOP OF THE NOTEBOOK PHOTO */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center p-2 sm:p-6 bg-slate-950">
        
        {/* CONTAINER FOR THE PHYSICAL NOTEBOOK PHOTO + AR RESOLUTION OVERLAY */}
        <div className="relative w-full max-w-4xl h-full max-h-[580px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center bg-[#faf7ee]">
          
          {/* If the user uploaded a photo, render the photo */}
          {activePhoto ? (
            <img
              src={activePhoto}
              alt="Cuaderno físico"
              className="absolute inset-0 w-full h-full object-contain z-0"
            />
          ) : (
            /* Built-in realistic physical notebook page with graphite equation 2x² - 7x + 3 = 0 */
            <div className="absolute inset-0 w-full h-full bg-[#f6f2e6] bg-notebook-grid z-0 flex flex-col justify-start p-8 sm:p-12 text-slate-800">
              {/* Notebook margin line */}
              <div className="absolute top-0 bottom-0 left-10 sm:left-16 w-0.5 bg-rose-400/50" />
              
              <div className="pl-6 sm:pl-10">
                <span className="text-[11px] font-telemetry text-slate-400 uppercase tracking-widest block mb-4">
                  // CUADERNO FÍSICO — TRAZO A LÁPIZ HB/2B
                </span>
                
                {/* Handwritten equation styling */}
                <div className="font-display font-black text-4xl sm:text-6xl text-slate-800 tracking-wider py-4 select-none drop-shadow-xs">
                  {coeffs.a !== 1 ? coeffs.a : ''}x² {coeffs.b < 0 ? `- ${Math.abs(coeffs.b)}` : `+ ${coeffs.b}`}x {coeffs.c < 0 ? `- ${Math.abs(coeffs.c)}` : `+ ${coeffs.c}`} = 0
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* HOLOGRAPHIC AR LAYER PROJECTED DIRECTLY OVER THE PAPER   */}
          {/* ======================================================== */}
          <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-8 pointer-events-none">
            
            {/* Top Indicator */}
            <div className="flex justify-between items-center text-xs font-telemetry">
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-cyan-500/40 text-cyan-300 font-bold backdrop-blur-md">
                Resolución WebAR sobre el Papel
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-700 text-slate-300 backdrop-blur-md">
                Paso {currentStep} de {totalSteps}
              </span>
            </div>

            {/* CENTRAL AR PROJECTIONS (ACCORDING TO STEP) */}
            <div className="my-auto flex flex-col items-center justify-center gap-3">
              
              {/* STEP 1: Coefficient brackets locked on paper terms */}
              {currentStep === 1 && (
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 animate-entrance">
                  <div className="px-4 py-2.5 rounded-xl bg-slate-950/90 border-2 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.4)] text-center backdrop-blur-md">
                    <span className="text-[10px] font-telemetry text-slate-400 block uppercase">Término Cuadrático</span>
                    <strong className="text-xl sm:text-2xl font-mono text-cyan-400 font-bold">a = {coeffs.a}</strong>
                  </div>

                  <div className="px-4 py-2.5 rounded-xl bg-slate-950/90 border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] text-center backdrop-blur-md">
                    <span className="text-[10px] font-telemetry text-slate-400 block uppercase">Término Lineal</span>
                    <strong className="text-xl sm:text-2xl font-mono text-amber-400 font-bold">b = {coeffs.b}</strong>
                  </div>

                  <div className="px-4 py-2.5 rounded-xl bg-slate-950/90 border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] text-center backdrop-blur-md">
                    <span className="text-[10px] font-telemetry text-slate-400 block uppercase">Término Independiente</span>
                    <strong className="text-xl sm:text-2xl font-mono text-emerald-400 font-bold">c = {coeffs.c}</strong>
                  </div>
                </div>
              )}

              {/* STEP 2: Discriminant computation */}
              {currentStep === 2 && (
                <div className="p-5 rounded-2xl bg-slate-950/90 border-2 border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.4)] text-center backdrop-blur-md max-w-md animate-entrance">
                  <span className="text-xs font-telemetry text-cyan-300 font-bold tracking-wider block mb-1">
                    CÁLCULO DEL DISCRIMINANTE (Δ)
                  </span>
                  <div className="text-lg sm:text-2xl font-mono font-black text-white py-1">
                    Δ = ({coeffs.b})² - 4({coeffs.a})({coeffs.c}) = {stepDetail.hudTelemetry.discriminante_Delta}
                  </div>
                  <div className="mt-2 text-xs font-telemetry text-emerald-400 font-bold border-t border-slate-800 pt-2 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{stepDetail.hudTelemetry.numero_soluciones}</span>
                  </div>
                </div>
              )}

              {/* STEP 3: ASPA SIMPLE HOLOGRÁFICA */}
              {currentStep === 3 && (
                <div className="p-6 rounded-2xl bg-slate-950/95 border-2 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)] text-center backdrop-blur-md max-w-lg animate-entrance">
                  <span className="text-xs font-telemetry text-amber-400 font-bold tracking-wider block mb-3">
                    MÉTODO DEL ASPA SIMPLE HOLOGRÁFICO
                  </span>

                  {/* The Cross Scheme */}
                  <div className="grid grid-cols-3 gap-3 items-center text-center font-mono text-base sm:text-lg mb-4">
                    {/* Left Column (Factors of a) */}
                    <div className="space-y-4 font-bold text-cyan-300">
                      <div className="p-2 rounded-lg bg-slate-900 border border-cyan-500/40">2x</div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-cyan-500/40">1x</div>
                    </div>

                    {/* Middle Cross Multiplication (X) with Glowing Lines */}
                    <div className="flex flex-col items-center justify-center text-amber-400 font-black text-3xl leading-none select-none">
                      <div className="relative w-16 h-20 flex items-center justify-center">
                        {/* SVG Glowing Aspa Cross Lines */}
                        <svg className="w-full h-full" viewBox="0 0 60 70">
                          <line x1="5" y1="15" x2="55" y2="55" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" className="animate-pulse" />
                          <line x1="5" y1="55" x2="55" y2="15" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" className="animate-pulse" />
                        </svg>
                      </div>
                    </div>

                    {/* Right Column (Factors of c) */}
                    <div className="space-y-4 font-bold text-amber-300">
                      <div className="p-2 rounded-lg bg-slate-900 border border-amber-500/40">-1</div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-amber-500/40">-3</div>
                    </div>
                  </div>

                  {/* Sum Verification Banner */}
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/60 font-mono text-xs sm:text-sm text-emerald-300 flex items-center justify-between">
                    <span>(2x)(-3) + (1x)(-1) = -6x - x:</span>
                    <strong className="text-emerald-400 font-black text-base">= -7x ✓</strong>
                  </div>
                </div>
              )}

              {/* STEP 4: Factor Equalization */}
              {currentStep === 4 && (
                <div className="p-5 rounded-2xl bg-slate-950/90 border-2 border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.4)] text-center backdrop-blur-md max-w-lg animate-entrance">
                  <span className="text-xs font-telemetry text-cyan-300 font-bold tracking-wider block mb-2">
                    FACTORES BINOMIOS IGUALADOS A CERO
                  </span>

                  <div className="font-mono text-xl sm:text-2xl font-black text-amber-300 mb-3">
                    (2x - 1)(x - 3) = 0
                  </div>

                  <div className="grid grid-cols-2 gap-3 font-mono text-xs sm:text-sm">
                    <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300">
                      <div>2x - 1 = 0</div>
                      <strong className="text-lg text-white block mt-1">x₁ = 1/2</strong>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300">
                      <div>x - 3 = 0</div>
                      <strong className="text-lg text-white block mt-1">x₂ = 3</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Conjunto Solución Box */}
              {currentStep === 5 && (
                <div className="p-6 rounded-2xl bg-slate-950/95 border-2 border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.5)] text-center backdrop-blur-md max-w-md animate-entrance">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 mx-auto mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-telemetry text-emerald-400 font-bold tracking-wider block mb-1">
                    CONJUNTO SOLUCIÓN VERIFICADO (C.S.)
                  </span>
                  <div className="text-2xl sm:text-4xl font-mono font-black text-white py-2">
                    {stepDetail.hudTelemetry.conjunto_solucion_CS}
                  </div>
                  <p className="text-xs text-slate-300 mt-2 font-telemetry">
                    Ecuación resuelta y proyectada sobre el cuaderno físico.
                  </p>
                </div>
              )}
            </div>

            {/* Explanation card at bottom of AR container */}
            <div className="p-3 rounded-xl bg-slate-950/85 border border-slate-800 text-center backdrop-blur-md">
              <span className="text-xs sm:text-sm text-slate-200 font-medium">
                {stepDetail.explanation}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROL DECK: STEP BY STEP NAVIGATION ONLY */}
      <div className="relative z-30 w-full px-4 sm:px-8 py-3.5 bg-slate-950 border-t border-slate-800 font-telemetry text-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          
          {/* Reset */}
          <button
            onClick={handleReset}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
            title="Reiniciar a Paso 1"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Reiniciar</span>
          </button>

          {/* Stepper buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentStep <= 1}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-700 text-slate-200 transition-all cursor-pointer flex items-center gap-1.5 font-bold"
            >
              <ChevronLeft className="w-4 h-4 text-cyan-400" />
              <span>Anterior</span>
            </button>

            {/* Direct step number pills */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {[1, 2, 3, 4, 5].map((step) => (
                <button
                  key={step}
                  onClick={() => setCurrentStep(step)}
                  className={`w-7 h-7 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center ${
                    step === currentStep
                      ? 'bg-cyan-400 text-slate-950 shadow-md scale-105'
                      : step < currentStep
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {step}
                </button>
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={currentStep >= totalSteps}
              className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>

          {/* Toggle sample paper vs upload photo */}
          <button
            onClick={() => {
              if (activePhoto) {
                setActivePhoto(null);
              } else {
                fileInputRef.current?.click();
              }
            }}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs transition-colors cursor-pointer flex items-center gap-1.5"
            title={activePhoto ? "Ver cuaderno de muestra" : "Subir tu propia foto"}
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{activePhoto ? 'Ver Muestra' : 'Mi Foto'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
