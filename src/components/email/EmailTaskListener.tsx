import { useEffect } from 'react';
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

  useEffect(() => {
    if (!user) return;

    console.log('📧 Email task listener started');

    const unsubscribe = subscribeToEmailTasks(user.id, async (emailTask: EmailTask) => {
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
          toast.success(
            `📧 Task skapad från mejl: ${emailTask.task_data.title}`,
            {
              duration: 5000,
              icon: '✉️',
            }
          );

          console.log('✅ Email task processed:', createdTask.id);
        }
      } catch (error) {
        console.error('Failed to process email task:', error);
        toast.error('Kunde inte skapa task från mejl');
      }
    });

    return () => {
      console.log('📧 Email task listener stopped');
      unsubscribe();
    };
  }, [user]); // Removed createTask from dependencies to prevent loop

  // Denna komponent renderar ingenting
  return null;
}
