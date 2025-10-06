import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/auth/LoginForm';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { AppLayout } from './components/layout/AppLayout';
import { QuickCaptureBar } from './components/ui/QuickCaptureBar';
import { QuickNoteInput } from './components/tasks/QuickNoteInput';
import { WelcomeModal } from './components/onboarding/WelcomeModal';
import { VersionBanner } from './components/VersionBanner';
import { InstallPrompt } from './components/pwa/InstallPrompt';
import { OfflineBanner } from './components/pwa/OfflineBanner';
import { toast } from 'react-hot-toast';
import { useTasks } from './hooks/useTasks';
import { checkAndSendNotifications } from './services/notifications';
import { WeeklyReviewModal } from './components/focus/WeeklyReviewModal';

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
const ShareHandler = lazy(() => import('./components/share/ShareHandler').then(m => ({ default: m.ShareHandler })));
const SettingsView = lazy(() => import('./components/settings/SettingsView').then(m => ({ default: m.SettingsView })));
const ProjectsView = lazy(() => import('./components/projects/ProjectsView').then(m => ({ default: m.ProjectsView })));
const ProjectDetailView = lazy(() => import('./components/projects/ProjectDetailView').then(m => ({ default: m.ProjectDetailView })));

// Loading fallback component
function RouteLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-cream-50 dark:bg-charcoal-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-copper-500 mx-auto mb-4"></div>
        <p className="text-stone-600 dark:text-stone-400">Laddar...</p>
      </div>
    </div>
  );
}

function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-cream-50 dark:bg-charcoal-950">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="bg-cream-100 dark:bg-charcoal-900 p-10 rounded-3xl shadow-medium w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-copper-600 dark:text-copper-400">
            Prio
          </h1>
          <p className="text-stone-600 dark:text-stone-400">
            Håll fokus på det som är viktigt
          </p>
        </div>

        <LoginForm />

        <p className="text-center text-sm text-stone-500 dark:text-stone-400 mt-6">
          Samma inloggning som Anmärkt
        </p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);
  const { tasks } = useTasks();

  useEffect(() => {
    // Kolla om användaren har slutfört onboarding
    if (user && !loading) {
      const completed = localStorage.getItem('prio_onboarding_completed');
      if (!completed) {
        setShowWelcome(true);
      }
    }
  }, [user, loading]);

  // Initialize notifications and check every 5 minutes
  useEffect(() => {
    if (!user || loading) return;

    // Initial check
    checkAndSendNotifications(tasks);

    // Set up interval (5 minutes)
    const intervalId = setInterval(() => {
      checkAndSendNotifications(tasks);
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user, loading, tasks]);

  // Weekly review trigger (Monday 06:00)
  useEffect(() => {
    if (!user || loading) return;

    const checkWeeklyReview = () => {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday
      const hour = now.getHours();

      // Check if it's Monday 06:00
      if (dayOfWeek === 1 && hour === 6) {
        const lastReview = localStorage.getItem('prio-last-weekly-review');
        const today = now.toISOString().split('T')[0];

        // Only show if not already shown today
        if (lastReview !== today) {
          setShowWeeklyReview(true);
          localStorage.setItem('prio-last-weekly-review', today);
        }
      }
    };

    // Initial check
    checkWeeklyReview();

    // Check every hour
    const intervalId = setInterval(checkWeeklyReview, 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user, loading]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-cream-50 dark:bg-charcoal-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-copper-500"></div>
    </div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      {children}
      {/* Quick note input */}
      <QuickNoteInput />
      {/* Quick capture bar för mobil */}
      <QuickCaptureBar />
      {/* Onboarding modal för nya användare */}
      <WelcomeModal
        isOpen={showWelcome}
        onComplete={() => setShowWelcome(false)}
      />
      {/* Weekly review modal */}
      <WeeklyReviewModal
        isOpen={showWeeklyReview}
        onClose={() => setShowWeeklyReview(false)}
        tasks={tasks}
      />
      {/* PWA install prompt */}
      <InstallPrompt />
    </AppLayout>
  );
}

// HomePage handles PWA shortcuts and redirects
function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check for action parameter from PWA shortcuts
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');

    if (action === 'quick') {
      // Trigger quick task form
      navigate('/focus');
      setTimeout(() => {
        window.dispatchEvent(new Event('trigger-quick-task'));
      }, 500);
    } else {
      // Default: go to focus view
      navigate('/focus');
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-cream-50 dark:bg-charcoal-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-copper-500 mx-auto mb-4"></div>
        <p className="text-stone-600 dark:text-stone-400">Laddar...</p>
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
        {/* Web Share Target API endpoint */}
        <Route
          path="/share"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <ShareHandler />
              </Suspense>
            </ProtectedRoute>
          }
        />
        {/* Settings */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <SettingsView />
              </Suspense>
            </ProtectedRoute>
          }
        />
        {/* Projects */}
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <ProjectsView />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <ProjectDetailView />
              </Suspense>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
