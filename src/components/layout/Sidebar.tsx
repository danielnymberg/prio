import { NavLink } from 'react-router-dom';
import { Calendar, CalendarDays, List, Archive, Plus, Upload, Target, Grid } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { isToday, isThisWeek, isPast } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { TaskForm } from '@/components/tasks/TaskForm';

export function Sidebar() {
  const { tasks, createTask } = useTasks();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const activeTasks = tasks.filter(t => t.status !== 'done');
  const todayTasks = activeTasks.filter(t => t.deadline && isToday(new Date(t.deadline)));
  const weekTasks = activeTasks.filter(t => t.deadline && isThisWeek(new Date(t.deadline)));
  const overdueTasks = activeTasks.filter(t => t.deadline && isPast(new Date(t.deadline)) && !isToday(new Date(t.deadline)));

  const navItems = [
    { to: '/focus', icon: Target, label: 'Just Nu', count: null, highlight: true, section: 'main' },
    { to: '/all', icon: List, label: 'Alla uppgifter', count: activeTasks.length, section: 'main' },
    { to: '/week', icon: CalendarDays, label: 'Denna vecka', count: weekTasks.length, section: 'main' },
    { to: '/today', icon: Calendar, label: 'Idag', count: todayTasks.length, alert: overdueTasks.length > 0, section: 'main' },
    { to: '/archive', icon: Archive, label: 'Klara', count: tasks.filter(t => t.status === 'done').length, section: 'main' },
  ];

  const advancedItems = [
    { to: '/matrix', icon: Grid, label: 'Matrix (beta)', count: null, section: 'advanced' },
    { to: '/import', icon: Upload, label: 'Importera', count: null, section: 'advanced' },
  ];

  return (
    <>
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col">
        <Button
          variant="primary"
          size="md"
          onClick={() => setIsFormOpen(true)}
          className="w-full mb-6"
        >
          <Plus className="h-5 w-5 mr-2" />
          Ny task
        </Button>

        <nav className="space-y-1 flex-1">
          {navItems.map(({ to, icon: Icon, label, count, alert, highlight }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  highlight
                    ? isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 shadow-md'
                    : isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
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
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {count}
                  </span>
                </div>
              )}
            </NavLink>
          ))}

          <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Avancerat
            </div>
            {advancedItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
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
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              ⚠️ {overdueTasks.length} försenade tasks
            </p>
          </div>
        )}
      </aside>

      <TaskForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={(input) => createTask(input as any)}
      />
    </>
  );
}
