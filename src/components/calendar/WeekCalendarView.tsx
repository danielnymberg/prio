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
import type { Task, UpdateTaskInput } from '@/lib/types';
import {
  getCalendarEvents,
  blockCalendarTime,
  updateCalendarEvent,
  deleteCalendarEvent,
  isMicrosoftLoggedIn,
} from '@/services/microsoft-graph';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { AlertCircle, Trash2, Sparkles } from 'lucide-react';

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
  tasks: Task[];
  updateTask: (id: string, input: UpdateTaskInput) => Promise<Task | null>;
}

export function WeekCalendarView({ onScheduleReady, tasks, updateTask }: WeekCalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMsftConnected, setIsMsftConnected] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SelectedEventData | null>(null);
  const scheduleRef = useRef<ScheduleComponent>(null);
  const currentViewRef = useRef<string>('Week');
  const currentDateRef = useRef<Date>(new Date());
  const [scheduleKey, setScheduleKey] = useState(0); // Force re-mount när events ändras

  // Exponera schedule ref till parent och konfigurera scroll-hastighet
  useEffect(() => {
    if (scheduleRef.current) {
      if (onScheduleReady) {
        onScheduleReady(scheduleRef.current);
      }

      // Sätt lagom auto-scroll-hastighet vid drag
      // @ts-ignore - scrollOptions finns i runtime men inte i types
      const schedule: any = scheduleRef.current;
      if (schedule.scrollOptions !== undefined) {
        schedule.scrollOptions = {
          enable: true,
          scrollBy: 20,      // Lagom scrollning (ökat från 10)
          timeDelay: 80      // Delay mellan scroll-steg i ms (minskat från 100)
        };
      }

      // Auto-scrolla till 07:00 när kalendern laddas
      setTimeout(() => {
        if (scheduleRef.current) {
          scheduleRef.current.scrollTo('07:00');
        }
      }, 100); // Liten delay för att kalendern ska hinna rendera
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
    console.log('📅 [WeekCalendarView] Tasks changed, updating calendar. Total tasks:', tasks.length);
    console.log('📅 [WeekCalendarView] All tasks:', tasks.map(t => ({
      id: t.id,
      title: t.title,
      scheduled_start: t.scheduled_start,
      status: t.status,
      estimated_duration: t.estimated_duration
    })));

    const taskEvents: CalendarEvent[] = tasks
      .filter((task) => {
        const hasScheduledStart = !!task.scheduled_start;
        const isNotDone = task.status !== 'done';
        const shouldShow = hasScheduledStart && isNotDone;

        console.log(`📅 [WeekCalendarView] Task "${task.title}": scheduled_start=${task.scheduled_start}, status=${task.status}, shouldShow=${shouldShow}`);

        return shouldShow;
      })
      .map((task) => {
        const scheduledStart = new Date(task.scheduled_start!);
        const durationMinutes = task.estimated_duration || 30;
        const event = {
          Id: `task-${task.id}`,
          Subject: `📌 ${task.title}`,
          StartTime: scheduledStart,
          EndTime: new Date(scheduledStart.getTime() + durationMinutes * 60 * 1000),
          IsReadonly: false,
          CategoryColor: '#dc2626',
          EventType: 'task' as const,
          TaskId: task.id,
        };

        console.log(`📅 [WeekCalendarView] Created event for "${task.title}":`, {
          StartTime: event.StartTime.toISOString(),
          EndTime: event.EndTime.toISOString()
        });

        return event;
      });

    console.log('📅 [WeekCalendarView] Task events created:', taskEvents.length);

    // Debug: Visa tasks MED scheduled_start
    const scheduledTasks = tasks.filter(t => t.scheduled_start && t.status !== 'done');
    console.log('📅 [WeekCalendarView] Tasks with scheduled_start (filtered):', scheduledTasks.length);

    // Spara nuvarande vy
    if (scheduleRef.current) {
      currentViewRef.current = scheduleRef.current.currentView;
      currentDateRef.current = scheduleRef.current.selectedDate;
    }

    // Kombinera Microsoft events och task events
    const combinedEvents = [...msftEvents, ...taskEvents];
    console.log('Setting events. Total:', combinedEvents.length, 'MS events:', msftEvents.length, 'Task events:', taskEvents.length);
    setEvents(combinedEvents);

    // Force Schedule component to re-render by changing key
    setScheduleKey(prev => prev + 1);

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

  // Helper: Hitta lediga tidsluckor i kalendern
  interface TimeSlot {
    start: Date;
    end: Date;
    duration: number; // minuter
  }

  const findFreeTimeSlots = (startDate: Date, endDate: Date): TimeSlot[] => {
    const freeSlots: TimeSlot[] = [];
    const workStartHour = 8; // 08:00
    const workEndHour = 17; // 17:00

    // Gå igenom varje dag
    const currentDate = new Date(startDate);
    while (currentDate < endDate) {
      // Skippa helger
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Skapa arbetsdag (08:00-17:00)
      const dayStart = new Date(currentDate);
      dayStart.setHours(workStartHour, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(workEndHour, 0, 0, 0);

      // Hitta alla events denna dag
      const dayEvents = events
        .filter(e => {
          const eStart = new Date(e.StartTime);
          const eEnd = new Date(e.EndTime);
          return (eStart >= dayStart && eStart < dayEnd) ||
                 (eEnd > dayStart && eEnd <= dayEnd) ||
                 (eStart <= dayStart && eEnd >= dayEnd);
        })
        .sort((a, b) => new Date(a.StartTime).getTime() - new Date(b.StartTime).getTime());

      // Hitta luckor mellan events
      let currentTime = dayStart;
      for (const event of dayEvents) {
        const eventStart = new Date(event.StartTime);
        const eventEnd = new Date(event.EndTime);

        // Lucka före detta event?
        if (currentTime < eventStart) {
          const gapMinutes = (eventStart.getTime() - currentTime.getTime()) / 60000;
          if (gapMinutes >= 30) { // Minst 30 min lucka
            freeSlots.push({
              start: new Date(currentTime),
              end: new Date(eventStart),
              duration: gapMinutes
            });
          }
        }

        // Flytta currentTime till efter eventet
        if (eventEnd > currentTime) {
          currentTime = eventEnd;
        }
      }

      // Lucka efter sista eventet till dagens slut?
      if (currentTime < dayEnd) {
        const gapMinutes = (dayEnd.getTime() - currentTime.getTime()) / 60000;
        if (gapMinutes >= 30) {
          freeSlots.push({
            start: new Date(currentTime),
            end: new Date(dayEnd),
            duration: gapMinutes
          });
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return freeSlots;
  };

  // Helper: Hitta bästa slot för en task
  const findBestSlotForTask = (task: Task, freeSlots: TimeSlot[]): TimeSlot | null => {
    const duration = task.estimated_duration || 60;
    const now = new Date();

    // Filtrera slots som är tillräckligt långa
    let validSlots = freeSlots.filter(slot => slot.duration >= duration);

    // Om task har deadline, filtrera bort slots efter deadline
    if (task.deadline) {
      const deadline = new Date(task.deadline);
      validSlots = validSlots.filter(slot => slot.start < deadline);
    }

    // Filtrera bort slots i det förflutna
    validSlots = validSlots.filter(slot => slot.start > now);

    if (validSlots.length === 0) return null;

    // Prioritera morgon (08:00-12:00) för viktiga tasks (value_score >= 8)
    if (task.value_score >= 8) {
      const morningSlots = validSlots.filter(slot => {
        const hour = slot.start.getHours();
        return hour >= 8 && hour < 12;
      });
      if (morningSlots.length > 0) {
        validSlots = morningSlots;
      }
    }

    // Ta första tillgängliga slot (tidigast i tiden)
    const bestSlot = validSlots[0];

    return {
      start: bestSlot.start,
      end: new Date(bestSlot.start.getTime() + duration * 60000),
      duration
    };
  };

  // Helper: Validera om task kan slutföras innan deadline
  const validateDeadline = (task: Task, scheduledStart: Date): { isValid: boolean; message?: string; suggestedTime?: Date } => {
    if (!task.deadline) {
      return { isValid: true };
    }

    const deadline = new Date(task.deadline);
    const duration = task.estimated_duration || 60;
    const scheduledEnd = new Date(scheduledStart.getTime() + duration * 60000);

    // Kolla om tasken kommer slutföras EFTER deadline
    if (scheduledEnd > deadline) {
      // Hitta bättre tid (före deadline)
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const freeSlots = findFreeTimeSlots(now, oneWeekFromNow);
      const betterSlot = findBestSlotForTask(task, freeSlots);

      const deadlineStr = deadline.toLocaleString('sv-SE', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const suggestedStr = betterSlot ? betterSlot.start.toLocaleString('sv-SE', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : null;

      return {
        isValid: false,
        message: `⚠️ Task "${task.title}" kommer inte hinna slutföras innan deadline (${deadlineStr}).${suggestedStr ? ` Förslag: ${suggestedStr}` : ' Ingen ledig tid hittades.'}`,
        suggestedTime: betterSlot?.start
      };
    }

    // Varning om det är tajt (mindre än 2h marginal)
    const marginHours = (deadline.getTime() - scheduledEnd.getTime()) / (1000 * 60 * 60);
    if (marginHours < 2) {
      return {
        isValid: true,
        message: `⏰ Tätt inpå deadline! Task slutförs ${Math.round(marginHours * 60)} minuter före deadline.`
      };
    }

    return { isValid: true };
  };

  // Auto-schedule alla oplanerade tasks
  const handleAutoScheduleAll = async () => {
    if (!isMsftConnected) {
      toast.error('Anslut till Microsoft Kalender först');
      return;
    }

    // Filter: ej schemalagda tasks (samma logik som sidebar)
    const unscheduledTasks = tasks.filter(
      t => t.status !== 'done' && !t.scheduled_start && (t.estimated_duration || 999) > 2
    );

    if (unscheduledTasks.length === 0) {
      toast.error('Inga oplanerade uppgifter att schemalägga');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading(`Analyserar kalender och schemalägger ${unscheduledTasks.length} uppgifter...`);

    try {
      // 1. Sortera efter priority (högst först)
      const sortedTasks = [...unscheduledTasks].sort((a, b) =>
        (b.priority || 0) - (a.priority || 0)
      );

      console.log('Auto-scheduling tasks:', sortedTasks.map(t => ({
        title: t.title,
        priority: t.priority,
        duration: t.estimated_duration
      })));

      // 2. Hitta lediga tider (nästa 7 dagar)
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      let freeSlots = findFreeTimeSlots(now, nextWeek);

      console.log('Found free slots:', freeSlots.length);

      // 3. Placera tasks i lediga slots
      let scheduled = 0;
      let failedTasks: string[] = [];

      for (const task of sortedTasks) {
        const slot = findBestSlotForTask(task, freeSlots);

        if (slot) {
          try {
            // Boka i kalendern först
            await blockCalendarTime(
              slot.start,
              task.estimated_duration || 60,
              `🎯 Fokus: ${task.title}`
            );

            // Uppdatera task
            await updateTask(task.id, {
              scheduled_start: slot.start.toISOString()
            });

            scheduled++;
            console.log(`Scheduled: ${task.title} at ${slot.start.toISOString()}`);

            // Ta bort använd tid från freeSlots
            const slotIndex = freeSlots.indexOf(freeSlots.find(s => s.start === slot.start)!);
            if (slotIndex !== -1) {
              const originalSlot = freeSlots[slotIndex];
              freeSlots.splice(slotIndex, 1);

              // Lägg till resterande tid före och efter
              if (slot.start > originalSlot.start) {
                freeSlots.push({
                  start: originalSlot.start,
                  end: slot.start,
                  duration: (slot.start.getTime() - originalSlot.start.getTime()) / 60000
                });
              }
              if (slot.end < originalSlot.end) {
                freeSlots.push({
                  start: slot.end,
                  end: originalSlot.end,
                  duration: (originalSlot.end.getTime() - slot.end.getTime()) / 60000
                });
              }
              // Sortera om
              freeSlots.sort((a, b) => a.start.getTime() - b.start.getTime());
            }
          } catch (error) {
            console.error(`Failed to schedule ${task.title}:`, error);
            failedTasks.push(task.title);
          }
        } else {
          failedTasks.push(task.title);
        }
      }

      toast.dismiss(loadingToast);

      if (scheduled === sortedTasks.length) {
        toast.success(`✅ Schemalade ${scheduled} uppgifter automatiskt!`);
      } else if (scheduled > 0) {
        toast.success(`✅ Schemalade ${scheduled} av ${sortedTasks.length} uppgifter`);
        if (failedTasks.length > 0) {
          toast.error(`⚠️ ${failedTasks.length} uppgifter fick inte plats: ${failedTasks.slice(0, 2).join(', ')}${failedTasks.length > 2 ? '...' : ''}`);
        }
      } else {
        toast.error('❌ Kunde inte schemalägga några uppgifter. Ingen ledig tid i kalendern?');
      }

      // Uppdatera kalendern
      await loadMicrosoftEvents();

    } catch (error) {
      console.error('Auto-schedule error:', error);
      toast.dismiss(loadingToast);
      toast.error('Kunde inte schemalägga automatiskt');
    } finally {
      setLoading(false);
    }
  };

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

        // Task scheduled_start (när man drar task till ny tid i kalendern)
        if (calEvent.TaskId) {
          try {
            // Hitta task för deadline-validering
            const task = tasks.find(t => t.id === calEvent.TaskId);

            if (task) {
              // Validera deadline
              const validation = validateDeadline(task, calEvent.StartTime);

              if (!validation.isValid) {
                // Visa varning med förslag
                toast.error(validation.message || 'Task kan inte slutföras innan deadline', {
                  duration: 6000,
                });

                // Återställ till ursprunglig position (revert)
                await loadMicrosoftEvents();
                return;
              }

              // Visa varning om tajt (men tillåt)
              if (validation.message) {
                toast(validation.message, {
                  duration: 4000,
                  icon: '⚠️'
                });
              }
            }

            await updateTask(calEvent.TaskId, {
              scheduled_start: calEvent.StartTime.toISOString()
            });
            toast.success('Schemalagd tid uppdaterad!');
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
            await updateTask(calEvent.TaskId, { scheduled_start: undefined });
            toast.success('Task borttagen från schema!');
            // Supabase realtime uppdaterar automatiskt
          } catch (error) {
            console.error('Failed to remove task from schedule:', error);
            toast.error('Kunde inte ta bort från schema');
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
            // Hitta task för deadline-validering
            const task = tasks.find(t => t.id === calEvent.TaskId);

            if (task) {
              // Validera deadline
              const validation = validateDeadline(task, calEvent.StartTime);

              if (!validation.isValid) {
                // Visa varning med förslag
                toast.error(validation.message || 'Task kan inte slutföras innan deadline', {
                  duration: 6000,
                });

                // Återställ (revert)
                await loadMicrosoftEvents();
                return;
              }

              // Visa varning om tajt (men tillåt)
              if (validation.message) {
                toast(validation.message, {
                  duration: 4000,
                  icon: '⚠️'
                });
              }
            }

            await updateTask(calEvent.TaskId, {
              scheduled_start: calEvent.StartTime.toISOString()
            });
            toast.success('Task schemalagd!');
            // Supabase realtime uppdaterar automatiskt
          } catch (error) {
            console.error('Failed to schedule task:', error);
            toast.error('Kunde inte schemalägga task');
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

  // Funktion för att få veckonummer
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Custom date header template - visa "Mån 6/10 v.41"
  const dateHeaderTemplate = (props: any) => {
    const date = new Date(props.date);
    const dayNames = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
    const dayName = dayNames[date.getDay()];
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const weekNum = getWeekNumber(date);

    return (
      <div className="flex flex-col items-center justify-center" style={{ lineHeight: '1.1', padding: '2px 0' }}>
        <div style={{ fontSize: '12px', fontWeight: '500' }}>
          {dayName} {day}/{month}
        </div>
        <div style={{ fontSize: '9px', color: '#888', marginTop: '1px' }}>
          v.{weekNum}
        </div>
      </div>
    );
  };

  // Custom rendering av events
  const onEventRendered = (args: EventRenderedArgs) => {
    const eventData = args.data as CalendarEvent;

    // Sätt bakgrundsfärg
    if (args.element && eventData.CategoryColor) {
      args.element.style.backgroundColor = eventData.CategoryColor;
      args.element.style.borderColor = eventData.CategoryColor;
    }

    // Deadline-validering för visuell feedback
    if (args.element && eventData.TaskId) {
      const task = tasks.find(t => t.id === eventData.TaskId);
      if (task) {
        const validation = validateDeadline(task, eventData.StartTime);

        if (!validation.isValid) {
          // Röd tjock kant för invalid placements
          args.element.style.border = '3px solid #dc2626';
          args.element.style.boxShadow = '0 0 0 2px rgba(220, 38, 38, 0.2)';

          // Lägg till varningsikon
          const warningIcon = document.createElement('span');
          warningIcon.textContent = '⚠️';
          warningIcon.style.position = 'absolute';
          warningIcon.style.top = '2px';
          warningIcon.style.right = '2px';
          warningIcon.style.fontSize = '14px';
          args.element.style.position = 'relative';
          args.element.appendChild(warningIcon);
        } else if (validation.message) {
          // Orange kant för tight deadline (varning men OK)
          args.element.style.border = '2px solid #f59e0b';
          args.element.style.boxShadow = '0 0 0 1px rgba(245, 158, 11, 0.2)';
        }
      }
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
        await updateTask(extendedProps.taskId, { scheduled_start: undefined });
        toast.success('Task borttagen från schema!');
        setSelectedEvent(null);
        // Supabase realtime uppdaterar automatiskt
      } catch (error) {
        console.error('Failed to remove task from schedule:', error);
        toast.error('Kunde inte ta bort från schema');
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

  // Räkna oplanerade tasks
  const unscheduledTasks = tasks.filter(
    t => t.status !== 'done' && !t.scheduled_start && (t.estimated_duration || 999) > 2
  );

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Info box & Auto-schedule button */}
      <div className="flex items-center justify-between gap-4">
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

        {/* Auto-schedule button */}
        <Button
          onClick={handleAutoScheduleAll}
          variant="primary"
          disabled={loading || unscheduledTasks.length === 0}
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <Sparkles className="h-4 w-4" />
          🤖 Schemalägg {unscheduledTasks.length} oplanerade
        </Button>
      </div>

      {/* Syncfusion Scheduler */}
      <div className="flex-1 bg-white dark:bg-charcoal-850 rounded-xl p-4 border border-sand-200 dark:border-charcoal-800 overflow-hidden">
        <ScheduleComponent
          key={scheduleKey}
          ref={scheduleRef}
          height="100%"
          locale="sv"
          cssClass="prio-compact-schedule"
          firstDayOfWeek={1}
          startHour="00:00"
          endHour="24:00"
          timeScale={{ enable: true, interval: 60, slotCount: 1 }}
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
          dateHeaderTemplate={dateHeaderTemplate}
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
                    💡 Detta är när du planerar att JOBBA på uppgiften. Deadline (om satt) är när den ska vara KLAR.
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
                  {selectedEvent.extendedProps?.type === 'task' ? 'Ta bort från schema' : 'Ta bort'}
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
