import { useState, useRef, useEffect } from 'react';
import { WeekCalendarView } from './WeekCalendarView';
import { useTasks } from '@/hooks/useTasks';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { TreeViewComponent, DragAndDropEventArgs } from '@syncfusion/ej2-react-navigations';
import { closest } from '@syncfusion/ej2-base';
import { TaskForm } from '@/components/tasks/TaskForm';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { Task } from '@/lib/types';
import { DialogUtility } from '@syncfusion/ej2-popups';
import { ToastComponent } from '@syncfusion/ej2-react-notifications';
import { toast } from 'react-hot-toast';

export function CalendarWithTaskSidebar() {
  const { tasks, updateTask, deleteTask } = useTasks();
  const [showSidebar, setShowSidebar] = useState(true);
  const scheduleRef = useRef<any>(null);
  const toastRef = useRef<ToastComponent>(null);
  const [treeData, setTreeData] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [checkedTaskIds, setCheckedTaskIds] = useState<string[]>([]);

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

  // Hantera click på task i sidebar - öppna task-modal
  const onNodeClick = (args: any) => {
    const clickedId = args.node?.dataset?.uid;

    if (clickedId) {
      // Hitta task baserat på Id
      const fullTask = tasks.find(t => t.id === clickedId);

      if (fullTask) {
        setSelectedTask(fullTask);
        setIsFormOpen(true);
      }
    }
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
    <div style={{ display: 'flex', height: '100%', gap: '1rem', position: 'relative', overflow: 'hidden' }}>
      {/* Sidebar med tasks */}
      <div
        style={{
          width: showSidebar ? '320px' : '0',
          flexShrink: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s'
        }}
      >
        <div style={{
          height: '100%',
          backgroundColor: 'var(--e-surface)',
          borderRadius: '12px',
          border: '1px solid var(--e-border)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ marginBottom: '1rem', flexShrink: 0 }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: 'var(--e-text)',
              marginBottom: '0.5rem'
            }}>
              Ej schemalagt
            </h3>
            <p style={{
              fontSize: '0.75rem',
              color: 'var(--e-text-secondary)',
              marginBottom: '0.5rem'
            }}>
              Dra uppgifter till kalendern för att planera när du ska jobba på dem. Klicka för detaljer.
            </p>
            <p style={{
              fontSize: '0.75rem',
              color: 'var(--e-text-secondary)',
              fontStyle: 'italic',
              marginBottom: '0.25rem'
            }}>
              📊 Sorterade efter priority (högst först)
            </p>
            <p style={{
              fontSize: '0.75rem',
              color: 'var(--e-text-secondary)',
              fontStyle: 'italic'
            }}>
              💡 För att ta bort från schema: Klicka på uppgift i kalendern → "Ta bort från schema"
            </p>

            {/* Batch scheduling button */}
            {checkedTaskIds.length > 0 && (
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Button
                  onClick={() => {
                    const selectedTasks = tasks.filter(t => checkedTaskIds.includes(t.id));
                    const totalMinutes = selectedTasks.reduce((sum, t) => sum + (t.estimated_duration || 60), 0);
                    const hours = Math.floor(totalMinutes / 60);
                    const mins = totalMinutes % 60;

                    DialogUtility.confirm({
                      title: `Schemalägg ${checkedTaskIds.length} uppgifter?`,
                      content: `<div style="display: flex; flex-direction: column; gap: 0.5rem">
                        <p><strong>Valda tasks:</strong></p>
                        <ul style="font-size: 0.875rem; list-style: disc; padding-left: 1.25rem">
                          ${selectedTasks.slice(0, 3).map(t => `<li>${t.title} (~${Math.round((t.estimated_duration || 60)/60)}h)</li>`).join('')}
                          ${selectedTasks.length > 3 ? `<li><em>...och ${selectedTasks.length - 3} till</em></li>` : ''}
                        </ul>
                        <p style="font-size: 0.875rem; margin-top: 0.5rem"><strong>Total tid:</strong> ${hours}h ${mins}min</p>
                        <p style="font-size: 0.875rem; color: var(--e-text-secondary)">Tasks kommer placeras i nästa lediga tider, sorterade efter prioritet.</p>
                      </div>`,
                      okButton: {
                        text: '✓ Schemalägg',
                        click: () => {
                          // Trigger auto-schedule
                          if (scheduleRef.current?.handleAutoScheduleSelected) {
                            scheduleRef.current.handleAutoScheduleSelected(checkedTaskIds);
                          }
                          setCheckedTaskIds([]);
                        }
                      },
                      cancelButton: { text: '✗ Avbryt' },
                      cssClass: 'e-dlg-center',
                      width: '450px'
                    });
                  }}
                  variant="primary"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Calendar style={{ height: '1rem', width: '1rem' }} />
                  {`Schemalägg ${checkedTaskIds.length} valda`}
                </Button>
                <button
                  onClick={() => setCheckedTaskIds([])}
                  style={{
                    width: '100%',
                    fontSize: '0.75rem',
                    color: 'var(--e-text-secondary)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Rensa urval
                </button>
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }} id="tree-container">
            {treeData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--e-text-secondary)' }}>
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
                showCheckBox={true}
                autoCheck={false}
                checkedNodes={checkedTaskIds}
                nodeChecked={(args: any) => {
                  // args.data innehåller array av checkade nodes
                  const checked = args.data?.map((node: any) => node.id || node.Id) || [];
                  setCheckedTaskIds(checked);
                }}
                nodeTemplate={(data: any) => (
                  <div style={{
                    padding: '0.5rem',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    transition: 'background-color 0.2s'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{
                        fontWeight: '500',
                        fontSize: '0.875rem',
                        color: 'var(--e-text)',
                        flex: 1,
                        minWidth: 0,
                        wordBreak: 'break-word'
                      }}>
                        {data.Name}
                      </div>
                      {data.Priority !== undefined && (
                        <div style={{
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: 'var(--copper-400)',
                          color: 'var(--charcoal-900)',
                          flexShrink: 0
                        }}>
                          {data.Priority}
                        </div>
                      )}
                    </div>
                    {data.Duration && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--e-text-secondary)',
                        marginTop: '0.25rem'
                      }}>
                        ~{Math.round(data.Duration / 60)}h
                      </div>
                    )}
                  </div>
                )}
              />
            )}
          </div>
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        style={{
          position: 'absolute',
          left: showSidebar ? '320px' : '0px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          backgroundColor: 'var(--e-surface)',
          border: '1px solid var(--e-border)',
          borderRadius: '0 8px 8px 0',
          padding: '0.5rem',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
          cursor: 'pointer',
          transition: 'left 0.3s'
        }}
      >
        {showSidebar ? (
          <ChevronLeft style={{ height: '1rem', width: '1rem', color: 'var(--e-text-secondary)' }} />
        ) : (
          <ChevronRight style={{ height: '1rem', width: '1rem', color: 'var(--e-text-secondary)' }} />
        )}
      </button>

      {/* Kalendervy */}
      <div style={{ flex: 1, minWidth: 0 }}>
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
