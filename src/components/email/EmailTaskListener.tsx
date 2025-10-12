import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import {
  subscribeToEmailTasks,
  emailTaskToTaskInput,
  markEmailTaskProcessed,
  EmailTask,
} from '@/services/email-to-task';
import { toast } from 'react-hot-toast';

export function EmailTaskListener() {
  const { user } = useAuth();
  const { createTask } = useTasks();
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (!user) return;

    // Förhindra multipla listeners
    if (unsubscribeRef.current) return;

    console.log('📧 Email task listener started');

    unsubscribeRef.current = subscribeToEmailTasks(user.id, async (emailTask: EmailTask) => {
      if (!isMountedRef.current) return;

      console.log('📧 New email task received:', emailTask);

      try {
        // Konvertera till task input
        const taskInput = emailTaskToTaskInput(emailTask);

        // Skapa task
        const createdTask = await createTask(taskInput);

        if (createdTask) {
          // Markera som processad
          await markEmailTaskProcessed(emailTask.id);

          // Visa notifikation
          if (isMountedRef.current) {
            toast.success(
              `📧 Task skapad från mejl: ${emailTask.task_data.title}`,
              {
                duration: 5000,
                icon: '✉️',
              }
            );
          }

          console.log('✅ Email task processed:', createdTask.id);
        }
      } catch (error) {
        console.error('Failed to process email task:', error);
        if (isMountedRef.current) {
          toast.error('Kunde inte skapa task från mejl');
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        console.log('📧 Email task listener stopped');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user?.id]); // Endast user.id, inte hela user-objektet

  // Denna komponent renderar ingenting
  return null;
}
