import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Atom, 
  Zap, 
  GitBranch, 
  Triangle, 
  Sparkles, 
  ArrowRight, 
  Layers, 
  BookOpen
} from 'lucide-react';
import { audioJuice } from '../utils/audioJuice';

interface SplashScreenProps {
  onEnter: () => void;
  onOpenPalette: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onEnter, onOpenPalette }) => {
  const [isLaunching, setIsLaunching] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);

  const handleLaunch = () => {
    setIsLaunching(true);
    audioJuice.playPowerUp();

    // Trigger Game Juice Confetti
    try {
      confetti({
        particleCount: 75,
        spread: 90,
        origin: { y: 0.65 },
        colors: ['#00f0ff', '#f59e0b', '#10b981', '#a855f7', '#ffffff']
      });
    } catch {
      // failsafe
    }

    setTimeout(() => {
      onEnter();
    }, 600);
  };

  const steps = [
    {
      num: "01",
      title: "Dibuja a mano con lápiz",
      desc: "Usa tu cuaderno escolar de papel normal. Dibuja rampas, circuitos, rombos de algoritmos o triángulos.",
      icon: "✏️",
      accent: "#f59e0b"
    },
    {
      num: "02",
      title: "Apunta la cámara de tu móvil",
      desc: "WebAR escanea la hoja con visión por computadora 100% en tu navegador, sin instalar nada y offline.",
      icon: "📱",
      accent: "#00f0ff"
    },
    {
      num: "03",
      title: "La física cobra vida sobre el papel",
      desc: "Observa bolas rodar con vectores reales, electrones fluorescentes viajar por el grafito y código ejecutarse.",
      icon: "✨",
      accent: "#10b981"
    }
  ];

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-[#070b14] text-slate-100 selection:bg-cyan-500 selection:text-black">
      {/* Background Holographic & Notebook Grids */}
      <div className="absolute inset-0 bg-notebook-grid opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-cyber-grid opacity-20 pointer-events-none" />
      
      {/* Dynamic Ambient Glow Orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-500/15 rounded-full blur-[120px] pointer-events-none animate-float-reverse" />
      <div className="absolute top-2/3 left-1/3 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Floating Animated Hand-Drawn Math & Science Doodles */}
      <div className="absolute top-16 left-8 sm:left-24 hidden sm:flex items-center gap-2 p-3 bg-slate-900/80 border border-cyan-500/30 rounded-2xl shadow-xl shadow-cyan-500/10 backdrop-blur-md animate-float">
        <div className="w-8 h-8 rounded-lg bg-cyan-400/20 flex items-center justify-center text-cyan-300">
          <Atom className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono text-cyan-400 font-bold block">Física Vectorial</span>
          <span className="text-xs font-hand text-slate-200">F = m · a (g = 9.8 m/s²)</span>
        </div>
      </div>

      <div className="absolute top-28 right-8 sm:right-24 hidden sm:flex items-center gap-2 p-3 bg-slate-900/80 border border-amber-500/30 rounded-2xl shadow-xl shadow-amber-500/10 backdrop-blur-md animate-float-reverse">
        <div className="w-8 h-8 rounded-lg bg-amber-400/20 flex items-center justify-center text-amber-300">
          <Zap className="w-5 h-5 animate-bounce" />
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono text-amber-400 font-bold block">Grafito Vivo</span>
          <span className="text-xs font-hand text-slate-200">V = I · R (9V Battery)</span>
        </div>
      </div>

      <div className="absolute bottom-28 left-6 sm:left-20 hidden md:flex items-center gap-2 p-3 bg-slate-900/80 border border-emerald-500/30 rounded-2xl shadow-xl shadow-emerald-500/10 backdrop-blur-md animate-float">
        <div className="w-8 h-8 rounded-lg bg-emerald-400/20 flex items-center justify-center text-emerald-300">
          <GitBranch className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold block">Pseudocódigo</span>
          <span className="text-xs font-hand text-slate-200">si (temp &gt; 100) hervir()</span>
        </div>
      </div>

      <div className="absolute bottom-24 right-6 sm:right-20 hidden md:flex items-center gap-2 p-3 bg-slate-900/80 border border-purple-500/30 rounded-2xl shadow-xl shadow-purple-500/10 backdrop-blur-md animate-float-reverse">
        <div className="w-8 h-8 rounded-lg bg-purple-400/20 flex items-center justify-center text-purple-300">
          <Triangle className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono text-purple-400 font-bold block">Pitágoras Holográfico</span>
          <span className="text-xs font-hand text-slate-200">a² + b² = c²</span>
        </div>
      </div>

      {/* Top Bar / Navigation */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-6 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-slate-950 shadow-lg shadow-cyan-500/30">
            <span className="font-mono text-lg font-extrabold tracking-tighter">P</span>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-[#070b14] animate-ping" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
              Paper<span className="text-cyan-400">Lab</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800">
                WebAR
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              audioJuice.playTap();
              onOpenPalette();
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white transition-all shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Paleta & Diseño</span>
            <span className="sm:hidden">Paleta</span>
          </button>
        </div>
      </header>

      {/* Hero Content Section */}
      <main className="relative z-20 w-full max-w-5xl mx-auto px-6 py-6 sm:py-10 flex flex-col items-center text-center">
        {/* Holographic AR Notebook Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs sm:text-sm font-semibold mb-6 shadow-inner backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>El laboratorio de ciencias que no necesita pantallas ni sensores caros</span>
        </div>

        {/* Brand Title with Tactile Pencil & Neon AR contrast */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white max-w-4xl leading-[1.08]">
          Tu cuaderno de papel <br className="hidden sm:block" />
          <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-amber-300">
            cobra vida en Realidad Aumentada
            <svg 
              className="absolute -bottom-2 left-0 w-full h-3 text-cyan-400/60" 
              viewBox="0 0 300 12" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M2 9.5C65 2.5 180 2.5 298 9.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </span>
        </h1>

        {/* Subtitle Description */}
        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed">
          En lugar de pulsar botones en una pantalla, el estudiante dibuja los experimentos a mano con <strong className="text-white font-semibold">lápiz y papel real</strong>. PaperLab ejecuta visión por computadora <strong className="text-cyan-300 font-semibold">100% en el celular</strong> para superponer física, circuitos eléctricos, algoritmos y geometría viva.
        </p>

        {/* 4 Pillars Interactive Badges */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full max-w-3xl">
          {[
            { label: 'Física', color: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300', icon: Atom, count: 'Gravedad & Vectores' },
            { label: 'Circuitos', color: 'border-amber-500/40 bg-amber-950/20 text-amber-300', icon: Zap, count: 'Grafito Conductor' },
            { label: 'Algoritmos', color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300', icon: GitBranch, count: 'Código en Vivo' },
            { label: 'Geometría', color: 'border-purple-500/40 bg-purple-950/20 text-purple-300', icon: Triangle, count: 'Teoremas 3D' }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border ${item.color} backdrop-blur-sm transition-transform hover:scale-105`}
              >
                <Icon className="w-5 h-5 mb-1 opacity-90" />
                <span className="font-bold text-xs sm:text-sm text-white">{item.label}</span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5">{item.count}</span>
              </div>
            );
          })}
        </div>

        {/* Call to Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          <button
            onClick={handleLaunch}
            disabled={isLaunching}
            className="w-full sm:w-auto flex-1 group relative inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-black tracking-wide text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-400 rounded-2xl shadow-xl shadow-cyan-500/30 hover:shadow-cyan-400/50 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <Sparkles className="w-5 h-5 text-slate-900 group-hover:rotate-12 transition-transform" />
            <span>{isLaunching ? 'Sintonizando WebAR...' : 'Entrar al Laboratorio'}</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* How it works 3-step carousel/tabs */}
        <div className="mt-12 w-full max-w-3xl p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-lg">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" /> ¿Cómo Funciona la Magia?
            </span>
            <span className="text-xs font-bold text-cyan-400">Paso a Paso</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {steps.map((st, idx) => (
              <div 
                key={st.num}
                onClick={() => {
                  setActiveStep(idx);
                  audioJuice.playPaperFlip();
                }}
                className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all duration-200 ${
                  activeStep === idx 
                    ? 'bg-slate-800/90 border-cyan-400 shadow-md shadow-cyan-500/10' 
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl">{st.icon}</span>
                  <span className="text-xs font-mono font-extrabold text-slate-500">{st.num}</span>
                </div>
                <h4 className="text-xs font-bold text-white mb-1">{st.title}</h4>
                <p className="text-[11px] text-slate-400 leading-snug">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-20 w-full max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Motor WebAR Offline • Sin Servidor • Privacidad 100% Local</span>
        </div>
        <div className="mt-2 sm:mt-0 font-hand text-sm text-slate-400">
          "Dibuja con lápiz, aprende con fotones" 🔬
        </div>
      </footer>
    </div>
  );
};
