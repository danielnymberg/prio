import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { TaskForm } from '@/components/tasks/TaskForm';
import { DailyCheckInModal } from '@/components/focus/DailyCheckInModal';
import { useTasks } from '@/hooks/useTasks';
import { CreateTaskInput, DailyCheckIn } from '@/lib/types';
import { LogOut, User, Plus, Menu, RefreshCw, Settings } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { createTask } = useTasks();
  const navigate = useNavigate();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);

  const handleCheckInComplete = (checkIn: DailyCheckIn) => {
    localStorage.setItem('prio-daily-checkin', JSON.stringify(checkIn));
    // Reload för att uppdatera FocusView med ny strategi
    window.location.reload();
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Hamburgermeny - endast synlig på mobil/tablet */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Öppna meny"
          >
            <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </button>

          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Prio
          </h1>
          <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400">
            Håll fokus på det som är viktigt
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/settings')}
            title="Inställningar"
            className="min-h-[44px]"
          >
            <Settings className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsCheckInOpen(true)}
            title="Gör ny check-in"
            className="min-h-[44px]"
          >
            <RefreshCw className="h-4 w-4 sm:mr-1" />
            <span className="hidden lg:inline">Check-in</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsQuickAddOpen(true)}
            title="Snabblägg task (Cmd+K)"
            className="min-h-[44px]"
          >
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Ny task</span>
          </Button>

          <ThemeToggle />

          {user && (
            <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-gray-200 dark:border-gray-700">
              <div className="hidden md:flex items-center gap-2">
                <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {user.email}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                title="Logga ut"
                className="min-h-[44px]"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <TaskForm
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSubmit={async (input) => {
          await createTask(input as CreateTaskInput);
        }}
      />

      <DailyCheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onComplete={handleCheckInComplete}
      />
    </header>
  );
}
