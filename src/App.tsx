import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/auth/LoginForm';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './components/views/Dashboard';
import { TodayView } from './components/views/TodayView';
import { WeekView } from './components/views/WeekView';
import { ArchiveView } from './components/views/ArchiveView';
import { ImportView } from './components/views/ImportView';
import { AllTasksView } from './components/views/AllTasksView';
import { VoiceInterface } from './components/voice/VoiceInterface';
import { FocusView } from './components/focus/FocusView';
import { ActiveSession } from './components/focus/ActiveSession';
import { BreakView } from './components/focus/BreakView';
import { ResultImpactModal } from './components/tasks/ResultImpactModal';
import { WelcomeModal } from './components/onboarding/WelcomeModal';

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

  return (
    <AppLayout>
      {children}
      {/* Voice interface alltid tillgänglig när inloggad */}
      <VoiceInterface />
      {/* Onboarding modal för nya användare */}
      <WelcomeModal
        isOpen={showWelcome}
        onComplete={() => setShowWelcome(false)}
      />
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
  return (
    <BrowserRouter>
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
              <TodayView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/week"
          element={
            <ProtectedRoute>
              <WeekView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/all"
          element={
            <ProtectedRoute>
              <AllTasksView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/archive"
          element={
            <ProtectedRoute>
              <ArchiveView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/import"
          element={
            <ProtectedRoute>
              <ImportView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/focus"
          element={
            <ProtectedRoute>
              <FocusView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/session/:taskId"
          element={
            <ProtectedRoute>
              <ActiveSession />
            </ProtectedRoute>
          }
        />
        <Route
          path="/break"
          element={
            <ProtectedRoute>
              <BreakView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/task/:taskId/impact"
          element={
            <ProtectedRoute>
              <ResultImpactModal />
            </ProtectedRoute>
          }
        />
        {/* Alias /matrix to Dashboard for backwards compatibility */}
        <Route
          path="/matrix"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
