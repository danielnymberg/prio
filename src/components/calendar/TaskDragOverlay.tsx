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
      <div style={{
        backgroundColor: 'var(--e-surface, #ffffff)',
        borderRadius: '8px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '2px solid var(--copper-600, #d4764e)',
        padding: '12px',
        width: '256px',
        opacity: 0.9
      }}>
        <div style={{
          fontWeight: '600',
          fontSize: '14px',
          color: 'var(--e-text, #1c1917)',
          marginBottom: '4px'
        }}>
          {task.title}
        </div>
        {task.estimated_duration && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            color: 'var(--e-text-secondary, #57534e)'
          }}>
            <Clock style={{ height: '12px', width: '12px' }} />
            {formatDuration(task.estimated_duration)}
          </div>
        )}
      </div>
    </DragOverlay>
  );
}
