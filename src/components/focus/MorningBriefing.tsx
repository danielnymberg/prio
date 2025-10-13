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
    <div className="e-rounded-lg e-p-24 e-mb-24" style={{ background: 'linear-gradient(to right, var(--copper-600), var(--copper-600))', color: 'white', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
      <h2 className="e-text-xl e-font-bold e-mb-16">{greeting}</h2>

      {/* Statistik-grid */}
      <div className="e-grid e-grid-cols-2 e-gap-16 e-mb-16">
        <div className="e-rounded-md e-p-12" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
          <div className="e-text-sm e-opacity-75">Deadline idag</div>
          <div className="e-text-2xl e-font-bold">{todayTasks.length}</div>
        </div>
        <div className="e-rounded-md e-p-12" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
          <div className="e-text-sm e-opacity-75">Försenade</div>
          <div className="e-text-2xl e-font-bold">{overdueTasks.length}</div>
        </div>
      </div>

      {/* Extra info */}
      {blockedTasks.length > 0 && (
        <p className="e-mb-12 e-opacity-75 e-text-sm">
          🔒 {blockedTasks.length} uppgifter är blockerade av andra tasks
        </p>
      )}

      {availableTime && (
        <p className="e-mb-16 e-opacity-75">
          ⏰ Du har {formatDuration(availableTime)} ledig tid idag
        </p>
      )}

      {/* Top 3 tasks */}
      {scoredTasks.length > 0 && (
        <div className="e-mb-16">
          <h3 className="e-font-semibold e-mb-8">🎯 Rekommenderade tasks:</h3>
          <ol className="e-flex e-flex-column e-gap-4 e-text-sm" style={{ listStyleType: 'decimal', paddingLeft: '1.5rem' }}>
            {scoredTasks.map(({ task }) => (
              <li key={task.id} className="e-opacity-75">
                {task.title}
                {task.deadline && (
                  <span className="e-text-xs e-ml-8 e-opacity-75">
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
        <p className="e-mb-16 e-opacity-75">
          🎉 Du har inga aktiva tasks! Skapa din första uppgift för att komma igång.
        </p>
      )}

      {/* Actions */}
      <div className="e-flex e-gap-12">
        <div
          className="e-flex-1"
          onMouseEnter={() => setHoverStartDay(true)}
          onMouseLeave={() => setHoverDismiss(false)}
        >
          <Button
            onClick={onStartDay}
            className="e-w-full e-font-semibold e-transition"
            style={{
              backgroundColor: hoverStartDay ? '#f5f1ed' : 'white',
              color: 'var(--copper-600)'
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
            className="e-transition e-border"
            style={{
              color: 'white',
              borderColor: 'rgba(255, 255, 255, 0.3)',
              backgroundColor: hoverDismiss ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
            }}
          >
            Hoppa över
          </Button>
        </div>
      </div>
    </div>
  );
}
