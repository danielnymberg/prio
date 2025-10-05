import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskForm } from '@/components/tasks/TaskForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { Task } from '@/lib/types';
import { isToday, isPast, format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Calendar } from 'lucide-react';

export function TodayView() {
  const { tasks, updateTask } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const todayTasks = tasks.filter(
    t => t.deadline && isToday(new Date(t.deadline)) && t.status !== 'done'
  );

  const overdueTasks = tasks.filter(
    t => t.deadline && isPast(new Date(t.deadline)) && !isToday(new Date(t.deadline)) && t.status !== 'done'
  );

  const allTasks = [...overdueTasks, ...todayTasks].sort((a, b) => b.priority - a.priority);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Idag ({format(new Date(), 'd MMMM', { locale: sv })})
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Tasks med deadline idag {overdueTasks.length > 0 && `+ ${overdueTasks.length} försenade`}
        </p>
      </div>

      {allTasks.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-16 w-16" />}
          title="Inga tasks idag"
          description="Du har inga tasks med deadline idag. Bra jobbat! 🎉"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allTasks.map((task) => (
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
        onClose={() => {
          setIsFormOpen(false);
          setSelectedTask(undefined);
        }}
        onSubmit={async (input) => {
          if (selectedTask) await updateTask(selectedTask.id, input);
        }}
        task={selectedTask}
      />
    </div>
  );
}
