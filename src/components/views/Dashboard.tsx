import { useTasks } from '@/hooks/useTasks';
import { EisenhowerMatrix } from '@/components/matrix/EisenhowerMatrix';
import { Stats } from '@/components/ui/Stats';
import { getTaskQuadrant } from '@/lib/utils';
import { isToday, isPast } from 'date-fns';
import { Target } from 'lucide-react';

// TODO: DaNy AI integration point
// Add workload analysis widget showing:
// - Burnout risk indicator
// - Suggested focus area (Q1/Q2/Q3/Q4)
// - Smart scheduling recommendations

export function Dashboard() {
  const { tasks } = useTasks();

  const activeTasks = tasks.filter(t => t.status !== 'done');
  const todayTasks = activeTasks.filter(t => t.deadline && isToday(new Date(t.deadline)));
  const overdueTasks = activeTasks.filter(t =>
    t.deadline && isPast(new Date(t.deadline)) && !isToday(new Date(t.deadline))
  );

  const highestPriorityTask = activeTasks
    .filter(t => getTaskQuadrant(t) === 'Q1')
    .sort((a, b) => b.priority - a.priority)[0];

  const stats = [
    { label: 'tasks totalt', value: activeTasks.length },
    { label: 'deadline idag', value: todayTasks.length, variant: todayTasks.length > 0 ? 'warning' as const : 'default' as const },
    { label: 'försenade', value: overdueTasks.length, variant: overdueTasks.length > 0 ? 'danger' as const : 'default' as const },
  ];

  return (
    <div className="space-y-6">
      {highestPriorityTask && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Target className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-red-900 dark:text-red-100 mb-1">
                🎯 Börja med:
              </h2>
              <p className="text-xl font-medium text-red-800 dark:text-red-200 mb-2">
                {highestPriorityTask.title}
              </p>
              {highestPriorityTask.description && (
                <p className="text-sm text-red-700 dark:text-red-300">
                  {highestPriorityTask.description}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs font-mono text-red-600 dark:text-red-400">
                  Prioritet: {highestPriorityTask.priority.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Eisenhower Matrix
        </h2>
        <EisenhowerMatrix />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <Stats stats={stats} />
      </div>
    </div>
  );
}
