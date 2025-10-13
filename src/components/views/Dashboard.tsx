import { useTasks } from '@/hooks/useTasks';
import { EisenhowerMatrix } from '@/components/matrix/EisenhowerMatrix';
import { Stats } from '@/components/ui/Stats';
import { Alert } from '@/components/ui/Alert';
import { getTaskQuadrant } from '@/lib/utils';
import { isToday, isPast } from 'date-fns';
import { Target } from 'lucide-react';

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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      <Alert variant="info" title="Matrix (Beta)">
        Eisenhower Matrix är nu i beta-läge. För bästa upplevelse rekommenderar vi vår nya <strong>Just Nu</strong>-vy som använder CPM (Consequence-Priority Model) för smartare prioritering baserat på forskningsbaserade principer.
      </Alert>

      {highestPriorityTask && (
        <div style={{
          background: 'linear-gradient(to right, #fef2f2, #fff7ed)',
          border: '2px solid #ef4444',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px'
          }}>
            <div style={{
              padding: '12px',
              background: '#ef4444',
              opacity: 0.2,
              borderRadius: '8px'
            }}>
              <Target style={{
                width: '24px',
                height: '24px',
                color: '#ef4444'
              }} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#ef4444',
                marginBottom: '4px'
              }}>
                🎯 Börja med:
              </h2>
              <p style={{
                fontSize: '20px',
                fontWeight: '500',
                color: '#ef4444',
                marginBottom: '8px'
              }}>
                {highestPriorityTask.title}
              </p>
              {highestPriorityTask.description && (
                <p style={{
                  fontSize: '14px',
                  color: '#ef4444',
                  opacity: 0.9
                }}>
                  {highestPriorityTask.description}
                </p>
              )}
              <div style={{
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: '#ef4444'
                }}>
                  Prioritet: {highestPriorityTask.priority.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{
        background: 'var(--e-surface)',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid var(--e-border)'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'var(--e-text)',
          marginBottom: '16px'
        }}>
          Eisenhower Matrix
        </h2>
        <EisenhowerMatrix />
      </div>

      <div style={{
        background: 'var(--e-surface)',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid var(--e-border)'
      }}>
        <Stats stats={stats} />
      </div>
    </div>
  );
}
