import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ScheduleComponent,
  Day,
  Week,
  Month,
  Agenda,
  Inject,
  ViewsDirective,
  ViewDirective,
  EventSettingsModel,
  ActionEventArgs,
  PopupOpenEventArgs,
  EventRenderedArgs,
  Resize,
  DragAndDrop,
} from '@syncfusion/ej2-react-schedule';
import { L10n, loadCldr, setCulture } from '@syncfusion/ej2-base';
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

// Import CLDR data för svensk kultur
import * as numberingSystems from 'cldr-data/supplemental/numberingSystems.json';
import * as gregorian from 'cldr-data/main/sv/ca-gregorian.json';
import * as numbers from 'cldr-data/main/sv/numbers.json';
import * as timeZoneNames from 'cldr-data/main/sv/timeZoneNames.json';

// Ladda CLDR-data
loadCldr(numberingSystems, gregorian, numbers, timeZoneNames);

// Sätt svensk kultur
setCulture('sv');

// Konfigurera svensk lokalisering
L10n.load({
  'sv': {
    'schedule': {
      'day': 'Dag',
      'week': 'Vecka',
      'month': 'Månad',
      'agenda': 'Agenda',
      'today': 'Idag',
      'noEvents': 'Inga händelser',
      'allDay': 'Heldag',
      'start': 'Start',
      'end': 'Slut',
      'more': 'fler',
      'close': 'Stäng',
      'cancel': 'Avbryt',
      'noTitle': '(Ingen titel)',
      'delete': 'Ta bort',
      'deleteEvent': 'Ta bort händelse',
      'deleteMultipleEvent': 'Ta bort flera händelser',
      'selectedItems': 'Valda objekt',
      'deleteSeries': 'Ta bort serie',
      'edit': 'Redigera',
      'editSeries': 'Redigera serie',
      'editEvent': 'Redigera händelse',
      'createEvent': 'Skapa',
      'subject': 'Ämne',
      'addTitle': 'Lägg till titel',
      'moreDetails': 'Fler detaljer',
      'save': 'Spara',
      'editContent': 'Hur vill du ändra mötet i serien?',
      'deleteContent': 'Är du säker på att du vill ta bort händelsen?',
      'deleteMultipleContent': 'Är du säker på att du vill ta bort valda händelser?',
      'newEvent': 'Ny händelse',
      'title': 'Titel',
      'location': 'Plats',
      'description': 'Beskrivning',
      'timezone': 'Tidszon',
      'startTimezone': 'Starttidszon',
      'endTimezone': 'Sluttidszon',
      'repeat': 'Upprepa',
      'saveButton': 'Spara',
      'cancelButton': 'Avbryt',
      'deleteButton': 'Ta bort',
      'recurrence': 'Återkommande',
      'wrongPattern': 'Återkommande mönster är inte giltigt.',
      'seriesChangeAlert': 'Vill du avbryta ändringarna på specifika instanser av denna serie och matcha den igen med hela serien?',
      'createError': 'Varaktigheten för händelsen måste vara kortare än hur ofta den inträffar. Förkorta varaktigheten eller ändra återkommande mönster i redigeraren för återkommande händelser.',
      'recurrenceDateValidation': 'Vissa månader har färre än det valda datumet. För dessa månader kommer händelsen att inträffa det sista datumet i månaden.',
      'sameDayAlert': 'Två händelser av samma händelse kan inte ske på samma dag.',
      'editRecurrence': 'Redigera återkommande',
      'repeats': 'Upprepningar',
      'alert': 'Varning',
      'startEndError': 'Det valda slutdatumet inträffar före startdatumet.',
      'invalidDateError': 'Det angivna datumvärdet är ogiltigt.',
      'ok': 'Ok',
      'occurrence': 'Förekomst',
      'series': 'Serie',
      'previous': 'Föregående',
      'next': 'Nästa',
      'timelineDay': 'Tidslinje Dag',
      'timelineWeek': 'Tidslinje Vecka',
      'timelineMonth': 'Tidslinje Månad',
      'expandAllDaySection': 'Expandera',
      'collapseAllDaySection': 'Kollapsa',
    }
  }
});

interface CalendarEvent {
  Id: string | number;
  Subject: string;
  StartTime: Date;
  EndTime: Date;
  IsAllDay?: boolean;
  IsReadonly?: boolean;
  CategoryColor?: string;
  EventType?: 'meeting' | 'focus' | 'task';
  TaskId?: string;
  EventId?: string;
  IsPrioEvent?: boolean;
}

interface SelectedEventData {
  id: string;
  title: string;
  start: Date;
  end: Date;
  editable?: boolean;
  extendedProps?: {
    taskId?: string;
    eventId?: string;
    isPrioEvent?: boolean;
    type: 'meeting' | 'focus' | 'task';
  };
}

interface WeekCalendarViewProps {
  onScheduleReady?: (scheduleInstance: ScheduleComponent | null) => void;
}

export function WeekCalendarView({ onScheduleReady }: WeekCalendarViewProps = {}) {
  const { tasks, updateTask } = useTasks();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMsftConnected, setIsMsftConnected] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SelectedEventData | null>(null);
  const scheduleRef = useRef<ScheduleComponent>(null);
  const currentViewRef = useRef<string>('Week');
  const currentDateRef = useRef<Date>(new Date());

  // Exponera schedule ref till parent
  useEffect(() => {
    if (scheduleRef.current && onScheduleReady) {
      onScheduleReady(scheduleRef.current);
    }
  }, [scheduleRef.current, onScheduleReady]);

  const [msftEvents, setMsftEvents] = useState<CalendarEvent[]>([]);

  // Ladda Microsoft events (ENDAST vid mount och var 5:e minut)
  const loadMicrosoftEvents = useCallback(async () => {
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

      // Konvertera till Syncfusion format
      const events: CalendarEvent[] = calendarEvents.map((event) => {
        const isPrioEvent = event.subject.includes('🎯 Fokus');
        return {
          Id: event.id,
          Subject: event.subject,
          StartTime: new Date(event.start),
          EndTime: new Date(event.end),
          IsReadonly: !isPrioEvent,
          CategoryColor: isPrioEvent ? '#ea580c' : '#3b82f6',
          EventType: isPrioEvent ? 'focus' : 'meeting',
          EventId: event.id,
          IsPrioEvent: isPrioEvent,
        };
      });

      setMsftEvents(events);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load Microsoft events:', error);
      toast.error('Kunde inte ladda kalender');
      setLoading(false);
    }
  }, []);

  // Spara current view och date när användaren ändrar
  const onNavigating = (args: any) => {
    if (scheduleRef.current) {
      currentViewRef.current = args.currentView || scheduleRef.current.currentView;
      currentDateRef.current = args.currentDate || scheduleRef.current.selectedDate;
    }
  };

  // Uppdatera task events när tasks ändras (ingen reload av kalendern)
  useEffect(() => {
    console.log('Tasks changed, updating calendar. Total tasks:', tasks.length);

    const taskEvents: CalendarEvent[] = tasks
      .filter((task) => task.deadline && task.status !== 'done')
      .map((task) => {
        const deadline = new Date(task.deadline!);
        const durationMinutes = task.estimated_duration || 30;
        return {
          Id: `task-${task.id}`,
          Subject: `📌 ${task.title}`,
          StartTime: deadline,
          EndTime: new Date(deadline.getTime() + durationMinutes * 60 * 1000),
          IsReadonly: false,
          CategoryColor: '#dc2626',
          EventType: 'task',
          TaskId: task.id,
        };
      });

    console.log('Task events created:', taskEvents.length);
    console.log('Task events:', taskEvents.map(e => ({
      id: e.TaskId,
      title: e.Subject,
      start: e.StartTime.toISOString()
    })));

    // Debug: Visa tasks MED deadline
    const tasksWithDeadline = tasks.filter(t => t.deadline && t.status !== 'done');
    console.log('Tasks with deadline (filtered):', tasksWithDeadline.length);
    console.log('Tasks with deadline details:', tasksWithDeadline.map(t => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline,
      status: t.status
    })));

    // Spara nuvarande vy
    if (scheduleRef.current) {
      currentViewRef.current = scheduleRef.current.currentView;
      currentDateRef.current = scheduleRef.current.selectedDate;
    }

    // Kombinera Microsoft events och task events
    const combinedEvents = [...msftEvents, ...taskEvents];
    console.log('Setting events. Total:', combinedEvents.length, 'MS events:', msftEvents.length, 'Task events:', taskEvents.length);
    setEvents(combinedEvents);

    // Återställ vy efter data-uppdatering
    setTimeout(() => {
      if (scheduleRef.current) {
        scheduleRef.current.currentView = currentViewRef.current as any;
        scheduleRef.current.selectedDate = currentDateRef.current;
      }
    }, 0);
  }, [tasks, msftEvents]);

  // Ladda Microsoft events vid mount och sedan var 5:e minut
  useEffect(() => {
    loadMicrosoftEvents();

    // Uppdatera Microsoft events var 5:e minut i bakgrunden
    const interval = setInterval(() => {
      loadMicrosoftEvents();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadMicrosoftEvents]);

  // Event settings för Syncfusion
  const eventSettings: EventSettingsModel = {
    dataSource: events,
    fields: {
      id: 'Id',
      subject: { name: 'Subject' },
      startTime: { name: 'StartTime' },
      endTime: { name: 'EndTime' },
      isAllDay: { name: 'IsAllDay' },
      isReadonly: { name: 'IsReadonly' },
    } as any, // Type workaround for Syncfusion fields
  };

  // Hantera när event ändras (drag, resize)
  const onActionComplete = async (args: ActionEventArgs) => {
    if (args.requestType === 'eventChanged' && args.data) {
      const changedEvents = Array.isArray(args.data) ? args.data : [args.data];

      for (const event of changedEvents) {
        const calEvent = event as CalendarEvent;

        // Blockera externa möten
        if (calEvent.EventId && !calEvent.IsPrioEvent) {
          toast.error('Kan inte flytta externa möten!');
          return;
        }

        // Prio focus-session
        if (calEvent.EventId && calEvent.IsPrioEvent) {
          try {
            const success = await updateCalendarEvent(calEvent.EventId, {
              start: calEvent.StartTime,
              end: calEvent.EndTime,
            });

            if (success) {
              toast.success('Fokustid uppdaterad!');
              // Microsoft synk sker i bakgrunden
            } else {
              toast.error('Kunde inte uppdatera fokustiden');
            }
          } catch (error) {
            console.error('Failed to update event:', error);
            toast.error('Kunde inte uppdatera fokustiden');
          }
        }

        // Task deadline
        if (calEvent.TaskId) {
          try {
            await updateTask(calEvent.TaskId, {
              deadline: calEvent.StartTime.toISOString()
            });
            toast.success('Task deadline uppdaterad!');
            // Supabase realtime uppdaterar automatiskt
          } catch (error) {
            console.error('Failed to update task:', error);
            toast.error('Kunde inte uppdatera task');
          }
        }
      }
    }

    // Hantera när event tas bort
    if (args.requestType === 'eventRemoved' && args.data) {
      const removedEvents = Array.isArray(args.data) ? args.data : [args.data];

      for (const event of removedEvents) {
        const calEvent = event as CalendarEvent;

        if (calEvent.EventId && calEvent.IsPrioEvent) {
          try {
            await deleteCalendarEvent(calEvent.EventId);
            toast.success('Fokustid borttagen!');
            // Microsoft synk sker i bakgrunden
          } catch (error) {
            console.error('Failed to delete event:', error);
            toast.error('Kunde inte ta bort fokustiden');
          }
        }

        if (calEvent.TaskId) {
          try {
            await updateTask(calEvent.TaskId, { deadline: undefined });
            toast.success('Task deadline borttagen!');
            // Supabase realtime uppdaterar automatiskt
          } catch (error) {
            console.error('Failed to remove task deadline:', error);
            toast.error('Kunde inte ta bort deadline');
          }
        }
      }
    }

    // Hantera när ny event skapas
    if (args.requestType === 'eventCreated' && args.data) {
      const newEvents = Array.isArray(args.data) ? args.data : [args.data];

      for (const event of newEvents) {
        const calEvent = event as CalendarEvent;

        // Om TaskId finns = task från sidebar
        if (calEvent.TaskId) {
          try {
            await updateTask(calEvent.TaskId, {
              deadline: calEvent.StartTime.toISOString()
            });
            toast.success('Task deadline satt!');
            // Supabase realtime uppdaterar automatiskt
          } catch (error) {
            console.error('Failed to set task deadline:', error);
            toast.error('Kunde inte sätta deadline');
          }
        } else {
          // Annars = ny fokustid
          if (!isMsftConnected) {
            toast.error('Anslut till Microsoft för att schemalägga');
            return;
          }

          const title = calEvent.Subject || 'Fokustid';
          const startDate = calEvent.StartTime;
          const endDate = calEvent.EndTime;
          const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

          try {
            await blockCalendarTime(startDate, durationMinutes, `🎯 Fokus: ${title}`);
            toast.success('Fokustid inbokad!');
            // Microsoft synk sker i bakgrunden
          } catch (error) {
            console.error('Failed to block time:', error);
            toast.error('Kunde inte boka tid');
          }
        }
      }
    }
  };

  // Hantera event click - visa custom modal
  const onEventClick = (args: any) => {
    const eventData = args.event as CalendarEvent;

    setSelectedEvent({
      id: String(eventData.Id),
      title: eventData.Subject,
      start: eventData.StartTime,
      end: eventData.EndTime,
      editable: !eventData.IsReadonly,
      extendedProps: {
        taskId: eventData.TaskId,
        eventId: eventData.EventId,
        isPrioEvent: eventData.IsPrioEvent,
        type: eventData.EventType!,
      },
    });
  };

  // Anpassa popup för att blockera default popups
  const onPopupOpen = (args: PopupOpenEventArgs) => {
    // Blockera alla default popups - vi använder vår egen modal
    if (args.type === 'QuickInfo' || args.type === 'Editor' || args.type === 'DeleteAlert') {
      args.cancel = true;
    }
  };

  // Custom rendering av events
  const onEventRendered = (args: EventRenderedArgs) => {
    const eventData = args.data as CalendarEvent;

    // Sätt bakgrundsfärg
    if (args.element && eventData.CategoryColor) {
      args.element.style.backgroundColor = eventData.CategoryColor;
      args.element.style.borderColor = eventData.CategoryColor;
    }

    // Custom HTML för event
    if (args.element) {
      const timeText = args.element.querySelector('.e-time');
      const subjectText = args.element.querySelector('.e-subject');

      // Flytta tid under titel
      if (timeText && subjectText && timeText.parentElement && subjectText.parentElement) {
        const container = subjectText.parentElement;
        container.innerHTML = '';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'font-medium truncate';
        titleDiv.textContent = eventData.Subject;

        const timeDiv = document.createElement('div');
        timeDiv.className = 'text-xs opacity-75 truncate';
        timeDiv.textContent = timeText.textContent || '';

        container.appendChild(titleDiv);
        container.appendChild(timeDiv);
      }
    }
  };

  // Hantera ta bort event från modal
  const handleDeleteEvent = async () => {
    if (!selectedEvent || !scheduleRef.current) return;

    const extendedProps = selectedEvent.extendedProps;

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
        // Microsoft synk sker i bakgrunden
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
        // Supabase realtime uppdaterar automatiskt
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

      {/* Syncfusion Scheduler */}
      <div className="flex-1 bg-white dark:bg-charcoal-850 rounded-xl p-4 border border-sand-200 dark:border-charcoal-800 overflow-hidden">
        <ScheduleComponent
          ref={scheduleRef}
          height="100%"
          locale="sv"
          firstDayOfWeek={1}
          startHour="00:00"
          endHour="24:00"
          timeScale={{ enable: true, interval: 30, slotCount: 2 }}
          showQuickInfo={false}
          eventSettings={eventSettings}
          actionComplete={onActionComplete}
          popupOpen={onPopupOpen}
          eventClick={onEventClick}
          eventRendered={onEventRendered}
          navigating={onNavigating}
          editorTemplate={() => null}
          allowDragAndDrop={true}
          allowResizing={true}
          showHeaderBar={true}
        >
          <ViewsDirective>
            <ViewDirective option="Week" />
            <ViewDirective option="Day" />
            <ViewDirective option="Month" />
            <ViewDirective option="Agenda" />
          </ViewsDirective>
          <Inject services={[Day, Week, Month, Agenda, DragAndDrop, Resize]} />
        </ScheduleComponent>
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
                  {selectedEvent.start.toLocaleString('sv-SE', {
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
                  {selectedEvent.end.toLocaleString('sv-SE', {
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
