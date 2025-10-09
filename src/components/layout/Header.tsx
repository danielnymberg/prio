import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { TaskForm } from '@/components/tasks/TaskForm';
import { DailyCheckInModal } from '@/components/focus/DailyCheckInModal';
import { useTasks } from '@/hooks/useTasks';
import { CreateTaskInput, DailyCheckIn } from '@/lib/types';
import { LogOut, User, Plus, Menu, RefreshCw, Settings } from 'lucide-react';
import { isMicrosoftLoggedIn } from '@/services/microsoft-graph';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { createTask } = useTasks();
  const navigate = useNavigate();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isMicrosoftConnected, setIsMicrosoftConnected] = useState(false);

  // Check Microsoft connection status
  useEffect(() => {
    const checkMicrosoftStatus = async () => {
      const connected = await isMicrosoftLoggedIn();
      setIsMicrosoftConnected(connected);
    };
    checkMicrosoftStatus();

    // Re-check every 30 seconds
    const interval = setInterval(checkMicrosoftStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckInComplete = (checkIn: DailyCheckIn) => {
    localStorage.setItem('prio-daily-checkin', JSON.stringify(checkIn));
    // Reload för att uppdatera FocusView med ny strategi
    window.location.reload();
  };

  return (
    <header className="bg-cream-100 dark:bg-charcoal-900 border-b border-sand-200 dark:border-charcoal-800 px-6 sm:px-8 py-4 sm:py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Hamburgermeny - endast synlig på mobil/tablet */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-sand-200 dark:hover:bg-charcoal-850 rounded-xl transition-colors"
            aria-label="Öppna meny"
          >
            <Menu className="h-6 w-6 text-stone-700 dark:text-stone-300" />
          </button>

          <h1 className="text-xl sm:text-2xl font-bold text-copper-600 dark:text-copper-400">
            Prio
          </h1>
          <span className="hidden sm:inline text-sm text-stone-500 dark:text-stone-400">
            Håll fokus på det som är viktigt
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Microsoft status indicator */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-sand-100 dark:bg-charcoal-850 cursor-pointer hover:bg-sand-200 dark:hover:bg-charcoal-800 transition-colors"
            onClick={() => navigate('/settings')}
            title={isMicrosoftConnected ? 'Microsoft Calendar ansluten' : 'Microsoft Calendar ej ansluten - klicka för att ansluta'}
          >
            <div className={`w-2 h-2 rounded-full ${isMicrosoftConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-stone-600 dark:text-stone-400 hidden sm:inline">
              MSFT
            </span>
          </div>

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
            <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-sand-200 dark:border-charcoal-800">
              <div className="hidden md:flex items-center gap-2">
                <User className="h-4 w-4 text-stone-600 dark:text-stone-400" />
                <span className="text-sm text-stone-700 dark:text-stone-300">
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
