import { useState } from 'react';
import { Task } from '@/lib/types';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { formatDuration } from '@/lib/utils';
import { calculateDynamicPriority } from '@/lib/focusAlgorithm';

interface MorningBriefingProps {
  tasks: Task[];
  onStartDay: () => void;
  onDismiss: () => void;
}

export function MorningBriefing({ tasks, onStartDay, onDismiss }: MorningBriefingProps) {
  const now = new Date();
  const hour = now.getHours();

  // Smart greeting baserat på tid
  const greeting = hour >= 6 && hour < 8 ? '☀️ God morgon!' : '👋 Hej igen!';

  // Beräkna statistik
  const activeTasks = tasks.filter(t => t.status !== 'done');

  // Tasks med deadline idag
  const todayTasks = activeTasks.filter(t => {
    if (!t.deadline) return false;
    const deadlineDate = new Date(t.deadline);
    return (
      deadlineDate.getDate() === now.getDate() &&
      deadlineDate.getMonth() === now.getMonth() &&
      deadlineDate.getFullYear() === now.getFullYear()
    );
  });

  // Försenade tasks
  const overdueTasks = activeTasks.filter(t => {
    if (!t.deadline) return false;
    return new Date(t.deadline) < now;
  });

  // Blockerade tasks
  const blockedTasks = activeTasks.filter(t =>
    t.blocked_by_task_ids &&
    t.blocked_by_task_ids.length > 0 &&
    t.blocked_by_task_ids.some(blockerId => {
      const blocker = tasks.find(bt => bt.id === blockerId);
      return blocker && blocker.status !== 'done';
    })
  );

  // Top 3 högsta prioritet tasks (använd calculateDynamicPriority)
  const mockContext = {
    availableTime: 480, // 8h default
    energyLevel: 'high' as const,
    strategy: 'balanced' as const,
    currentDate: now,
    nextBlockDuration: 90,
  };

  const scoredTasks = activeTasks
    .map(t => ({
      task: t,
      score: calculateDynamicPriority(t, tasks, mockContext, now),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Hämta senaste check-in för tillgänglig tid
  const lastCheckIn = localStorage.getItem('prio-daily-checkin');
  let availableTime: number | null = null;
  if (lastCheckIn) {
    try {
      const checkIn = JSON.parse(lastCheckIn);
      const checkInDate = checkIn.date;
      const today = now.toISOString().split('T')[0];
      if (checkInDate === today) {
        availableTime = checkIn.availableTime;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  const [hoverStartDay, setHoverStartDay] = useState(false);
  const [hoverDismiss, setHoverDismiss] = useState(false);

  return (
    <div style={{ background: 'linear-gradient(to right, var(--copper-600), var(--copper-600))', color: 'white', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>{greeting}</h2>

      {/* Statistik-grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', borderRadius: '0.5rem', padding: '0.75rem' }}>
          <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Deadline idag</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{todayTasks.length}</div>
        </div>
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', borderRadius: '0.5rem', padding: '0.75rem' }}>
          <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Försenade</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>{overdueTasks.length}</div>
        </div>
      </div>

      {/* Extra info */}
      {blockedTasks.length > 0 && (
        <p style={{ marginBottom: '0.75rem', opacity: 0.9, fontSize: '0.875rem' }}>
          🔒 {blockedTasks.length} uppgifter är blockerade av andra tasks
        </p>
      )}

      {availableTime && (
        <p style={{ marginBottom: '1rem', opacity: 0.9 }}>
          ⏰ Du har {formatDuration(availableTime)} ledig tid idag
        </p>
      )}

      {/* Top 3 tasks */}
      {scoredTasks.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>🎯 Rekommenderade tasks:</h3>
          <ol style={{ listStyleType: 'decimal', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
            {scoredTasks.map(({ task }) => (
              <li key={task.id} style={{ opacity: 0.9 }}>
                {task.title}
                {task.deadline && (
                  <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem', opacity: 0.75 }}>
                    (deadline: {new Date(task.deadline).toLocaleDateString('sv-SE')})
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Om inga tasks */}
      {activeTasks.length === 0 && (
        <p style={{ marginBottom: '1rem', opacity: 0.9 }}>
          🎉 Du har inga aktiva tasks! Skapa din första uppgift för att komma igång.
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <div
          style={{ flex: 1 }}
          onMouseEnter={() => setHoverStartDay(true)}
          onMouseLeave={() => setHoverStartDay(false)}
        >
          <Button
            onClick={onStartDay}
            style={{
              width: '100%',
              backgroundColor: hoverStartDay ? '#f5f1ed' : 'white',
              color: 'var(--copper-600)',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
          >
            Starta dagen
          </Button>
        </div>
        <div
          onMouseEnter={() => setHoverDismiss(true)}
          onMouseLeave={() => setHoverDismiss(false)}
        >
          <Button
            onClick={onDismiss}
            variant="ghost"
            style={{
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              backgroundColor: hoverDismiss ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              transition: 'background-color 0.2s'
            }}
          >
            Hoppa över
          </Button>
        </div>
      </div>
    </div>
  );
}
