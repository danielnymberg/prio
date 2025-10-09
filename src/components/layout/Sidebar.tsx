import { NavLink } from 'react-router-dom';
import { Calendar, CalendarDays, List, Archive, Plus, Upload, Target, X, Inbox, Settings, FolderKanban, BarChart3, CalendarRange } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { isToday, isThisWeek, isPast } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { TaskForm } from '@/components/tasks/TaskForm';
import { Task, CreateTaskInput } from '@/lib/types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { tasks, createTask, updateTask } = useTasks();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);

  const activeTasks = tasks.filter(t => t.status !== 'done');
  const todayTasks = activeTasks.filter(t => t.deadline && isToday(new Date(t.deadline)));
  const weekTasks = activeTasks.filter(t => t.deadline && isThisWeek(new Date(t.deadline)));
  const overdueTasks = activeTasks.filter(t => t.deadline && isPast(new Date(t.deadline)) && !isToday(new Date(t.deadline)));
  const inboxTasks = tasks.filter(t =>
    t.status === 'not_started' &&
    !t.deadline &&
    (t.value_score === 8 && t.time_sensitivity === 5)
  );

  const navItems = [
    { to: '/focus', icon: Target, label: 'Just Nu', count: null, highlight: true, section: 'main' },
    { to: '/calendar', icon: CalendarRange, label: 'Kalender', count: null, section: 'main' },
    { to: '/inbox', icon: Inbox, label: 'Inbox', count: inboxTasks.length, alert: inboxTasks.length > 0, section: 'main' },
    { to: '/all', icon: List, label: 'Alla uppgifter', count: activeTasks.length, section: 'main' },
    { to: '/week', icon: CalendarDays, label: 'Denna vecka', count: weekTasks.length, section: 'main' },
    { to: '/today', icon: Calendar, label: 'Idag', count: todayTasks.length, alert: overdueTasks.length > 0, section: 'main' },
    { to: '/archive', icon: Archive, label: 'Klara', count: tasks.filter(t => t.status === 'done').length, section: 'main' },
    { to: '/overview', icon: BarChart3, label: 'Översikt', count: null, section: 'main' },
  ];

  const advancedItems = [
    { to: '/projects', icon: FolderKanban, label: 'Projekt', count: null, section: 'advanced' },
    { to: '/import', icon: Upload, label: 'Importera', count: null, section: 'advanced' },
    { to: '/settings', icon: Settings, label: 'Inställningar', count: null, section: 'advanced' },
  ];

  return (
    <>
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-cream-50 dark:bg-charcoal-900 border-r border-sand-200 dark:border-charcoal-800
          p-6 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Stäng-knapp för mobil */}
        <div className="lg:hidden flex justify-end mb-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-sand-100 dark:hover:bg-charcoal-800 rounded-xl transition-colors"
            aria-label="Stäng meny"
          >
            <X className="h-6 w-6 text-stone-600 dark:text-stone-400" />
          </button>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setSelectedTask(undefined); // Reset för ny task
            setIsFormOpen(true);
            onClose(); // Stäng sidebar på mobil efter klick
          }}
          className="w-full mb-6 min-h-[44px]"
        >
          <Plus className="h-5 w-5 mr-2" />
          Ny task
        </Button>

        <nav className="space-y-1 flex-1">
          {navItems.map(({ to, icon: Icon, label, count, alert, highlight }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => onClose()} // Stäng sidebar på mobil efter navigering
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 rounded-xl transition-all min-h-[44px] ${
                  highlight
                    ? isActive
                      ? 'bg-copper-500 text-white shadow-soft'
                      : 'bg-copper-400 text-white hover:bg-copper-500 shadow-subtle'
                    : isActive
                    ? 'bg-sand-200 dark:bg-charcoal-800 text-copper-600 dark:text-copper-400'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-sand-100 dark:hover:bg-charcoal-850'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                <span className="font-medium">{label}</span>
              </div>
              {count !== null && (
                <div className="flex items-center gap-2">
                  {alert && (
                    <span className="w-2 h-2 bg-error-500 rounded-full animate-pulse" />
                  )}
                  <span className="text-sm text-stone-500 dark:text-stone-400">
                    {count}
                  </span>
                </div>
              )}
            </NavLink>
          ))}

          <div className="pt-6 mt-6 border-t border-sand-200 dark:border-charcoal-800">
            <div className="px-4 mb-3 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Avancerat
            </div>
            {advancedItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => onClose()} // Stäng sidebar på mobil efter navigering
                className={({ isActive }) =>
                  `flex items-center justify-between px-4 py-3 rounded-xl transition-all min-h-[44px] ${
                    isActive
                      ? 'bg-sand-200 dark:bg-charcoal-800 text-copper-600 dark:text-copper-400'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-sand-100 dark:hover:bg-charcoal-850'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{label}</span>
                </div>
              </NavLink>
            ))}
          </div>
        </nav>

        {overdueTasks.length > 0 && (
          <div className="mt-6 p-4 bg-error-50 dark:bg-error-950 border border-error-200 dark:border-error-800 rounded-xl">
            <p className="text-sm font-medium text-error-700 dark:text-error-400">
              ⚠️ {overdueTasks.length} försenade tasks
            </p>
          </div>
        )}
      </aside>

      <TaskForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedTask(undefined);
        }}
        onSubmit={async (input) => {
          if (selectedTask) {
            await updateTask(selectedTask.id, input);
          } else {
            await createTask(input as CreateTaskInput);
          }
        }}
        task={selectedTask}
      />
    </>
  );
}
