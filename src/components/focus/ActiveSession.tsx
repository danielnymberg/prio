import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { Task } from '@/lib/types';
import { CheckCircle, Pause, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function ActiveSession() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { tasks, updateTask } = useTasks();
  const [task, setTask] = useState<Task | null>(null);
  const [sessionDuration, setSessionDuration] = useState(90 * 60); // Default 90 min
  const [timeRemaining, setTimeRemaining] = useState(90 * 60);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const foundTask = tasks.find(t => t.id === taskId);

    // Vänta tills tasks har laddats innan vi avgör om uppgiften saknas
    if (!foundTask && tasks.length > 0) {
      toast.error('Uppgift hittades inte');
      navigate('/focus');
      return;
    }

    // Om task hittades, sätt den och uppdatera timer-varaktighet
    if (foundTask) {
      setTask(foundTask);
      const durationInSeconds = (foundTask.estimated_duration || 90) * 60;
      setSessionDuration(durationInSeconds);
      setTimeRemaining(durationInSeconds);
    }
    // Annars vänta (tasks laddar fortfarande, visa "Laddar..." från rad 76)
  }, [taskId, tasks, navigate]);

  useEffect(() => {
    if (isPaused || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Session klar!
          clearInterval(interval);
          handleSessionComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, timeRemaining]);

  const handleSessionComplete = () => {
    const minutes = Math.floor(sessionDuration / 60);

    // Snabbis (≤5 min): ingen paus
    if (minutes <= 5) {
      toast.success(`✅ ${minutes} min klart!`);
      navigate('/focus');
      return;
    }

    // Kort session (6-30 min): kort paus
    if (minutes <= 30) {
      toast.success(`🌟 ${minutes} minuter klart! Ta en kort paus.`);
      navigate('/break?duration=short');
      return;
    }

    // Lång session (>30 min): full 20+10 paus
    toast.success(`🌟 ${minutes} minuter klart! Dags för ordentlig paus.`);
    navigate('/break');
  };

  const handleMarkDone = async () => {
    if (!task) return;

    try {
      await updateTask(task.id, {
        status: 'done',
        completed_at: new Date().toISOString()
      });
      toast.success('Uppgift markerad som klar!');
      navigate(`/task/${task.id}/impact`);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Kunde inte markera som klar');
    }
  };

  const handleCancel = () => {
    const confirmed = confirm('Vill du avbryta sessionen?');
    if (confirmed) {
      navigate('/focus');
    }
  };

  if (!task) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Laddar...</div>;
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const progress = ((sessionDuration - timeRemaining) / sessionDuration) * 100;

  return (
    <div className="e-h-screen e-flex e-align-center e-justify-center e-p-16" style={{ background: 'linear-gradient(to bottom right, #f5f1ed, #ede9e5)' }}>
      <div className="e-rounded-xl e-p-32 e-w-full" style={{ backgroundColor: 'var(--e-surface)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxWidth: '48rem' }}>
        {/* Timer */}
        <div className="e-text-center e-mb-32">
          <div className="e-font-bold e-mb-16" style={{ fontSize: '72px', fontFamily: 'monospace', color: 'var(--e-text)' }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <div className="e-text-lg" style={{ color: 'var(--e-text-secondary)' }}>
            {minutes > 0 ? `${minutes} minuter kvar` : `${seconds} sekunder kvar`}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="e-w-full e-rounded-full e-mb-32" style={{ backgroundColor: 'var(--e-border)', height: '16px' }}>
          <div
            className="e-rounded-full e-transition"
            style={{ backgroundColor: 'var(--primary-500)', height: '16px', transitionDuration: '1s', width: `${progress}%` }}
          />
        </div>

        {/* Task Info */}
        <div className="e-mb-16">
          <h2 className="e-text-2xl e-font-bold e-mb-16" style={{ color: 'var(--e-text)' }}>
            {task.title}
          </h2>
          {task.description && (
            <p style={{ color: 'var(--e-text-secondary)', lineHeight: '1.75' }}>
              {task.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="e-grid e-grid-cols-3 e-gap-16">
          <Button
            variant="primary"
            onClick={handleMarkDone}
            style={{ height: '64px' }}
          >
            <CheckCircle style={{ height: '24px', width: '24px', marginRight: '8px' }} />
            Klar
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsPaused(!isPaused)}
            style={{ height: '64px' }}
          >
            <Pause style={{ height: '24px', width: '24px', marginRight: '8px' }} />
            {isPaused ? 'Fortsätt' : 'Paus'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleCancel}
            style={{ height: '64px' }}
          >
            <XCircle style={{ height: '24px', width: '24px', marginRight: '8px' }} />
            Avbryt
          </Button>
        </div>

        <div className="e-mt-16 e-rounded-md e-p-16 e-text-sm" style={{ backgroundColor: 'var(--e-border)', color: 'var(--e-text-secondary)' }}>
          💡 <strong>Tips:</strong> Stäng av notifikationer och mejl under denna session för bästa fokus.
        </div>
      </div>
    </div>
  );
}
