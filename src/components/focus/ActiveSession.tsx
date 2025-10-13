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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #f5f1ed, #ede9e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: 'var(--e-surface)', borderRadius: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '3rem', maxWidth: '48rem', width: '100%' }}>
        {/* Timer */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ fontSize: '4.5rem', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '1rem' }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <div style={{ fontSize: '1.125rem', color: 'var(--e-text-secondary)' }}>
            {minutes > 0 ? `${minutes} minuter kvar` : `${seconds} sekunder kvar`}
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', backgroundColor: 'var(--e-border)', borderRadius: '9999px', height: '1rem', marginBottom: '3rem' }}>
          <div
            style={{ backgroundColor: 'var(--copper-500)', height: '1rem', borderRadius: '9999px', transition: 'width 1s', width: `${progress}%` }}
          />
        </div>

        {/* Task Info */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '1rem' }}>
            {task.title}
          </h2>
          {task.description && (
            <p style={{ color: 'var(--e-text-secondary)', lineHeight: '1.75' }}>
              {task.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          <Button
            variant="primary"
            onClick={handleMarkDone}
            style={{ height: '64px' }}
          >
            <CheckCircle style={{ height: '24px', width: '24px', marginRight: '0.5rem' }} />
            Klar
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsPaused(!isPaused)}
            style={{ height: '64px' }}
          >
            <Pause style={{ height: '24px', width: '24px', marginRight: '0.5rem' }} />
            {isPaused ? 'Fortsätt' : 'Paus'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleCancel}
            style={{ height: '64px' }}
          >
            <XCircle style={{ height: '24px', width: '24px', marginRight: '0.5rem' }} />
            Avbryt
          </Button>
        </div>

        <div style={{ marginTop: '2rem', backgroundColor: 'var(--e-border)', borderRadius: '0.5rem', padding: '1rem', fontSize: '0.875rem', color: 'var(--e-text-secondary)' }}>
          💡 <strong>Tips:</strong> Stäng av notifikationer och mejl under denna session för bästa fokus.
        </div>
      </div>
    </div>
  );
}
