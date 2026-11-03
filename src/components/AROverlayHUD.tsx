import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Scan, ShieldCheck, Zap, Info } from 'lucide-react';
import { audioJuice } from '../utils/audioJuice';

interface AROverlayHUDProps {
  moduleName: string;
  accentColor: string;
  isRealCamera: boolean;
  onToggleRealCamera: () => void;
}

export const AROverlayHUD: React.FC<AROverlayHUDProps> = ({
  moduleName,
  accentColor,
  isRealCamera,
  onToggleRealCamera,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(true);

  // Manage WebRTC Camera Feed
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    if (isRealCamera) {
      setCameraError(null);
      navigator.mediaDevices?.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      })
      .then((stream) => {
        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setStreamActive(true);
          audioJuice.playLaserScan();
        }
      })
      .catch((err) => {
        console.warn("Camera access denied or unavailable:", err);
        setCameraError("Cámara no disponible. Usando simulación de cuaderno físico.");
        setStreamActive(false);
      });
    } else {
      setStreamActive(false);
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isRealCamera]);

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-3xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-2xl">
      {/* Real Camera Stream or Paper Background Simulation */}
      {isRealCamera && streamActive ? (
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className="absolute inset-0 w-full h-full object-cover z-0"
        />
      ) : (
        <div className="absolute inset-0 z-0 bg-[#f7f4ea] bg-notebook-grid">
          {/* Notebook Paper Margin & Header Simulation */}
          <div className="absolute top-0 left-12 bottom-0 w-[1.5px] bg-red-400/50" />
          <div className="absolute top-8 left-0 right-0 h-[1.5px] bg-red-400/40" />
          <div className="absolute top-2 left-16 font-hand text-slate-400 text-sm">
            Laboratorio de Ciencias • Hoja #14 • Cuaderno Cuadriculado
          </div>
        </div>
      )}

      {/* Holographic AR Edge Glow Filter (Cyber-Shader Simulation) */}
      <div 
        className="absolute inset-0 pointer-events-none z-10 opacity-30"
        style={{
          background: `radial-gradient(circle at 50% 50%, transparent 60%, ${accentColor} 100%)`
        }}
      />

      {/* Scanning Laser Beam Effect */}
      {isScanning && (
        <div 
          className="absolute left-0 right-0 h-1 z-20 pointer-events-none animate-scanbeam"
          style={{
            backgroundColor: accentColor,
            boxShadow: `0 0 16px ${accentColor}, 0 0 32px ${accentColor}`
          }}
        />
      )}

      {/* AR Viewfinder Corner Reticles */}
      <div className="absolute inset-4 sm:inset-8 pointer-events-none z-20 border border-white/10 rounded-2xl flex flex-col justify-between">
        {/* Top Corners */}
        <div className="flex justify-between">
          <div className="w-6 h-6 border-t-2 border-l-2 rounded-tl" style={{ borderColor: accentColor }} />
          <div className="w-6 h-6 border-t-2 border-r-2 rounded-tr" style={{ borderColor: accentColor }} />
        </div>

        {/* Center Target Sight */}
        <div className="self-center flex flex-col items-center">
          <div 
            className="w-16 h-16 rounded-full border border-dashed flex items-center justify-center animate-spin"
            style={{ borderColor: `${accentColor}80`, animationDuration: '14s' }}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
          </div>
          <span 
            className="mt-2 text-[10px] font-mono tracking-widest uppercase font-extrabold px-2 py-0.5 rounded-full bg-slate-900/90 border"
            style={{ color: accentColor, borderColor: `${accentColor}40` }}
          >
            Enfoca tu trazo a lápiz
          </span>
        </div>

        {/* Bottom Corners */}
        <div className="flex justify-between">
          <div className="w-6 h-6 border-b-2 border-l-2 rounded-bl" style={{ borderColor: accentColor }} />
          <div className="w-6 h-6 border-b-2 border-r-2 rounded-br" style={{ borderColor: accentColor }} />
        </div>
      </div>

      {/* Top Floating Telemetry Bar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/80 text-xs text-white shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-mono font-bold">Cuaderno Físico: DETECTADO</span>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">| 60 FPS Local</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              audioJuice.playLaserScan();
              setIsScanning(!isScanning);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
            title="Alternar haz de escaneo AR"
          >
            <Scan className="w-3.5 h-3.5" style={{ color: accentColor }} />
            <span className="text-[11px] font-mono">{isScanning ? 'Láser ON' : 'Láser OFF'}</span>
          </button>

          <button
            onClick={() => {
              audioJuice.playTap();
              onToggleRealCamera();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              isRealCamera
                ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                : 'bg-slate-900/85 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {isRealCamera ? (
              <>
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                <span>Cámara Real</span>
              </>
            ) : (
              <>
                <CameraOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Simulador Papel</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Camera fallback notification if needed */}
      {cameraError && isRealCamera && (
        <div className="absolute bottom-16 left-4 right-4 z-30 p-2.5 rounded-xl bg-amber-950/90 border border-amber-600/60 text-amber-200 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* Bottom Live AR Metrics Card */}
      <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-[11px]">
            Tracking: <strong className="text-white">Cuadrícula 5mm (Página Plana)</strong>
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-slate-400">
            Módulo: <strong style={{ color: accentColor }}>{moduleName}</strong>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-cyan-400">
            <Zap className="w-3 h-3" /> 100% Offline
          </span>
        </div>
      </div>
    </div>
  );
};

