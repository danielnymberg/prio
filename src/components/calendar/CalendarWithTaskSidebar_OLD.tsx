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
            console.log('Dragged node data:', draggedData);

            // Hitta rätt task från treeData (draggedNodeData innehåller bara id/text)
            const taskData = treeData.find(t => t.Id === draggedData.id || t.Id === draggedData.Id);

            if (taskData) {
              console.log('RAW cellData.startTime:', cellData.startTime);
              console.log('Current view:', scheduleRef.current.currentView);

              // I månadsvy - använd klockan 08:00 som default
              let deadline = new Date(cellData.startTime);
              if (scheduleRef.current.currentView === 'Month') {
                deadline.setHours(8, 0, 0, 0);
                console.log('Month view detected - setting time to 08:00');
              }

              console.log('Final scheduled_start:', deadline.toISOString());
              console.log('Updating task:', taskData.TaskId, 'with scheduled_start:', deadline.toISOString());

              // Hitta original task för att få previous state
              const originalTask = tasks.find(t => t.id === taskData.TaskId);
              const previousStart = originalTask?.scheduled_start || null;

              // Sätt scheduled_start på tasken (INTE deadline - deadline är när det ska vara KLART)
              console.log('⏰ Scheduling task:', taskData.TaskId, 'to:', deadline.toISOString());
              console.log('⏰ Original task before update:', originalTask);

              updateTask(taskData.TaskId, {
                scheduled_start: deadline.toISOString()
              }).then((result) => {
                if (result) {
                  console.log('✅ Task scheduled successfully!', {
                    id: result.id,
                    title: result.title,
                    scheduled_start: result.scheduled_start,
                    status: result.status,
                    estimated_duration: result.estimated_duration
                  });

                  // Show undo toast
                  showUndoToast(result.title, result.id, previousStart);

                  // Ingen calendar refresh behövs - useTasks realtime uppdatering + useEffect kommer trigga automatiskt
                } else {
                  console.error('❌ updateTask returned null - operation failed');
                  toast.error('Kunde inte schemalägga task - serverfel');
                }
              }).catch((error) => {
                console.error('❌ FAILED to schedule task:', error);
                toast.error(`Kunde inte schemalägga task: ${error.message || 'Okänt fel'}`);
              });
            } else {
              console.error('CRITICAL: Could not find task data for dragged node:', draggedData);
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
    <div className="flex h-full gap-4 relative overflow-hidden">
      {/* Sidebar med tasks */}
      <div
        className={`transition-all duration-300 ${
          showSidebar ? 'w-80' : 'w-0'
        } flex-shrink-0 overflow-hidden flex flex-col`}
      >
        <div className="h-full bg-white dark:bg-charcoal-850 rounded-xl border border-sand-200 dark:border-charcoal-800 p-4 flex flex-col overflow-hidden">
          <div className="mb-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-stone-900 dark:text-cream-50 mb-2">
              Ej schemalagt
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mb-2">
              Dra uppgifter till kalendern för att planera när du ska jobba på dem. Klicka för detaljer.
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-500 italic mb-1">
              📊 Sorterade efter priority (högst först)
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-500 italic">
              💡 För att ta bort från schema: Klicka på uppgift i kalendern → "Ta bort från schema"
            </p>

            {/* Batch scheduling button */}
            {checkedTaskIds.length > 0 && (
              <div className="mt-3 space-y-2">
                <Button
                  onClick={() => {
                    const selectedTasks = tasks.filter(t => checkedTaskIds.includes(t.id));
                    const totalMinutes = selectedTasks.reduce((sum, t) => sum + (t.estimated_duration || 60), 0);
                    const hours = Math.floor(totalMinutes / 60);
                    const mins = totalMinutes % 60;

                    DialogUtility.confirm({
                      title: `Schemalägg ${checkedTaskIds.length} uppgifter?`,
                      content: `<div class="space-y-2">
                        <p><strong>Valda tasks:</strong></p>
                        <ul class="text-sm list-disc pl-5">
                          ${selectedTasks.slice(0, 3).map(t => `<li>${t.title} (~${Math.round((t.estimated_duration || 60)/60)}h)</li>`).join('')}
                          ${selectedTasks.length > 3 ? `<li><em>...och ${selectedTasks.length - 3} till</em></li>` : ''}
                        </ul>
                        <p class="text-sm mt-2"><strong>Total tid:</strong> ${hours}h ${mins}min</p>
                        <p class="text-sm text-stone-600">Tasks kommer placeras i nästa lediga tider, sorterade efter prioritet.</p>
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
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  {`Schemalägg ${checkedTaskIds.length} valda`}
                </Button>
                <button
                  onClick={() => setCheckedTaskIds([])}
                  className="w-full text-xs text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
                >
                  Rensa urval
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto" id="tree-container">
            {treeData.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Alla uppgifter är schemalagda! 🎉
                </p>
              </div>
            ) : (
              <TreeViewComponent
                fields={fields}
                allowDragAndDrop={true}
                dragArea=".flex.h-full.gap-4"
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
                  <div className="p-2 cursor-pointer hover:bg-sand-50 dark:hover:bg-charcoal-800 rounded transition-colors">
                    <div className="flex items-start gap-2">
                      <div className="font-medium text-sm text-stone-900 dark:text-cream-50 flex-1 min-w-0 break-words">
                        {data.Name}
                      </div>
                      {data.Priority !== undefined && (
                        <div className="text-xs font-semibold px-2 py-0.5 rounded bg-copper-100 dark:bg-copper-900 text-copper-700 dark:text-copper-300 flex-shrink-0">
                          {data.Priority}
                        </div>
                      )}
                    </div>
                    {data.Duration && (
                      <div className="text-xs text-stone-600 dark:text-stone-400 mt-1">
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
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-charcoal-850 border border-sand-200 dark:border-charcoal-800 rounded-r-lg p-2 shadow-lg hover:bg-sand-50 dark:hover:bg-charcoal-800 transition-colors"
        style={{ left: showSidebar ? '320px' : '0px' }}
      >
        {showSidebar ? (
          <ChevronLeft className="h-4 w-4 text-stone-600 dark:text-stone-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-stone-600 dark:text-stone-400" />
        )}
      </button>

      {/* Kalendervy */}
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
