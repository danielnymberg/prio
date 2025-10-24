import { useState, useEffect } from 'react';
import { DialogComponent, AnimationSettingsModel } from '@syncfusion/ej2-react-popups';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { Task } from '@/lib/types';
import { useTasks } from '@/hooks/useTasks';
import { toast } from 'react-hot-toast';

interface TimerModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
  onComplete: (taskId: string) => void;
}

const animationSettings: AnimationSettingsModel = {
  effect: 'Zoom',
  duration: 300,
  delay: 0
};

export function TimerModal({ isOpen, task, onClose, onComplete }: TimerModalProps) {
  const { updateTask } = useTasks();
  const [sessionDuration, setSessionDuration] = useState(90 * 60);
  const [timeRemaining, setTimeRemaining] = useState(90 * 60);
  const [isPaused, setIsPaused] = useState(false);

  // Sätt timer-längd när task ändras
  useEffect(() => {
    if (task) {
      const durationInSeconds = (task.estimated_duration || 90) * 60;
      setSessionDuration(durationInSeconds);
      setTimeRemaining(durationInSeconds);
      setIsPaused(false);
    }
  }, [task]);

  // Countdown
  useEffect(() => {
    if (isPaused || timeRemaining <= 0 || !isOpen) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSessionComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, timeRemaining, isOpen]);

  const handleSessionComplete = () => {
    const minutes = Math.floor(sessionDuration / 60);
    toast.success(`🌟 ${minutes} minuter klart!`);
    onClose();
  };

  const handleMarkDone = async () => {
    if (!task) return;

    try {
      await updateTask(task.id, {
        status: 'done',
        completed_at: new Date().toISOString()
      });
      toast.success('Uppgift slutförd!');
      onComplete(task.id);
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Kunde inte markera som klar');
    }
  };

  const handleCancel = () => {
    onClose();
  };

  // Villkorlig rendering enligt SF best practice
  if (!isOpen || !task) return null;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const progress = ((sessionDuration - timeRemaining) / sessionDuration) * 100;

  return (
    <DialogComponent
      width="min(95%, 600px)"
      header={task.title}
      visible={true}
      close={onClose}
      showCloseIcon={true}
      isModal={true}
      animationSettings={animationSettings}
      target="body"
      cssClass="e-responsive-dialog"
    >
      <div className="e-p-24 e-flex e-flex-column e-gap-24">

        {/* Timer Display */}
        <div className="e-text-center">
          <div className="e-font-bold e-mb-12" style={{ fontSize: '64px', fontFamily: 'monospace' }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <div className="e-text-base">
            {minutes > 0 ? `${minutes} minuter kvar` : `${seconds} sekunder kvar`}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="e-rounded-full" style={{ width: '100%', backgroundColor: 'var(--e-border)', height: '12px' }}>
          <div
            className="e-rounded-full"
            style={{
              backgroundColor: 'var(--primary-500)',
              height: '12px',
              width: `${progress}%`,
              transition: 'width 1s linear'
            }}
          />
        </div>

        {/* Task Description */}
        {task.description && (
          <div className="e-text-sm">
            {task.description}
          </div>
        )}

        {/* Action Buttons */}
        <div className="e-flex e-gap-12">
          <Button
            variant="primary"
            onClick={handleMarkDone}
            className="e-flex-1"
          >
            <span className="e-icons e-check" style={{ fontSize: '16px', marginRight: '8px' }}></span>
            Klar
          </Button>
          <Button
            variant="secondary"
            onClick={() => setIsPaused(!isPaused)}
            className="e-flex-1"
          >
            <span className={`e-icons ${isPaused ? 'e-play' : 'e-pause'}`} style={{ fontSize: '16px', marginRight: '8px' }}></span>
            {isPaused ? 'Fortsätt' : 'Paus'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="e-flex-1"
          >
            <span className="e-icons e-close" style={{ fontSize: '16px', marginRight: '8px' }}></span>
            Avbryt
          </Button>
        </div>

        {/* Tip */}
        <div className="e-rounded-md e-p-12 e-text-xs" style={{ backgroundColor: 'var(--e-border)' }}>
          💡 <strong>Tips:</strong> Stäng av notifikationer och mejl under denna session för bästa fokus.
        </div>

      </div>
    </DialogComponent>
  );
}
