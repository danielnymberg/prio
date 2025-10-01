import { Task } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Copy } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onDuplicate?: (task: Task) => void;
}

export function TaskCard({ task, onClick, onDuplicate }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getDeadlineBadge = () => {
    if (!task.deadline) return null;

    const deadlineDate = new Date(task.deadline);

    if (isPast(deadlineDate) && !isToday(deadlineDate)) {
      return <Badge variant="danger">Försenad</Badge>;
    }

    if (isToday(deadlineDate)) {
      return <Badge variant="danger">Idag</Badge>;
    }

    if (isTomorrow(deadlineDate)) {
      return <Badge variant="warning">Imorgon</Badge>;
    }

    return (
      <Badge variant="default">
        {formatDistanceToNow(deadlineDate, { locale: sv, addSuffix: true })}
      </Badge>
    );
  };

  const getStatusDot = () => {
    const colors = {
      not_started: 'bg-gray-400',
      in_progress: 'bg-amber-400',
      done: 'bg-green-400',
    };

    return (
      <div className={`w-2 h-2 rounded-full ${colors[task.status]}`} />
    );
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDuplicate) onDuplicate(task);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-200 dark:border-gray-600 group relative"
    >
      {onDuplicate && (
        <button
          onClick={handleDuplicate}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-100 dark:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-500"
          title="Skapa liknande task"
        >
          <Copy className="h-3 w-3 text-gray-600 dark:text-gray-300" />
        </button>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate flex-1 pr-6">
          {task.title}
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          {task.priority.toFixed(1)}
        </span>
      </div>

      {task.description && (
        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusDot()}
          {getDeadlineBadge()}
        </div>
      </div>
    </div>
  );
}
