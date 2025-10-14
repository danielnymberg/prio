import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { Task, Quadrant } from '@/lib/types';
import { showToast } from '@/services/toast';
import {
  KanbanComponent,
  ColumnsDirective,
  ColumnDirective,
} from '@syncfusion/ej2-react-kanban';

export function EisenhowerMatrix() {
  const { tasks, updateTask } = useTasks();
  const { projects } = useProjects();

  // Filter active tasks only
  const activeTasks = tasks.filter(t => t.status !== 'done');

  // Map tasks to quadrants based on importance/urgency
  const getQuadrant = (task: Task): Quadrant => {
    const importance = task.importance || task.value_score || 5;
    const urgency = task.urgency || task.time_sensitivity || 5;

    if (importance > 5 && urgency > 5) return 'Q1'; // Important & Urgent
    if (importance > 5 && urgency <= 5) return 'Q2'; // Important, Not Urgent
    if (importance <= 5 && urgency > 5) return 'Q3'; // Not Important, Urgent
    return 'Q4'; // Not Important, Not Urgent
  };

  // Prepare Kanban data
  const kanbanData = activeTasks.map(task => {
    const project = projects.find(p => p.id === task.project_id);
    return {
      ...task,
      quadrant: getQuadrant(task),
      projectName: project?.name || 'Inget projekt',
      projectColor: project?.color || '#999',
    };
  });

  // Card template
  const cardTemplate = (props: any) => {
    const task = props as Task & { projectName: string; projectColor: string; quadrant: string };

    return (
      <div className="e-p-12">
        <div className="e-flex e-align-start e-justify-between e-mb-8">
          <h4 className="e-font-semibold e-text-sm e-truncate"
            style={{
              color: 'var(--e-text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>
            {task.title}
          </h4>
        </div>

        {task.description && (
          <p className="e-text-xs e-mb-8 e-opacity-75 e-truncate"
            style={{
              color: 'var(--e-text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>
            {task.description}
          </p>
        )}

        <div className="e-flex e-align-center e-justify-between e-text-xs">
          <div className="e-py-4 e-px-8 e-rounded-full"
            style={{
              backgroundColor: `${task.projectColor}20`,
              color: task.projectColor,
              border: `1px solid ${task.projectColor}40`
            }}>
            {task.projectName}
          </div>

          {task.estimated_duration && (
            <span className="e-opacity-75"
              style={{ color: 'var(--e-text)' }}>
              {task.estimated_duration >= 60
                ? `${Math.round(task.estimated_duration / 60)}h`
                : `${task.estimated_duration}m`}
            </span>
          )}
        </div>

        <div className="e-flex e-align-center e-gap-8 e-mt-8 e-text-xs e-opacity-75"
          style={{ color: 'var(--e-text)' }}>
          <span>V: {task.value_score || task.importance || 5}</span>
          <span>T: {task.time_sensitivity || task.urgency || 5}</span>
          <span className="e-ml-auto e-font-medium">
            P: {((task.value_score || 5) * (task.time_sensitivity || 5) * (task.confidence || 7) / (task.effort || 5)).toFixed(1)}
          </span>
        </div>
      </div>
    );
  };

  // Handle card click
  const handleCardClick = (_: any) => {
    // TaskForm removed
  };

  // Handle drag & drop (quadrant change)
  const handleDragStop = async (args: any) => {
    const taskId = args.data[0].id;
    const newQuadrant = args.dropIndex;

    // Update task based on new quadrant
    let updates: any = {};

    switch (newQuadrant) {
      case 'Q1': // Important & Urgent
        updates = { importance: 8, urgency: 8 };
        break;
      case 'Q2': // Important, Not Urgent
        updates = { importance: 8, urgency: 3 };
        break;
      case 'Q3': // Not Important, Urgent
        updates = { importance: 3, urgency: 8 };
        break;
      case 'Q4': // Not Important, Not Urgent
        updates = { importance: 3, urgency: 3 };
        break;
    }

    await updateTask(taskId, updates);
    showToast.success('Uppgift flyttad till ny kvadrant');
  };

  return (
    <div className="e-h-full e-flex e-flex-column e-gap-16 e-p-24">
      {/* Header */}
      <div>
        <h1 className="e-font-bold e-mb-8"
          style={{
            fontSize: 'clamp(24px, 5vw, 30px)',
            color: 'var(--e-text)'
          }}>
          Eisenhower Matrix
        </h1>
        <p className="e-opacity-75" style={{ color: 'var(--e-text)' }}>
          Prioritera uppgifter baserat på viktighet och brådska
        </p>
      </div>

      {/* Tips */}
      <div className="e-border e-rounded-lg e-p-16 e-opacity-75"
        style={{
          backgroundColor: 'var(--primary-500)',
          borderColor: 'var(--primary-500)'
        }}>
        <p className="e-text-sm"
          style={{ color: 'var(--e-text)' }}>
          <strong>💡 Tips:</strong> Dra och släpp uppgifter mellan kvadranter för att ändra prioritering.
          Q1 = Gör nu, Q2 = Schemalägg, Q3 = Delegera, Q4 = Eliminera
        </p>
      </div>

      {/* Kanban Board */}
      <div className="e-flex-1 e-rounded-lg e-overflow-hidden"
        style={{
          backgroundColor: 'var(--e-surface)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
        <KanbanComponent
          dataSource={kanbanData}
          keyField="quadrant"
          cardSettings={{
            contentField: 'title',
            headerField: 'title',
            template: cardTemplate,
          }}
          swimlaneSettings={{ keyField: 'project_id' }}
          cardClick={handleCardClick}
          dragStop={handleDragStop}
          height="100%"
        >
          <ColumnsDirective>
            <ColumnDirective
              headerText="🎯 Q1: Gör nu"
              keyField="Q1"
              allowToggle={true}
            />
            <ColumnDirective
              headerText="📅 Q2: Schemalägg"
              keyField="Q2"
              allowToggle={true}
            />
            <ColumnDirective
              headerText="👥 Q3: Delegera"
              keyField="Q3"
              allowToggle={true}
            />
            <ColumnDirective
              headerText="🗑️ Q4: Eliminera"
              keyField="Q4"
              allowToggle={true}
            />
          </ColumnsDirective>
        </KanbanComponent>
      </div>
    </div>
  );
}
