import { useState, useRef, useEffect } from 'react';
import { Task, UpdateTaskInput } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { isPast, isToday, isTomorrow } from 'date-fns';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Copy, Check, X, Clock, Trash2 } from 'lucide-react';
import { formatDuration, getDurationIcon } from '@/lib/utils';
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
      not_started: '#9ca3af',
      in_progress: '#fbbf24',
      done: '#4ade80',
    };

    return (
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '9999px',
        backgroundColor: colors[task.status]
      }} />
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

  // const handleTitleEdit = (e: React.MouseEvent) => {
  //   e.stopPropagation();
  //   setIsEditingTitle(true);
  // };

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
      style={{
        ...style,
        backgroundColor: 'var(--e-surface)',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        position: 'relative',
        border: isOverdue
          ? '2px solid #ef4444'
          : isEmergency
          ? '2px solid #f59e0b'
          : '1px solid var(--e-border, #e7e5e4)',
        transition: 'all 0.2s',
      }}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header med titel och priority */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '8px',
        marginBottom: '8px'
      }}>
        {isEditingTitle ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: '1'
          }}>
            <input
              ref={titleInputRef}
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleTitleSave}
              onClick={(e) => e.stopPropagation()}
              style={{
                flex: '1',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: 'transparent',
                borderBottom: '1px solid var(--copper-500)',
                outline: 'none',
                color: 'var(--e-text)',
              }}
            />
            <button
              onClick={handleTitleSave}
              style={{
                padding: '4px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              title="Spara"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--e-hover, #f5f5f4)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <Check style={{ height: '12px', width: '12px', color: '#10b981' }} />
            </button>
            <button
              onClick={handleTitleCancel}
              style={{
                padding: '4px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              title="Avbryt"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--e-hover, #f5f5f4)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X style={{ height: '12px', width: '12px', color: '#ef4444' }} />
            </button>
          </div>
        ) : (
          <>
            <h3 style={{
              fontWeight: '600',
              fontSize: '14px',
              color: 'var(--e-text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: '1'
            }}>
              {task.title}
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: '0'
            }}>
              {task.estimated_duration && (
                <span style={{ fontSize: '12px' }} title={`Uppskattad tid: ${formatDuration(task.estimated_duration)}`}>
                  {getDurationIcon(task.estimated_duration)}
                </span>
              )}
              <span style={{
                fontSize: '12px',
                color: 'var(--e-text-secondary, #78716c)',
                fontFamily: 'monospace'
              }}>
                {task.priority.toFixed(1)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Action buttons - flyttade till botten */}
      {!isEditingTitle && (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          display: 'flex',
          gap: '4px',
          opacity: showActions || isTouchDevice ? 1 : 0,
          transition: 'opacity 0.2s'
        }}>
          {onDuplicate && (
            <button
              onClick={handleDuplicate}
              style={{
                padding: '6px',
                borderRadius: '8px',
                backgroundColor: 'var(--e-hover, #e7e5e4)',
                border: 'none',
                cursor: 'pointer',
              }}
              title="Skapa liknande task"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--e-border, #d6d3d1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--e-hover, #e7e5e4)'}
            >
              <Copy style={{ height: '12px', width: '12px', color: 'var(--e-text-secondary, #57534e)' }} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              style={{
                padding: '6px',
                borderRadius: '8px',
                backgroundColor: '#fee2e2',
                border: 'none',
                cursor: 'pointer',
              }}
              title="Radera task"
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fecaca'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
            >
              <Trash2 style={{ height: '12px', width: '12px', color: '#dc2626' }} />
            </button>
          )}
        </div>
      )}

      {task.description && (
        <p style={{
          fontSize: '12px',
          color: 'var(--e-text-secondary, #78716c)',
          marginBottom: '8px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          opacity: viewMode === 'expanded' ? 1 : 0,
          transition: 'opacity 0.2s'
        }}>
          {task.description}
        </p>
      )}

      {viewMode === 'expanded' && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            fontSize: '12px',
            marginBottom: '8px'
          }}>
            <div style={{
              backgroundColor: '#f0fdf4',
              borderRadius: '8px',
              padding: '4px 8px'
            }}>
              <div style={{ color: '#78716c', fontSize: '10px' }}>Värde</div>
              <div style={{ fontWeight: '600', color: '#15803d' }}>{task.value_score}/10</div>
            </div>
            <div style={{
              backgroundColor: '#fffbeb',
              borderRadius: '8px',
              padding: '4px 8px'
            }}>
              <div style={{ color: '#78716c', fontSize: '10px' }}>Tidskänsl.</div>
              <div style={{ fontWeight: '600', color: '#b45309' }}>{task.time_sensitivity}/10</div>
            </div>
            <div style={{
              backgroundColor: 'var(--copper-50, #fef3f2)',
              borderRadius: '8px',
              padding: '4px 8px'
            }}>
              <div style={{ color: '#78716c', fontSize: '10px' }}>Tillit</div>
              <div style={{ fontWeight: '600', color: 'var(--copper-700, #b45309)' }}>{task.confidence}/10</div>
            </div>
            <div style={{
              backgroundColor: '#fef2f2',
              borderRadius: '8px',
              padding: '4px 8px'
            }}>
              <div style={{ color: '#78716c', fontSize: '10px' }}>Anstr.</div>
              <div style={{ fontWeight: '600', color: '#b91c1c' }}>{task.effort}/10</div>
            </div>
          </div>
          {(task.estimated_duration || task.deadline) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '12px',
              color: 'var(--e-text-secondary, #78716c)'
            }}>
              {task.estimated_duration && (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Clock style={{ height: '12px', width: '12px' }} />
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

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {onUpdate ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={handleStatusMenuToggle}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                title="Klicka för att ändra status"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--e-hover, #f5f5f4)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {getStatusDot()}
                <span style={{
                  fontSize: '12px',
                  color: 'var(--e-text-secondary, #78716c)',
                  textTransform: 'capitalize'
                }}>
                  {task.status === 'not_started' ? 'Ej påbörjad' : task.status === 'in_progress' ? 'Pågående' : 'Klar'}
                </span>
              </button>

              {showStatusMenu && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '0',
                  marginBottom: '4px',
                  backgroundColor: 'var(--e-surface)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  border: '1px solid var(--e-border, #e7e5e4)',
                  padding: '4px 0',
                  zIndex: 10,
                  minWidth: '140px'
                }}>
                  <button
                    onClick={() => handleStatusChange('not_started')}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--e-hover, #f5f5f4)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: '#9ca3af' }} />
                    Ej påbörjad
                  </button>
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--e-hover, #f5f5f4)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: '#fbbf24' }} />
                    Pågående
                  </button>
                  <button
                    onClick={() => handleStatusChange('done')}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--e-hover, #f5f5f4)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: '#4ade80' }} />
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
