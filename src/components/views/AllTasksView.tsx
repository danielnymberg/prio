import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskForm } from '@/components/tasks/TaskForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { Task, Quadrant } from '@/lib/types';
import { getTaskQuadrant } from '@/lib/utils';
import { List, Search, Filter } from 'lucide-react';

export function AllTasksView() {
  const { tasks, updateTask } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterQuadrant, setFilterQuadrant] = useState<Quadrant | 'all'>('all');
  const [filterStatus] = useState<'all' | 'not_started' | 'in_progress' | 'done'>('all');

  const activeTasks = tasks.filter(t => t.status !== 'done');

  let filteredTasks = activeTasks;

  if (searchQuery) {
    filteredTasks = filteredTasks.filter(t =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  if (filterQuadrant !== 'all') {
    filteredTasks = filteredTasks.filter(t => getTaskQuadrant(t) === filterQuadrant);
  }

  if (filterStatus !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.status === filterStatus);
  }

  const sortedTasks = [...filteredTasks].sort((a, b) => b.priority - a.priority);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsFormOpen(true);
  };

  const quadrantCounts = {
    Q1: activeTasks.filter(t => getTaskQuadrant(t) === 'Q1').length,
    Q2: activeTasks.filter(t => getTaskQuadrant(t) === 'Q2').length,
    Q3: activeTasks.filter(t => getTaskQuadrant(t) === 'Q3').length,
    Q4: activeTasks.filter(t => getTaskQuadrant(t) === 'Q4').length,
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
              onClick={() => setFilterQuadrant('all')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filterQuadrant === 'all'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Alla ({activeTasks.length})
            </button>
            <button
              onClick={() => setFilterQuadrant('Q1')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filterQuadrant === 'Q1'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Q1 ({quadrantCounts.Q1})
            </button>
            <button
              onClick={() => setFilterQuadrant('Q2')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filterQuadrant === 'Q2'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Q2 ({quadrantCounts.Q2})
            </button>
            <button
              onClick={() => setFilterQuadrant('Q3')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filterQuadrant === 'Q3'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Q3 ({quadrantCounts.Q3})
            </button>
            <button
              onClick={() => setFilterQuadrant('Q4')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filterQuadrant === 'Q4'
                  ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              Q4 ({quadrantCounts.Q4})
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
