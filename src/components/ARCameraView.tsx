import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  ArrowLeft, 
  Camera, 
  SwitchCamera, 
  CheckCircle2, 
  AlertCircle,
  Play,
  Pause,
  Scan
} from 'lucide-react';
import { moduleThemeConfig } from '../data/colorPalette';
import { audioJuice } from '../utils/audioJuice';

interface ARCameraViewProps {
  moduleId: string;
  onBack: () => void;
}

export const ARCameraView: React.FC<ARCameraViewProps> = ({ moduleId, onBack }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streamStatus, setStreamStatus] = useState<'requesting' | 'active' | 'denied' | 'simulated'>('requesting');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isSimPaused, setIsSimPaused] = useState<boolean>(false);
  const [detectedConfidence, setDetectedConfidence] = useState<number>(98.2);
  const [streamError, setStreamError] = useState<string>('');

  const mod = moduleThemeConfig[moduleId as keyof typeof moduleThemeConfig] || moduleThemeConfig.physics;

  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    setStreamStatus('requesting');
    setStreamError('');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La API de cámara no es compatible con este navegador.');
      }

      // Stop existing tracks if any
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

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
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

  return (
    <div className="relative w-full h-[calc(100vh-56px)] bg-black overflow-hidden flex flex-col select-none animate-entrance">
      {/* Real Camera Stream */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          streamStatus === 'active' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Simulated Paper Background if camera denied or simulator chosen */}
      {streamStatus === 'simulated' && (
        <div className="absolute inset-0 bg-[#f7f4ea] dark:bg-[#070a11] bg-notebook-grid z-0">
          <div className="absolute top-0 left-12 bottom-0 w-[1.5px] bg-red-400/50" />
          <div className="absolute top-8 left-16 text-xs font-telemetry text-slate-500">
            // SIMULADOR ÓPTICO DE CUADERNO CUADRICULADO (5.0mm)
          </div>
        </div>
      )}

      {/* Camera Permission Request Overlay */}
      {streamStatus === 'requesting' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/85 backdrop-blur-md text-center text-white">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center mb-4 text-cyan-400 animate-pulse">
            <Camera className="w-8 h-8" />
          </div>
          <h2 className="font-display font-bold text-2xl mb-2">Activando Cámara WebAR...</h2>
          <p className="text-sm font-telemetry text-slate-400 max-w-sm mb-6">
            Concede permiso de cámara en tu navegador para enfocar la libreta física.
          </p>
          <button
            onClick={handleUseSimulator}
            className="text-xs font-telemetry text-cyan-400 hover:text-cyan-300 underline underline-offset-4 cursor-pointer"
          >
            Continuar con simulador de cuaderno si no tienes cámara
          </button>
        </div>
      )}

      {/* Camera Denied / Error Overlay */}
      {streamStatus === 'denied' && (
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
              onClick={() => startCamera(facingMode)}
              className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs transition-all cursor-pointer shadow-md"
            >
              Reintentar permiso
            </button>
            <button
              onClick={handleUseSimulator}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-telemetry text-xs transition-all cursor-pointer"
            >
              Usar simulador de papel
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
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-cyan-400 hidden sm:inline">WebAR 60 FPS</span>
        </div>

        {/* Camera Switching Controls */}
        <div className="flex items-center gap-2">
          {streamStatus === 'active' && (
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

      {/* AR Viewfinder Frame & Corner Reticles */}
      <div className="relative flex-1 pointer-events-none p-4 sm:p-8 flex flex-col justify-between z-10">
        {/* Top Reticles */}
        <div className="flex justify-between">
          <div className="w-8 h-8 border-t-2 border-l-2" style={{ borderColor: mod.accent }} />
          <div className="w-8 h-8 border-t-2 border-r-2" style={{ borderColor: mod.accent }} />
        </div>

        {/* Central AR Scanning Crosshair / Paper Target Box */}
        <div className="self-center flex flex-col items-center">
          <div 
            className="w-64 sm:w-88 h-44 sm:h-60 border border-dashed rounded-2xl flex flex-col items-center justify-between p-3.5 backdrop-blur-[1px]"
            style={{ borderColor: `${mod.accent}80` }}
          >
            <div className="w-full flex justify-between text-[10px] font-telemetry text-white/80">
              <span>ALINEACIÓN DE CUADERNO</span>
              <span>CALIBRE: 5.0mm</span>
            </div>

            {/* Live Holographic Overlay specific to module */}
            <div className="w-full flex-1 flex items-center justify-center">
              {moduleId === 'physics' && (
                <svg className="w-40 h-24" viewBox="0 0 100 60" fill="none">
                  <line x1="10" y1="50" x2="90" y2="20" stroke="#00f0ff" strokeWidth="2.5" />
                  <circle cx="50" cy="35" r="7" fill="#00f0ff" />
                  <line x1="50" y1="35" x2="35" y2="40" stroke="#f59e0b" strokeWidth="2" />
                  <text x="35" y="55" fill="#f59e0b" fontSize="8" fontFamily="DM Mono">v = 3.2m/s</text>
                </svg>
              )}

              {moduleId === 'circuits' && (
                <svg className="w-40 h-24" viewBox="0 0 100 60" fill="none">
                  <rect x="15" y="15" width="70" height="30" rx="4" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" />
                  <circle cx="85" cy="30" r="6" fill="#f59e0b" className="animate-pulse" />
                  <text x="32" y="34" fill="#ffffff" fontSize="8" fontFamily="DM Mono">9V → 41mA</text>
                </svg>
              )}

              {moduleId === 'flowcharts' && (
                <svg className="w-40 h-24" viewBox="0 0 100 60" fill="none">
                  <polygon points="50,15 75,30 50,45 25,30" stroke="#10b981" strokeWidth="2" />
                  <circle cx="50" cy="30" r="4" fill="#34d399" className="animate-ping" />
                  <text x="36" y="55" fill="#10b981" fontSize="8" fontFamily="DM Mono">IF x &gt; 0: TRUE</text>
                </svg>
              )}

              {moduleId === 'math' && (
                <svg className="w-40 h-24" viewBox="0 0 100 60" fill="none">
                  <polygon points="20,50 80,50 80,20" stroke="#a855f7" strokeWidth="2" fill="rgba(168,85,247,0.15)" />
                  <rect x="68" y="38" width="12" height="12" stroke="#a855f7" strokeWidth="1" fill="none" />
                  <text x="36" y="32" fill="#ffffff" fontSize="8" fontFamily="DM Mono">a²+b²=c²</text>
                </svg>
              )}
            </div>

            <div className="text-[10px] font-telemetry text-cyan-300 font-bold tracking-wider">
              [ LÍNEA DE GRAFITO DETECTADA ]
            </div>
          </div>
        </div>

        {/* Bottom Reticles */}
        <div className="flex justify-between">
          <div className="w-8 h-8 border-b-2 border-l-2" style={{ borderColor: mod.accent }} />
          <div className="w-8 h-8 border-b-2 border-r-2" style={{ borderColor: mod.accent }} />
        </div>
      </div>

      {/* Bottom Telemetry HUD */}
      <div className="relative z-20 w-full p-4 flex flex-col sm:flex-row items-center justify-between gap-3 font-telemetry text-xs text-slate-300 pointer-events-auto">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700/80 backdrop-blur-md shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Tracking Cuaderno: <strong>{detectedConfidence}%</strong></span>
          <span className="text-slate-500">•</span>
          <span className="text-cyan-400">Procesamiento Local</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              audioJuice.playTap();
              setDetectedConfidence(prev => (prev >= 99 ? 94 : prev + 2.5));
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Scan className="w-3.5 h-3.5 text-cyan-400" />
            <span>Recalibrar sensor</span>
          </button>
        </div>
      </div>
    </div>
  );
};
