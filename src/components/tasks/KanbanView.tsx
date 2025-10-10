import { useState, useEffect } from 'react';
import { KanbanComponent, ColumnsDirective, ColumnDirective } from '@syncfusion/ej2-react-kanban';
import { useTasks } from '@/hooks/useTasks';
import { Task, Project } from '@/lib/types';
import { TaskForm } from '@/components/tasks/TaskForm';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function KanbanView() {
  const { user } = useAuth();
  const { tasks, updateTask, deleteTask } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  // Hämta projekt för swimlanes
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      }
    };

    fetchProjects();
  }, [user]);

  // Konvertera tasks till Kanban-format
  const kanbanData = tasks.map(task => {
    const project = projects.find(p => p.id === task.project_id);

    return {
      Id: task.id,
      Title: task.title,
      Status: task.status,
      Summary: task.description || '',
      Priority: task.priority,
      Tags: task.project_id ? [`Project: ${task.project_id}`] : [],
      Estimate: task.estimated_duration ? `${Math.round(task.estimated_duration / 60)}h` : '',
      Deadline: task.deadline ? new Date(task.deadline).toLocaleDateString('sv-SE') : '',
      ProjectId: task.project_id || 'ingen',
      ProjectName: project?.name || 'Ingen projekt',
      // Behåll original task för updates
      TaskData: task
    };
  });

  const cardTemplate = (props: any) => {
    return (
      <div className="e-card-content">
        <div className="e-card-header">
          <div className="e-card-header-title font-semibold">{props.Title}</div>
        </div>
        {props.Summary && (
          <div className="e-card-content-description text-sm text-stone-600 dark:text-stone-400 mt-2">
            {props.Summary.substring(0, 100)}{props.Summary.length > 100 ? '...' : ''}
          </div>
        )}
        <div className="flex items-center justify-between mt-3 text-xs">
          {props.Estimate && (
            <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              ⏱️ {props.Estimate}
            </span>
          )}
          {props.Deadline && (
            <span className="px-2 py-1 rounded bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300">
              📅 {props.Deadline}
            </span>
          )}
          {props.Priority && (
            <span className="px-2 py-1 rounded bg-copper-100 dark:bg-copper-900 text-copper-700 dark:text-copper-300 font-semibold">
              {Math.round(props.Priority)}
            </span>
          )}
        </div>
      </div>
    );
  };

  const onCardClick = (args: any) => {
    const taskId = args.data.Id;
    const fullTask = tasks.find(t => t.id === taskId);

    if (fullTask) {
      setSelectedTask(fullTask);
      setIsFormOpen(true);
    }
  };

  const onDragStop = async (args: any) => {
    if (args.data && args.data.length > 0) {
      const card = args.data[0];
      const newStatus = card.Status;
      const newProjectId = card.ProjectId === 'ingen' ? null : card.ProjectId;
      const taskId = card.Id;

      // Uppdatera task status och projekt (om det ändrats)
      await updateTask(taskId, {
        status: newStatus,
        project_id: newProjectId
      });
      console.log(`Task ${taskId} moved to ${newStatus}, project: ${newProjectId || 'none'}`);
    }
  };

  return (
    <>
      <div className="h-full bg-white dark:bg-charcoal-850 rounded-xl border border-sand-200 dark:border-charcoal-800 p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-4 text-stone-900 dark:text-cream-50 flex-shrink-0">
          Kanban Board
        </h2>
        <div className="flex-1 min-h-0" style={{ display: 'flex', flexDirection: 'column' }}>
          <KanbanComponent
            id="kanban"
            dataSource={kanbanData}
            keyField="Status"
            cardSettings={{
              contentField: 'Summary',
              headerField: 'Title',
              template: cardTemplate
            }}
            swimlaneSettings={{
              keyField: 'ProjectId',
              textField: 'ProjectName',
              allowDragAndDrop: true
            }}
            dialogSettings={{ fields: [] }} // Disable default dialog
            cardClick={onCardClick}
            dragStop={onDragStop}
            style={{ height: '100%' }}
          >
          <ColumnsDirective>
            <ColumnDirective
              headerText="📋 Ej påbörjad"
              keyField="not_started"
              allowToggle={true}
            />
            <ColumnDirective
              headerText="🚀 Pågående"
              keyField="in_progress"
              allowToggle={true}
            />
            <ColumnDirective
              headerText="✅ Klar"
              keyField="done"
              allowToggle={true}
            />
          </ColumnsDirective>
        </KanbanComponent>
        </div>
      </div>

      {/* Task detail modal */}
      <TaskForm
        isOpen={isFormOpen}
        task={selectedTask}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedTask(undefined);
        }}
        onSubmit={async (input) => {
          if (selectedTask) {
            await updateTask(selectedTask.id, input);
          }
          setIsFormOpen(false);
          setSelectedTask(undefined);
        }}
        onDelete={async (id) => {
          await deleteTask(id);
          setIsFormOpen(false);
          setSelectedTask(undefined);
          return true;
        }}
      />
    </>
  );
}
