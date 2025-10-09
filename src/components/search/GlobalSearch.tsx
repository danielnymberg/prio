import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { Task, Project } from '@/lib/types';
import { Search, FileText, FolderKanban, X, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDuration } from '@/lib/utils';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchResult = {
  type: 'task' | 'project';
  id: string;
  title: string;
  subtitle?: string;
  icon: any;
  data: Task | Project;
};

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const { user } = useAuth();
  const { tasks } = useTasks();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (user && isOpen) {
      fetchProjects();
    }
  }, [user, isOpen]);

  const fetchProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id);
    setProjects(data || []);
  };

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchQuery = query.toLowerCase();
    const taskResults: SearchResult[] = [];
    const projectResults: SearchResult[] = [];

    // Sök i uppgifter
    tasks.forEach(task => {
      const matches =
        task.title.toLowerCase().includes(searchQuery) ||
        task.description?.toLowerCase().includes(searchQuery);

      if (matches) {
        const project = task.project_id ? projects.find(p => p.id === task.project_id) : null;
        taskResults.push({
          type: 'task',
          id: task.id,
          title: task.title,
          subtitle: project ? `${project.name}${project.client_name ? ` • ${project.client_name}` : ''}` : task.estimated_duration ? formatDuration(task.estimated_duration) : undefined,
          icon: task.status === 'done' ? Calendar : FileText,
          data: task
        });
      }
    });

    // Sök i projekt (namn + kund)
    projects.forEach(project => {
      const matches =
        project.name.toLowerCase().includes(searchQuery) ||
        project.client_name?.toLowerCase().includes(searchQuery);

      if (matches) {
        projectResults.push({
          type: 'project',
          id: project.id,
          title: project.name,
          subtitle: project.client_name || undefined,
          icon: FolderKanban,
          data: project
        });
      }
    });

    setResults([...taskResults, ...projectResults].slice(0, 10));
    setSelectedIndex(0);
  }, [query, tasks, projects]);

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'task') {
      navigate(`/task/${result.id}`);
    } else if (result.type === 'project') {
      navigate(`/projects/${result.id}`);
    }
    onClose();
    setQuery('');
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      onClose();
      setQuery('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  }, [isOpen, results, selectedIndex]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök uppgifter, projekt, kunder..."
            className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {results.length === 0 && query && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Inga resultat för "{query}"
            </div>
          )}

          {results.length === 0 && !query && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Börja skriva för att söka...
            </div>
          )}

          {results.map((result, index) => {
            const Icon = result.icon;
            return (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-copper-50 dark:bg-copper-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Icon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {result.title}
                  </p>
                  {result.subtitle && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {result.subtitle}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400 uppercase">
                  {result.type === 'task' ? 'Uppgift' : 'Projekt'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd> navigera</span>
            <span><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> välj</span>
            <span><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd> stäng</span>
          </div>
        </div>
      </div>
    </div>
  );
}
