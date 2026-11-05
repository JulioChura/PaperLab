import { useState, useEffect } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { Header } from './components/Header';
import { ModuleSelector } from './components/ModuleSelector';
import { ARCameraView } from './components/ARCameraView';
import { audioJuice } from './utils/audioJuice';
import { MissionPanel, ProfilePanel, Toaster } from './game/GameUI';
import { progress, getProgress } from './game/progress';
import type { Mission } from './game/missions';
import { registerNotificationWorker } from './game/notify';

type ViewMode = 'splash' | 'menu' | 'camera';

export function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('splash');
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showMissions, setShowMissions] = useState(false);

  useEffect(() => {
    // Si el alumno ya activó las notificaciones, el Service Worker debe estar listo
    if (getProgress().settings.nativeNotifications) void registerNotificationWorker();
  }, []);

  // Robust Dark Mode / Day Mode with system detection and persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('paperlab-theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false; // Default to clean studio day mode or system
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('paperlab-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      localStorage.setItem('paperlab-theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    audioJuice.playTap();
    setIsDarkMode((prev) => !prev);
  };

  const handleEnterFromSplash = () => {
    setCurrentView('menu');
  };

  const handleSelectModule = (moduleId: string) => {
    setActiveModuleId(moduleId);
    setCurrentView('camera');
  };

  const handleStartMission = (m: Mission) => {
    audioJuice.playTap();
    progress.setActiveMission(m.id);
    setShowMissions(false);
    setActiveModuleId(m.module);
    setCurrentView('camera');
  };

  const handleGoHome = () => {
    setCurrentView('menu');
    setActiveModuleId(null);
  };

  const handleGoSplash = () => {
    audioJuice.playPaperFlip();
    setCurrentView('splash');
    setActiveModuleId(null);
  };

  return (
    <div className="min-h-screen bg-[#f5f0e6] dark:bg-[#070a11] text-[#14171f] dark:text-[#f8fafc] flex flex-col font-sans transition-colors duration-200">
      {currentView === 'splash' ? (
        <SplashScreen
          onEnter={handleEnterFromSplash}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <>
          <Header
            currentModule={activeModuleId}
            onGoHome={handleGoHome}
            onGoSplash={handleGoSplash}
            isDarkMode={isDarkMode}
            onToggleTheme={toggleTheme}
            onOpenProfile={() => setShowProfile(true)}
          />

          <main className="flex-1 flex flex-col">
            {currentView === 'menu' && (
              <ModuleSelector
                onSelectModule={handleSelectModule}
                onStartMission={handleStartMission}
                onOpenMissions={() => setShowMissions(true)}
              />
            )}

            {currentView === 'camera' && activeModuleId && (
              <ARCameraView
                moduleId={activeModuleId}
                onBack={handleGoHome}
              />
            )}

          </main>
        </>
      )}
      <Toaster />
      {showProfile && <ProfilePanel onClose={() => setShowProfile(false)} />}
      {showMissions && <MissionPanel onClose={() => setShowMissions(false)} onStart={handleStartMission} />}
    </div>
  );
}

export default App;
