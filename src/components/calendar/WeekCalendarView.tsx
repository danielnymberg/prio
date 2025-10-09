import { useState, useEffect, useCallback, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { EventInput, EventDropArg, DateSelectArg, EventClickArg } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import svLocale from '@fullcalendar/core/locales/sv';
import { useTasks } from '@/hooks/useTasks';
import {
  getCalendarEvents,
  blockCalendarTime,
  updateCalendarEvent,
  deleteCalendarEvent,
  isMicrosoftLoggedIn,
} from '@/services/microsoft-graph';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { AlertCircle, Trash2 } from 'lucide-react';

interface CalendarEventData {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
  backgroundColor?: string;
  borderColor?: string;
  editable?: boolean;
  extendedProps?: {
    taskId?: string;
    eventId?: string;
    isPrioEvent?: boolean;
    type: 'meeting' | 'focus' | 'task';
  };
}

export function WeekCalendarView() {
  const { tasks, updateTask } = useTasks();
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMsftConnected, setIsMsftConnected] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  // Ladda kalenderdata
  const loadCalendarData = useCallback(async () => {
    try {
      setLoading(true);

      // Kolla Microsoft-status
      const connected = await isMicrosoftLoggedIn();
      setIsMsftConnected(connected);

      if (!connected) {
        setLoading(false);
        return;
      }

      // Hämta events från Microsoft för kommande 2 veckor
      const now = new Date();
      const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const calendarEvents = await getCalendarEvents(now, twoWeeksFromNow);

      // Konvertera till FullCalendar format
      const msftEvents: EventInput[] = calendarEvents.map((event) => {
        const isPrioEvent = event.subject.includes('🎯 Fokus');
        return {
          id: event.id,
          title: event.subject,
          start: event.start,
          end: event.end,
          backgroundColor: isPrioEvent ? '#ea580c' : '#3b82f6',
          borderColor: isPrioEvent ? '#c2410c' : '#2563eb',
          editable: isPrioEvent, // Endast Prio-events kan flyttas
          extendedProps: {
            eventId: event.id,
            isPrioEvent: isPrioEvent,
            type: isPrioEvent ? 'focus' : 'meeting',
          },
        };
      });

      // Lägg till tasks med deadlines
      const taskEvents: EventInput[] = tasks
        .filter((task) => task.deadline && task.status !== 'done')
        .map((task) => {
          const deadline = new Date(task.deadline!);
          const durationMinutes = task.estimated_duration || 30; // Använd task's duration, fallback 30 min
          return {
            id: `task-${task.id}`,
            title: `📌 ${task.title}`,
            start: deadline,
            end: new Date(deadline.getTime() + durationMinutes * 60 * 1000),
            backgroundColor: '#dc2626',
            borderColor: '#991b1b',
            editable: true,
            extendedProps: {
              taskId: task.id,
              type: 'task',
            },
          };
        });

      setEvents([...msftEvents, ...taskEvents]);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
      toast.error('Kunde inte ladda kalender');
      setLoading(false);
    }
  }, [tasks]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // Custom event content renderer (titel först, sedan tid)
  const renderEventContent = (eventInfo: any) => {
    const timeText = eventInfo.timeText;
    const title = eventInfo.event.title;

    return (
      <div className="fc-event-main-frame px-1 overflow-hidden">
        <div className="fc-event-title-container">
          <div className="fc-event-title fc-sticky font-medium truncate">
            {title}
          </div>
        </div>
        {timeText && (
          <div className="fc-event-time text-xs opacity-75 truncate">
            {timeText}
          </div>
        )}
      </div>
    );
  };

  // Hantera när event flyttas
  const handleEventDrop = async (info: EventDropArg) => {
    const { event } = info;
    const extendedProps = event.extendedProps as CalendarEventData['extendedProps'];

    // Blockera externa events
    if (extendedProps?.eventId && !extendedProps?.isPrioEvent) {
      info.revert();
      toast.error('Kan inte flytta externa möten! Endast Prio fokustid kan flyttas.');
      return;
    }

    const startDate = event.start!;
    const endDate = event.end!;
    const currentDate = calendarRef.current?.getApi().getDate();

    // Prio focus-session
    if (extendedProps?.eventId && extendedProps?.isPrioEvent) {
      try {
        const success = await updateCalendarEvent(extendedProps.eventId, {
          start: startDate,
          end: endDate,
        });

        if (success) {
          toast.success('Fokustid flyttad!');
          await loadCalendarData();

          // Behåll nuvarande vy
          if (calendarRef.current && currentDate) {
            calendarRef.current.getApi().gotoDate(currentDate);
          }
        } else {
          info.revert();
          toast.error('Kunde inte flytta fokustiden');
        }
      } catch (error) {
        console.error('Failed to move event:', error);
        info.revert();
        toast.error('Kunde inte flytta fokustiden');
      }
    }

    // Task deadline
    if (extendedProps?.taskId) {
      try {
        await updateTask(extendedProps.taskId, { deadline: startDate.toISOString() });
        toast.success('Task deadline uppdaterad!');
        await loadCalendarData();

        // Behåll nuvarande vy
        if (calendarRef.current && currentDate) {
          calendarRef.current.getApi().gotoDate(currentDate);
        }
      } catch (error) {
        console.error('Failed to update task:', error);
        info.revert();
        toast.error('Kunde inte uppdatera task');
      }
    }
  };

  // Hantera resize (ändra längd)
  const handleEventResize = async (info: EventResizeDoneArg) => {
    const { event } = info;
    const extendedProps = event.extendedProps as CalendarEventData['extendedProps'];
    const currentDate = calendarRef.current?.getApi().getDate();

    // Blockera externa events
    if (extendedProps?.eventId && !extendedProps?.isPrioEvent) {
      info.revert();
      toast.error('Kan inte ändra externa möten!');
      return;
    }

    const startDate = event.start!;
    const endDate = event.end!;

    if (extendedProps?.eventId && extendedProps?.isPrioEvent) {
      try {
        const success = await updateCalendarEvent(extendedProps.eventId, {
          start: startDate,
          end: endDate,
        });

        if (success) {
          toast.success('Fokustid ändrad!');
          await loadCalendarData();

          // Behåll nuvarande vy
          if (calendarRef.current && currentDate) {
            calendarRef.current.getApi().gotoDate(currentDate);
          }
        } else {
          info.revert();
        }
      } catch (error) {
        console.error('Failed to resize event:', error);
        info.revert();
        toast.error('Kunde inte ändra fokustiden');
      }
    }
  };

  // Hantera när användaren väljer en tid (skapa ny event)
  const handleDateSelect = async (selectInfo: DateSelectArg) => {
    if (!isMsftConnected) {
      toast.error('Anslut till Microsoft för att schemalägga');
      return;
    }

    const title = prompt('Vad vill du fokusera på?');
    if (!title) return;

    const startDate = selectInfo.start;
    const endDate = selectInfo.end;
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

    try {
      await blockCalendarTime(startDate, durationMinutes, `🎯 Fokus: ${title}`);
      toast.success('Fokustid inbokad!');
      await loadCalendarData();

      // Behåll nuvarande vy (förhindra hopp till nuvarande vecka)
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.gotoDate(startDate);
      }
    } catch (error) {
      console.error('Failed to block time:', error);
      toast.error('Kunde inte boka tid');
    }
  };

  // Hantera när extern event (från sidebar) tas emot
  const handleEventReceive = async (info: any) => {
    const taskId = info.event.extendedProps?.taskId;
    const startDate = info.event.start;

    if (!taskId || !startDate) {
      info.revert();
      return;
    }

    const currentDate = calendarRef.current?.getApi().getDate();

    try {
      // Uppdatera task med deadline
      await updateTask(taskId, { deadline: startDate.toISOString() });
      toast.success('Task schemalagd!');

      // Ta bort det tillfälliga eventet (vi laddar om från backend)
      info.event.remove();
      await loadCalendarData();

      // Behåll nuvarande vy
      if (calendarRef.current && currentDate) {
        calendarRef.current.getApi().gotoDate(currentDate);
      }
    } catch (error) {
      console.error('Failed to schedule task:', error);
      toast.error('Kunde inte schemalägga task');
      info.revert();
    }
  };

  // Hantera klick på event
  const handleEventClick = (info: EventClickArg) => {
    const { event } = info;
    const extendedProps = event.extendedProps as CalendarEventData['extendedProps'];

    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.start!,
      end: event.end!,
      backgroundColor: event.backgroundColor,
      borderColor: event.borderColor,
      editable: event.startEditable,
      extendedProps,
    });
  };

  // Ta bort event
  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    const extendedProps = selectedEvent.extendedProps;
    const currentDate = calendarRef.current?.getApi().getDate();

    // Blockera borttagning av externa events
    if (extendedProps?.eventId && !extendedProps?.isPrioEvent) {
      toast.error('Kan inte ta bort externa möten!');
      setSelectedEvent(null);
      return;
    }

    if (extendedProps?.eventId && extendedProps?.isPrioEvent) {
      try {
        await deleteCalendarEvent(extendedProps.eventId);
        toast.success('Fokustid borttagen!');
        setSelectedEvent(null);
        await loadCalendarData();

        // Behåll nuvarande vy
        if (calendarRef.current && currentDate) {
          calendarRef.current.getApi().gotoDate(currentDate);
        }
      } catch (error) {
        console.error('Failed to delete event:', error);
        toast.error('Kunde inte ta bort fokustiden');
      }
    }

    if (extendedProps?.taskId) {
      try {
        await updateTask(extendedProps.taskId, { deadline: undefined });
        toast.success('Task deadline borttagen!');
        setSelectedEvent(null);
        await loadCalendarData();

        // Behåll nuvarande vy
        if (calendarRef.current && currentDate) {
          calendarRef.current.getApi().gotoDate(currentDate);
        }
      } catch (error) {
        console.error('Failed to remove task deadline:', error);
        toast.error('Kunde inte ta bort deadline');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-copper-500 mx-auto mb-4"></div>
          <p className="text-stone-600 dark:text-stone-400">Laddar kalender...</p>
        </div>
      </div>
    );
  }

  if (!isMsftConnected) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-white dark:bg-charcoal-850 rounded-xl p-8 max-w-md text-center border border-sand-200 dark:border-charcoal-800">
          <AlertCircle className="h-12 w-12 text-copper-600 dark:text-copper-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-stone-900 dark:text-cream-50 mb-2">
            Microsoft Kalender Ej Ansluten
          </h3>
          <p className="text-stone-600 dark:text-stone-400 mb-6">
            Anslut ditt Microsoft-konto för att synka kalender och schemalägga fokustid.
          </p>
          <Button
            onClick={() => window.location.href = '/settings'}
            variant="primary"
          >
            Gå till Inställningar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Info box */}
      <div className="flex items-center gap-4 text-xs text-stone-600 dark:text-stone-400 bg-sand-50 dark:bg-charcoal-900 rounded-lg p-3 border border-sand-200 dark:border-charcoal-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Externa möten</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-600" />
          <span>Prio fokustid (kan flyttas)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Task deadlines</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 bg-white dark:bg-charcoal-850 rounded-xl p-4 border border-sand-200 dark:border-charcoal-800 overflow-hidden">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin, listPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridWeek,timeGridDay,listWeek',
          }}
          locale={svLocale}
          allDaySlot={false}
          slotMinTime="06:00:00"
          slotMaxTime="24:00:00"
          slotDuration="00:30:00"
          snapDuration="00:15:00"
          height="100%"
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          firstDay={1} // Måndag
          events={events}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventReceive={handleEventReceive}
          droppable={true}
          eventContent={renderEventContent}
          nowIndicator={true}
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
        />
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-charcoal-850 rounded-xl shadow-2xl max-w-md w-full border border-sand-200 dark:border-charcoal-800 p-6">
            <h3 className="text-xl font-bold text-stone-900 dark:text-cream-50 mb-4">
              {selectedEvent.title}
            </h3>

            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-stone-600 dark:text-stone-400">Start</p>
                <p className="text-stone-900 dark:text-cream-50">
                  {new Date(selectedEvent.start).toLocaleString('sv-SE', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div>
                <p className="text-sm text-stone-600 dark:text-stone-400">Slut</p>
                <p className="text-stone-900 dark:text-cream-50">
                  {new Date(selectedEvent.end).toLocaleString('sv-SE', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {selectedEvent.extendedProps?.type && (
                <div>
                  <p className="text-sm text-stone-600 dark:text-stone-400">Typ</p>
                  <p className="text-stone-900 dark:text-cream-50 capitalize">
                    {selectedEvent.extendedProps.type === 'meeting' && 'Externt möte'}
                    {selectedEvent.extendedProps.type === 'focus' && 'Prio fokustid'}
                    {selectedEvent.extendedProps.type === 'task' && 'Task deadline'}
                  </p>
                </div>
              )}

              {!selectedEvent.editable && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ Detta är ett externt möte som inte kan redigeras eller tas bort från Prio.
                  </p>
                </div>
              )}

              {selectedEvent.editable && selectedEvent.extendedProps?.type === 'task' && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 Du kan dra denna uppgift till en annan tid eller vecka. Använd prev/next-knapparna för att navigera.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {selectedEvent.editable && (
                <Button
                  variant="secondary"
                  onClick={handleDeleteEvent}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {selectedEvent.extendedProps?.type === 'task' ? 'Ta bort deadline' : 'Ta bort'}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => setSelectedEvent(null)}
                className="flex-1"
              >
                Stäng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
