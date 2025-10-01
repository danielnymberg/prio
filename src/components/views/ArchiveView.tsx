import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskForm } from '@/components/tasks/TaskForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { Task } from '@/lib/types';
import { Archive } from 'lucide-react';

export function ArchiveView() {
  const { tasks, updateTask } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const completedTasks = tasks
    .filter(t => t.status === 'done')
    .sort((a, b) => {
      if (!a.completed_at || !b.completed_at) return 0;
      return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
    });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Arkiv
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Slutförda tasks
        </p>
      </div>

      {completedTasks.length === 0 ? (
        <EmptyState
          icon={<Archive className="h-16 w-16" />}
          title="Inget i arkivet"
          description="Du har inga slutförda tasks än. När du markerar tasks som klara hamnar de här."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {completedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => handleTaskClick(task)}
            />
          ))}
        </div>
      )}

      <TaskForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={async (input) => {
          if (selectedTask) await updateTask(selectedTask.id, input);
        }}
        task={selectedTask}
      />
    </div>
  );
}
