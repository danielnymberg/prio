import { Task } from '@/lib/types';
import { Button } from '@/components/ui/Button';
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

  return (
    <div className="bg-gradient-to-r from-copper-600 to-copper-600 text-white rounded-2xl p-6 mb-6 shadow-xl">
      <h2 className="text-2xl font-bold mb-4">{greeting}</h2>

      {/* Statistik-grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white/10 backdrop-blur rounded-lg p-3">
          <div className="text-sm opacity-90">Deadline idag</div>
          <div className="text-3xl font-bold">{todayTasks.length}</div>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-lg p-3">
          <div className="text-sm opacity-90">Försenade</div>
          <div className="text-3xl font-bold">{overdueTasks.length}</div>
        </div>
      </div>

      {/* Extra info */}
      {blockedTasks.length > 0 && (
        <p className="mb-3 opacity-90 text-sm">
          🔒 {blockedTasks.length} uppgifter är blockerade av andra tasks
        </p>
      )}

      {availableTime && (
        <p className="mb-4 opacity-90">
          ⏰ Du har {formatDuration(availableTime)} ledig tid idag
        </p>
      )}

      {/* Top 3 tasks */}
      {scoredTasks.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">🎯 Rekommenderade tasks:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            {scoredTasks.map(({ task }) => (
              <li key={task.id} className="opacity-90">
                {task.title}
                {task.deadline && (
                  <span className="text-xs ml-2 opacity-75">
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
        <p className="mb-4 opacity-90">
          🎉 Du har inga aktiva tasks! Skapa din första uppgift för att komma igång.
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={onStartDay}
          className="flex-1 bg-white text-copper-600 hover:bg-sand-100 font-semibold"
        >
          Starta dagen
        </Button>
        <Button
          onClick={onDismiss}
          variant="ghost"
          className="text-white border border-white/30 hover:bg-white/10"
        >
          Hoppa över
        </Button>
      </div>
    </div>
  );
}
