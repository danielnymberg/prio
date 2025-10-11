import { useState, useEffect, useRef } from 'react';
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
import { DataManager } from '@syncfusion/ej2-data';
import { L10n, loadCldr, setCulture } from '@syncfusion/ej2-base';
import { SupabaseAdaptor } from '@/lib/SupabaseAdaptor';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';

// Import CLDR data för svensk kultur
import * as numberingSystems from 'cldr-data/supplemental/numberingSystems.json';
import * as gregorian from 'cldr-data/main/sv/ca-gregorian.json';
import * as numbers from 'cldr-data/main/sv/numbers.json';
import * as timeZoneNames from 'cldr-data/main/sv/timeZoneNames.json';

// Ladda CLDR-data
loadCldr(numberingSystems, gregorian, numbers, timeZoneNames);
setCulture('sv');

// Svensk lokalisering
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
      'save': 'Spara',
      'newEvent': 'Ny händelse',
      'title': 'Titel',
    }
  }
});

interface WeekCalendarViewProps {
  onScheduleReady?: (scheduleInstance: ScheduleComponent | null) => void;
  tasks?: any[]; // UNUSED - vi använder DataManager nu istället
  updateTask?: any; // UNUSED - vi använder DataManager nu istället
}

export function WeekCalendarView({ onScheduleReady }: WeekCalendarViewProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const scheduleRef = useRef<ScheduleComponent>(null);
  const [dataManager, setDataManager] = useState<DataManager | null>(null);

  // Skapa DataManager med SupabaseAdaptor
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    console.log('🔷 [WeekCalendarView NEW] Creating DataManager with SupabaseAdaptor');

    const adaptor = new SupabaseAdaptor(user.id);
    const dm = new DataManager({
      adaptor: adaptor,
      offline: false // Vi vill alltid hämta från Supabase
    });

    setDataManager(dm);
    setLoading(false);

    // Lyssna på Supabase realtime changes för att refresha kalendern
    const subscription = supabase
      .channel('calendar_tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔷 [WeekCalendarView NEW] Realtime change detected:', payload);

          // Refresha Schedule för att hämta ny data
          if (scheduleRef.current) {
            console.log('🔷 [WeekCalendarView NEW] Refreshing schedule...');
            scheduleRef.current.refreshEvents();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Exponera schedule ref till parent
  useEffect(() => {
    if (scheduleRef.current && onScheduleReady) {
      onScheduleReady(scheduleRef.current);
    }
  }, [scheduleRef.current, onScheduleReady]);

  // Event settings för Syncfusion - använd DataManager
  const eventSettings: EventSettingsModel = {
    dataSource: dataManager || [],
    fields: {
      id: 'Id',
      subject: { name: 'Subject' },
      startTime: { name: 'StartTime' },
      endTime: { name: 'EndTime' },
      isReadonly: { name: 'IsReadonly' },
    } as any,
  };

  // Hantera CRUD-operationer (Syncfusion anropar adaptor automatiskt!)
  const onActionComplete = async (args: ActionEventArgs) => {
    console.log('🔷 [WeekCalendarView NEW] Action complete:', args.requestType);

    if (args.requestType === 'eventCreated') {
      toast.success('Task schemalagd!');
    } else if (args.requestType === 'eventChanged') {
      toast.success('Schemalagd tid uppdaterad!');
    } else if (args.requestType === 'eventRemoved') {
      toast.success('Task borttagen från schema!');
    }
  };

  // Blockera default popups
  const onPopupOpen = (args: PopupOpenEventArgs) => {
    if (args.type === 'QuickInfo' || args.type === 'Editor' || args.type === 'DeleteAlert') {
      args.cancel = true;
    }
  };

  // Custom rendering av events
  const onEventRendered = (args: EventRenderedArgs) => {
    const eventData = args.data as any;

    if (args.element && eventData.CategoryColor) {
      args.element.style.backgroundColor = eventData.CategoryColor;
      args.element.style.borderColor = eventData.CategoryColor;
    }
  };

  // Veckonummer helper
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Custom date header template
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

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-white dark:bg-charcoal-850 rounded-xl p-8 max-w-md text-center border border-sand-200 dark:border-charcoal-800">
          <AlertCircle className="h-12 w-12 text-copper-600 dark:text-copper-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-stone-900 dark:text-cream-50 mb-2">
            Ingen användare inloggad
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs text-stone-600 dark:text-stone-400 bg-sand-50 dark:bg-charcoal-900 rounded-lg p-3 border border-sand-200 dark:border-charcoal-800">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>Schemalagda tasks</span>
          </div>
        </div>
      </div>

      {/* Syncfusion Scheduler med DataManager */}
      <div className="flex-1 bg-white dark:bg-charcoal-850 rounded-xl p-4 border border-sand-200 dark:border-charcoal-800 overflow-hidden">
        <ScheduleComponent
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
          eventRendered={onEventRendered}
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
    </div>
  );
}
