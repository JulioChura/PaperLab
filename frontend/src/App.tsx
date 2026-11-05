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
import { TeacherView } from './teacher/TeacherView';
import { ClassBanner, JoinClassModal } from './classroom/JoinClass';
import { useClassLink } from './classroom/studentLink';

type ViewMode = 'splash' | 'menu' | 'camera' | 'teacher';

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
const INITIAL_JOIN = params.get('sala');
const INITIAL_TEACHER = params.has('docente');

export function App() {
  const [currentView, setCurrentView] = useState<ViewMode>(INITIAL_TEACHER ? 'teacher' : INITIAL_JOIN ? 'menu' : 'splash');
  const [joinCode, setJoinCode] = useState<string | null>(INITIAL_JOIN);
  const classLink = useClassLink();
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

  const openJoin = () => {
    audioJuice.playTap();
    setJoinCode('');
  };

  const handleJoined = (module: string) => {
    setJoinCode(null);
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
    setActiveModuleId(module);
    setCurrentView('camera');
  };

  const openTeacher = () => {
    audioJuice.playPaperFlip();
    setActiveModuleId(null);
    setCurrentView('teacher');
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
    <div className="relative min-h-screen bg-[var(--bg-ground)] text-[var(--text-primary)] flex flex-col font-sans transition-colors duration-300">
      {currentView === 'splash' ? (
        <SplashScreen
          onEnter={handleEnterFromSplash}
          onTeacher={openTeacher}
          onJoinClass={openJoin}
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
            teacherMode={currentView === 'teacher'}
            inClass={classLink.step === 'joined'}
            onJoinClass={openJoin}
            onTeacher={openTeacher}
          />
          {currentView !== 'teacher' && <ClassBanner />}

          <main className="flex-1 flex flex-col">
            {currentView === 'menu' && (
              <ModuleSelector
                onSelectModule={handleSelectModule}
                onStartMission={handleStartMission}
                onOpenMissions={() => setShowMissions(true)}
              />
            )}

            {currentView === 'teacher' && <TeacherView onExit={handleGoSplash} />}

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
      {joinCode !== null && <JoinClassModal initialCode={joinCode} onClose={() => setJoinCode(null)} onJoined={handleJoined} />}
      {showProfile && <ProfilePanel onClose={() => setShowProfile(false)} />}
      {showMissions && <MissionPanel onClose={() => setShowMissions(false)} onStart={handleStartMission} />}
    </div>
  );
}

export default App;
