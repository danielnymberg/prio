import { useState, useRef, useEffect } from 'react';
import { Task, UpdateTaskInput } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { isPast, isToday, isTomorrow } from 'date-fns';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Copy, Check, X, Clock, Trash2 } from 'lucide-react';
import { formatDuration, getDurationColor, getDurationIcon } from '@/lib/utils';
import { isEmergencyTask, isOverdueTask, formatTimeUntilDeadline } from '@/lib/priorityCalculation';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onDuplicate?: (task: Task) => void;
  onUpdate?: (id: string, updates: UpdateTaskInput) => void;
  onDelete?: (id: string) => Promise<boolean>;
  viewMode?: 'compact' | 'expanded';
}

export function TaskCard({ task, onClick, onDuplicate, onUpdate, onDelete, viewMode = 'compact' }: TaskCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [showActions, setShowActions] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Detect touch devices to always show action buttons
  const isTouchDevice = 'ontouchstart' in window;

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
      // Move cursor to end instead of selecting all text
      const length = titleInputRef.current.value.length;
      titleInputRef.current.setSelectionRange(length, length);
    }
  }, [isEditingTitle]);

  const getDeadlineBadge = () => {
    if (!task.deadline) return null;

    const timeRemaining = formatTimeUntilDeadline(task.deadline);
    const deadlineDate = new Date(task.deadline);

    if (isPast(deadlineDate) && !isToday(deadlineDate)) {
      return <Badge variant="danger">{timeRemaining}</Badge>;
    }

    if (isToday(deadlineDate)) {
      return <Badge variant="danger">{timeRemaining}</Badge>;
    }

    if (isTomorrow(deadlineDate)) {
      return <Badge variant="warning">{timeRemaining}</Badge>;
    }

    return (
      <Badge variant="default">
        {timeRemaining}
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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && confirm(`Är du säker på att du vill radera "${task.title}"?`)) {
      onDelete(task.id);
    }
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

  const handleStatusMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowStatusMenu(!showStatusMenu);
  };

  const handleStatusChange = (newStatus: Task['status']) => {
    if (!onUpdate) return;
    onUpdate(task.id, { status: newStatus });
    setShowStatusMenu(false);
  };

  const handleCardClick = () => {
    if (isEditingTitle) return;
    onClick();
  };

  const isEmergency = isEmergencyTask(task);
  const isOverdue = isOverdueTask(task);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className={`bg-cream-100 dark:bg-charcoal-850 rounded-xl p-4 shadow-subtle hover:shadow-soft transition-all cursor-pointer group relative ${
        isOverdue
          ? 'border-2 border-error-500 dark:border-error-600'
          : isEmergency
          ? 'border-2 border-warning-500 dark:border-warning-600'
          : 'border border-sand-200 dark:border-charcoal-800'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header med titel och priority */}
      <div className="flex items-start justify-between gap-2 mb-2">
        {isEditingTitle ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              ref={titleInputRef}
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleTitleSave}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 text-sm font-semibold bg-transparent border-b border-copper-500 focus:outline-none text-stone-900 dark:text-cream-50"
            />
            <button
              onClick={handleTitleSave}
              className="p-1 rounded-lg hover:bg-sand-100 dark:hover:bg-charcoal-800"
              title="Spara"
            >
              <Check className="h-3 w-3 text-success-600" />
            </button>
            <button
              onClick={handleTitleCancel}
              className="p-1 rounded-lg hover:bg-sand-100 dark:hover:bg-charcoal-800"
              title="Avbryt"
            >
              <X className="h-3 w-3 text-error-600" />
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-semibold text-sm text-stone-900 dark:text-cream-50 truncate flex-1">
              {task.title}
            </h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {task.estimated_duration && (
                <span className="text-xs" title={`Uppskattad tid: ${formatDuration(task.estimated_duration)}`}>
                  {getDurationIcon(task.estimated_duration)}
                </span>
              )}
              <span className="text-xs text-stone-500 dark:text-stone-400 font-mono">
                {task.priority.toFixed(1)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Action buttons - flyttade till botten */}
      {!isEditingTitle && (
        <div className={`absolute bottom-3 right-3 flex gap-1 transition-opacity ${showActions || isTouchDevice ? 'opacity-100' : 'opacity-0'}`}>
          {onDuplicate && (
            <button
              onClick={handleDuplicate}
              className="p-1.5 rounded-lg bg-sand-200 dark:bg-charcoal-800 hover:bg-sand-300 dark:hover:bg-charcoal-700"
              title="Skapa liknande task"
            >
              <Copy className="h-3 w-3 text-stone-600 dark:text-stone-300" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg bg-error-100 dark:bg-error-950 hover:bg-error-200 dark:hover:bg-error-900"
              title="Radera task"
            >
              <Trash2 className="h-3 w-3 text-error-600 dark:text-error-400" />
            </button>
          )}
        </div>
      )}

      {task.description && (
        <p className={`text-xs text-stone-600 dark:text-stone-400 line-clamp-2 mb-2 transition-opacity ${
          viewMode === 'expanded' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          {task.description}
        </p>
      )}

      {viewMode === 'expanded' && (
        <div className="mb-2 space-y-2">
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="bg-success-50 dark:bg-success-950 rounded-lg px-2 py-1">
              <div className="text-stone-500 dark:text-stone-400 text-[10px]">Värde</div>
              <div className="font-semibold text-success-700 dark:text-success-400">{task.value_score}/10</div>
            </div>
            <div className="bg-warning-50 dark:bg-warning-950 rounded-lg px-2 py-1">
              <div className="text-stone-500 dark:text-stone-400 text-[10px]">Tidskänsl.</div>
              <div className="font-semibold text-warning-700 dark:text-warning-400">{task.time_sensitivity}/10</div>
            </div>
            <div className="bg-copper-50 dark:bg-copper-950 rounded-lg px-2 py-1">
              <div className="text-stone-500 dark:text-stone-400 text-[10px]">Tillit</div>
              <div className="font-semibold text-copper-700 dark:text-copper-400">{task.confidence}/10</div>
            </div>
            <div className="bg-error-50 dark:bg-error-950 rounded-lg px-2 py-1">
              <div className="text-stone-500 dark:text-stone-400 text-[10px]">Anstr.</div>
              <div className="font-semibold text-error-700 dark:text-error-400">{task.effort}/10</div>
            </div>
          </div>
          {(task.estimated_duration || task.deadline) && (
            <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
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
            <div className="relative">
              <button
                onClick={handleStatusMenuToggle}
                className="flex items-center gap-1 hover:bg-sand-100 dark:hover:bg-charcoal-800 rounded-lg px-2 py-1 transition-colors"
                title="Klicka för att ändra status"
              >
                {getStatusDot()}
                <span className="text-xs text-stone-500 dark:text-stone-400 capitalize">
                  {task.status === 'not_started' ? 'Ej påbörjad' : task.status === 'in_progress' ? 'Pågående' : 'Klar'}
                </span>
              </button>

              {showStatusMenu && (
                <div className="absolute bottom-full left-0 mb-1 bg-cream-50 dark:bg-charcoal-850 rounded-xl shadow-medium border border-sand-200 dark:border-charcoal-800 py-1 z-10 min-w-[140px]">
                  <button
                    onClick={() => handleStatusChange('not_started')}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-sand-100 dark:hover:bg-charcoal-800 flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-stone-400" />
                    Ej påbörjad
                  </button>
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-sand-100 dark:hover:bg-charcoal-800 flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-warning-400" />
                    Pågående
                  </button>
                  <button
                    onClick={() => handleStatusChange('done')}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-sand-100 dark:hover:bg-charcoal-800 flex items-center gap-2"
                  >
                    <div className="w-2 h-2 rounded-full bg-success-400" />
                    Klar
                  </button>
                </div>
              )}
            </div>
          ) : (
            getStatusDot()
          )}
          {getDeadlineBadge()}
        </div>
      </div>
    </div>
  );
}
