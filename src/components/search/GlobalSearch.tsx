import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { Task, Project } from '@/lib/types';
import { Search, FileText, Folder, X, Calendar } from 'lucide-react';
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
          icon: Folder,
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '20vh', paddingLeft: '16px', paddingRight: '16px' }}>
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Search Modal */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '672px', backgroundColor: 'var(--e-surface)', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', border: '1px solid var(--e-border)' }}>
        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid var(--e-border)' }}>
          <Search style={{ height: '20px', width: '20px', color: 'var(--e-text)', opacity: 0.4 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök uppgifter, projekt, kunder..."
            style={{ flex: 1, backgroundColor: 'transparent', color: 'var(--e-text)', outline: 'none', border: 'none' }}
            autoFocus
          />
          <button
            onClick={onClose}
            style={{ padding: '4px', backgroundColor: 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--e-surface)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X style={{ height: '20px', width: '20px', color: 'var(--e-text)', opacity: 0.4 }} />
          </button>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {results.length === 0 && query && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--e-text)', opacity: 0.5 }}>
              Inga resultat för "{query}"
            </div>
          )}

          {results.length === 0 && !query && (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--e-text)', opacity: 0.5 }}>
              Börja skriva för att söka...
            </div>
          )}

          {results.map((result, index) => {
            const Icon = result.icon;
            return (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  textAlign: 'left',
                  transition: 'colors 0.2s',
                  backgroundColor: index === selectedIndex ? 'var(--primary-50)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (index !== selectedIndex) {
                    e.currentTarget.style.backgroundColor = 'var(--e-surface)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (index !== selectedIndex) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Icon style={{ height: '20px', width: '20px', color: 'var(--e-text)', opacity: 0.4, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: '500', color: 'var(--e-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {result.title}
                  </p>
                  {result.subtitle && (
                    <p style={{ fontSize: '14px', color: 'var(--e-text)', opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {result.subtitle}
                    </p>
                  )}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--e-text)', opacity: 0.4, textTransform: 'uppercase' }}>
                  {result.type === 'task' ? 'Uppgift' : 'Projekt'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--e-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--e-text)', opacity: 0.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span><kbd style={{ padding: '4px 8px', backgroundColor: 'var(--e-surface)', borderRadius: '4px' }}>↑↓</kbd> navigera</span>
            <span><kbd style={{ padding: '4px 8px', backgroundColor: 'var(--e-surface)', borderRadius: '4px' }}>Enter</kbd> välj</span>
            <span><kbd style={{ padding: '4px 8px', backgroundColor: 'var(--e-surface)', borderRadius: '4px' }}>Esc</kbd> stäng</span>
          </div>
        </div>
      </div>
    </div>
  );
}
