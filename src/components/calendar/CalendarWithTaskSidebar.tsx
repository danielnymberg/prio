import { useState } from 'react';
import { WeekCalendarView } from './WeekCalendarView';
import { useTasks } from '@/hooks/useTasks';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function CalendarWithTaskSidebar() {
  const { tasks } = useTasks();
  const [showSidebar, setShowSidebar] = useState(true);

  // Ej schemalagda uppgifter (uppgifter utan slutdatum som kan dras till kalendern)
  // Exkludera Snabbis (≤2 min) från kalenderplanering
  const unscheduledTasks = tasks.filter(
    (t) => t.status !== 'done' && !t.deadline && (t.estimated_duration || 999) > 2
  );

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

          <div className="flex-1 overflow-y-auto">
            {unscheduledTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Alla uppgifter är schemalagda! 🎉
                </p>
              </div>
            ) : (
              <div className="space-y-2 pr-2">
                {unscheduledTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    className="e-draggable bg-sand-50 dark:bg-charcoal-800 rounded-lg p-3 border border-sand-200 dark:border-charcoal-700 cursor-move hover:shadow-md transition-shadow"
                    data-id={`task-${task.id}`}
                    data-subject={`📌 ${task.title}`}
                    data-starttime={new Date().toISOString()}
                    data-endtime={new Date(Date.now() + (task.estimated_duration || 30) * 60 * 1000).toISOString()}
                    data-taskid={task.id}
                    data-eventtype="task"
                    data-categorycolor="#dc2626"
                    data-isreadonly="false"
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
  );
}
