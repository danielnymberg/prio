import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { getNextTask, getTaskQueue } from '@/lib/focusAlgorithm';
import { Task, UserContext, DailyCheckIn } from '@/lib/types';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { AccordionComponent, AccordionItemDirective, AccordionItemsDirective } from '@syncfusion/ej2-react-navigations';
import { formatDuration, formatRelativeTime } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { DagligCheckIn } from './DagligCheckIn';
import { TimerModal } from './TimerModal';

export function FocusView() {
  const navigate = useNavigate();
  const { tasks, updateTask } = useTasks();
  const [context, setContext] = useState<UserContext | null>(null);
  const [nextTask, setNextTask] = useState<Task | null>(null);
  const [queue, setQueue] = useState<Task[]>([]);
  const [checkInData, setCheckInData] = useState<DailyCheckIn | null>(null);
  const [skippedTaskIds, setSkippedTaskIds] = useState<string[]>([]);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [timerTask, setTimerTask] = useState<Task | null>(null);
  const [showTimer, setShowTimer] = useState(false);

  // Hämta dagens check-in från localStorage
  useEffect(() => {
    const stored = localStorage.getItem('prio-daily-checkin');
    if (!stored) {
      // Ingen checkin - auto-öppna modal
      setShowCheckInDialog(true);
      return;
    }

    const checkIn: DailyCheckIn = JSON.parse(stored);
    const today = new Date().toISOString().split('T')[0];

    if (checkIn.date === today) {
      setCheckInData(checkIn);
      setContext({
        availableTime: checkIn.availableTime,
        energyLevel: checkIn.energyLevel,
        strategy: checkIn.strategy,
        currentDate: new Date(),
        nextBlockDuration: 90
      });
    } else {
      // Gammal checkin - auto-öppna modal för ny dag
      setShowCheckInDialog(true);
    }
  }, []);

  // Beräkna nästa task när context eller tasks ändras
  useEffect(() => {
    if (!context || tasks.length === 0) return;

    const availableTasks = tasks.filter(t =>
      !skippedTaskIds.includes(t.id) &&
      (t.estimated_duration || 999) > 2
    );

    const next = getNextTask(availableTasks, context);
    const upcoming = getTaskQueue(availableTasks, context, 5);

    setNextTask(next);
    setQueue(upcoming.slice(1));
  }, [context, tasks, skippedTaskIds]);

  // Beräkna statistik
  const now = new Date();
  const activeTasks = tasks.filter(t => t.status !== 'done');

  const todayTasks = activeTasks.filter(t => {
    if (!t.deadline) return false;
    const deadlineDate = new Date(t.deadline);
    return (
      deadlineDate.getDate() === now.getDate() &&
      deadlineDate.getMonth() === now.getMonth() &&
      deadlineDate.getFullYear() === now.getFullYear()
    );
  });

  const overdueTasks = activeTasks.filter(t => {
    if (!t.deadline) return false;
    return new Date(t.deadline) < now;
  });

  const urgentTasks = activeTasks.filter(t => {
    if (!t.deadline) return false;
    const deadline = new Date(t.deadline);
    const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil > 0 && hoursUntil < 24;
  });

  const blockedTasks = activeTasks.filter(t =>
    t.blocked_by_task_ids &&
    t.blocked_by_task_ids.length > 0 &&
    t.blocked_by_task_ids.some(blockerId => {
      const blocker = tasks.find(bt => bt.id === blockerId);
      return blocker && blocker.status !== 'done';
    })
  );

  const snabbisTasks = activeTasks.filter(t =>
    t.estimated_duration && t.estimated_duration <= 2
  );

  // Handlers
  const handleStartSession = (task: Task) => {
    setTimerTask(task);
    setShowTimer(true);
  };

  const handleMarkDone = async (task: Task) => {
    try {
      await updateTask(task.id, { status: 'done', completed_at: new Date().toISOString() });
      toast.success('Uppgift slutförd!');
      setTimeout(() => {
        navigate(`/task/${task.id}/impact`);
      }, 500);
    } catch (error) {
      console.error('Error marking task done:', error);
      toast.error('Kunde inte markera uppgift som klar');
    }
  };

  const handleSkipTask = () => {
    if (!nextTask) return;
    setSkippedTaskIds(prev => [...prev, nextTask.id]);
    toast.success('Uppgift överhoppad - visar nästa');
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
    setShowCheckInDialog(false);

    // Navigera till focus efter avstämning
    if (window.location.pathname !== '/focus') {
      navigate('/focus');
    }
  };

  const handleTimerComplete = (taskId: string) => {
    navigate(`/task/${taskId}/impact`);
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/all?task=${taskId}`);
  };

  // === RENDER ===

  // Tom state - Inga tasks alls
  if (tasks.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        background: '#ffffff'
      }}></div>
    );
  }

  // Ingen context - be om avstämning
  if (!context) {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
            <p style={{ marginBottom: '24px', color: 'var(--e-text-secondary)', fontSize: '14px' }}>
              Gör din dagliga avstämning för att få din första uppgift.
            </p>
          </div>
        </div>
        <DagligCheckIn
          isOpen={showCheckInDialog}
          onClose={() => setShowCheckInDialog(false)}
          onComplete={handleCheckInComplete}
        />
      </>
    );
  }

  // Huvudvy
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* === 1. STATISTIK-SEKTION === */}
      <div className="e-card" style={{ marginBottom: '24px' }}>
        <div className="e-card-header">
          <div className="e-card-title">Översikt</div>
        </div>
        <div className="e-card-content">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '16px',
            marginBottom: checkInData ? '16px' : '0'
          }}>
            <div style={{
              padding: '16px',
              border: '2px solid var(--e-border)',
              borderRadius: '8px',
              backgroundColor: 'var(--e-surface-alt)'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--e-text-secondary)', marginBottom: '4px' }}>
                Deadline idag
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{todayTasks.length}</div>
            </div>
            <div style={{
              padding: '16px',
              border: '2px solid var(--e-border)',
              borderRadius: '8px',
              backgroundColor: 'var(--e-surface-alt)'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--e-text-secondary)', marginBottom: '4px' }}>
                Försenade
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{overdueTasks.length}</div>
            </div>
            <div style={{
              padding: '16px',
              border: '2px solid var(--e-border)',
              borderRadius: '8px',
              backgroundColor: 'var(--e-surface-alt)'
            }}>
              <div style={{ fontSize: '12px', color: 'var(--e-text-secondary)', marginBottom: '4px' }}>
                Blockerade
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{blockedTasks.length}</div>
            </div>
            {checkInData && (
              <div style={{
                padding: '16px',
                border: '2px solid var(--e-border)',
                borderRadius: '8px',
                backgroundColor: 'var(--e-surface-alt)'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--e-text-secondary)', marginBottom: '4px' }}>
                  Tillgänglig tid
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {formatDuration(checkInData.availableTime)}
                </div>
              </div>
            )}
          </div>
          {checkInData && (
            <div style={{ display: 'flex', gap: '8px', fontSize: '14px', alignItems: 'center' }}>
              <span>
                {checkInData.energyLevel === 'low' ? '🔋' : checkInData.energyLevel === 'medium' ? '🔋🔋' : '🔋🔋🔋'}
              </span>
              <span>•</span>
              <span>
                {checkInData.strategy === 'quick_wins' && 'Quick Wins'}
                {checkInData.strategy === 'deep_work' && 'Deep Work'}
                {checkInData.strategy === 'balanced' && 'Balanserad'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* === 2. VARNINGAR (ACCORDION) === */}
      {(urgentTasks.length > 0 || overdueTasks.length > 0) && (
        <div style={{ marginBottom: '24px' }}>
          <AccordionComponent>
            <AccordionItemsDirective>
              {urgentTasks.length > 0 && (
                <AccordionItemDirective
                  header={`Akuta uppgifter (${urgentTasks.length}) - deadline inom 24h`}
                  content={() => (
                    <div style={{ padding: '8px 0' }}>
                      {urgentTasks.map(task => (
                        <div
                          key={task.id}
                          onClick={() => handleTaskClick(task.id)}
                          style={{
                            padding: '12px',
                            marginBottom: '8px',
                            backgroundColor: 'var(--e-surface-alt)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            border: '1px solid var(--e-warning)'
                          }}
                        >
                          <div style={{ fontWeight: '500', marginBottom: '4px' }}>{task.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--e-text-secondary)' }}>
                            Deadline: {formatRelativeTime(task.deadline!)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                />
              )}
              {overdueTasks.length > 0 && (
                <AccordionItemDirective
                  header={`Försenade uppgifter (${overdueTasks.length})`}
                  content={() => (
                    <div style={{ padding: '8px 0' }}>
                      {overdueTasks.map(task => (
                        <div
                          key={task.id}
                          onClick={() => handleTaskClick(task.id)}
                          style={{
                            padding: '12px',
                            marginBottom: '8px',
                            backgroundColor: 'var(--e-surface-alt)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            border: '1px solid var(--e-error)'
                          }}
                        >
                          <div style={{ fontWeight: '500', marginBottom: '4px' }}>{task.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--e-text-secondary)' }}>
                            Deadline: {formatRelativeTime(task.deadline!)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                />
              )}
            </AccordionItemsDirective>
          </AccordionComponent>
        </div>
      )}

      {/* === 3. SNABBIS-SEKTION === */}
      {snabbisTasks.length > 0 && (
        <div className="e-card" style={{ marginBottom: '24px' }}>
          <div className="e-card-header">
            <div className="e-card-title">Snabbis ({snabbisTasks.length}) - Gör direkt!</div>
          </div>
          <div className="e-card-content">
            <p style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--e-text-secondary)' }}>
              Uppgifter som tar ≤ 2 min - klara av dem först!
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {snabbisTasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--e-surface-alt)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    border: '1px solid transparent'
                  }}
                  onClick={() => handleStartSession(task)}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--e-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <div>
                    <p style={{ fontWeight: '500', marginBottom: '4px', margin: 0 }}>{task.title}</p>
                    <p style={{ fontSize: '12px', margin: 0, color: 'var(--e-text-secondary)' }}>
                      {formatDuration(task.estimated_duration)}
                    </p>
                  </div>
                  <span className="e-icons e-play" style={{ fontSize: '16px' }}></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === 4. HUVUDKORT - NÄSTA UPPGIFT === */}
      {nextTask ? (
        <div className="e-card" style={{ marginBottom: '24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
          <div className="e-card-header">
            <div className="e-card-title">Just Nu</div>
          </div>
          <div className="e-card-content">
            <h2 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '16px', margin: '0 0 16px 0' }}>
              {nextTask.title}
            </h2>

            {nextTask.description && (
              <p style={{ marginBottom: '24px', lineHeight: '1.5', margin: '0 0 24px 0' }}>
                {nextTask.description}
              </p>
            )}

            {/* Metadata */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {nextTask.estimated_duration && (
                <div style={{
                  padding: '12px',
                  backgroundColor: 'var(--e-surface-alt)',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '12px', marginBottom: '4px', color: 'var(--e-text-secondary)' }}>
                    Uppskattad tid
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '600' }}>
                    {formatDuration(nextTask.estimated_duration)}
                  </div>
                </div>
              )}
              {nextTask.deadline && (
                <div style={{
                  padding: '12px',
                  backgroundColor: 'var(--e-surface-alt)',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '12px', marginBottom: '4px', color: 'var(--e-text-secondary)' }}>
                    Deadline
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '600' }}>
                    {formatRelativeTime(nextTask.deadline)}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <ButtonComponent
                  cssClass="e-primary"
                  onClick={() => handleStartSession(nextTask)}
                  style={{ flex: 1, height: '56px', fontSize: '18px', fontWeight: '600' }}
                >
                  <span className="e-icons e-play" style={{ fontSize: '20px', marginRight: '8px' }}></span>
                  Starta nu
                </ButtonComponent>
                <ButtonComponent
                  cssClass="e-outline"
                  onClick={() => handleMarkDone(nextTask)}
                  style={{ height: '56px', padding: '0 24px' }}
                >
                  <span className="e-icons e-check" style={{ fontSize: '20px' }}></span>
                </ButtonComponent>
              </div>

              <ButtonComponent
                cssClass="e-flat"
                onClick={handleSkipTask}
                style={{ width: '100%' }}
              >
                <span className="e-icons e-skip-forward" style={{ fontSize: '12px', marginRight: '8px' }}></span>
                Hoppa över (visa nästa)
              </ButtonComponent>
            </div>
          </div>
        </div>
      ) : (
        <div className="e-card" style={{ marginBottom: '24px' }}>
          <div className="e-card-content" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '60px', marginBottom: '16px' }}>🤷</div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
              Inga uppgifter tillgängliga just nu
            </h2>
            <p style={{ marginBottom: '24px' }}>
              Det finns uppgifter men ingen passar dina nuvarande filter.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <ButtonComponent cssClass="e-primary" onClick={() => setShowCheckInDialog(true)}>
                Uppdatera avstämning
              </ButtonComponent>
              <ButtonComponent cssClass="e-outline" onClick={() => navigate('/all')}>
                Visa alla uppgifter
              </ButtonComponent>
            </div>
          </div>
        </div>
      )}

      {/* === 5. KOMMANDE UPPGIFTER === */}
      {queue.length > 0 && (
        <div className="e-card">
          <div className="e-card-header">
            <div className="e-card-title">Kommande uppgifter</div>
          </div>
          <div className="e-card-content">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {queue.slice(0, 5).map((task, index) => (
                <div
                  key={task.id}
                  onClick={() => handleTaskClick(task.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: 'var(--e-surface-alt)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: '1px solid transparent'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--e-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <span style={{ fontWeight: 'bold', minWidth: '24px' }}>{index + 2}.</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '500', margin: 0 }}>{task.title}</p>
                    <p style={{ fontSize: '12px', margin: 0, color: 'var(--e-text-secondary)' }}>
                      {task.estimated_duration && `${formatDuration(task.estimated_duration)}`}
                      {task.deadline && ` • ${formatRelativeTime(task.deadline)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === MODALS === */}
      <TimerModal
        isOpen={showTimer}
        task={timerTask}
        onClose={() => setShowTimer(false)}
        onComplete={handleTimerComplete}
      />

      <DagligCheckIn
        isOpen={showCheckInDialog}
        onClose={() => setShowCheckInDialog(false)}
        onComplete={handleCheckInComplete}
      />
    </div>
  );
}
