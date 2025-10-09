import { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addHours } from 'date-fns';
import { sv } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
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
import { AlertCircle, Calendar as CalendarIcon, Trash2 } from 'lucide-react';

// Setup localizer för svenska
const locales = {
  'sv': sv,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Måndag
  getDay,
  locales,
});

// Event types för färgkodning
type EventType = 'meeting' | 'focus' | 'task' | 'free';

interface CalendarEventData {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: EventType;
  resource?: {
    taskId?: string;
    eventId?: string;
    isPrioEvent?: boolean;
    color?: string;
  };
}

export function WeekCalendarView() {
  const { tasks, updateTask } = useTasks();
  const [events, setEvents] = useState<CalendarEventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMsftConnected, setIsMsftConnected] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(null);

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

      // Konvertera till vårt event-format
      const msftEvents: CalendarEventData[] = calendarEvents.map((event) => ({
        id: event.id,
        title: event.subject,
        start: new Date(event.start),
        end: new Date(event.end),
        type: event.subject.includes('🎯 Fokus') ? 'focus' : 'meeting',
        resource: {
          eventId: event.id,
          isPrioEvent: event.subject.includes('🎯 Fokus'),
          color: event.subject.includes('🎯 Fokus') ? 'orange' : 'blue',
        },
      }));

      // Lägg till tasks med deadlines
      const taskEvents: CalendarEventData[] = tasks
        .filter((task) => task.deadline && task.status !== 'done')
        .map((task) => {
          const deadline = new Date(task.deadline!);
          return {
            id: `task-${task.id}`,
            title: `📌 ${task.title}`,
            start: deadline,
            end: addHours(deadline, task.estimated_duration ? task.estimated_duration / 60 : 1),
            type: 'task' as EventType,
            resource: {
              taskId: task.id,
              color: 'red',
            },
          };
        });

      setEvents([...msftEvents, ...taskEvents]);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
      toast.error('Kunde inte ladda kalenderdata');
    } finally {
      setLoading(false);
    }
  }, [tasks]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // Event styling baserat på typ
  const eventStyleGetter = (event: CalendarEventData) => {
    let backgroundColor = '#3b82f6'; // blue
    let borderColor = '#2563eb';

    switch (event.type) {
      case 'meeting':
        backgroundColor = '#3b82f6'; // blue
        borderColor = '#2563eb';
        break;
      case 'focus':
        backgroundColor = '#f59e0b'; // orange
        borderColor = '#d97706';
        break;
      case 'task':
        backgroundColor = '#ef4444'; // red
        borderColor = '#dc2626';
        break;
      case 'free':
        backgroundColor = '#10b981'; // green
        borderColor = '#059669';
        break;
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderWidth: '2px',
        borderStyle: 'solid',
        borderRadius: '6px',
        color: 'white',
        fontSize: '13px',
        padding: '4px 8px',
      },
    };
  };

  // Hantera när användaren drar ett event
  const handleEventDrop = async ({ event, start, end }: { event: CalendarEventData; start: Date; end: Date }) => {
    if (!isMsftConnected) {
      toast.error('Anslut till Microsoft för att flytta händelser');
      return;
    }

    // Om det är en Prio focus-session eller Microsoft-event, uppdatera i Graph
    if (event.resource?.eventId) {
      try {
        const success = await updateCalendarEvent(event.resource.eventId, { start, end });

        if (success) {
          toast.success('Händelse flyttad!');
          loadCalendarData(); // Reload
        } else {
          toast.error('Kunde inte flytta händelsen');
        }
      } catch (error) {
        console.error('Failed to move event:', error);
        toast.error('Kunde inte flytta händelsen');
      }
    }

    // Om det är en task, uppdatera deadline
    if (event.resource?.taskId) {
      try {
        await updateTask(event.resource.taskId, { deadline: start.toISOString() });
        toast.success('Task deadline uppdaterad!');
        loadCalendarData();
      } catch (error) {
        console.error('Failed to update task:', error);
        toast.error('Kunde inte uppdatera task');
      }
    }
  };

  // Hantera resize (ändra längd på event)
  const handleEventResize = async ({ event, start, end }: { event: CalendarEventData; start: Date; end: Date }) => {
    if (!isMsftConnected) return;

    if (event.resource?.eventId) {
      try {
        const success = await updateCalendarEvent(event.resource.eventId, { start, end });

        if (success) {
          toast.success('Händelse ändrad!');
          loadCalendarData();
        }
      } catch (error) {
        console.error('Failed to resize event:', error);
        toast.error('Kunde inte ändra händelsen');
      }
    }
  };

  // Hantera klick på tomt slot (boka fokustid)
  const handleSelectSlot = async (slotInfo: SlotInfo) => {
    if (!isMsftConnected) {
      toast.error('Anslut till Microsoft för att boka fokustid');
      return;
    }

    const title = prompt('Vad vill du fokusera på?');
    if (!title) return;

    const durationMinutes = Math.round((slotInfo.end.getTime() - slotInfo.start.getTime()) / (1000 * 60));

    try {
      const success = await blockCalendarTime(slotInfo.start, durationMinutes, title);

      if (success) {
        toast.success('Fokustid bokad!');
        loadCalendarData();
      } else {
        toast.error('Kunde inte boka fokustid');
      }
    } catch (error) {
      console.error('Failed to block time:', error);
      toast.error('Kunde inte boka fokustid');
    }
  };

  // Hantera klick på event
  const handleSelectEvent = (event: CalendarEventData) => {
    setSelectedEvent(event);
  };

  // Radera event
  const handleDeleteEvent = async () => {
    if (!selectedEvent || !selectedEvent.resource?.eventId) return;

    if (!confirm(`Radera "${selectedEvent.title}"?`)) return;

    try {
      const success = await deleteCalendarEvent(selectedEvent.resource.eventId);

      if (success) {
        toast.success('Händelse raderad!');
        setSelectedEvent(null);
        loadCalendarData();
      } else {
        toast.error('Kunde inte radera händelsen');
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast.error('Kunde inte radera händelsen');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper-600" />
      </div>
    );
  }

  if (!isMsftConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="bg-warning-50 dark:bg-warning-950 border border-warning-200 dark:border-warning-800 rounded-xl p-6 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-warning-900 dark:text-warning-200 mb-2">
                Microsoft-konto krävs
              </h3>
              <p className="text-sm text-warning-700 dark:text-warning-300 mb-4">
                För att använda kalendervyn behöver du koppla ditt Microsoft-konto.
              </p>
              <Button
                onClick={() => window.location.href = '/settings'}
                className="bg-copper-600 hover:bg-copper-700 text-white"
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Gå till Inställningar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 dark:text-cream-50">
            Kalender
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
            Dra tasks för att schemalägga, klicka på lediga tider för att boka fokustid
          </p>
        </div>
        <Button onClick={loadCalendarData} variant="ghost" size="sm">
          Uppdatera
        </Button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-stone-600 dark:text-stone-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Möten</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span>Fokustid (Prio)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Task deadlines</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-charcoal-850 rounded-xl p-4 border border-sand-200 dark:border-charcoal-800 calendar-container">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 700 }}
          views={[Views.WEEK, Views.DAY]}
          defaultView={Views.WEEK}
          eventPropGetter={eventStyleGetter}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          resizable
          step={30}
          timeslots={2}
          min={new Date(2025, 0, 1, 7, 0)} // 07:00
          max={new Date(2025, 0, 1, 20, 0)} // 20:00
          messages={{
            today: 'Idag',
            previous: 'Föregående',
            next: 'Nästa',
            month: 'Månad',
            week: 'Vecka',
            day: 'Dag',
            agenda: 'Agenda',
            date: 'Datum',
            time: 'Tid',
            event: 'Händelse',
            noEventsInRange: 'Inga händelser denna period',
            showMore: (total: number) => `+ ${total} fler`,
          }}
          culture="sv"
        />
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-charcoal-850 rounded-xl shadow-2xl max-w-md w-full border border-sand-200 dark:border-charcoal-800 p-6">
            <h3 className="text-xl font-bold text-stone-900 dark:text-cream-50 mb-4">
              {selectedEvent.title}
            </h3>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-stone-600 dark:text-stone-400">Start:</span>
                <span className="ml-2 text-stone-900 dark:text-cream-50">
                  {selectedEvent.start.toLocaleString('sv-SE')}
                </span>
              </div>
              <div>
                <span className="text-stone-600 dark:text-stone-400">Slut:</span>
                <span className="ml-2 text-stone-900 dark:text-cream-50">
                  {selectedEvent.end.toLocaleString('sv-SE')}
                </span>
              </div>
              <div>
                <span className="text-stone-600 dark:text-stone-400">Längd:</span>
                <span className="ml-2 text-stone-900 dark:text-cream-50">
                  {Math.round((selectedEvent.end.getTime() - selectedEvent.start.getTime()) / (1000 * 60))} minuter
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              {selectedEvent.resource?.isPrioEvent && (
                <Button
                  onClick={handleDeleteEvent}
                  variant="ghost"
                  className="text-error-600 hover:text-error-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Radera
                </Button>
              )}
              <Button onClick={() => setSelectedEvent(null)} className="ml-auto">
                Stäng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS for dark mode */}
      <style>{`
        .calendar-container .rbc-calendar {
          font-family: inherit;
        }

        .dark .rbc-calendar {
          color: #e7e5e4;
        }

        .dark .rbc-header {
          background-color: #292524;
          border-color: #44403c;
          color: #e7e5e4;
        }

        .dark .rbc-time-view {
          border-color: #44403c;
        }

        .dark .rbc-time-content {
          border-color: #44403c;
        }

        .dark .rbc-time-slot {
          border-color: #44403c;
        }

        .dark .rbc-day-slot {
          border-color: #44403c;
        }

        .dark .rbc-timeslot-group {
          border-color: #44403c;
        }

        .dark .rbc-today {
          background-color: rgba(194, 120, 77, 0.1);
        }

        .dark .rbc-current-time-indicator {
          background-color: #c2784d;
        }

        .rbc-event {
          cursor: pointer;
        }

        .rbc-event:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}
