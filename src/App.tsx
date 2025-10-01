import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Placeholder components - you'll build these next
function LoginPage() {
  return <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-4">Prio</h1>
      <p className="text-gray-600 dark:text-gray-400">Login page - under construction</p>
      <p className="text-sm text-gray-500 mt-4">Infrastructure is ready! Start building components.</p>
    </div>
  </div>;
}

function Dashboard() {
  return <div className="p-8">
    <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
    <p>Eisenhower Matrix will go here</p>
  </div>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
    </div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
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
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
