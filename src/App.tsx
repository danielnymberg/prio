import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/auth/LoginForm';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { AppLayout } from './components/layout/AppLayout';
// import { QuickCaptureBar } from './components/ui/QuickCaptureBar'; // TEMPORÄRT DISABLED
// import { QuickNoteInput } from './components/tasks/QuickNoteInput'; // TEMPORÄRT DISABLED
import { VersionBanner } from './components/VersionBanner';
import { InstallPrompt } from './components/pwa/InstallPrompt';
import { OfflineBanner } from './components/pwa/OfflineBanner';
// import { ToastComponent } from '@syncfusion/ej2-react-notifications'; // TEMPORÄRT DISABLED
// import { globalToastRef, showToast } from './services/toast'; // TEMPORÄRT DISABLED
import { useTasks } from './hooks/useTasks';
import { checkAndSendNotifications } from './services/notifications';
// import { WeeklyReviewModal } from './components/focus/WeeklyReviewModal'; // TEMPORÄRT DISABLED
import { initEmailScheduler } from './services/email-scheduler';
// import { EmailTaskListener } from './components/email/EmailTaskListener'; // TEMPORÄRT DISABLED
import { PushToTalkAssistant } from './components/voice/PushToTalkAssistant';
// import { GlobalSearch } from './components/search/GlobalSearch'; // TEMPORÄRT DISABLED

// Lazy load routes för bättre initial load performance
const ArchiveView = lazy(() => import('./components/views/ArchiveView').then(m => ({ default: m.ArchiveView })));
const ImportView = lazy(() => import('./components/views/ImportView').then(m => ({ default: m.ImportView })));
const AllTasksView = lazy(() => import('./components/views/AllTasksView').then(m => ({ default: m.AllTasksView })));
const InboxView = lazy(() => import('./components/views/InboxView').then(m => ({ default: m.InboxView })));
const FocusView = lazy(() => import('./components/focus/FocusView').then(m => ({ default: m.FocusView })));
const BreakView = lazy(() => import('./components/focus/BreakView').then(m => ({ default: m.BreakView })));
const TaskImpactPage = lazy(() => import('./pages/TaskImpactPage').then(m => ({ default: m.TaskImpactPage })));
const ShareHandler = lazy(() => import('./components/share/ShareHandler').then(m => ({ default: m.ShareHandler })));
const SettingsView = lazy(() => import('./components/settings/SettingsView').then(m => ({ default: m.SettingsView })));
const ProjectsView = lazy(() => import('./components/projects/ProjectsView').then(m => ({ default: m.ProjectsView })));
const ProjectDetailView = lazy(() => import('./components/projects/ProjectDetailView').then(m => ({ default: m.ProjectDetailView })));
const NewProjectPage = lazy(() => import('./pages/NewProjectPage').then(m => ({ default: m.NewProjectPage })));
const OverviewView = lazy(() => import('./components/overview/OverviewView').then(m => ({ default: m.OverviewView })));
const CalendarView = lazy(() => import('./components/calendar/CalendarWithTaskSidebar').then(m => ({ default: m.CalendarWithTaskSidebar })));
const ResursallokeringAllView = lazy(() => import('./components/allocation/ResursallokeringAllView').then(m => ({ default: m.ResursallokeringAllView })));
const TestView = lazy(() => import('./components/test/TestView').then(m => ({ default: m.TestView })));
const GanttView = lazy(() => import('./components/gantt/GanttView').then(m => ({ default: m.GanttView })));
const HomeView = lazy(() => import('./components/home/HomeView').then(m => ({ default: m.HomeView })));

// Loading fallback component
function RouteLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--e-surface)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '2px solid transparent',
          borderBottomColor: 'var(--primary-500)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }}></div>
        <p style={{ color: 'var(--e-text)' }}>Laddar...</p>
      </div>
    </div>
  );
}

function LoginPage() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--e-surface)'
    }}>
      <div style={{
        position: 'absolute',
        top: '24px',
        right: '24px'
      }}>
        <ThemeToggle />
      </div>

      <div style={{
        background: 'var(--e-surface)',
        padding: '40px',
        borderRadius: '24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '448px',
        margin: '0 16px'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: 'var(--primary-500)'
          }}>
            Prio
          </h1>
          <p style={{ color: 'var(--e-text)' }}>
            Håll fokus på det som är viktigt
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  // const [showWeeklyReview, setShowWeeklyReview] = useState(false);
  const { tasks } = useTasks();

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

  // Initialize email scheduler
  useEffect(() => {
    if (!user || loading) return;

    initEmailScheduler();
  }, [user, loading]);

  // TEMPORÄRT DISABLED: Weekly review modal disabled
  // // Weekly review trigger (Monday 06:00)
  // useEffect(() => {
  //   if (!user || loading) return;

  //   const checkWeeklyReview = () => {
  //     const now = new Date();
  //     const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday
  //     const hour = now.getHours();

  //     // Check if it's Monday 06:00
  //     if (dayOfWeek === 1 && hour === 6) {
  //       const lastReview = localStorage.getItem('prio-last-weekly-review');
  //       const today = now.toISOString().split('T')[0];

  //       // Only show if not already shown today
  //       if (lastReview !== today) {
  //         setShowWeeklyReview(true);
  //         localStorage.setItem('prio-last-weekly-review', today);
  //       }
  //     }
  //   };

  //   // Initial check
  //   checkWeeklyReview();

  //   // Check every hour
  //   const intervalId = setInterval(checkWeeklyReview, 60 * 60 * 1000);

  //   return () => clearInterval(intervalId);
  // }, [user, loading]);

  if (loading) {
    return <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--e-surface)'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        border: '2px solid transparent',
        borderBottomColor: 'var(--primary-500)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
    </div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      {children}
      {/* Email task listener - TEMPORÄRT DISABLED: Kraschar vid mount */}
      {/* <EmailTaskListener key="email-listener" /> */}
      {/* Voice AI assistant - Flyttad till HomeView */}
      {/* Quick note input - TEMPORÄRT DISABLED: Kraschar vid expandering */}
      {/* <QuickNoteInput key="quick-note" /> */}
      {/* Quick capture bar för mobil - TEMPORÄRT DISABLED: Testing if TaskForm/Dialog causes crash */}
      {/* <QuickCaptureBar key="quick-capture" /> */}
      {/* Weekly review modal - TEMPORÄRT DISABLED: Testing crash */}
      {/* <WeeklyReviewModal
        key="weekly-review"
        isOpen={showWeeklyReview}
        onClose={() => setShowWeeklyReview(false)}
        tasks={tasks}
      /> */}
      {/* PWA install prompt */}
      <InstallPrompt key="install-prompt" />
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
      // Default: go to home view
      navigate('/home');
    }
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--e-surface)'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '2px solid transparent',
          borderBottomColor: 'var(--primary-500)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }}></div>
        <p style={{ color: 'var(--e-text)' }}>Laddar...</p>
      </div>
    </div>
  );
}

function App() {
  // TEMPORÄRT DISABLED: GlobalSearch component disabled
  // const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Track app version for update notifications
  useEffect(() => {
    const currentVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';
    const storedVersion = localStorage.getItem('prio_app_version');

    if (storedVersion && storedVersion !== currentVersion) {
      // TEMPORÄRT DISABLED: Toast component disabled
      // showToast.custom({
      //   title: '🎉 Uppdaterad!',
      //   content: `Appen har uppdaterats till v${currentVersion}`,
      //   cssClass: 'e-toast-success',
      //   timeOut: 5000,
      // });
      console.log(`🎉 Uppdaterad till v${currentVersion}`);
    }

    localStorage.setItem('prio_app_version', currentVersion);
  }, []);

  // TEMPORÄRT DISABLED: GlobalSearch keyboard shortcut
  // // Global Search keyboard shortcut (Cmd/Ctrl+K)
  // useEffect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
  //       e.preventDefault();
  //       setIsGlobalSearchOpen(true);
  //     }
  //   };

  //   window.addEventListener('keydown', handleKeyDown);
  //   return () => window.removeEventListener('keydown', handleKeyDown);
  // }, []);

  return (
    <BrowserRouter>
      {/* Global Toast Component - TEMPORÄRT DISABLED: Testing crash */}
      {/* <ToastComponent
        ref={globalToastRef}
        id="toast_global"
        position={{ X: 'Right', Y: 'Top' }}
        showCloseButton={true}
        newestOnTop={true}
        showProgressBar={true}
        timeOut={3000}
        animation={{
          show: { effect: 'SlideRightIn', duration: 300 },
          hide: { effect: 'SlideRightOut', duration: 300 }
        }}
      /> */}
      <VersionBanner />
      <OfflineBanner />
      {/* <GlobalSearch isOpen={isGlobalSearchOpen} onClose={() => setIsGlobalSearchOpen(false)} /> */}
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
          path="/home"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <HomeView />
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
                <TaskImpactPage />
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
        {/* Overview */}
        <Route
          path="/overview"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <OverviewView />
              </Suspense>
            </ProtectedRoute>
          }
        />
        {/* Test View - SF Fluent2 Reference */}
        <Route
          path="/test"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <TestView />
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
          path="/projects/new"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <NewProjectPage />
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
        {/* Calendar */}
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <CalendarView />
              </Suspense>
            </ProtectedRoute>
          }
        />
        {/* Resursallokering (All) */}
        <Route
          path="/allocation"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <ResursallokeringAllView />
              </Suspense>
            </ProtectedRoute>
          }
        />
        {/* Gantt Timeline */}
        <Route
          path="/gantt"
          element={
            <ProtectedRoute>
              <Suspense fallback={<RouteLoader />}>
                <GanttView />
              </Suspense>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
