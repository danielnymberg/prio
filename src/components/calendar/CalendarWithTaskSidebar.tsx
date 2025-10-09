import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { WeekCalendarView } from './WeekCalendarView';
import { useTasks } from '@/hooks/useTasks';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function CalendarWithTaskSidebar() {
  const { tasks } = useTasks();
  const [showSidebar, setShowSidebar] = useState(true);

  // Inbox tasks (kan dras till kalendern)
  const inboxTasks = tasks.filter(
    (t) => t.status !== 'done' && !t.deadline
  );

  return (
    <DndProvider backend={HTML5Backend}>
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
              Inbox
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Dra tasks till kalendern för att schemalägga
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
          {inboxTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Inga oschemalagda tasks
              </p>
            </div>
          ) : (
            <div className="space-y-2 pr-2">
              {inboxTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('taskId', task.id);
                    e.dataTransfer.setData('taskTitle', task.title);
                    e.dataTransfer.setData(
                      'taskDuration',
                      String(task.estimated_duration || 60)
                    );
                  }}
                  className="bg-sand-50 dark:bg-charcoal-800 rounded-lg p-3 border border-sand-200 dark:border-charcoal-700 cursor-move hover:border-copper-500 dark:hover:border-copper-500 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-stone-900 dark:text-cream-50 truncate">
                        {task.title}
                      </div>
                      {task.estimated_duration && (
                        <div className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                          ~{Math.round(task.estimated_duration / 60)}h
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-mono text-stone-500 dark:text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Dra →
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
        <WeekCalendarView />
      </div>
    </div>
    </DndProvider>
  );
}
