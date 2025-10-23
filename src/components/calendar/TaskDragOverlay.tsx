import { useTasks } from '@/hooks/useTasks';
import { Task } from '@/lib/types';
import { useDndContext, DragOverlay } from '@dnd-kit/core';
// Lucide icons replaced with SyncFusion e-icons
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
      <div className="e-rounded-lg e-p-12 e-opacity-75"
        style={{
          backgroundColor: 'var(--e-surface, #ffffff)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '2px solid var(--primary-600)',
          width: '256px'
        }}>
        <div className="e-font-semibold e-text-sm e-mb-4"
          style={{ color: 'var(--e-text, #1c1917)' }}>
          {task.title}
        </div>
        {task.estimated_duration && (
          <div className="e-flex e-align-center e-gap-4 e-text-xs"
            style={{ color: 'var(--e-text-secondary, #57534e)' }}>
            <span className="e-icons e-time" style={{ fontSize: '12px' }}></span>
            {formatDuration(task.estimated_duration)}
          </div>
        )}
      </div>
    </DragOverlay>
  );
}
