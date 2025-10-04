import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { Button } from '@/components/ui/Button';
import { Task } from '@/lib/types';
import { CheckCircle, Pause, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const SESSION_DURATION = 90 * 60; // 90 minuter i sekunder

export function ActiveSession() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { tasks, updateTask } = useTasks();
  const [task, setTask] = useState<Task | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(SESSION_DURATION);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const foundTask = tasks.find(t => t.id === taskId);
    if (!foundTask) {
      toast.error('Uppgift hittades inte');
      navigate('/focus');
      return;
    }
    setTask(foundTask);
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
    toast.success('🌟 90 minuter klart! Dags för paus.');
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
    return <div className="flex items-center justify-center min-h-screen">Laddar...</div>;
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const progress = ((SESSION_DURATION - timeRemaining) / SESSION_DURATION) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-12 max-w-3xl w-full">
        {/* Timer */}
        <div className="text-center mb-12">
          <div className="text-7xl font-mono font-bold text-gray-900 dark:text-white mb-4">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <div className="text-lg text-gray-600 dark:text-gray-400">
            {minutes > 0 ? `${minutes} minuter kvar` : `${seconds} sekunder kvar`}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-12">
          <div
            className="bg-blue-500 h-4 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Task Info */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {task.title}
          </h2>
          {task.description && (
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {task.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-4">
          <Button
            variant="primary"
            onClick={handleMarkDone}
            className="h-16"
          >
            <CheckCircle className="h-6 w-6 mr-2" />
            Klar
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsPaused(!isPaused)}
            className="h-16"
          >
            <Pause className="h-6 w-6 mr-2" />
            {isPaused ? 'Fortsätt' : 'Paus'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="h-16"
          >
            <XCircle className="h-6 w-6 mr-2" />
            Avbryt
          </Button>
        </div>

        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200">
          💡 <strong>Tips:</strong> Stäng av notifikationer och mejl under denna session för bästa fokus.
        </div>
      </div>
    </div>
  );
}
