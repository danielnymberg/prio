import { useState, useRef, useEffect } from 'react';
import { WeekCalendarView } from './WeekCalendarView';
import { useTasks } from '@/hooks/useTasks';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TreeViewComponent, DragAndDropEventArgs } from '@syncfusion/ej2-react-navigations';
import { closest } from '@syncfusion/ej2-base';

export function CalendarWithTaskSidebar() {
  const { tasks, updateTask } = useTasks();
  const [showSidebar, setShowSidebar] = useState(true);
  const scheduleRef = useRef<any>(null);
  const [treeData, setTreeData] = useState<any[]>([]);

  // Ej schemalagda uppgifter (uppgifter utan slutdatum som kan dras till kalendern)
  // Exkludera Snabbis (≤2 min) från kalenderplanering
  const unscheduledTasks = tasks.filter(
    (t) => t.status !== 'done' && !t.deadline && (t.estimated_duration || 999) > 2
  );

  // Uppdatera TreeView data när tasks ändras
  useEffect(() => {
    setTreeData(unscheduledTasks.map((task) => ({
      Id: task.id,
      Name: task.title,
      Duration: task.estimated_duration || 30,
      TaskId: task.id,
    })));
  }, [unscheduledTasks]);

  // TreeView fields config
  const fields = {
    dataSource: treeData,
    id: 'Id',
    text: 'Name',
  };

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

          if (cellData && args.draggedNodeData) {
            // Hämta task data
            const draggedData = args.draggedNodeData as any;
            console.log('Dragged node data:', draggedData);

            // Hitta rätt task från treeData (draggedNodeData innehåller bara id/text)
            const taskData = treeData.find(t => t.Id === draggedData.id || t.Id === draggedData.Id);

            if (taskData) {
              // Sätt deadline på tasken
              updateTask(taskData.TaskId, {
                deadline: cellData.startTime.toISOString()
              }).then(() => {
                // Ta bort från TreeView
                setTreeData(prev => prev.filter(t => t.Id !== taskData.Id));
              }).catch((error) => {
                console.error('Failed to update task:', error);
              });
            }
          }
        }
      }
    }
  };

  // Sätt schedule ref från child
  const setScheduleRef = (ref: any) => {
    scheduleRef.current = ref;
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
              Dra uppgifter till kalendern för att schemalägga
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-500 italic">
              💡 För att ta bort deadline: Klicka på uppgift i kalendern → "Ta bort deadline"
            </p>
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
                nodeTemplate={(data: any) => (
                  <div className="p-2">
                    <div className="font-medium text-sm text-stone-900 dark:text-cream-50">
                      {data.Name}
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
        <WeekCalendarView onScheduleReady={setScheduleRef} />
      </div>
    </div>
  );
}
