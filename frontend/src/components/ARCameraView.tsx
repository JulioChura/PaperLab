import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  SwitchCamera,
  CheckCircle2,
  AlertCircle,
  Upload,
  Sparkles,
  X,
  Code,
  Image as ImageIcon,
} from 'lucide-react';
import { moduleThemeConfig } from '../data/colorPalette';
import { audioJuice } from '../utils/audioJuice';
import { analyzeDrawing } from '../services/analysisApi';
import type { ClassificationResult } from '../services/analysisApi';
import { analyzePaper, type NormRect } from '../ar/paperVision';
import { planFromEquation, planFromFunction, type SolutionPlan } from '../ar/mathEngine';
import { compileTargetFromCanvas, loadMindAR } from '../ar/mindar';
import type { HybridPaperTracker } from '../ar/paperTracker';
import type { ARSolverSession } from './ARSolver/ARSolverOverlay';

// El motor AR (Three.js, rough.js, jsfeat) se carga aparte para no pesar en el menú
const loadArOverlay = () => import('./ARSolver/ARSolverOverlay');
const loadTracker = () => import('../ar/paperTracker');
const ARSolverOverlay = lazy(() => loadArOverlay().then((m) => ({ default: m.ARSolverOverlay })));

interface ARCameraViewProps {
  moduleId: string;
  onBack: () => void;
}

type Phase = 'live' | 'scanning' | 'ar';

const MAX_FRAME = 1600;
// Tamaño del objetivo MindAR y de la entrada de seguimiento (deben coincidir: escala 1:1)
const TARGET_MAX = 640;

function scaledCanvas(source: CanvasImageSource, sw: number, sh: number, maxDim: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDim / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function buildPlan(result: ClassificationResult): SolutionPlan | null {
  const data = result.parameters as Record<string, unknown>;
  if (result.exercise_type === 'equation_solver') return planFromEquation(data);
  if (result.exercise_type === 'function_graph') return planFromFunction(data);
  return null;
}

let sessionCounter = 0;

/**
 * Modo por defecto: FOTO CONGELADA. Al escanear se congela la captura y la solución se escribe sobre
 * ella (100% estable). El rastreo en vivo (flujo óptico + MindAR) es experimental: se activa con `?ar=live`.
 */
const LIVE_TRACKING = new URLSearchParams(window.location.search).get('ar') === 'live';

export const ARCameraView: React.FC<ARCameraViewProps> = ({ moduleId, onBack }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const frozenRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const trackerRef = useRef<HybridPaperTracker | null>(null);

  const [streamStatus, setStreamStatus] = useState<'requesting' | 'active' | 'denied' | 'simulated'>('requesting');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [streamError, setStreamError] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  /** Fotograma congelado tras escanear con la cámara (modo foto fija). */
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>('live');
  const [analysisError, setAnalysisError] = useState<string>('');
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);
  const [arSession, setArSession] = useState<ARSolverSession | null>(null);
  const [compileProgress, setCompileProgress] = useState<number | null>(null);
  const [shutter, setShutter] = useState<{ key: number; thumb: string } | null>(null);

  const mod = moduleThemeConfig[moduleId as keyof typeof moduleThemeConfig] || moduleThemeConfig.physics;
  const supportsArSolver = moduleId === 'math';

  useEffect(() => () => trackerRef.current?.dispose(), []);

  // Pre-carga MindAR mientras el alumno encuadra (no bloquea la UI)
  useEffect(() => {
    if (!supportsArSolver) return;
    loadMindAR().catch(() => undefined);
    loadArOverlay().catch(() => undefined);
    loadTracker().catch(() => undefined);
  }, [supportsArSolver]);

  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('La API de cámara no es compatible con este navegador (se requiere HTTPS en el celular).');
      }
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setStreamStatus('active');
        };
      }
    } catch (err: unknown) {
      console.warn('Camera permission or device error:', err);
      setStreamError(err instanceof Error ? err.message : 'No se pudo acceder a la cámara.');
      setStreamStatus('denied');
    }
  }, []);

  useEffect(() => {
    const currentVideo = videoRef.current;
    // La petición de cámara es asíncrona; el estado se actualiza en sus callbacks
    void startCamera(facingMode);
    return () => {
      if (currentVideo?.srcObject) {
        (currentVideo.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, startCamera]);

  const disposeTracker = () => {
    trackerRef.current?.dispose();
    trackerRef.current = null;
  };

  const resetAr = () => {
    disposeTracker();
    setArSession(null);
    setCompileProgress(null);
    setClassificationResult(null);
    setAnalysisError('');
    setFrozenFrame(null);
    setPhase('live');
  };

  const handleToggleFacing = () => {
    audioJuice.playTap();
    resetAr();
    setStreamStatus('requesting');
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleUseSimulator = () => {
    audioJuice.playPaperFlip();
    setStreamStatus('simulated');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    audioJuice.playPaperFlip();
    const reader = new FileReader();
    reader.onload = (e) => {
      resetAr();
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearUploadedImage = () => {
    audioJuice.playTap();
    resetAr();
    setUploadedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /** Toma el fotograma actual SIN detener el video. */
  const captureFrame = (): HTMLCanvasElement | null => {
    if (uploadedImage && imageRef.current?.naturalWidth) {
      const img = imageRef.current;
      return scaledCanvas(img, img.naturalWidth, img.naturalHeight, MAX_FRAME);
    }
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || streamStatus !== 'active') return null;
    return scaledCanvas(video, video.videoWidth, video.videoHeight, MAX_FRAME);
  };

  const handleAnalyze = async () => {
    if (phase === 'scanning') return;
    audioJuice.playLaserScan();
    setAnalysisError('');
    setClassificationResult(null);
    setArSession(null);

    const frame = captureFrame();
    if (!frame) {
      setAnalysisError('No hay imagen disponible. Enfoca tu cuaderno con la cámara o sube una foto.');
      return;
    }
    const dataUrl = frame.toDataURL('image/jpeg', 0.9);
    setShutter({ key: Date.now(), thumb: dataUrl });
    setPhase('scanning');

    const live = !uploadedImage && !!videoRef.current;
    // Modo foto fija: la captura se congela en pantalla con el mismo encuadre que el video
    const freeze = live && !LIVE_TRACKING;
    if (freeze) setFrozenFrame(dataUrl);
    const space = scaledCanvas(frame, frame.width, frame.height, TARGET_MAX);
    disposeTracker();
    let tracker: HybridPaperTracker | null = null;
    // Experimental (?ar=live): la hoja se rastrea DESDE este instante mientras la IA analiza
    if (supportsArSolver && live && !freeze && videoRef.current) {
      const { HybridPaperTracker } = await loadTracker();
      tracker = new HybridPaperTracker(videoRef.current, space);
      trackerRef.current = tracker;
      setCompileProgress(0);
      const owner = tracker;
      compileTargetFromCanvas(space, (p) => setCompileProgress(p))
        .then((buffer) => owner.attachMindAR(buffer))
        .catch((err) => console.warn('[PaperLab AR] No se pudo compilar el objetivo MindAR:', err));
    }

    try {
      const result = await analyzeDrawing(dataUrl, moduleId);
      console.info('[PaperLab AI] Ejercicio identificado:', result.exercise_type, result.parameters);
      const plan = supportsArSolver ? buildPlan(result) : null;
      const media = freeze ? frozenRef.current : live ? videoRef.current : imageRef.current;

      if (plan && media) {
        const box = result.bounding_boxes[0];
        const hint: NormRect | null = box ? { x: box.x, y: box.y, w: box.width, h: box.height } : null;
        const profile = analyzePaper(frame, hint);
        setArSession({
          id: ++sessionCounter,
          media: {
            element: media,
            fit: live ? 'cover' : 'contain', // la foto congelada usa object-cover, igual que el video
            width: frame.width,
            height: frame.height,
          },
          profile,
          plan,
          space: { width: space.width, height: space.height },
          tracker,
        });
        setPhase('ar');
      } else {
        disposeTracker();
        setFrozenFrame(null);
        setClassificationResult(result);
        setPhase('live');
      }
    } catch (err: unknown) {
      disposeTracker();
      setFrozenFrame(null);
      setAnalysisError(err instanceof Error ? err.message : 'Error desconocido al analizar la imagen.');
      setCompileProgress(null);
      setPhase('live');
      console.error('[PaperLab AI] Error en clasificación:', err);
    }
  };

  const isScanning = phase === 'scanning';
  const inAr = phase === 'ar' && arSession;

  return (
    <div className="relative w-full h-[calc(100vh-56px)] bg-black overflow-hidden flex flex-col select-none">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

      {/* Cámara en vivo: nunca se detiene, ni al capturar ni durante la fase AR */}
      {!uploadedImage && (
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            streamStatus === 'active' ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Foto congelada: misma posición y encuadre que el video (object-cover) */}
      {frozenFrame && !uploadedImage && (
        <img
          ref={frozenRef}
          src={frozenFrame}
          alt="Captura del cuaderno"
          className="absolute inset-0 w-full h-full object-cover animate-freeze-in"
        />
      )}

      {/* Foto subida */}
      {uploadedImage && (
        <img
          ref={imageRef}
          src={uploadedImage}
          alt="Cuaderno subido"
          className="absolute inset-0 w-full h-full object-contain bg-slate-950"
        />
      )}

      {/* Capa AR (mezcla multiplicativa con el video) */}
      {inAr && (
        <Suspense fallback={null}>
        <ARSolverOverlay
          key={arSession.id}
          session={arSession}
          accent={mod.accent}
          mindarProgress={compileProgress}
          onRescan={() => {
            audioJuice.playTap();
            resetAr();
          }}
        />
        </Suspense>
      )}

      {uploadedImage && (
        <div className="absolute top-16 right-4 z-20 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-600 text-slate-200 font-telemetry text-xs flex items-center gap-2 backdrop-blur-md">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Foto del cuaderno</span>
          <button onClick={handleClearUploadedImage} className="ml-1 hover:text-white cursor-pointer" title="Volver a la cámara">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Obturador: destello suave + miniatura de la captura (el video sigue corriendo) */}
      {shutter && (
        <React.Fragment key={shutter.key}>
          <div className="absolute inset-0 z-20 pointer-events-none bg-white animate-shutter-flash" />
          <div className="absolute top-16 right-4 z-30 pointer-events-none animate-capture-thumb">
            <img
              src={shutter.thumb}
              alt=""
              className="w-24 sm:w-32 rounded-md border-2 border-white shadow-2xl rotate-2"
            />
          </div>
        </React.Fragment>
      )}

      {!uploadedImage && streamStatus === 'simulated' && (
        <div className="absolute inset-0 bg-[#f7f4ea] dark:bg-[#070a11] bg-notebook-grid z-0">
          <div className="absolute top-0 left-12 bottom-0 w-[1.5px] bg-red-400/50" />
          <div className="absolute top-8 left-16 text-xs font-telemetry text-slate-500">
            // CUADERNO SIMULADO · sube una foto para analizar
          </div>
        </div>
      )}

      {!uploadedImage && streamStatus === 'requesting' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/85 backdrop-blur-md text-center text-white">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center mb-4 text-cyan-400 animate-pulse">
            <Camera className="w-8 h-8" />
          </div>
          <h2 className="font-display font-bold text-2xl mb-2">Activando cámara…</h2>
          <p className="text-sm font-telemetry text-slate-400 max-w-sm mb-6">
            Concede permiso de cámara en tu navegador o sube una foto de tu cuaderno.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs cursor-pointer flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Subir foto de libreta</span>
            </button>
            <button
              onClick={handleUseSimulator}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-telemetry text-xs cursor-pointer"
            >
              Usar cuaderno simulado
            </button>
          </div>
        </div>
      )}

      {!uploadedImage && streamStatus === 'denied' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/90 text-center text-white">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-4 text-amber-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="font-display font-bold text-2xl mb-2">Cámara no disponible</h2>
          <p className="text-xs sm:text-sm font-telemetry text-slate-400 max-w-md mb-6 leading-relaxed">
            {streamError || 'No se concedieron permisos de cámara o el dispositivo no responde.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs cursor-pointer shadow-md flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Subir foto del cuaderno</span>
            </button>
            <button
              onClick={() => {
                setStreamStatus('requesting');
                void startCamera(facingMode);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-telemetry text-xs cursor-pointer"
            >
              Reintentar cámara
            </button>
          </div>
        </div>
      )}

      {/* Barra superior */}
      <div className="relative z-20 w-full p-4 flex items-center justify-between text-xs font-telemetry pointer-events-auto">
        <button
          onClick={() => {
            audioJuice.playPaperFlip();
            onBack();
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-white shadow-lg backdrop-blur-md cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Volver al menú</span>
        </button>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white shadow-lg backdrop-blur-md">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: mod.accent }} />
          <span className="font-bold">{mod.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 shadow-lg backdrop-blur-md cursor-pointer"
            title="Subir foto del cuaderno"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
          </button>
          {streamStatus === 'active' && !uploadedImage && (
            <button
              onClick={handleToggleFacing}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 shadow-lg backdrop-blur-md cursor-pointer"
              title="Cambiar cámara"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Visor: se desvanece al entrar en la fase AR */}
      <div
        className={`relative flex-1 pointer-events-none p-4 sm:p-8 flex flex-col justify-center items-center z-10 transition-opacity duration-500 ${
          inAr ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div
          className="w-72 sm:w-96 h-48 sm:h-64 rounded-2xl relative overflow-hidden"
          style={{ boxShadow: `inset 0 0 0 1px ${mod.accent}66` }}
        >
          {['top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl', 'top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl', 'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl', 'bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl'].map((c) => (
            <span key={c} className={`absolute w-6 h-6 ${c}`} style={{ borderColor: mod.accent }} />
          ))}
          {isScanning && (
            <div
              className="absolute inset-x-0 h-16 animate-scan-sweep"
              style={{ background: `linear-gradient(to bottom, transparent, ${mod.accent}55, transparent)` }}
            />
          )}
          <div className="absolute inset-x-0 bottom-3 flex justify-center"><span className="px-2.5 py-1 rounded-lg bg-slate-950/75 backdrop-blur-sm text-[11px] font-telemetry text-white">
            {isScanning
              ? 'Leyendo tus trazos…'
              : uploadedImage
                ? 'Foto lista para resolver'
                : 'Encuadra la ecuación en tu hoja'}
          </span></div>
        </div>
      </div>

      {/* Resultado sin solver AR (otros módulos o tipos de ejercicio) */}
      {classificationResult && !inAr && (
        <div className="absolute bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-30 p-4 rounded-2xl bg-slate-950/95 border border-cyan-500/50 backdrop-blur-xl shadow-2xl text-white font-telemetry text-xs animate-entrance">
          <div className="flex items-start justify-between mb-2">
            <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Ejercicio identificado</span>
            <button onClick={() => setClassificationResult(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <h3 className="font-display font-bold text-base text-white mb-1">{classificationResult.exercise_name}</h3>
          <p className="text-[11px] text-slate-300 mb-2.5">{classificationResult.explanation}</p>
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 mb-3 overflow-auto max-h-32">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold mb-1">
              <Code className="w-3.5 h-3.5" />
              <span>Parámetros validados</span>
            </div>
            <pre className="text-[10px] text-slate-300 font-mono">{JSON.stringify(classificationResult.parameters, null, 2)}</pre>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Validado por el backend
            </span>
            <span>Confianza: {(classificationResult.confidence * 100).toFixed(1)}%</span>
          </div>
          <p className="mt-2 text-[10px] text-slate-500">La resolución AR sobre la hoja está disponible para ecuaciones y gráficas de funciones.</p>
        </div>
      )}

      {analysisError && (
        <div className="absolute bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-30 p-3.5 rounded-xl bg-rose-950/90 border border-rose-500/50 text-white font-telemetry text-xs backdrop-blur-lg flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-rose-300 block mb-0.5">No se pudo resolver</span>
            <span className="text-slate-300 text-[11px] leading-relaxed">{analysisError}</span>
          </div>
          <button onClick={() => setAnalysisError('')} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Botón principal (se oculta en la fase AR, donde el panel tiene su propio "Escanear") */}
      {!inAr && (
        <div className="relative z-20 w-full p-4 flex items-center justify-center pointer-events-auto">
          <button
            onClick={handleAnalyze}
            disabled={isScanning}
            className={`px-6 py-3 rounded-2xl font-display font-bold text-sm flex items-center gap-2 shadow-xl transition-all cursor-pointer ${
              isScanning ? 'bg-slate-800 text-slate-400 cursor-wait' : 'text-slate-950 active:scale-95 hover:brightness-110'
            }`}
            style={isScanning ? undefined : { backgroundColor: mod.accent }}
          >
            <Sparkles className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Analizando…' : supportsArSolver ? 'Escanear y resolver' : 'Escanear e identificar'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
