import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { getNextTask, getTaskQueue, hasEmergencyTasks } from '@/lib/focusAlgorithm';
import { Task, UserContext, DailyCheckIn } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { formatDuration, formatRelativeTime } from '@/lib/utils';
import { Play, ChevronRight, AlertTriangle, CheckCircle, SkipForward } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DailyCheckInModal } from './DailyCheckInModal';

export function FocusView() {
  const navigate = useNavigate();
  const { tasks, updateTask } = useTasks();
  const [context, setContext] = useState<UserContext | null>(null);
  const [nextTask, setNextTask] = useState<Task | null>(null);
  const [queue, setQueue] = useState<Task[]>([]);
  const [isEmergency, setIsEmergency] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInData, setCheckInData] = useState<DailyCheckIn | null>(null);

  // Hämta dagens check-in
  useEffect(() => {
    const stored = localStorage.getItem('prio-daily-checkin');
    const today = new Date().toISOString().split('T')[0];

    if (!stored) {
      // Ingen check-in gjord, öppna modal
      setIsCheckInOpen(true);
      return;
    }

    const checkIn: DailyCheckIn = JSON.parse(stored);

    if (checkIn.date !== today) {
      // Gammal check-in, öppna modal
      setIsCheckInOpen(true);
      return;
    }

    // Sätt context
    setCheckInData(checkIn);
    setContext({
      availableTime: checkIn.availableTime,
      energyLevel: checkIn.energyLevel,
      strategy: checkIn.strategy,
      currentDate: new Date(),
      nextBlockDuration: 90
    });
  }, []);

  // Beräkna nästa task när context eller tasks ändras
  useEffect(() => {
    if (!context || tasks.length === 0) return;

    const next = getNextTask(tasks, context);
    const upcoming = getTaskQueue(tasks, context, 5);
    const emergency = hasEmergencyTasks(tasks);

    setNextTask(next);
    setQueue(upcoming.slice(1)); // Skippa första (det är nextTask)
    setIsEmergency(emergency);
  }, [context, tasks]);

  const handleStartSession = () => {
    if (!nextTask) return;
    navigate(`/session/${nextTask.id}`);
  };

  const handleMarkDone = async () => {
    if (!nextTask) return;

    try {
      await updateTask(nextTask.id, { status: 'done', completed_at: new Date().toISOString() });
      toast.success('Uppgift markerad som klar!');

      // Visa result impact modal efter en kort delay
      setTimeout(() => {
        navigate(`/task/${nextTask.id}/impact`);
      }, 500);
    } catch (error) {
      console.error('Error marking task done:', error);
      toast.error('Kunde inte markera uppgift som klar');
    }
  };

  const handleShowNext = () => {
    if (queue.length === 0) {
      toast('Inga fler uppgifter i kön!', { icon: '🎉' });
      return;
    }
    // I framtiden: visa modal med hela kön
    toast('Nästa uppgifter listas snart!');
  };

  const handleCheckInComplete = (checkIn: DailyCheckIn) => {
    setCheckInData(checkIn);
    setContext({
      availableTime: checkIn.availableTime,
      energyLevel: checkIn.energyLevel,
      strategy: checkIn.strategy,
      currentDate: new Date(),
      nextBlockDuration: 90
    });
  };

  const handleSkipTask = async () => {
    if (!nextTask) return;

    const skipUntil = new Date();
    skipUntil.setHours(skipUntil.getHours() + 2);

    try {
      // Vi kan lägga till ett skipped_until fält senare, för nu skippa bara genom att öka effort tillfälligt
      toast.success('Uppgift överhoppad tillfälligt');
      // Force re-calculation by updating context
      setContext({...context!});
    } catch (error) {
      console.error('Error skipping task:', error);
      toast.error('Kunde inte hoppa över uppgift');
    }
  };

  if (!context || !nextTask) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Beräknar nästa uppgift...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Emergency Banner */}
      {isEmergency && (
        <div className="bg-red-500 text-white px-6 py-3 text-center font-semibold">
          <AlertTriangle className="inline h-5 w-5 mr-2" />
          Du har uppgifter med deadline inom 24 timmar!
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              🎯 Just Nu
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {context.availableTime} min kvar idag • {context.energyLevel === 'low' ? '🔋' : context.energyLevel === 'medium' ? '🔋🔋' : '🔋🔋🔋'}
              {checkInData?.strategy === 'quick_wins' && ' • ⚡ Quick Wins'}
              {checkInData?.strategy === 'deep_work' && ' • 🧠 Deep Work'}
              {checkInData?.strategy === 'balanced' && ' • ⚖️ Balanced'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCheckInOpen(true)}
          >
            Ny check-in
          </Button>
        </div>
      </div>

      {/* Main Focus Card */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-12 border-4 border-blue-500 dark:border-blue-600">
          {/* Emergency indicator */}
          {nextTask.consequence_deadline && (
            (() => {
              const hoursUntil = Math.floor(
                (new Date(nextTask.consequence_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60)
              );
              if (hoursUntil < 24) {
                return (
                  <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-500 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-bold text-red-900 dark:text-red-100 mb-1">
                          🚨 AKUT - Måste göras idag!
                        </h3>
                        <p className="text-sm text-red-800 dark:text-red-200">
                          Konsekvens om {hoursUntil}h: {nextTask.consequence_1week}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()
          )}

          {/* Title */}
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            {nextTask.title}
          </h2>

          {/* Description */}
          {nextTask.description && (
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
              {nextTask.description}
            </p>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {nextTask.estimated_duration && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Uppskattad tid</div>
                <div className="text-xl font-semibold text-gray-900 dark:text-white">
                  {formatDuration(nextTask.estimated_duration)}
                </div>
              </div>
            )}
            {nextTask.consequence_deadline && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Konsekvens om</div>
                <div className="text-xl font-semibold text-gray-900 dark:text-white">
                  {formatRelativeTime(nextTask.consequence_deadline)}
                </div>
              </div>
            )}
          </div>

          {/* Consequences (om användaren fyllt i) */}
          {(nextTask.consequence_1week || nextTask.consequence_1month) && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-3">
                Om du INTE gör denna uppgift:
              </h3>
              <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                {nextTask.consequence_1week && (
                  <div>
                    <span className="font-medium">Om 1 vecka:</span> {nextTask.consequence_1week}
                  </div>
                )}
                {nextTask.consequence_1month && (
                  <div>
                    <span className="font-medium">Om 1 månad:</span> {nextTask.consequence_1month}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex gap-4">
              <Button
                onClick={handleStartSession}
                className="flex-1 h-16 text-lg font-semibold"
              >
                <Play className="h-6 w-6 mr-3" />
                Starta nu
              </Button>
              <Button
                variant="secondary"
                onClick={handleMarkDone}
                className="h-16 px-8"
              >
                <CheckCircle className="h-6 w-6" />
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={handleSkipTask}
              className="w-full"
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Hoppa över (visa nästa)
            </Button>
          </div>
        </div>

        {/* Next in Queue */}
        {queue.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={handleShowNext}
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <span className="text-sm font-medium">Därefter:</span>
              <span className="text-base font-semibold">{queue[0].title}</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Daily Check-In Modal */}
      <DailyCheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onComplete={handleCheckInComplete}
      />
    </div>
  );
}
