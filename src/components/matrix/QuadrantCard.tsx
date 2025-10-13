import { Task, Quadrant } from '@/lib/types';
import { TaskCard } from '@/components/tasks/TaskCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Flame, Target, Zap, Package } from 'lucide-react';

interface QuadrantCardProps {
  quadrant: Quadrant;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (quadrant: Quadrant) => void;
  onDuplicate?: (task: Task) => void;
  onUpdate?: (id: string, updates: Partial<Task>) => void;
  onDelete?: (id: string) => Promise<boolean>;
  viewMode?: 'compact' | 'expanded';
}

const quadrantConfig = {
  Q1: {
    title: 'Viktigt + Brådskande',
    emoji: '🔥',
    icon: Flame,
    bgColor: 'rgba(254, 226, 226, 0.5)',
    bgColorDark: 'rgba(127, 29, 29, 0.1)',
    borderColor: '#fecaca',
    borderColorDark: '#991b1b',
    textColor: '#b91c1c',
    textColorDark: '#f87171',
    action: 'Gör nu',
  },
  Q2: {
    title: 'Viktigt + Ej Brådskande',
    emoji: '🎯',
    icon: Target,
    bgColor: 'rgba(220, 252, 231, 0.5)',
    bgColorDark: 'rgba(20, 83, 45, 0.1)',
    borderColor: '#bbf7d0',
    borderColorDark: '#166534',
    textColor: '#15803d',
    textColorDark: '#4ade80',
    action: 'Schemalägg',
  },
  Q3: {
    title: 'Ej Viktigt + Brådskande',
    emoji: '⚡',
    icon: Zap,
    bgColor: 'rgba(254, 243, 199, 0.5)',
    bgColorDark: 'rgba(120, 53, 15, 0.1)',
    borderColor: '#fde68a',
    borderColorDark: '#92400e',
    textColor: '#b45309',
    textColorDark: '#fbbf24',
    action: 'Delegera',
  },
  Q4: {
    title: 'Ej Viktigt + Ej Brådskande',
    emoji: '📦',
    icon: Package,
    bgColor: 'rgba(249, 250, 251, 0.5)',
    bgColorDark: 'rgba(17, 24, 39, 0.1)',
    borderColor: '#e5e7eb',
    borderColorDark: '#374151',
    textColor: '#374151',
    textColorDark: '#9ca3af',
    action: 'Eliminera',
  },
};

export function QuadrantCard({ quadrant, tasks, onTaskClick, onAddTask, onDuplicate, onUpdate, onDelete, viewMode = 'compact' }: QuadrantCardProps) {
  const config = quadrantConfig[quadrant];
  const Icon = config.icon;
  const { setNodeRef, isOver } = useDroppable({ id: quadrant });

  const sortedTasks = [...tasks].sort((a, b) => b.priority - a.priority);

  return (
    <div
      ref={setNodeRef}
      style={{
        borderRadius: '12px',
        border: `2px solid var(--e-border, ${config.borderColor})`,
        backgroundColor: `var(--e-surface, ${config.bgColor})`,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'all 0.2s',
        ...(isOver && {
          boxShadow: '0 0 0 2px var(--copper-500, #d4764e)',
          transform: 'scale(1.02)',
        }),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon style={{ height: '20px', width: '20px', color: `var(--e-text, ${config.textColor})` }} />
          <div>
            <h3 style={{ fontWeight: 'bold', fontSize: '14px', color: `var(--e-text, ${config.textColor})` }}>
              {quadrant}: {config.title}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--e-text-secondary, #6b7280)' }}>
              {config.action}
            </p>
          </div>
        </div>
        <div style={{
          padding: '4px 8px',
          borderRadius: '9999px',
          backgroundColor: `var(--e-surface, ${config.bgColor})`,
          color: `var(--e-text, ${config.textColor})`,
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {tasks.length}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', maxHeight: '500px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sortedTasks.length === 0 ? (
          <EmptyState
            title="Inga tasks"
            description="Dra hit en task eller klicka + för att lägga till"
            icon={<span style={{ fontSize: '36px' }}>{config.emoji}</span>}
            action={{
              label: 'Lägg till task',
              onClick: () => onAddTask(quadrant),
            }}
          />
        ) : (
          <SortableContext
            items={sortedTasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                onDuplicate={onDuplicate}
                onUpdate={onUpdate}
                onDelete={onDelete}
                viewMode={viewMode}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
