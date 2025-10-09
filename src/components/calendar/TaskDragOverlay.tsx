import { useTasks } from '@/hooks/useTasks';
import { Task } from '@/lib/types';
import { useDndContext, DragOverlay } from '@dnd-kit/core';
import { Clock } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

export function TaskDragOverlay() {
  const { active } = useDndContext();
  const { tasks } = useTasks();

  if (!active || active.data.current?.type !== 'task') {
    return null;
  }

  const task = tasks.find(t => t.id === active.id) as Task | undefined;

  if (!task) return null;

  return (
    <DragOverlay>
      <div className="bg-white dark:bg-charcoal-850 rounded-lg shadow-2xl border-2 border-copper-600 p-3 w-64 opacity-90">
        <div className="font-semibold text-sm text-stone-900 dark:text-cream-50 mb-1">
          {task.title}
        </div>
        {task.estimated_duration && (
          <div className="flex items-center gap-1 text-xs text-stone-600 dark:text-stone-400">
            <Clock className="h-3 w-3" />
            {formatDuration(task.estimated_duration)}
          </div>
        )}
      </div>
    </DragOverlay>
  );
}
