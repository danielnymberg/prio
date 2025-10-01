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
}

const quadrantConfig = {
  Q1: {
    title: 'Viktigt + Brådskande',
    emoji: '🔥',
    icon: Flame,
    bgColor: 'bg-red-50 dark:bg-red-900/10',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-700 dark:text-red-400',
    action: 'Gör nu',
  },
  Q2: {
    title: 'Viktigt + Ej Brådskande',
    emoji: '🎯',
    icon: Target,
    bgColor: 'bg-green-50 dark:bg-green-900/10',
    borderColor: 'border-green-200 dark:border-green-800',
    textColor: 'text-green-700 dark:text-green-400',
    action: 'Schemalägg',
  },
  Q3: {
    title: 'Ej Viktigt + Brådskande',
    emoji: '⚡',
    icon: Zap,
    bgColor: 'bg-amber-50 dark:bg-amber-900/10',
    borderColor: 'border-amber-200 dark:border-amber-800',
    textColor: 'text-amber-700 dark:text-amber-400',
    action: 'Delegera',
  },
  Q4: {
    title: 'Ej Viktigt + Ej Brådskande',
    emoji: '📦',
    icon: Package,
    bgColor: 'bg-gray-50 dark:bg-gray-900/10',
    borderColor: 'border-gray-200 dark:border-gray-700',
    textColor: 'text-gray-700 dark:text-gray-400',
    action: 'Eliminera',
  },
};

export function QuadrantCard({ quadrant, tasks, onTaskClick, onAddTask, onDuplicate }: QuadrantCardProps) {
  const config = quadrantConfig[quadrant];
  const Icon = config.icon;
  const { setNodeRef, isOver } = useDroppable({ id: quadrant });

  const sortedTasks = [...tasks].sort((a, b) => b.priority - a.priority);

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 ${config.borderColor} ${config.bgColor} p-4 flex flex-col h-full transition-all ${
        isOver ? 'ring-2 ring-blue-500 scale-[1.02]' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${config.textColor}`} />
          <div>
            <h3 className={`font-bold text-sm ${config.textColor}`}>
              {quadrant}: {config.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {config.action}
            </p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-full ${config.bgColor} ${config.textColor} text-xs font-bold`}>
          {tasks.length}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[500px] space-y-2">
        {sortedTasks.length === 0 ? (
          <EmptyState
            title="Inga tasks"
            description="Dra hit en task eller klicka + för att lägga till"
            icon={<span className="text-4xl">{config.emoji}</span>}
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
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
