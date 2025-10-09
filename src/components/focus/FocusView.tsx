import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { getNextTask, getTaskQueue, hasEmergencyTasks, calculatePartialWork } from '@/lib/focusAlgorithm';
import { Task, UserContext, DailyCheckIn } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { formatDuration, formatRelativeTime } from '@/lib/utils';
import { Play, ChevronRight, AlertTriangle, CheckCircle, SkipForward, Clock, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DailyCheckInModal } from './DailyCheckInModal';
import { MorningBriefing } from './MorningBriefing';
import { DependencyAlert } from '@/components/alerts/DependencyAlert';
import { findCriticalDependencyChains } from '@/lib/dependencyAnalyzer';

export function FocusView() {
  const navigate = useNavigate();
  const { tasks, updateTask } = useTasks();
  const [context, setContext] = useState<UserContext | null>(null);
  const [nextTask, setNextTask] = useState<Task | null>(null);
  const [queue, setQueue] = useState<Task[]>([]);
  const [isEmergency, setIsEmergency] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInData, setCheckInData] = useState<DailyCheckIn | null>(null);
  const [skippedTaskIds, setSkippedTaskIds] = useState<string[]>([]);
  const [showMorningBriefing, setShowMorningBriefing] = useState(false);
  const [criticalChains, setCriticalChains] = useState<ReturnType<typeof findCriticalDependencyChains>>([]);

  // Helper functions for morning briefing
  const isMorningTime = () => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 10;
  };

  const hasSeenBriefingToday = () => {
    const lastBriefing = localStorage.getItem('last_briefing_date');
    if (!lastBriefing) return false;
    const today = new Date().toDateString();
    return lastBriefing === today;
  };

  // Check if morning briefing should be shown (run once on mount)
  useEffect(() => {
    if (isMorningTime() && !hasSeenBriefingToday()) {
      setShowMorningBriefing(true);
    }
  }, []); // Run only once on mount

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

    // Filtrera bort skippade tasks OCH Snabbis (≤2 min) - de hanteras separat
    const availableTasks = tasks.filter(t =>
      !skippedTaskIds.includes(t.id) &&
      (t.estimated_duration || 999) > 2
    );

    const next = getNextTask(availableTasks, context);
    const upcoming = getTaskQueue(availableTasks, context, 5);
    const emergency = hasEmergencyTasks(availableTasks);

    setNextTask(next);
    setQueue(upcoming.slice(1)); // Skippa första (det är nextTask)
    setIsEmergency(emergency);

    // Find critical dependency chains
    const chains = findCriticalDependencyChains(tasks, 40);
    setCriticalChains(chains);
  }, [context, tasks, skippedTaskIds]);

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

  const handleSkipTask = () => {
    if (!nextTask) return;

    // Lägg till current task i skipped-listan
    setSkippedTaskIds(prev => [...prev, nextTask.id]);
    toast.success('Uppgift överhoppad - visar nästa');
  };

  // Show morning briefing BEFORE check-in prompt
  if (showMorningBriefing) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
          <div className="max-w-2xl w-full">
            <MorningBriefing
              tasks={tasks}
              onStartDay={() => {
                localStorage.setItem('last_briefing_date', new Date().toDateString());
                setShowMorningBriefing(false);
                setIsCheckInOpen(true);
              }}
              onDismiss={() => {
                localStorage.setItem('last_briefing_date', new Date().toDateString());
                setShowMorningBriefing(false);
              }}
            />
          </div>
        </div>

        {/* Daily Check-In Modal */}
        <DailyCheckInModal
          isOpen={isCheckInOpen}
          onClose={() => setIsCheckInOpen(false)}
          onComplete={handleCheckInComplete}
        />
      </>
    );
  }

  if (!context) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <div className="max-w-md text-center px-6">
            <div className="text-6xl mb-4">☀️</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Börja din dag!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Gör din dagliga avstämning för att få din första uppgift.
            </p>
            <Button onClick={() => setIsCheckInOpen(true)} size="lg">
              Starta avstämning
            </Button>
          </div>
        </div>

        {/* Daily Check-In Modal */}
        <DailyCheckInModal
          isOpen={isCheckInOpen}
          onClose={() => setIsCheckInOpen(false)}
          onComplete={handleCheckInComplete}
        />
      </>
    );
  }

  if (!nextTask) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <div className="max-w-md text-center px-6">
            {(() => {
              const activeTasks = tasks.filter(t => t.status !== 'done');
              const blockedTasks = activeTasks.filter(t =>
                t.blocked_by_task_ids && t.blocked_by_task_ids.length > 0 &&
                t.blocked_by_task_ids.some(blockerId => {
                  const blocker = tasks.find(bt => bt.id === blockerId);
                  return blocker && blocker.status !== 'done';
                })
              );
              const tooLongTasks = context ? activeTasks.filter(t =>
                t.estimated_duration && t.estimated_duration > context.availableTime
              ) : [];

              if (tasks.length === 0) {
                return (
                  <>
                    <div className="text-6xl mb-4">📝</div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      Inga uppgifter ännu!
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Skapa din första uppgift för att komma igång med smart prioritering.
                    </p>
                    <Button onClick={() => navigate('/all')} size="lg">
                      <Plus className="h-5 w-5 mr-2" />
                      Skapa första uppgiften
                    </Button>
                  </>
                );
              }

              if (blockedTasks.length === activeTasks.length) {
                return (
                  <>
                    <div className="text-6xl mb-4">🔒</div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      Alla uppgifter är blockerade
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {blockedTasks.length} uppgifter väntar på att andra uppgifter ska bli klara.
                    </p>
                    <Button onClick={() => navigate('/all')} variant="primary">
                      Granska dependencies
                    </Button>
                  </>
                );
              }

              if (activeTasks.length > 0 && tooLongTasks.length === activeTasks.length && context) {
                return (
                  <>
                    <div className="text-6xl mb-4">⏰</div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                      Alla uppgifter tar för lång tid
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Du har {activeTasks.length} uppgifter men alla kräver mer än {Math.floor(context.availableTime / 60)}h.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button onClick={() => setIsCheckInOpen(true)} variant="primary">
                        Uppdatera tillgänglig tid
                      </Button>
                      <Button onClick={() => navigate('/all')} variant="secondary">
                        Dela upp uppgifter
                      </Button>
                    </div>
                  </>
                );
              }

              return (
                <>
                  <div className="text-6xl mb-4">🤷</div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Inga uppgifter tillgängliga just nu
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Det finns uppgifter men ingen passar dina nuvarande filter.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={() => setIsCheckInOpen(true)} variant="primary">
                      Uppdatera avstämning
                    </Button>
                    <Button onClick={() => navigate('/all')} variant="secondary">
                      Visa alla uppgifter
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Daily Check-In Modal */}
        <DailyCheckInModal
          isOpen={isCheckInOpen}
          onClose={() => setIsCheckInOpen(false)}
          onComplete={handleCheckInComplete}
        />
      </>
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

      {/* Dependency Alerts */}
      {criticalChains.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              ⚠️ Kritiska blockeringskedjor ({criticalChains.length})
            </h2>
            {criticalChains.map((chain, index) => (
              <DependencyAlert key={index} chain={chain} />
            ))}
          </div>
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
            Ny avstämning
          </Button>
        </div>
      </div>

      {/* Snabbis-sektion - Uppgifter <= 2 min */}
      {(() => {
        const snabbis = tasks.filter(t =>
          t.status !== 'done' &&
          t.estimated_duration &&
          t.estimated_duration <= 2
        );

        if (snabbis.length === 0) return null;

        return (
          <div className="max-w-4xl mx-auto px-6 pt-6">
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">⚡</span>
                <h3 className="text-lg font-bold text-green-900 dark:text-green-100">
                  Snabbis ({snabbis.length}) - Gör direkt!
                </h3>
              </div>
              <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                💡 Uppgifter som tar ≤ 2 min - klara av dem först!
              </p>
              <div className="space-y-2">
                {snabbis.map(task => (
                  <div
                    key={task.id}
                    className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/session/${task.id}`)}
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatDuration(task.estimated_duration)}
                      </p>
                    </div>
                    <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Focus Card */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-12 border-4 border-copper-500 dark:border-copper-600">
          {/* Deadline Warnings */}
          {nextTask.deadline && (() => {
            const deadline = new Date(nextTask.deadline);
            const now = new Date();
            const hoursUntil = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
            const isOverdue = hoursUntil < 0;
            const isEmergency = hoursUntil >= 0 && hoursUntil < 24 && (nextTask.time_sensitivity || 5) >= 7;

            if (isOverdue) {
              const hoursOverdue = Math.abs(hoursUntil);
              return (
                <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-500 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-red-900 dark:text-red-100 mb-1">
                        🚨 FÖRSENAD - {hoursOverdue < 24 ? `${hoursOverdue}h` : `${Math.floor(hoursOverdue / 24)} dagar`} sen!
                      </h3>
                      <p className="text-sm text-red-800 dark:text-red-200">
                        Deadline var {deadline.toLocaleDateString('sv-SE')} kl {deadline.toLocaleTimeString('sv-SE', {hour: '2-digit', minute: '2-digit'})}.
                        Denna uppgift bör prioriteras högst.
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            if (isEmergency) {
              return (
                <div className="bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-500 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-orange-900 dark:text-orange-100 mb-1">
                        ⚡ AKUT - Deadline om {hoursUntil}h
                      </h3>
                      <p className="text-sm text-orange-800 dark:text-orange-200">
                        Deadline: {deadline.toLocaleDateString('sv-SE')} kl {deadline.toLocaleTimeString('sv-SE', {hour: '2-digit', minute: '2-digit'})}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })()}

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
            {nextTask.deadline && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Deadline</div>
                <div className="text-xl font-semibold text-gray-900 dark:text-white">
                  {formatRelativeTime(nextTask.deadline)}
                </div>
              </div>
            )}
          </div>

          {/* Too Late Warning */}
          {(nextTask as any).isTooLate && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-bold text-red-900 dark:text-red-100 mb-1">
                    🚨 För sent att påbörja denna uppgift
                  </h3>
                  <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                    {(nextTask as any).tooLateReason}
                  </p>
                  <div className="bg-red-100 dark:bg-red-800 rounded-lg p-3 mt-2">
                    <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                      💡 Förslag:
                    </p>
                    <ul className="text-sm text-red-800 dark:text-red-200 mt-1 space-y-1">
                      <li>• Omförhandla deadline med beställare</li>
                      <li>• Delegera uppgiften till någon annan</li>
                      <li>• Dela upp i mindre delar och gör det viktigaste först</li>
                      <li>• Markera som "ej genomförbar" och dokumentera varför</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Partial Work Warning */}
          {nextTask.estimated_duration &&
           context &&
           nextTask.estimated_duration > context.availableTime && (
            <div className="bg-sand-100 dark:bg-charcoal-850 border-2 border-copper-400 dark:border-copper-600 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Clock className="h-6 w-6 text-copper-600 dark:text-copper-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-bold text-stone-600 dark:text-sand-100 mb-1">
                    ⏱️ Uppgiften tar längre än tillgänglig tid
                  </h3>
                  <p className="text-sm text-stone-600 dark:text-sand-200 mb-2">
                    Uppgiften tar {formatDuration(nextTask.estimated_duration)},
                    du har {formatDuration(context.availableTime)} kvar idag.
                  </p>
                  <div className="bg-sand-200 dark:bg-charcoal-700 rounded-lg p-3 mt-2">
                    <p className="text-sm font-semibold text-stone-600 dark:text-sand-100">
                      💡 Förslag: {calculatePartialWork(
                        nextTask.estimated_duration,
                        context.availableTime
                      ).suggestion}
                    </p>
                  </div>
                </div>
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
