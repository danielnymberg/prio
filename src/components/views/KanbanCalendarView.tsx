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
      <div className="e-p-12">
        <div className="e-mb-8">
          <div className="e-font-semibold e-flex e-align-center e-justify-between">
            <span>{props.Title}</span>
            {props.Scheduled && <span className="e-text-xs">📅</span>}
          </div>
        </div>
        {props.Summary && (
          <div className="e-text-sm e-mt-8 e-opacity-75" style={{ color: 'var(--e-text)' }}>
            {props.Summary.substring(0, 80)}{props.Summary.length > 80 ? '...' : ''}
          </div>
        )}
        <div className="e-flex e-align-center e-justify-between e-mt-12 e-text-xs e-flex-wrap e-gap-4">
          {props.Estimate && (
            <span className="e-rounded" style={{ padding: '4px 8px', backgroundColor: 'var(--primary-500)', color: '#fff' }}>
              ⏱️ {props.Estimate}
            </span>
          )}
          {props.Deadline && (
            <span className="e-rounded" style={{ padding: '4px 8px', backgroundColor: 'var(--warning-500)', color: '#fff' }}>
              📅 {props.Deadline}
            </span>
          )}
          {props.Priority && (
            <span className="e-rounded e-font-semibold" style={{ padding: '4px 8px', backgroundColor: 'var(--primary-500)', color: '#fff' }}>
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
            let startTime = new Date(cellData.startTime);

            // I månadsvy - använd 08:00 som default
            if (scheduleRef.current.currentView === 'Month') {
              startTime.setHours(8, 0, 0, 0);
              console.log('🎯 [Kanban] Month view - setting time to 08:00');
            }

            const previousStart = originalTask.scheduled_start || null;
            const durationMinutes = originalTask.estimated_duration || 30;

            // Skapa event-objekt för Schedule (som sedan sparas via adaptor)
            const eventData = {
              Id: `task-${taskId}`,
              Subject: `📌 ${originalTask.title}`,
              StartTime: startTime,
              EndTime: new Date(startTime.getTime() + durationMinutes * 60 * 1000),
              IsReadonly: false,
              CategoryColor: '#dc2626',
              EventType: 'task',
              TaskId: taskId,
            };

            console.log('🎯 [Kanban] Adding event via Schedule.addEvent():', eventData);

            // Använd Syncfusion addEvent - detta triggar adaptor.insert() automatiskt!
            scheduleRef.current.addEvent(eventData);

            // Show undo toast
            showUndoToast(originalTask.title, taskId, previousStart);
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
    <div className="e-flex e-h-full e-gap-16 e-relative" id="kanban-calendar-container">
      {/* Kanban board */}
      <div style={{ width: '33.333%', flexShrink: 0 }}>
        <div className="e-h-full e-border e-rounded-lg e-p-16 e-flex e-flex-column" style={{ background: 'var(--e-surface)' }}>
          <h2 className="e-text-lg e-font-semibold e-mb-16 e-flex-none" style={{ color: 'var(--e-text)' }}>
            Uppgifter
          </h2>
          <div className="e-flex-1 e-flex e-flex-column" style={{ minHeight: 0 }}>
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
      <div className="e-flex-1 e-overflow-hidden" style={{ minWidth: 0 }}>
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
