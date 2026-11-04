import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  ArrowLeft, 
  Camera, 
  SwitchCamera, 
  CheckCircle2, 
  AlertCircle,
  Play,
  Pause,
  Upload,
  Sparkles,
  Key,
  X,
  Code,
  Image as ImageIcon
} from 'lucide-react';
import { moduleThemeConfig } from '../data/colorPalette';
import { audioJuice } from '../utils/audioJuice';
import { 
  classifyExerciseWithGemini, 
  getStoredApiKey, 
  setStoredApiKey 
} from '../services/geminiClassifier';
import type { GeminiClassificationResult } from '../services/geminiClassifier';

interface ARCameraViewProps {
  moduleId: string;
  onBack: () => void;
  onLaunchSimulator?: (exerciseId: string, imageSrc?: string) => void;
}

export const ARCameraView: React.FC<ARCameraViewProps> = ({ moduleId, onBack, onLaunchSimulator }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [streamStatus, setStreamStatus] = useState<'requesting' | 'active' | 'denied' | 'simulated'>('requesting');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isSimPaused, setIsSimPaused] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string>('');

  // Uploaded photo state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Gemini API Key management
  const [apiKey, setApiKey] = useState<string>(() => getStoredApiKey());
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>(() => getStoredApiKey());

  // Classification & Scanning state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string>('');
  const [classificationResult, setClassificationResult] = useState<GeminiClassificationResult | null>(null);

  const mod = moduleThemeConfig[moduleId as keyof typeof moduleThemeConfig] || moduleThemeConfig.physics;

  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    setStreamStatus('requesting');
    setStreamError('');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La API de cámara no es compatible con este navegador.');
      }

      if (videoRef.current && videoRef.current.srcObject) {
        const existingStream = videoRef.current.srcObject as MediaStream;
        existingStream.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setStreamStatus('active');
          audioJuice.playLaserScan();
        };
      }
    } catch (err: unknown) {
      console.warn('Camera permission or device error:', err);
      const message = err instanceof Error ? err.message : 'No se pudo acceder a la cámara.';
      setStreamError(message);
      setStreamStatus('denied');
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);

    const currentVideo = videoRef.current;
    return () => {
      if (currentVideo && currentVideo.srcObject) {
        const stream = currentVideo.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, startCamera]);

  const handleToggleFacing = () => {
    audioJuice.playTap();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleUseSimulator = () => {
    audioJuice.playPaperFlip();
    setStreamStatus('simulated');
  };

  // Handle uploading photo from disk/phone gallery
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    audioJuice.playPaperFlip();
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadedImage(result);
      setClassificationResult(null);
      setAnalysisError('');
    };
    reader.readAsDataURL(file);
  };

  const handleClearUploadedImage = () => {
    audioJuice.playTap();
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Capture current frame from live camera or use uploaded image
  const captureFrameDataUrl = (): string | null => {
    if (uploadedImage) {
      return uploadedImage;
    }

    if (!videoRef.current || videoRef.current.videoWidth === 0) {
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.88);
  };

  // Run Gemini Multimodal Classification
  const handleAnalyzeWithGemini = async () => {
    audioJuice.playLaserScan();
    setAnalysisError('');

    // Check API Key
    const currentKey = apiKey || getStoredApiKey();
    if (!currentKey) {
      setShowKeyModal(true);
      return;
    }

    // Get snapshot
    const imageDataUrl = captureFrameDataUrl();
    if (!imageDataUrl) {
      setAnalysisError('No hay imagen disponible. Asegúrate de enfocar con la cámara o subir una foto.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await classifyExerciseWithGemini(imageDataUrl, moduleId, currentKey);
      setClassificationResult(result);
      audioJuice.playLaserScan();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al analizar con Gemini.';
      setAnalysisError(msg);
      console.error('[PaperLab AI] Error en clasificación:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveApiKey = () => {
    audioJuice.playTap();
    setStoredApiKey(keyInput);
    setApiKey(keyInput.trim());
    setShowKeyModal(false);
  };

  return (
    <div className="relative w-full h-[calc(100vh-56px)] bg-black overflow-hidden flex flex-col select-none animate-entrance">
      {/* Hidden file input for uploading notebook photos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Real Camera Stream (if no uploaded image is active) */}
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

      {/* Uploaded Photo Preview View */}
      {uploadedImage && (
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-slate-950">
          <img
            src={uploadedImage}
            alt="Cuaderno subido"
            className="w-full h-full object-contain"
          />
          <div className="absolute top-16 left-6 z-10 px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-telemetry text-xs flex items-center gap-2 backdrop-blur-md">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Foto de Cuaderno Cargada</span>
            <button
              onClick={handleClearUploadedImage}
              className="ml-2 hover:text-white cursor-pointer"
              title="Quitar foto y volver a cámara"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Simulated Paper Background if camera denied or simulator chosen */}
      {!uploadedImage && streamStatus === 'simulated' && (
        <div className="absolute inset-0 bg-[#f7f4ea] dark:bg-[#070a11] bg-notebook-grid z-0">
          <div className="absolute top-0 left-12 bottom-0 w-[1.5px] bg-red-400/50" />
          <div className="absolute top-8 left-16 text-xs font-telemetry text-slate-500">
            // SIMULADOR ÓPTICO DE CUADERNO CUADRICULADO (5.0mm)
          </div>
        </div>
      )}

      {/* Camera Permission Request Overlay */}
      {!uploadedImage && streamStatus === 'requesting' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/85 backdrop-blur-md text-center text-white">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center mb-4 text-cyan-400 animate-pulse">
            <Camera className="w-8 h-8" />
          </div>
          <h2 className="font-display font-bold text-2xl mb-2">Activando Cámara WebAR...</h2>
          <p className="text-sm font-telemetry text-slate-400 max-w-sm mb-6">
            Concede permiso de cámara en tu navegador o sube una foto de tu cuaderno.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs transition-all cursor-pointer flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Subir foto de libreta</span>
            </button>
            <button
              onClick={handleUseSimulator}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-telemetry text-xs transition-all cursor-pointer"
            >
              Usar cuaderno simulado
            </button>
          </div>
        </div>
      )}

      {/* Camera Denied / Error Overlay */}
      {!uploadedImage && streamStatus === 'denied' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/90 text-center text-white">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-4 text-amber-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="font-display font-bold text-2xl mb-2">Acceso a Cámara no Disponible</h2>
          <p className="text-xs sm:text-sm font-telemetry text-slate-400 max-w-md mb-6 leading-relaxed">
            {streamError || 'No se concedieron permisos de cámara o el dispositivo no responde.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs transition-all cursor-pointer shadow-md flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Subir foto del cuaderno</span>
            </button>
            <button
              onClick={() => startCamera(facingMode)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-telemetry text-xs transition-all cursor-pointer"
            >
              Reintentar cámara
            </button>
            <button
              onClick={handleUseSimulator}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-telemetry text-xs transition-all cursor-pointer"
            >
              Usar simulador
            </button>
          </div>
        </div>
      )}

      {/* Top Floating Control Bar */}
      <div className="relative z-20 w-full p-4 flex items-center justify-between text-xs font-telemetry pointer-events-auto">
        <button
          onClick={() => {
            audioJuice.playPaperFlip();
            onBack();
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-white shadow-lg backdrop-blur-md transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Volver al menú</span>
        </button>

        {/* Module Title Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white shadow-lg backdrop-blur-md">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: mod.accent }} />
          <span className="font-bold">{mod.title}</span>
        </div>

        {/* Controls: API Key, Upload Photo, Camera Facing, Pause */}
        <div className="flex items-center gap-2">
          {/* Gemini API Key Button */}
          <button
            onClick={() => {
              audioJuice.playTap();
              setShowKeyModal(true);
            }}
            className={`px-2.5 py-1.5 rounded-xl border font-telemetry text-xs transition-all cursor-pointer flex items-center gap-1.5 backdrop-blur-md shadow-lg ${
              apiKey
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300 animate-pulse'
            }`}
            title="Configurar Gemini API Key"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{apiKey ? 'Gemini API: Conectada' : 'Ingresar API Key'}</span>
          </button>

          {/* Upload Photo Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white shadow-lg backdrop-blur-md transition-all cursor-pointer"
            title="Subir foto del cuaderno"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Switch Camera Button */}
          {streamStatus === 'active' && !uploadedImage && (
            <button
              onClick={handleToggleFacing}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white shadow-lg backdrop-blur-md transition-all cursor-pointer"
              title="Cambiar cámara (frontal / trasera)"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              audioJuice.playTap();
              setIsSimPaused(!isSimPaused);
            }}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white shadow-lg backdrop-blur-md transition-all cursor-pointer"
            title={isSimPaused ? "Reanudar simulación" : "Pausar simulación"}
          >
            {isSimPaused ? <Play className="w-4 h-4 text-cyan-400" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* AR Viewfinder Frame */}
      <div className="relative flex-1 pointer-events-none p-4 sm:p-8 flex flex-col justify-center items-center z-10">
        <div 
          className="w-72 sm:w-96 h-48 sm:h-64 border border-dashed rounded-2xl flex flex-col items-center justify-between p-4 backdrop-blur-[1px] relative overflow-hidden"
          style={{ borderColor: `${mod.accent}80` }}
        >
          {/* Laser scanning sweep line when analyzing */}
          {isAnalyzing && (
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-laser-scan shadow-[0_0_15px_#00f0ff] z-20" />
          )}

          <div className="w-full text-center text-xs font-telemetry text-white/80">
            <span>ÁREA DE ENFOQUE DEL CUADERNO</span>
          </div>

          {/* Central Target Glyph */}
          <div className="w-full flex-1 flex flex-col items-center justify-center gap-1.5 text-center">
            {isAnalyzing ? (
              <div className="flex flex-col items-center gap-2">
                <Sparkles className="w-8 h-8 text-cyan-400 animate-spin" />
                <span className="text-xs font-telemetry text-cyan-300 font-bold tracking-wider">
                  ANALIZANDO TRAZOS CON GEMINI VISION...
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-slate-400">
                <div className="w-10 h-10 rounded-full border border-slate-700/80 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-slate-300" />
                </div>
                <span className="text-[11px] font-telemetry text-slate-300">
                  {uploadedImage ? 'Foto cargada lista para resolver' : 'Enfoca la ecuación en tu libreta'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Result HUD if Gemini identified an exercise */}
      {classificationResult && (
        <div className="absolute bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-30 p-4 rounded-2xl bg-slate-950/95 border border-cyan-500/50 backdrop-blur-xl shadow-2xl text-white font-telemetry text-xs animate-entrance">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Ejercicio Identificado</span>
            </div>
            <button
              onClick={() => setClassificationResult(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="font-display font-bold text-base text-white mb-1">
            {classificationResult.exercise_name}
          </h3>
          <p className="text-[11px] text-slate-300 mb-2.5">
            {classificationResult.explanation}
          </p>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 mb-3 overflow-x-auto max-h-32">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold mb-1">
              <Code className="w-3.5 h-3.5" />
              <span>Parámetros para Simulación (Impresos en Consola):</span>
            </div>
            <pre className="text-[10px] text-slate-300 font-mono">
              {JSON.stringify(classificationResult.parameters, null, 2)}
            </pre>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-2 mb-2">
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Consola actualizada
            </span>
            <span>Confianza: {(classificationResult.confidence * 100).toFixed(1)}%</span>
          </div>

          {onLaunchSimulator && (
            <button
              onClick={() => {
                const img = uploadedImage || captureFrameDataUrl() || undefined;
                onLaunchSimulator(classificationResult.exercise_id, img);
              }}
              className="w-full py-2 px-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resolver con AR sobre la Foto</span>
            </button>
          )}
        </div>
      )}

      {/* Analysis Error Alert */}
      {analysisError && (
        <div className="absolute bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-30 p-3.5 rounded-xl bg-rose-950/90 border border-rose-500/50 text-white font-telemetry text-xs backdrop-blur-lg flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-rose-300 block mb-0.5">Error de Identificación</span>
            <span className="text-slate-300 text-[11px] leading-relaxed">{analysisError}</span>
          </div>
          <button
            onClick={() => setAnalysisError('')}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Bottom Telemetry & Primary Action Bar */}
      <div className="relative z-20 w-full p-4 flex flex-col sm:flex-row items-center justify-between gap-3 font-telemetry text-xs text-slate-300 pointer-events-auto">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700/80 backdrop-blur-md shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Módulo: <strong>{mod.title}</strong></span>
        </div>

        {/* Center / Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Subir Foto Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white transition-all cursor-pointer flex items-center gap-2 backdrop-blur-md shadow-lg"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Subir Foto</span>
          </button>

          {/* Primary Scan & Classify Button */}
          <button
            onClick={handleAnalyzeWithGemini}
            disabled={isAnalyzing}
            className={`px-5 py-2.5 rounded-xl font-display font-bold text-xs transition-all cursor-pointer flex items-center gap-2 shadow-xl ${
              isAnalyzing 
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 active:scale-95'
            }`}
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>{isAnalyzing ? 'Analizando trazos...' : 'Escanear e Identificar'}</span>
          </button>
        </div>
      </div>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-entrance">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-lg">Google Gemini API Key</h3>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-telemetry text-slate-300 mb-4 leading-relaxed">
              Ingresa tu API Key de Gemini para clasificar los dibujos de tus cuadernos en tiempo real y extraer los parámetros JSON hacia la consola.
            </p>

            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 mb-4"
            />

            <div className="flex justify-end gap-2.5 font-telemetry text-xs">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold cursor-pointer"
              >
                Guardar y Conectar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
