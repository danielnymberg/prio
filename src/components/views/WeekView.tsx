import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskForm } from '@/components/tasks/TaskForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { Task } from '@/lib/types';
import { isThisWeek } from 'date-fns';
import { CalendarDays } from 'lucide-react';

export function WeekView() {
  const { tasks, updateTask } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const weekTasks = tasks
    .filter(t => t.deadline && isThisWeek(new Date(t.deadline)) && t.status !== 'done')
    .sort((a, b) => b.priority - a.priority);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Denna vecka
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Tasks med deadline denna vecka
        </p>
      </div>

      {weekTasks.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-16 w-16" />}
          title="Inga tasks denna vecka"
          description="Du har inga tasks med deadline denna vecka."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {weekTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => handleTaskClick(task)}
              onUpdate={updateTask}
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
