import { useState } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { LabDraftingDesk } from './components/LabDraftingDesk';
import { PaletteModal } from './components/PaletteModal';
import { audioJuice } from './utils/audioJuice';

export function App() {
  const [inSplash, setInSplash] = useState<boolean>(true);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false);

  const handleEnterFromSplash = () => {
    setInSplash(false);
  };

  const handleSelectModule = (moduleId: string) => {
    setActiveModuleId(moduleId);
  };

  const handleGoBackToIndex = () => {
    setActiveModuleId(null);
  };

  const handleReturnToCover = () => {
    audioJuice.playPaperFlip();
    setInSplash(true);
    setActiveModuleId(null);
  };

  return (
    <div className="min-h-screen bg-[#12151e] text-white flex flex-col font-sans">
      {inSplash ? (
        <SplashScreen
          onEnter={handleEnterFromSplash}
          onOpenPalette={() => setIsPaletteOpen(true)}
        />
      ) : (
        <>
          {/* Header Bar */}
          <header className="w-full bg-[#0d1017] border-b border-slate-800 px-4 sm:px-8 py-3 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3">
              <button
                onClick={handleReturnToCover}
                className="font-black text-sm tracking-tight text-white hover:text-cyan-400 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <div className="w-6 h-6 rounded bg-cyan-400 text-slate-950 flex items-center justify-center font-bold text-xs">
                  P
                </div>
                <span>PaperLab</span>
              </button>

              <span className="text-slate-600">/</span>
              <button
                onClick={handleGoBackToIndex}
                className={`transition-colors cursor-pointer ${!activeModuleId ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Índice
              </button>

              {activeModuleId && (
                <>
                  <span className="text-slate-600">/</span>
                  <span className="text-cyan-400 font-bold capitalize">
                    {activeModuleId}
                  </span>
                  <span className="text-amber-400 text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800">
                    En Construcción
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  audioJuice.playTap();
                  setIsPaletteOpen(true);
                }}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Paleta
              </button>
            </div>
          </header>

          {/* Main Drafting Desk Surface with Physical Notebook */}
          <main className="flex-1 flex flex-col">
            <LabDraftingDesk
              activeModuleId={activeModuleId}
              onSelectModule={handleSelectModule}
              onGoBackToIndex={handleGoBackToIndex}
              onOpenPalette={() => setIsPaletteOpen(true)}
            />
          </main>
        </>
      )}

      {/* Design System & Palette Modal */}
      <PaletteModal
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
      />
    </div>
  );
}

export default App;
