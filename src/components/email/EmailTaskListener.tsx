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
import { blockCalendarTime } from '@/services/microsoft-graph';

export function EmailTaskListener() {
  const { user } = useAuth();
  const { createTask } = useTasks();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Flag to prevent race conditions in StrictMode
    let isSubscribed = true;
    let unsubscribe: (() => void) | null = null;

    const setupListener = async () => {
      // Cleanup previous subscription if exists
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      if (!isSubscribed) return;

      console.log('📧 Email task listener started');

      unsubscribe = subscribeToEmailTasks(user.id, async (emailTask: EmailTask) => {
        if (!isSubscribed) return;

        console.log('📧 New email task received:', emailTask);

        try {
          // Kolla om detta är en bokning
          const booking = emailTask.task_data?.booking;

          if (booking && booking.departure_time) {
            console.log('📅 Booking detected, creating calendar event...', booking);

            try {
              // Skapa kalenderhändelse
              const departureDate = new Date(booking.departure_time);
              const arrivalDate = booking.arrival_time ? new Date(booking.arrival_time) : null;

              const duration = arrivalDate
                ? Math.round((arrivalDate.getTime() - departureDate.getTime()) / (1000 * 60))
                : 120; // Default 2h om ingen arrival_time

              const eventId = await blockCalendarTime(
                departureDate,
                duration,
                booking.title || emailTask.subject
              );

              if (eventId && isSubscribed) {
                // Markera som processad
                await markEmailTaskProcessed(emailTask.id);

                // Visa notifikation
                toast.success(
                  `📅 Bokning inlagd i kalender: ${booking.title}`,
                  {
                    duration: 6000,
                    icon: '✈️',
                  }
                );

                console.log('✅ Booking calendar event created:', eventId);
              }
            } catch (bookingError) {
              console.error('Failed to create calendar event for booking:', bookingError);
              toast.error('Kunde inte lägga in bokning i kalender');
            }
          } else {
            // Normal task (inte bokning)
            // Konvertera till task input
            const taskInput = emailTaskToTaskInput(emailTask);

            // Skapa task
            const createdTask = await createTask(taskInput);

            if (createdTask && isSubscribed) {
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
          }
        } catch (error) {
          console.error('Failed to process email task:', error);
          if (isSubscribed) {
            toast.error('Kunde inte bearbeta mejl');
          }
        }
      });

      if (isSubscribed) {
        unsubscribeRef.current = unsubscribe;
      }
    };

    setupListener();

    return () => {
      isSubscribed = false;
      console.log('📧 Email task listener stopped');
      if (unsubscribe) {
        unsubscribe();
      }
      unsubscribeRef.current = null;
    };
  }, [user?.id, createTask]);

  // Denna komponent renderar ingenting
  return null;
}
