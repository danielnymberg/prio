import { useTasks } from '@/hooks/useTasks';
import { Stats } from '@/components/ui/Stats';
import { isToday, isPast } from 'date-fns';
import { Target } from 'lucide-react';

export function Dashboard() {
  const { tasks } = useTasks();

  const activeTasks = tasks.filter(t => t.status !== 'done');
  const todayTasks = activeTasks.filter(t => t.deadline && isToday(new Date(t.deadline)));
  const overdueTasks = activeTasks.filter(t =>
    t.deadline && isPast(new Date(t.deadline)) && !isToday(new Date(t.deadline))
  );

  // Hitta viktig och brådskande task (högt värde OCH hög tidskänslighet)
  const highestPriorityTask = activeTasks
    .filter(t => t.value_score >= 7 && t.time_sensitivity >= 7)
    .sort((a, b) => b.priority - a.priority)[0];

  const stats = [
    { label: 'tasks totalt', value: activeTasks.length },
    { label: 'deadline idag', value: todayTasks.length, variant: todayTasks.length > 0 ? 'warning' as const : 'default' as const },
    { label: 'försenade', value: overdueTasks.length, variant: overdueTasks.length > 0 ? 'danger' as const : 'default' as const },
  ];

  return (
    <div className="e-flex e-flex-column e-gap-24">
      {highestPriorityTask && (
        <div className="e-rounded-lg e-p-24 e-border" style={{
          background: 'linear-gradient(to right, var(--error-50, #fef2f2), var(--warning-50, #fff7ed))',
          borderWidth: '2px',
          borderColor: 'var(--error-500, #ef4444)'
        }}>
          <div className="e-flex e-align-start e-gap-16">
            <div className="e-p-12 e-rounded-md e-opacity-75" style={{
              backgroundColor: 'var(--error-500, #ef4444)'
            }}>
              <Target style={{
                width: '24px',
                height: '24px',
                color: 'var(--error-500, #ef4444)'
              }} />
            </div>
            <div className="e-flex-1">
              <h2 className="e-text-lg e-font-bold e-mb-4" style={{ color: 'var(--error-500, #ef4444)' }}>
                🎯 Börja med:
              </h2>
              <p className="e-text-xl e-font-medium e-mb-8" style={{ color: 'var(--error-500, #ef4444)' }}>
                {highestPriorityTask.title}
              </p>
              {highestPriorityTask.description && (
                <p className="e-text-sm e-opacity-75" style={{ color: 'var(--error-500, #ef4444)' }}>
                  {highestPriorityTask.description}
                </p>
              )}
              <div className="e-mt-8 e-flex e-align-center e-gap-8">
                <span className="e-text-xs" style={{
                  fontFamily: 'monospace',
                  color: 'var(--error-500, #ef4444)'
                }}>
                  Prioritet: {highestPriorityTask.priority.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="e-rounded-lg e-p-24 e-border" style={{
        backgroundColor: 'var(--e-surface)',
        borderColor: 'var(--e-border)'
      }}>
        <Stats stats={stats} />
      </div>
    </div>
  );
}
