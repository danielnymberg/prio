import { useState, useEffect, useRef, useMemo } from 'react';
import {
  ScheduleComponent,
  Day,
  Week,
  WorkWeek,
  Month,
  Agenda,
  TimelineViews,
  TimelineMonth,
  Inject,
  ViewsDirective,
  ViewDirective,
  EventSettingsModel,
  ActionEventArgs,
  PopupOpenEventArgs,
  Resize,
  DragAndDrop,
  Print,
  ExcelExport,
  ICalendarExport,
} from '@syncfusion/ej2-react-schedule';
import { L10n, loadCldr, setCulture } from '@syncfusion/ej2-base';
import type { Task, UpdateTaskInput } from '@/lib/types';
import {
  getExternalMeetings,
  blockCalendarTime,
  updateCalendarEvent,
  deleteCalendarEvent,
  isMicrosoftLoggedIn,
} from '@/services/microsoft-graph';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';

// Import CLDR data
import * as numberingSystems from 'cldr-data/supplemental/numberingSystems.json';
import * as gregorian from 'cldr-data/main/sv/ca-gregorian.json';
import * as numbers from 'cldr-data/main/sv/numbers.json';
import * as timeZoneNames from 'cldr-data/main/sv/timeZoneNames.json';

loadCldr(numberingSystems, gregorian, numbers, timeZoneNames);
setCulture('sv');

// Svensk lokalisering
L10n.load({
  'sv': {
    'schedule': {
      'day': 'Dag',
      'week': 'Vecka',
      'month': 'Månad',
      'today': 'Idag',
      'noEvents': 'Inga händelser',
      'delete': 'Ta bort',
      'save': 'Spara',
      'cancel': 'Avbryt',
    }
  }
});

interface CalendarEvent {
  Id: string;
  Subject: string;
  StartTime: Date;
  EndTime: Date;
  IsReadonly: boolean;
  CategoryColor: string;
  EventType: 'task' | 'meeting';
  TaskId?: string;
  CalendarEventId?: string;
}

interface WeekCalendarViewProps {
  onScheduleReady?: (scheduleInstance: ScheduleComponent | null) => void;
  tasks: Task[];
  updateTask: (id: string, input: UpdateTaskInput) => Promise<Task | null>;
}

export function WeekCalendarView({ onScheduleReady, tasks, updateTask }: WeekCalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMsftConnected, setIsMsftConnected] = useState(false);
  const scheduleRef = useRef<ScheduleComponent>(null);

  // Memoize counts för att undvika onödiga re-renders
  const scheduledCount = useMemo(
    () => tasks.filter(t => t.scheduled_start && t.status !== 'done').length,
    [tasks]
  );

  const outlookLinkedCount = useMemo(
    () => tasks.filter(t => t.calendar_event_id).length,
    [tasks]
  );

  // Exponera schedule ref till parent
  useEffect(() => {
    if (scheduleRef.current && onScheduleReady) {
      onScheduleReady(scheduleRef.current);
    }
  }, [scheduleRef.current, onScheduleReady]);

  // Ladda alla events
  const loadAllEvents = async (showSpinner = false) => {
    try {
      if (showSpinner) {
        setLoading(true);
      }

      // Kolla Microsoft-status
      const connected = await isMicrosoftLoggedIn();
      setIsMsftConnected(connected);

      let externalMeetings: any[] = [];

      if (connected) {
        // Hämta endast externa möten (ej Prio-skapade)
        const now = new Date();
        const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        externalMeetings = await getExternalMeetings(now, twoWeeksFromNow);
      }

      // Kombinera externa möten + schemalagda tasks
      const combined: CalendarEvent[] = [
        // Externa möten (blå, readonly)
        ...externalMeetings.map((m) => ({
          Id: `meeting-${m.id}`,
          Subject: m.subject,
          StartTime: new Date(m.start),
          EndTime: new Date(m.end),
          IsReadonly: true,
          CategoryColor: '#3b82f6',
          EventType: 'meeting' as const,
        })),
        // Schemalagda tasks (röd, editable)
        ...tasks
          .filter(t => t.scheduled_start && t.status !== 'done')
          .map((t) => ({
            Id: `task-${t.id}`,
            Subject: `📌 ${t.title}`,
            StartTime: new Date(t.scheduled_start!),
            EndTime: new Date(
              new Date(t.scheduled_start!).getTime() + (t.estimated_duration || 30) * 60000
            ),
            IsReadonly: false,
            CategoryColor: '#dc2626',
            EventType: 'task' as const,
            TaskId: t.id,
            CalendarEventId: t.calendar_event_id || undefined,
          })),
      ];

      setEvents(combined);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load events:', error);
      toast.error('Kunde inte ladda kalender');
      setLoading(false);
    }
  };

  // Första laddning - visa spinner
  useEffect(() => {
    loadAllEvents(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Uppdateringar när tasks ändras - ingen spinner
  useEffect(() => {
    loadAllEvents(false);
  }, [tasks.length, scheduledCount, outlookLinkedCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hantera CRUD-operationer
  const onActionComplete = async (args: ActionEventArgs) => {
    // ÄNDRA event (drag, resize)
    if (args.requestType === 'eventChanged' && args.data) {
      const event = (Array.isArray(args.data) ? args.data[0] : args.data) as CalendarEvent;

      // Blockera flyttning av externa möten
      if (event.EventType === 'meeting') {
        toast.error('Kan inte flytta externa möten!');
        await loadAllEvents(false); // Behövs för att återställa vid fel
        return;
      }

      // Flytta task
      if (event.EventType === 'task' && event.TaskId) {
        try {
          // 1. Uppdatera Supabase
          await updateTask(event.TaskId, {
            scheduled_start: event.StartTime.toISOString()
          });

          // 2. Uppdatera Outlook (om event finns)
          if (event.CalendarEventId) {
            await updateCalendarEvent(event.CalendarEventId, {
              start: event.StartTime,
              end: event.EndTime,
            });
          }

          toast.success('Task omschemalagd!');
          // loadAllEvents() körs automatiskt via useEffect när updateTask ändrar tasks
        } catch (error) {
          console.error('Failed to update task:', error);
          toast.error('Kunde inte uppdatera task');
          await loadAllEvents(false); // Behövs för att återställa vid fel
        }
      }
    }

    // TA BORT event
    if (args.requestType === 'eventRemoved' && args.data) {
      const event = (Array.isArray(args.data) ? args.data[0] : args.data) as CalendarEvent;

      if (event.EventType === 'task' && event.TaskId) {
        try {
          // 1. Ta bort från Supabase
          await updateTask(event.TaskId, {
            scheduled_start: undefined,
            calendar_event_id: undefined,
          });

          // 2. Ta bort från Outlook (om event finns)
          if (event.CalendarEventId) {
            await deleteCalendarEvent(event.CalendarEventId);
          }

          toast.success('Task borttagen från schema!');
        } catch (error) {
          console.error('Failed to remove task:', error);
          toast.error('Kunde inte ta bort task');
        }
      }
    }

    // SKAPA event (från tom slot)
    if (args.requestType === 'eventCreated' && args.data) {
      const event = (Array.isArray(args.data) ? args.data[0] : args.data) as CalendarEvent;

      // Om det är en task från sidebar (TaskId finns redan)
      if (event.TaskId) {
        try {
          // 1. Uppdatera Supabase
          const updatedTask = await updateTask(event.TaskId, {
            scheduled_start: event.StartTime.toISOString()
          });

          if (!updatedTask) {
            throw new Error('Failed to update task');
          }

          // 2. Skapa i Outlook
          if (isMsftConnected) {
            const duration = updatedTask.estimated_duration || 30;
            const eventId = await blockCalendarTime(
              event.StartTime,
              duration,
              updatedTask.title
            );

            // 3. Spara event ID
            if (eventId) {
              await supabase
                .from('tasks')
                .update({ calendar_event_id: eventId })
                .eq('id', event.TaskId);
            }
          }

          toast.success('Task schemalagd!');
          // loadAllEvents() körs automatiskt via useEffect när updateTask ändrar tasks
        } catch (error) {
          console.error('Failed to schedule task:', error);
          toast.error('Kunde inte schemalägga task');
          await loadAllEvents(false); // Behövs för att återställa vid fel
        }
      }
    }
  };

  // Blockera default popups
  const onPopupOpen = (args: PopupOpenEventArgs) => {
    args.cancel = true;
  };

  // Custom rendering av events (sätt färger)
  const onEventRendered = (args: any) => {
    const eventData = args.data as CalendarEvent;
    if (args.element && eventData.CategoryColor) {
      args.element.style.backgroundColor = eventData.CategoryColor;
      args.element.style.borderColor = eventData.CategoryColor;
    }
  };

  const eventSettings: EventSettingsModel = {
    dataSource: events,
    fields: {
      id: 'Id',
      subject: { name: 'Subject' },
      startTime: { name: 'StartTime' },
      endTime: { name: 'EndTime' },
      isReadonly: { name: 'IsReadonly' },
    } as any,
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
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Info box */}
      <div className="flex items-center gap-4 text-xs text-stone-600 dark:text-stone-400 bg-sand-50 dark:bg-charcoal-900 rounded-lg p-3 border border-sand-200 dark:border-charcoal-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span>Externa möten</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Schemalagda tasks</span>
        </div>
      </div>

      {/* SyncFusion Schedule - Let SyncFusion handle its own scrolling */}
      <div className="flex-1 bg-white dark:bg-charcoal-850 rounded-xl border border-sand-200 dark:border-charcoal-800">
        <div className="h-full p-4 relative">
          <ScheduleComponent
            ref={scheduleRef}
            cssClass="prio-compact-schedule"
            height="calc(100% - 2rem)"
            width="100%"
            locale="sv"
            firstDayOfWeek={1}
            startHour="07:00"
            endHour="20:00"
            currentView="Week"
            timeScale={{
              enable: true,
              interval: 30,
              slotCount: 2,
              minorSlotCount: 1
            }}
            showQuickInfo={false}
            eventSettings={eventSettings}
            actionComplete={onActionComplete}
            popupOpen={onPopupOpen}
            eventRendered={onEventRendered}
            allowDragAndDrop={true}
            allowResizing={true}
            enableRecurrenceValidation={true}
            enablePersistence={false}
            allowKeyboardInteraction={true}
            enableAdaptiveUI={true}
            rowAutoHeight={false}
            showTimeIndicator={true}
          >
            <ViewsDirective>
              <ViewDirective option="Day" />
              <ViewDirective option="Week" />
              <ViewDirective option="WorkWeek" />
              <ViewDirective option="Month" />
              <ViewDirective option="Agenda" />
              <ViewDirective option="TimelineWeek" />
            </ViewsDirective>
            <Inject services={[
              Day,
              Week,
              WorkWeek,
              Month,
              Agenda,
              TimelineViews,
              TimelineMonth,
              DragAndDrop,
              Resize,
              Print,
              ExcelExport,
              ICalendarExport
            ]} />
          </ScheduleComponent>
        </div>
      </div>
    </div>
  );
}
