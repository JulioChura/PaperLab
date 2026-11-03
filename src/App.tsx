import { useState } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { Header } from './components/Header';
import { MainMenu } from './components/MainMenu';
import { PaletteModal } from './components/PaletteModal';
import { UnderConstruction } from './components/UnderConstruction';
import { audioJuice } from './utils/audioJuice';

type ViewMode = 'splash' | 'menu' | 'physics' | 'circuits' | 'flowcharts' | 'math';

export function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('splash');
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false);

  const handleEnterFromSplash = () => {
    setCurrentView('menu');
  };

  const handleSelectModule = (moduleId: string) => {
    setCurrentView(moduleId as ViewMode);
  };

  const handleGoHome = () => {
    setCurrentView('menu');
  };

  const handleGoSplash = () => {
    audioJuice.playPaperFlip();
    setCurrentView('splash');
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* If in Splash View */}
      {currentView === 'splash' ? (
        <SplashScreen
          onEnter={handleEnterFromSplash}
          onOpenPalette={() => setIsPaletteOpen(true)}
        />
      ) : (
        <>
          {/* Main App Navigation Header */}
          <Header
            currentModule={currentView === 'menu' ? null : currentView}
            onGoHome={handleGoHome}
            onOpenPalette={() => setIsPaletteOpen(true)}
            onGoSplash={handleGoSplash}
          />

          {/* View Content */}
          <main className="flex-1 flex flex-col">
            {currentView === 'menu' ? (
              <MainMenu
                onSelectModule={handleSelectModule}
                onOpenPalette={() => setIsPaletteOpen(true)}
              />
            ) : (
              /* When clicking on any of the 4 options: Beautiful & Playful Under Construction Screen! */
              <UnderConstruction
                moduleId={currentView}
                onBack={handleGoHome}
              />
            )}
          </main>
        </>
      )}

      {/* Design System & Color Palette Modal */}
      <PaletteModal
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
      />
    </div>
  );
}

export default App;
