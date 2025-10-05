import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/auth/LoginForm';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { AppLayout } from './components/layout/AppLayout';
import { VoiceInterface } from './components/voice/VoiceInterface';
import { QuickCaptureBar } from './components/ui/QuickCaptureBar';
import { WelcomeModal } from './components/onboarding/WelcomeModal';
import { VersionBanner } from './components/VersionBanner';
import { InstallPrompt } from './components/pwa/InstallPrompt';
import { OfflineBanner } from './components/pwa/OfflineBanner';
import { toast } from 'react-hot-toast';
import { useRef } from 'react';

// Lazy load routes för bättre initial load performance
const Dashboard = lazy(() => import('./components/views/Dashboard').then(m => ({ default: m.Dashboard })));
const TodayView = lazy(() => import('./components/views/TodayView').then(m => ({ default: m.TodayView })));
const WeekView = lazy(() => import('./components/views/WeekView').then(m => ({ default: m.WeekView })));
const ArchiveView = lazy(() => import('./components/views/ArchiveView').then(m => ({ default: m.ArchiveView })));
const ImportView = lazy(() => import('./components/views/ImportView').then(m => ({ default: m.ImportView })));
const AllTasksView = lazy(() => import('./components/views/AllTasksView').then(m => ({ default: m.AllTasksView })));
const InboxView = lazy(() => import('./components/views/InboxView').then(m => ({ default: m.InboxView })));
const FocusView = lazy(() => import('./components/focus/FocusView').then(m => ({ default: m.FocusView })));
const ActiveSession = lazy(() => import('./components/focus/ActiveSession').then(m => ({ default: m.ActiveSession })));
const BreakView = lazy(() => import('./components/focus/BreakView').then(m => ({ default: m.BreakView })));
const ResultImpactModal = lazy(() => import('./components/tasks/ResultImpactModal').then(m => ({ default: m.ResultImpactModal })));

// Loading fallback component
function RouteLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Laddar...</p>
      </div>
    </div>
  );
}

function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Prio
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Håll fokus på det som är viktigt
          </p>
        </div>

        <LoginForm />

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Samma inloggning som Anmärkt
        </p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const voiceInterfaceRef = useRef<any>(null);

  useEffect(() => {
    // Kolla om användaren har slutfört onboarding
    if (user && !loading) {
      const completed = localStorage.getItem('prio_onboarding_completed');
      if (!completed) {
        setShowWelcome(true);
      }
    }
  }, [user, loading]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
    </div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleVoiceClick = () => {
    // Trigger voice interface
    const voiceButton = document.querySelector('[title*="Klicka för att prata"]') as HTMLButtonElement;
    if (voiceButton) {
      voiceButton.click();
    }
  };

  return (
    <AppLayout>
      {children}
      {/* Voice interface alltid tillgänglig när inloggad */}
      <VoiceInterface ref={voiceInterfaceRef} />
      {/* Quick capture bar för mobil */}
      <QuickCaptureBar onVoiceClick={handleVoiceClick} />
      {/* Onboarding modal för nya användare */}
      <WelcomeModal
        isOpen={showWelcome}
        onComplete={() => setShowWelcome(false)}
      />
      {/* PWA install prompt */}
      <InstallPrompt />
    </AppLayout>
  );
}

// HomePage now just redirects to FocusView
function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/focus');
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Laddar...</p>
      </div>
    </div>
  );
}

function App() {
  // Track app version for update notifications
  useEffect(() => {
    const currentVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';
    const storedVersion = localStorage.getItem('prio_app_version');

    if (storedVersion && storedVersion !== currentVersion) {
      toast.success('Appen har uppdaterats till v' + currentVersion, {
        duration: 5000,
        icon: '🎉',
      });
    }

    localStorage.setItem('prio_app_version', currentVersion);
  }, []);

  return (
    <BrowserRouter>
      <VersionBanner />
      <OfflineBanner />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/today"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <TodayView />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/week"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <WeekView />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inbox"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <InboxView />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/all"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <AllTasksView />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/archive"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <ArchiveView />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/import"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <ImportView />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/focus"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <FocusView />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/session/:taskId"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <ActiveSession />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/break"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <BreakView />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/task/:taskId/impact"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <ResultImpactModal />
              </Suspense>
            </ProtectedRoute>
          }
        />
        {/* Alias /matrix to Dashboard for backwards compatibility */}
        <Route
          path="/matrix"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <Dashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
