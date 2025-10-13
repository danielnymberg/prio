import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { getNextTask, getTaskQueue, hasEmergencyTasks, calculatePartialWork } from '@/lib/focusAlgorithm';
import { Task, UserContext, DailyCheckIn } from '@/lib/types';
import { SyncButton as Button } from '@/components/ui/SyncButton';
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(to bottom right, #f9fafb, #e5e7eb)', padding: '1rem' }}>
          <div style={{ maxWidth: '42rem', width: '100%' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(to bottom right, var(--e-surface), var(--e-border))' }}>
          <div style={{ maxWidth: '28rem', textAlign: 'center', padding: '0 1.5rem' }}>
            <div style={{ fontSize: '3.75rem', marginBottom: '1rem' }}>☀️</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '1rem' }}>
              Börja din dag!
            </h2>
            <p style={{ color: 'var(--e-text-secondary)', marginBottom: '1.5rem' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(to bottom right, var(--e-surface), var(--e-border))' }}>
          <div style={{ maxWidth: '28rem', textAlign: 'center', padding: '0 1.5rem' }}>
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
                    <div style={{ fontSize: '3.75rem', marginBottom: '1rem' }}>📝</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '1rem' }}>
                      Inga uppgifter ännu!
                    </h2>
                    <p style={{ color: 'var(--e-text-secondary)', marginBottom: '1.5rem' }}>
                      Skapa din första uppgift för att komma igång med smart prioritering.
                    </p>
                    <Button onClick={() => navigate('/all')} size="lg">
                      <Plus style={{ height: '20px', width: '20px', marginRight: '0.5rem' }} />
                      Skapa första uppgiften
                    </Button>
                  </>
                );
              }

              if (blockedTasks.length === activeTasks.length) {
                return (
                  <>
                    <div style={{ fontSize: '3.75rem', marginBottom: '1rem' }}>🔒</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '1rem' }}>
                      Alla uppgifter är blockerade
                    </h2>
                    <p style={{ color: 'var(--e-text-secondary)', marginBottom: '1.5rem' }}>
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
                    <div style={{ fontSize: '3.75rem', marginBottom: '1rem' }}>⏰</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '1rem' }}>
                      Alla uppgifter tar för lång tid
                    </h2>
                    <p style={{ color: 'var(--e-text-secondary)', marginBottom: '1.5rem' }}>
                      Du har {activeTasks.length} uppgifter men alla kräver mer än {Math.floor(context.availableTime / 60)}h.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
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
                  <div style={{ fontSize: '3.75rem', marginBottom: '1rem' }}>🤷</div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '1rem' }}>
                    Inga uppgifter tillgängliga just nu
                  </h2>
                  <p style={{ color: 'var(--e-text-secondary)', marginBottom: '1.5rem' }}>
                    Det finns uppgifter men ingen passar dina nuvarande filter.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, var(--e-surface), var(--e-border))' }}>
      {/* Emergency Banner */}
      {isEmergency && (
        <div style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.75rem 1.5rem', textAlign: 'center', fontWeight: '600' }}>
          <AlertTriangle style={{ display: 'inline', height: '20px', width: '20px', marginRight: '0.5rem', verticalAlign: 'middle' }} />
          Du har uppgifter med deadline inom 24 timmar!
        </div>
      )}

      {/* Dependency Alerts */}
      {criticalChains.length > 0 && (
        <div style={{ backgroundColor: 'var(--e-surface)', borderBottom: '1px solid var(--e-border)', padding: '1rem 1.5rem' }}>
          <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--e-text)', marginBottom: '0.75rem' }}>
              ⚠️ Kritiska blockeringskedjor ({criticalChains.length})
            </h2>
            {criticalChains.map((chain, index) => (
              <DependencyAlert key={index} chain={chain} />
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ backgroundColor: 'var(--e-surface)', borderBottom: '1px solid var(--e-border)', padding: '1rem 1.5rem' }}>
        <div style={{ maxWidth: '64rem', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--e-text)', margin: 0 }}>
              🎯 Just Nu
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--e-text-secondary)', margin: 0 }}>
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
          <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '1.5rem 1.5rem 0' }}>
            <div style={{ backgroundColor: '#ecfdf5', border: '2px solid #10b981', borderRadius: '0.75rem', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>⚡</span>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#064e3b', margin: 0 }}>
                  Snabbis ({snabbis.length}) - Gör direkt!
                </h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#065f46', marginBottom: '0.75rem' }}>
                💡 Uppgifter som tar ≤ 2 min - klara av dem först!
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {snabbis.map(task => (
                  <div
                    key={task.id}
                    style={{
                      backgroundColor: 'var(--e-surface)',
                      borderRadius: '0.5rem',
                      padding: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'box-shadow 0.2s'
                    }}
                    onClick={() => navigate(`/session/${task.id}`)}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                  >
                    <div>
                      <p style={{ fontWeight: '500', color: 'var(--e-text)', margin: 0 }}>{task.title}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--e-text-secondary)', margin: 0 }}>
                        {formatDuration(task.estimated_duration)}
                      </p>
                    </div>
                    <Play style={{ height: '20px', width: '20px', color: '#10b981' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Focus Card */}
      <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ backgroundColor: 'var(--e-surface)', borderRadius: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '3rem', border: '4px solid var(--copper-500)' }}>
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
                <div style={{ backgroundColor: '#fee2e2', border: '2px solid #ef4444', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <AlertTriangle style={{ height: '24px', width: '24px', color: '#dc2626', flexShrink: 0, marginTop: '0.25rem' }} />
                    <div>
                      <h3 style={{ fontWeight: 'bold', color: '#7f1d1d', marginBottom: '0.25rem' }}>
                        🚨 FÖRSENAD - {hoursOverdue < 24 ? `${hoursOverdue}h` : `${Math.floor(hoursOverdue / 24)} dagar`} sen!
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: '#991b1b' }}>
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
                <div style={{ backgroundColor: '#fed7aa', border: '2px solid #f97316', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <AlertTriangle style={{ height: '24px', width: '24px', color: '#ea580c', flexShrink: 0, marginTop: '0.25rem' }} />
                    <div>
                      <h3 style={{ fontWeight: 'bold', color: '#7c2d12', marginBottom: '0.25rem' }}>
                        ⚡ AKUT - Deadline om {hoursUntil}h
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: '#9a3412' }}>
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
          <h2 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '1.5rem' }}>
            {nextTask.title}
          </h2>

          {/* Description */}
          {nextTask.description && (
            <p style={{ fontSize: '1.125rem', color: 'var(--e-text-secondary)', marginBottom: '1.5rem', lineHeight: '1.75' }}>
              {nextTask.description}
            </p>
          )}

          {/* Metadata */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {nextTask.estimated_duration && (
              <div style={{ backgroundColor: 'var(--e-border)', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--e-text-secondary)', marginBottom: '0.25rem' }}>Uppskattad tid</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--e-text)' }}>
                  {formatDuration(nextTask.estimated_duration)}
                </div>
              </div>
            )}
            {nextTask.deadline && (
              <div style={{ backgroundColor: 'var(--e-border)', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--e-text-secondary)', marginBottom: '0.25rem' }}>Deadline</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--e-text)' }}>
                  {formatRelativeTime(nextTask.deadline)}
                </div>
              </div>
            )}
          </div>

          {/* Too Late Warning */}
          {(nextTask as any).isTooLate && (
            <div style={{ backgroundColor: '#fee2e2', border: '2px solid #ef4444', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <AlertTriangle style={{ height: '24px', width: '24px', color: '#dc2626', flexShrink: 0, marginTop: '0.25rem' }} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 'bold', color: '#7f1d1d', marginBottom: '0.25rem' }}>
                    🚨 För sent att påbörja denna uppgift
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#991b1b', marginBottom: '0.5rem' }}>
                    {(nextTask as any).tooLateReason}
                  </p>
                  <div style={{ backgroundColor: '#fecaca', borderRadius: '0.5rem', padding: '0.75rem', marginTop: '0.5rem' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#7f1d1d' }}>
                      💡 Förslag:
                    </p>
                    <ul style={{ fontSize: '0.875rem', color: '#991b1b', marginTop: '0.25rem', paddingLeft: '1rem' }}>
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
            <div style={{ backgroundColor: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <Clock style={{ height: '24px', width: '24px', color: '#d97706', flexShrink: 0, marginTop: '0.25rem' }} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 'bold', color: '#78350f', marginBottom: '0.25rem' }}>
                    ⏱️ Uppgiften tar längre än tillgänglig tid
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#92400e', marginBottom: '0.5rem' }}>
                    Uppgiften tar {formatDuration(nextTask.estimated_duration)},
                    du har {formatDuration(context.availableTime)} kvar idag.
                  </p>
                  <div style={{ backgroundColor: '#fde68a', borderRadius: '0.5rem', padding: '0.75rem', marginTop: '0.5rem' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#78350f' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Button
                onClick={handleStartSession}
                style={{ flex: 1, height: '64px', fontSize: '1.125rem', fontWeight: '600' }}
              >
                <Play style={{ height: '24px', width: '24px', marginRight: '0.75rem' }} />
                Starta nu
              </Button>
              <Button
                variant="secondary"
                onClick={handleMarkDone}
                style={{ height: '64px', padding: '0 2rem' }}
              >
                <CheckCircle style={{ height: '24px', width: '24px' }} />
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={handleSkipTask}
              style={{ width: '100%' }}
            >
              <SkipForward style={{ height: '16px', width: '16px', marginRight: '0.5rem' }} />
              Hoppa över (visa nästa)
            </Button>
          </div>
        </div>

        {/* Next in Queue */}
        {queue.length > 0 && (
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button
              onClick={handleShowNext}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--e-text-secondary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--e-text)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--e-text-secondary)'}
            >
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Därefter:</span>
              <span style={{ fontSize: '1rem', fontWeight: '600' }}>{queue[0].title}</span>
              <ChevronRight style={{ height: '20px', width: '20px' }} />
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
