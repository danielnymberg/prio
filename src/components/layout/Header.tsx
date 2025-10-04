import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { TaskForm } from '@/components/tasks/TaskForm';
import { useTasks } from '@/hooks/useTasks';
import { LogOut, User, Plus, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { createTask } = useTasks();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // TODO: Voice control integration point
  // Add speech-to-text for quick task creation via microphone button

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
        onSubmit={(input) => createTask(input as any)}
      />
    </header>
  );
}
