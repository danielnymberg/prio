import { useState, useRef } from 'react';
import { KanbanComponent, ColumnsDirective, ColumnDirective, DragEventArgs } from '@syncfusion/ej2-react-kanban';
import { WeekCalendarView } from '@/components/calendar/WeekCalendarView';
import { useTasks } from '@/hooks/useTasks';
import { Task } from '@/lib/types';
import { TaskForm } from '@/components/tasks/TaskForm';
import { ToastComponent } from '@syncfusion/ej2-react-notifications';
import { toast } from 'react-hot-toast';
import { closest } from '@syncfusion/ej2-base';

export function KanbanCalendarView() {
  const { tasks, updateTask, deleteTask } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const scheduleRef = useRef<any>(null);
  const toastRef = useRef<ToastComponent>(null);

  // Konvertera tasks till Kanban-format
  const kanbanData = tasks
    .filter(t => (t.estimated_duration || 999) > 2) // Exkludera Snabbis
    .map(task => ({
      Id: task.id,
      Title: task.title,
      Status: task.status,
      Summary: task.description || '',
      Priority: task.priority,
      Tags: task.project_id ? [`Project: ${task.project_id}`] : [],
      Estimate: task.estimated_duration ? `${Math.round(task.estimated_duration / 60)}h` : '',
      Deadline: task.deadline ? new Date(task.deadline).toLocaleDateString('sv-SE') : '',
      Scheduled: task.scheduled_start ? '📅' : '',
      TaskData: task
    }));

  const cardTemplate = (props: any) => {
    return (
      <div className="e-card-content">
        <div className="e-card-header">
          <div className="e-card-header-title font-semibold flex items-center justify-between">
            <span>{props.Title}</span>
            {props.Scheduled && <span className="text-xs">📅</span>}
          </div>
        </div>
        {props.Summary && (
          <div className="e-card-content-description text-sm text-stone-600 dark:text-stone-400 mt-2">
            {props.Summary.substring(0, 80)}{props.Summary.length > 80 ? '...' : ''}
          </div>
        )}
        <div className="flex items-center justify-between mt-3 text-xs flex-wrap gap-1">
          {props.Estimate && (
            <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              ⏱️ {props.Estimate}
            </span>
          )}
          {props.Deadline && (
            <span className="px-2 py-1 rounded bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
              📅 {props.Deadline}
            </span>
          )}
          {props.Priority && (
            <span className="px-2 py-1 rounded bg-copper-100 dark:bg-copper-900 text-copper-700 dark:text-copper-300 font-semibold">
              {Math.round(props.Priority)}
            </span>
          )}
        </div>
      </div>
    );
  };

  const onCardClick = (args: any) => {
    const taskId = args.data.Id;
    const fullTask = tasks.find(t => t.id === taskId);

    if (fullTask) {
      setSelectedTask(fullTask);
      setIsFormOpen(true);
    }
  };

  const onDragStop = async (args: DragEventArgs) => {
    // Kolla om släppt på kalendern
    const scheduleElement = closest(args.event.target as Element, '.e-schedule');

    if (scheduleElement && scheduleRef.current) {
      // Släppt på kalendern - schemalägg task
      args.cancel = true;

      const target = args.event.target as HTMLElement;
      console.log('🎯 [Kanban] Dropped on calendar, target:', target.className);

      if (target.classList.contains('e-work-cells')) {
        const cellData = scheduleRef.current.getCellDetails(target);
        console.log('🎯 [Kanban] Cell data:', cellData);

        if (cellData && args.data && args.data.length > 0) {
          const card = args.data[0];
          const taskId = card.Id;
          const originalTask = tasks.find(t => t.id === taskId);

          console.log('🎯 [Kanban] Card:', card);
          console.log('🎯 [Kanban] Original task:', originalTask);

          if (originalTask) {
            let scheduledTime = new Date(cellData.startTime);

            // I månadsvy - använd 08:00 som default
            if (scheduleRef.current.currentView === 'Month') {
              scheduledTime.setHours(8, 0, 0, 0);
              console.log('🎯 [Kanban] Month view - setting time to 08:00');
            }

            const previousStart = originalTask.scheduled_start || null;

            console.log('⏰ [Kanban] Scheduling task:', taskId, 'to:', scheduledTime.toISOString());
            console.log('⏰ [Kanban] Original task before update:', originalTask);

            try {
              const result = await updateTask(taskId, {
                scheduled_start: scheduledTime.toISOString()
              });

              if (result) {
                console.log('✅ [Kanban] Task scheduled successfully!', {
                  id: result.id,
                  title: result.title,
                  scheduled_start: result.scheduled_start,
                  status: result.status,
                  estimated_duration: result.estimated_duration
                });

                showUndoToast(originalTask.title, taskId, previousStart);

                // Force calendar refresh
                if (scheduleRef.current) {
                  console.log('🔄 [Kanban] Forcing calendar refresh...');
                  setTimeout(() => {
                    scheduleRef.current?.refresh();
                    console.log('🔄 [Kanban] Calendar refresh() called');
                  }, 100);
                }
              } else {
                console.error('❌ [Kanban] updateTask returned null - operation failed');
                toast.error('Kunde inte schemalägga task - serverfel');
              }
            } catch (error) {
              console.error('❌ [Kanban] Failed to schedule task:', error);
              toast.error('Kunde inte schemalägga task');
            }
          } else {
            console.error('❌ [Kanban] Could not find original task for ID:', taskId);
          }
        } else {
          console.error('❌ [Kanban] No cell data or card data');
        }
      } else {
        console.error('❌ [Kanban] Target is not e-work-cells:', target.className);
      }
    } else if (args.data && args.data.length > 0) {
      // Släppt inom Kanban - uppdatera status
      const card = args.data[0];
      const newStatus = card.Status;
      const taskId = card.Id;

      console.log('🎯 [Kanban] Dropped within Kanban - updating status to:', newStatus);
      await updateTask(taskId, { status: newStatus });
    }
  };

  const showUndoToast = (taskTitle: string, taskId: string, previousStart: string | null | undefined) => {
    if (toastRef.current) {
      toastRef.current.show({
        title: '✓ Task schemalagd',
        content: `"${taskTitle}" har lagts till i kalendern`,
        cssClass: 'e-toast-success',
        timeOut: 5000,
        buttons: [{
          model: { content: 'Ångra' },
          click: async () => {
            await updateTask(taskId, { scheduled_start: previousStart || undefined });
            toast.success('Schemaläggning ångrad');
          }
        }]
      });
    }
  };

  const setScheduleRef = (ref: any) => {
    scheduleRef.current = ref;
  };

  return (
    <div className="flex h-full gap-4 relative" id="kanban-calendar-container">
      {/* Kanban board */}
      <div className="w-1/3 flex-shrink-0">
        <div className="h-full bg-white dark:bg-charcoal-850 rounded-xl border border-sand-200 dark:border-charcoal-800 p-4 flex flex-col">
          <h2 className="text-lg font-semibold mb-4 text-stone-900 dark:text-cream-50 flex-shrink-0">
            Uppgifter
          </h2>
          <div className="flex-1 min-h-0" style={{ display: 'flex', flexDirection: 'column' }}>
            <KanbanComponent
              id="kanban-board"
              dataSource={kanbanData}
              keyField="Status"
              cardSettings={{
                contentField: 'Summary',
                headerField: 'Title',
                template: cardTemplate
              }}
              dialogSettings={{ fields: [] }}
              cardClick={onCardClick}
              dragStop={onDragStop}
              allowDragAndDrop={true}
              externalDropId={['#kanban-calendar-container']}
              style={{ height: '100%' }}
            >
            <ColumnsDirective>
              <ColumnDirective
                headerText="📋 Ej påbörjad"
                keyField="not_started"
                allowToggle={true}
              />
              <ColumnDirective
                headerText="🚀 Pågående"
                keyField="in_progress"
                allowToggle={true}
              />
              <ColumnDirective
                headerText="✅ Klar"
                keyField="done"
                allowToggle={true}
              />
            </ColumnsDirective>
          </KanbanComponent>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <WeekCalendarView
          onScheduleReady={setScheduleRef}
          tasks={tasks}
          updateTask={updateTask}
        />
      </div>

      {/* Task detail modal */}
      <TaskForm
        isOpen={isFormOpen}
        task={selectedTask}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedTask(undefined);
        }}
        onSubmit={async (input) => {
          if (selectedTask) {
            await updateTask(selectedTask.id, input);
          }
          setIsFormOpen(false);
          setSelectedTask(undefined);
        }}
        onDelete={async (id) => {
          await deleteTask(id);
          setIsFormOpen(false);
          setSelectedTask(undefined);
          return true;
        }}
      />

      {/* Toast notifications with undo */}
      <ToastComponent
        ref={toastRef}
        position={{ X: 'Right', Y: 'Bottom' }}
        newestOnTop={true}
      />
    </div>
  );
}
