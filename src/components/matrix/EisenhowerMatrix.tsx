import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { Task, Quadrant, CreateTaskInput } from '@/lib/types';
import { TaskForm } from '@/components/tasks/TaskForm';
import { showToast } from '@/services/toast';
import {
  KanbanComponent,
  ColumnsDirective,
  ColumnDirective,
} from '@syncfusion/ej2-react-kanban';

export function EisenhowerMatrix() {
  const { tasks, updateTask, createTask, deleteTask } = useTasks();
  const { projects } = useProjects();
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);

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
      <div className="e-card-content p-3">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2">
            {task.title}
          </h4>
        </div>

        {task.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs">
          <div
            className="px-2 py-1 rounded-full"
            style={{
              backgroundColor: `${task.projectColor}20`,
              color: task.projectColor,
              border: `1px solid ${task.projectColor}40`,
            }}
          >
            {task.projectName}
          </div>

          {task.estimated_duration && (
            <span className="text-gray-500 dark:text-gray-400">
              {task.estimated_duration >= 60
                ? `${Math.round(task.estimated_duration / 60)}h`
                : `${task.estimated_duration}m`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>V: {task.value_score || task.importance || 5}</span>
          <span>T: {task.time_sensitivity || task.urgency || 5}</span>
          <span className="ml-auto font-medium">
            P: {((task.value_score || 5) * (task.time_sensitivity || 5) * (task.confidence || 7) / (task.effort || 5)).toFixed(1)}
          </span>
        </div>
      </div>
    );
  };

  // Handle card click
  const handleCardClick = (args: any) => {
    const taskId = args.data.id;
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setSelectedTask(task);
      setIsFormOpen(true);
    }
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
    <div className="h-full flex flex-col space-y-4 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Eisenhower Matrix
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Prioritera uppgifter baserat på viktighet och brådska
        </p>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>💡 Tips:</strong> Dra och släpp uppgifter mellan kvadranter för att ändra prioritering.
          Q1 = Gör nu, Q2 = Schemalägg, Q3 = Delegera, Q4 = Eliminera
        </p>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
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

      {/* TaskForm Modal */}
      <TaskForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedTask(undefined);
        }}
        onSubmit={async (input) => {
          if (selectedTask) {
            await updateTask(selectedTask.id, input);
            showToast.success('Uppgift uppdaterad!');
          } else {
            await createTask(input as CreateTaskInput);
            showToast.success('Uppgift skapad!');
          }
        }}
        onDelete={deleteTask}
        task={selectedTask}
      />
    </div>
  );
}
