import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskForm } from '@/components/tasks/TaskForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { Task, CreateTaskInput } from '@/lib/types';
import { Inbox, FileCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function InboxView() {
  const { tasks, updateTask, deleteTask, createTask } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // Inbox = tasks med status 'not_started' OCH låg bedömning (värde+tidskänslighet = default 5)
  const inboxTasks = tasks.filter(t =>
    t.status === 'not_started' &&
    !t.deadline && // Ingen deadline = behöver bedömning
    (t.value_score === 5 && t.time_sensitivity === 5) // Default-värden = ej bedömd
  );

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsFormOpen(true);
  };

  const handleToggleSelect = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Ta bort ${selectedTasks.size} tasks från inbox?`)) return;

    for (const taskId of selectedTasks) {
      await deleteTask(taskId);
    }
    setSelectedTasks(new Set());
  };

  const handleBulkActivate = async () => {
    for (const taskId of selectedTasks) {
      // Ändra till in_progress för att markera som "aktiverad"
      await updateTask(taskId, { status: 'in_progress' });
    }
    setSelectedTasks(new Set());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Inbox
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {inboxTasks.length} tasks väntar på bedömning
          </p>
        </div>

        {selectedTasks.size > 0 && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkActivate}
            >
              <FileCheck className="h-4 w-4 mr-1" />
              Aktivera ({selectedTasks.size})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkDelete}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Ta bort
            </Button>
          </div>
        )}
      </div>

      {inboxTasks.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-16 w-16" />}
          title="Inbox är tom!"
          description="Nya tasks från röstassistent hamnar här för bedömning"
        />
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Tips:</strong> Klicka på en task för att bedöma vikten, tidskänslighet och deadline.
              Tasks som skapats via röst eller delning hamnar här om AI:n inte kunde bedöma dem direkt.
            </p>
          </div>

          <div className="space-y-2">
            {inboxTasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedTasks.has(task.id)}
                  onChange={() => handleToggleSelect(task.id)}
                  className="mt-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <TaskCard
                    task={task}
                    onClick={() => handleTaskClick(task)}
                    onUpdate={updateTask}
                    onDelete={deleteTask}
                    viewMode="expanded"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <TaskForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedTask(undefined);
        }}
        onSubmit={async (input) => {
          if (selectedTask) {
            await updateTask(selectedTask.id, input);
          } else {
            await createTask(input as CreateTaskInput);
          }
        }}
        onDelete={deleteTask}
        task={selectedTask}
      />
    </div>
  );
}
