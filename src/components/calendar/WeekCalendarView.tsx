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

// Svensk lokalisering för alla SyncFusion komponenter
L10n.load({
  'sv': {
    'schedule': {
      'day': 'Dag',
      'week': 'Vecka',
      'workWeek': 'Arbetsvecka',
      'month': 'Månad',
      'agenda': 'Agenda',
      'today': 'Idag',
      'noEvents': 'Inga händelser',
      'delete': 'Ta bort',
      'save': 'Spara',
      'cancel': 'Avbryt',
      'allDay': 'Heldag',
      'repeat': 'Upprepa',
      'never': 'Aldrig',
      'daily': 'Dagligen',
      'weekly': 'Veckovis',
      'monthly': 'Månadsvis',
      'yearly': 'Årligen',
    },
    'grid': {
      'EmptyRecord': 'Inga poster att visa',
      'GroupDropArea': 'Dra en kolumnrubrik hit för att gruppera',
      'UnGroup': 'Klicka här för att avgruppera',
      'Item': 'post',
      'Items': 'poster',
      'Print': 'Skriv ut',
      'Pdfexport': 'PDF Export',
      'Excelexport': 'Excel Export',
      'Search': 'Sök',
    },
    'pager': {
      'currentPageInfo': '{0} av {1} sidor',
      'totalItemsInfo': '({0} poster)',
      'firstPageTooltip': 'Gå till första sidan',
      'lastPageTooltip': 'Gå till sista sidan',
      'nextPageTooltip': 'Gå till nästa sida',
      'previousPageTooltip': 'Gå till föregående sida',
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
      <div className="e-flex e-align-center e-justify-center e-h-full">
        <div className="e-text-center">
          <div className="e-rounded-full e-mx-auto e-mb-16 e-animate-spin"
            style={{
              width: '48px',
              height: '48px',
              border: '2px solid transparent',
              borderBottomColor: 'var(--primary-500)'
            }}></div>
          <p style={{ color: 'var(--e-text)' }}>Laddar kalender...</p>
        </div>
      </div>
    );
  }

  if (!isMsftConnected) {
    return (
      <div className="e-flex e-align-center e-justify-center e-h-full">
        <div className="e-rounded-lg e-p-32 e-max-w-md e-text-center e-border"
          style={{
            backgroundColor: 'var(--e-surface)',
            borderColor: 'var(--e-border)'
          }}>
          <AlertCircle className="e-mx-auto e-mb-16"
            style={{
              width: '48px',
              height: '48px',
              color: 'var(--primary-500)'
            }} />
          <h3 className="e-text-xl e-font-bold e-mb-8"
            style={{ color: 'var(--e-text)' }}>
            Microsoft Kalender Ej Ansluten
          </h3>
          <p className="e-mb-24"
            style={{ color: 'var(--e-text)' }}>
            Anslut ditt Microsoft-konto för att synka kalender och schemalägga fokustid.
          </p>
        </div>
      </div>
    );
  }

  // Handle export actions
  const handleExcelExport = () => {
    if (scheduleRef.current) {
      scheduleRef.current.exportToExcel();
    }
  };

  const handleICalExport = () => {
    if (scheduleRef.current) {
      scheduleRef.current.exportToICalendar();
    }
  };

  const handlePrint = () => {
    if (scheduleRef.current) {
      scheduleRef.current.print();
    }
  };

  return (
    <div className="e-w-full e-h-full">
      {/* Header section - Legend and export buttons */}
      <div className="e-p-16 e-border-b"
        style={{
          backgroundColor: 'var(--e-surface)',
          borderColor: 'var(--e-border)'
        }}>
        <div className="e-flex e-justify-between e-align-center e-flex-wrap e-gap-16">
          <div className="e-flex e-gap-24 e-align-center e-flex-wrap">
            <div className="e-flex e-align-center e-gap-8">
              <div className="e-rounded"
                style={{
                  backgroundColor: '#3b82f6',
                  width: '16px',
                  height: '16px'
                }} />
              <span className="e-text-sm" style={{ color: 'var(--e-text)' }}>Externa möten</span>
            </div>
            <div className="e-flex e-align-center e-gap-8">
              <div className="e-rounded"
                style={{
                  backgroundColor: '#ef4444',
                  width: '16px',
                  height: '16px'
                }} />
              <span className="e-text-sm" style={{ color: 'var(--e-text)' }}>Schemalagda tasks</span>
            </div>
            <div className="e-text-sm e-opacity-75"
              style={{ color: 'var(--e-text)', fontSize: '13px' }}>
              💡 Byt vy med knapparna i kalendern: Dag, Vecka, Arbetsvecka, Månad, Agenda, Timeline
            </div>
          </div>
          <div className="e-flex e-gap-8">
            <button
              onClick={handleExcelExport}
              className="e-px-16 e-py-8 e-border e-rounded-md e-cursor-pointer e-text-sm e-font-medium"
              style={{
                backgroundColor: 'var(--e-surface)',
                borderColor: 'var(--e-border)',
                color: 'var(--e-text)'
              }}
              title="Exportera till Excel"
            >
              📊 Excel
            </button>
            <button
              onClick={handleICalExport}
              className="e-px-16 e-py-8 e-border e-rounded-md e-cursor-pointer e-text-sm e-font-medium"
              style={{
                backgroundColor: 'var(--e-surface)',
                borderColor: 'var(--e-border)',
                color: 'var(--e-text)'
              }}
              title="Exportera till iCalendar (.ics)"
            >
              📅 iCal
            </button>
            <button
              onClick={handlePrint}
              className="e-px-16 e-py-8 e-border e-rounded-md e-cursor-pointer e-text-sm e-font-medium"
              style={{
                backgroundColor: 'var(--e-surface)',
                borderColor: 'var(--e-border)',
                color: 'var(--e-text)'
              }}
              title="Skriv ut"
            >
              🖨️ Print
            </button>
          </div>
        </div>
      </div>

      {/* Schedule container - NO padding, clean structure */}
      <div className="e-w-full" style={{ height: 'calc(100% - 70px)' }}>
        <ScheduleComponent
          ref={scheduleRef}
          height="550px"
          width="100%"
          locale="sv"
          firstDayOfWeek={1}
          startHour="07:00"
          endHour="20:00"
          currentView="Week"
          timeScale={{
            enable: true,
            interval: 30,
            slotCount: 2
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
  );
}
