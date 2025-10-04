import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskForm } from '@/components/tasks/TaskForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { Task } from '@/lib/types';
import { List, Search, Filter } from 'lucide-react';

type PriorityLevel = 'all' | 'high' | 'medium' | 'low';

export function AllTasksView() {
  const { tasks, updateTask } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<PriorityLevel>('all');
  const [filterStatus] = useState<'all' | 'not_started' | 'in_progress' | 'done'>('all');

  const activeTasks = tasks.filter(t => t.status !== 'done');

  let filteredTasks = activeTasks;

  if (searchQuery) {
    filteredTasks = filteredTasks.filter(t =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  if (filterPriority !== 'all') {
    filteredTasks = filteredTasks.filter(t => {
      if (filterPriority === 'high') return t.priority >= 50;
      if (filterPriority === 'medium') return t.priority >= 20 && t.priority < 50;
      if (filterPriority === 'low') return t.priority < 20;
      return true;
    });
  }

  if (filterStatus !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.status === filterStatus);
  }

  const sortedTasks = [...filteredTasks].sort((a, b) => b.priority - a.priority);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsFormOpen(true);
  };

  const priorityCounts = {
    high: activeTasks.filter(t => t.priority >= 50).length,
    medium: activeTasks.filter(t => t.priority >= 20 && t.priority < 50).length,
    low: activeTasks.filter(t => t.priority < 20).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Alla tasks
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {activeTasks.length} aktiva tasks
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Sök tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400" />

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterPriority('all')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filterPriority === 'all'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Alla ({activeTasks.length})
            </button>
            <button
              onClick={() => setFilterPriority('high')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filterPriority === 'high'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Hög prioritet (≥50) ({priorityCounts.high})
            </button>
            <button
              onClick={() => setFilterPriority('medium')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filterPriority === 'medium'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Medel (20-50) ({priorityCounts.medium})
            </button>
            <button
              onClick={() => setFilterPriority('low')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filterPriority === 'low'
                  ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Låg (&lt;20) ({priorityCounts.low})
            </button>
          </div>
        </div>
      </div>

      {sortedTasks.length === 0 ? (
        <EmptyState
          icon={<List className="h-16 w-16" />}
          title={searchQuery ? "Inga tasks hittades" : "Inga aktiva tasks"}
          description={searchQuery ? `Inga tasks matchar "${searchQuery}"` : "Skapa din första task för att komma igång!"}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTasks.map((task) => (
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
