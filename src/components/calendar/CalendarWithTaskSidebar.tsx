import { useState, useRef, useEffect } from 'react';
import { WeekCalendarView } from './WeekCalendarView';
import { useTasks } from '@/hooks/useTasks';
import { TreeViewComponent, DragAndDropEventArgs } from '@syncfusion/ej2-react-navigations';
import { closest } from '@syncfusion/ej2-base';
import { ToastComponent } from '@syncfusion/ej2-react-notifications';
import { toast } from 'react-hot-toast';

export function CalendarWithTaskSidebar() {
  const { tasks, updateTask } = useTasks();
  // const [showSidebar, setShowSidebar] = useState(true);
  const scheduleRef = useRef<any>(null);
  const toastRef = useRef<ToastComponent>(null);
  const [treeData, setTreeData] = useState<any[]>([]);

  // Ej schemalagda uppgifter (uppgifter utan scheduled_start som kan dras till kalendern)
  // Exkludera Snabbis (≤2 min) från kalenderplanering
  const unscheduledTasks = tasks.filter(
    (t) => t.status !== 'done' && !t.scheduled_start && (t.estimated_duration || 999) > 2
  );

  // Uppdatera TreeView data när tasks ändras
  useEffect(() => {
    const updatedTreeData = unscheduledTasks.map((task) => ({
      Id: task.id,
      Name: task.title,
      Duration: task.estimated_duration || 30,
      Priority: Math.round(task.priority),
      TaskId: task.id,
    }));
    setTreeData(updatedTreeData);
  }, [tasks]);

  // TreeView fields config
  const fields = {
    dataSource: treeData,
    id: 'Id',
    text: 'Name',
  };

  console.log('TreeView data sample:', treeData[0]);

  // Handle drag stop - när task släpps på kalendern
  const onTreeDragStop = (args: DragAndDropEventArgs): void => {
    const treeElement = closest(args.target as Element, '.e-treeview');

    // Om släppt utanför TreeView
    if (!treeElement) {
      args.cancel = true;

      const scheduleElement = closest(args.target as Element, '.e-content-wrap');

      if (scheduleElement) {
        // Hitta vilken cell som droppades på
        const target = args.target as HTMLElement;

        if (target.classList.contains('e-work-cells') && scheduleRef.current) {
          const cellData = scheduleRef.current.getCellDetails(target);

          console.log('Cell data from getCellDetails:', cellData);
          console.log('Target element:', target);
          console.log('Schedule current view:', scheduleRef.current.currentView);

          if (cellData && args.draggedNodeData) {
            // Hämta task data
            const draggedData = args.draggedNodeData as any;
            console.log('🎯 [Sidebar] Dragged node data:', draggedData);

            // Hitta rätt task från treeData (draggedNodeData innehåller bara id/text)
            const taskData = treeData.find(t => t.Id === draggedData.id || t.Id === draggedData.Id);

            if (taskData) {
              console.log('🎯 [Sidebar] RAW cellData.startTime:', cellData.startTime);
              console.log('🎯 [Sidebar] Current view:', scheduleRef.current.currentView);

              // I månadsvy - använd klockan 08:00 som default
              let startTime = new Date(cellData.startTime);
              if (scheduleRef.current.currentView === 'Month') {
                startTime.setHours(8, 0, 0, 0);
                console.log('🎯 [Sidebar] Month view detected - setting time to 08:00');
              }

              // Hitta original task för duration och undo
              const originalTask = tasks.find(t => t.id === taskData.TaskId);
              const previousStart = originalTask?.scheduled_start || null;
              const durationMinutes = originalTask?.estimated_duration || 30;

              // Skapa event-objekt för Schedule (som sedan sparas via adaptor)
              const eventData = {
                Id: `task-${taskData.TaskId}`,
                Subject: `📌 ${taskData.Name}`,
                StartTime: startTime,
                EndTime: new Date(startTime.getTime() + durationMinutes * 60 * 1000),
                IsReadonly: false,
                CategoryColor: '#dc2626',
                EventType: 'task',
                TaskId: taskData.TaskId,
              };

              console.log('🎯 [Sidebar] Adding event via Schedule.addEvent():', eventData);

              // Använd Syncfusion addEvent - detta triggar adaptor.insert() automatiskt!
              scheduleRef.current.addEvent(eventData);

              // Show undo toast
              if (originalTask) {
                showUndoToast(originalTask.title, taskData.TaskId, previousStart);
              }
            } else {
              console.error('❌ [Sidebar] Could not find task data for dragged node:', draggedData);
            }
          }
        }
      }
    }
  };

  // Hantera click på task i sidebar
  const onNodeClick = (_: any) => {
    // TaskForm removed
  };

  // Sätt schedule ref från child
  const setScheduleRef = (ref: any) => {
    scheduleRef.current = ref;
  };

  // Show toast with undo functionality
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
            // Ångra schemanläggning
            await updateTask(taskId, { scheduled_start: previousStart || undefined });
            toast.success('Schemaläggning ångrad');
          }
        }]
      });
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', gap: '16px' }}>
      {/* Sidebar med tasks */}
      {/* <div
        style={{
          width: showSidebar ? '320px' : '0',
          flexShrink: 0,
          transition: 'all 0.3s',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      > */}
        <div className="e-card" style={{ width: '320px', flexShrink: 0 }}>
          <div className="e-card-header">
            <div className="e-card-title">Ej schemalagt</div>
            {/* <button
              onClick={() => setShowSidebar(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span className="e-icons e-close e-small" style={{ fontSize: '12px', color: 'var(--color-sf-black)', opacity: 0.6 }}></span>
            </button> */}
          </div>
          {/* <div className="e-card-content" style={{ padding: '12px 16px 16px 16px', flexShrink: 0 }}>
            <p style={{ fontSize: '12px', color: 'var(--color-sf-black)', opacity: 0.6, margin: 0 }}>
              Dra uppgifter till kalendern för att schemalägga. Sorterade efter prioritet.
            </p>
          </div> */}

          {/* <div style={{ flex: '1', overflowY: 'auto', padding: '0 16px 16px 16px' }} id="tree-container"> */}
          <div className="e-card-content">
            {treeData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ fontSize: '14px', color: 'var(--color-sf-black)', opacity: 0.6 }}>
                  Alla uppgifter är schemalagda! 🎉
                </p>
              </div>
            ) : (
              <TreeViewComponent
                fields={fields}
                allowDragAndDrop={true}
                dragArea="[style*='display: flex'][style*='height: 100%']"
                nodeDragStop={onTreeDragStop}
                nodeClicked={onNodeClick}
                nodeTemplate={(data: any) => (
                  <div>
                    {data.Name}
                    {data.Priority !== undefined && ` (${data.Priority})`}
                    {data.Duration && ` · ${Math.round(data.Duration / 60)}h`}
                  </div>
                )}
              />
            )}
          </div>
        </div>
      {/* </div> */}

      {/* Toggle button */}
      {/* {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          style={{
            position: 'absolute',
            zIndex: 10,
            left: '0px',
            top: '50%',
            transform: 'translateY(-50%)',
            backgroundColor: 'var(--color-sf-white)',
            border: '1px solid var(--color-sf-border-light)',
            borderRadius: '0 8px 8px 0',
            padding: '8px',
            cursor: 'pointer',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
          }}
        >
          <span className="e-icons e-chevron-right e-small" style={{ fontSize: '12px', color: 'var(--color-sf-black)', opacity: 0.6 }}></span>
        </button>
      )} */}

      {/* Kalendervy */}
      <div style={{ flex: '1', minWidth: '0' }}>
        <WeekCalendarView
          onScheduleReady={setScheduleRef}
          tasks={tasks}
          updateTask={updateTask}
        />
      </div>

      {/* Toast notifications with undo */}
      <ToastComponent
        ref={toastRef}
        position={{ X: 'Right', Y: 'Bottom' }}
        newestOnTop={true}
      />
    </div>
  );
}
