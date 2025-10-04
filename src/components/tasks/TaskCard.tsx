import { useState, useRef, useEffect } from 'react';
import { Task, UpdateTaskInput } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Copy, Edit2, Check, X, Clock } from 'lucide-react';
import { formatDuration, getDurationColor, getDurationIcon } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onDuplicate?: (task: Task) => void;
  onUpdate?: (id: string, updates: UpdateTaskInput) => void;
  viewMode?: 'compact' | 'expanded';
}

export function TaskCard({ task, onClick, onDuplicate, onUpdate, viewMode = 'compact' }: TaskCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [showActions, setShowActions] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

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

  const handleTitleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    if (editedTitle.trim() !== task.title && onUpdate) {
      onUpdate(task.id, { title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditedTitle(task.title);
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

  const handleStatusChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdate) return;

    const statusCycle = {
      not_started: 'in_progress',
      in_progress: 'done',
      done: 'not_started',
    } as const;

    onUpdate(task.id, { status: statusCycle[task.status] });
  };

  const handleCardClick = () => {
    if (isEditingTitle) return;
    onClick();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-200 dark:border-gray-600 group relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Action buttons */}
      <div className={`absolute top-2 right-2 flex gap-1 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
        {onUpdate && !isEditingTitle && (
          <button
            onClick={handleTitleEdit}
            className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500"
            title="Redigera titel"
          >
            <Edit2 className="h-3 w-3 text-gray-600 dark:text-gray-300" />
          </button>
        )}
        {onDuplicate && (
          <button
            onClick={handleDuplicate}
            className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500"
            title="Skapa liknande task"
          >
            <Copy className="h-3 w-3 text-gray-600 dark:text-gray-300" />
          </button>
        )}
      </div>

      <div className="flex items-start justify-between gap-2 mb-2">
        {isEditingTitle ? (
          <div className="flex items-center gap-2 flex-1 pr-6">
            <input
              ref={titleInputRef}
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleTitleSave}
              className="flex-1 text-sm font-semibold bg-transparent border-b border-blue-500 focus:outline-none text-gray-900 dark:text-white"
            />
            <button
              onClick={handleTitleSave}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
              title="Spara"
            >
              <Check className="h-3 w-3 text-green-600" />
            </button>
            <button
              onClick={handleTitleCancel}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
              title="Avbryt"
            >
              <X className="h-3 w-3 text-red-600" />
            </button>
          </div>
        ) : (
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate flex-1 pr-6">
            {task.title}
          </h3>
        )}
        <div className="flex items-center gap-2">
          {task.estimated_duration && (
            <span className="text-xs" title={`Uppskattad tid: ${formatDuration(task.estimated_duration)}`}>
              {getDurationIcon(task.estimated_duration)}
            </span>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {task.priority.toFixed(1)}
          </span>
        </div>
      </div>

      {task.description && (
        <p className={`text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 transition-opacity ${
          viewMode === 'expanded' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          {task.description}
        </p>
      )}

      {viewMode === 'expanded' && (
        <div className="mb-2 space-y-2">
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="bg-green-50 dark:bg-green-900/20 rounded px-2 py-1">
              <div className="text-gray-500 dark:text-gray-400 text-[10px]">Värde</div>
              <div className="font-semibold text-green-700 dark:text-green-400">{task.value_score}/10</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1">
              <div className="text-gray-500 dark:text-gray-400 text-[10px]">Tidskänsl.</div>
              <div className="font-semibold text-amber-700 dark:text-amber-400">{task.time_sensitivity}/10</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded px-2 py-1">
              <div className="text-gray-500 dark:text-gray-400 text-[10px]">Tillit</div>
              <div className="font-semibold text-blue-700 dark:text-blue-400">{task.confidence}/10</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">
              <div className="text-gray-500 dark:text-gray-400 text-[10px]">Anstr.</div>
              <div className="font-semibold text-red-700 dark:text-red-400">{task.effort}/10</div>
            </div>
          </div>
          {(task.estimated_duration || task.deadline) && (
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              {task.estimated_duration && (
                <span className={`flex items-center gap-1 ${getDurationColor(task.estimated_duration)}`}>
                  <Clock className="h-3 w-3" />
                  {formatDuration(task.estimated_duration)}
                </span>
              )}
              {task.deadline && (
                <span>Deadline: {new Date(task.deadline).toLocaleDateString('sv-SE')}</span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onUpdate ? (
            <button
              onClick={handleStatusChange}
              className="flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded px-1 py-0.5 transition-colors"
              title={`Status: ${task.status === 'not_started' ? 'Ej påbörjad' : task.status === 'in_progress' ? 'Pågående' : 'Klar'} (klicka för att ändra)`}
            >
              {getStatusDot()}
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {task.status === 'not_started' ? 'Ej påbörjad' : task.status === 'in_progress' ? 'Pågående' : 'Klar'}
              </span>
            </button>
          ) : (
            getStatusDot()
          )}
          {getDeadlineBadge()}
        </div>
      </div>
    </div>
  );
}
