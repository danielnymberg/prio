import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { Project } from '@/lib/types';
import { calculateProjectMetrics } from '@/lib/projectMetrics';
import { ProjectProgressSlider } from './ProjectProgressSlider';
import { ArrowLeft, Calendar, User, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export function ProjectDetailView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tasks } = useTasks();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && id) {
      fetchProject();
    }
  }, [user, id]);

  const fetchProject = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Kunde inte hämta projekt');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-copper-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-center text-gray-500">Projekt hittades inte</p>
      </div>
    );
  }

  const projectTasks = tasks.filter(task => task.project_id === project.id);
  const metrics = calculateProjectMetrics(project, tasks);

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <button
        onClick={() => navigate('/projects')}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
      >
        <ArrowLeft className="h-5 w-5" />
        Tillbaka till projekt
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{project.name}</h1>

        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          {project.client_name && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{project.client_name}</span>
            </div>
          )}

          {project.project_deadline && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                Deadline: {new Date(project.project_deadline).toLocaleDateString('sv-SE')}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{projectTasks.length} tasks kopplade</span>
          </div>
        </div>

        {project.description && (
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {project.description}
          </p>
        )}
      </div>

      {/* Progress slider */}
      <ProjectProgressSlider
        project={project}
        metrics={metrics}
        onUpdate={fetchProject}
      />

      {/* Kopplade tasks */}
      {projectTasks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Kopplade tasks</h2>
          <div className="space-y-2">
            {projectTasks.map(task => (
              <div
                key={task.id}
                className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{task.title}</h3>
                    {task.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded ${
                        task.status === 'done'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : task.status === 'in_progress'
                          ? 'bg-sand-100 dark:bg-charcoal-850 text-copper-600 dark:text-sand-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {task.status === 'done' ? 'Klar' :
                         task.status === 'in_progress' ? 'Pågående' : 'Ej påbörjad'}
                      </span>
                      {task.estimated_duration && (
                        <span>{Math.round(task.estimated_duration / 60 * 10) / 10}h</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {projectTasks.length === 0 && (
        <div className="mt-8 p-8 border-2 border-dashed rounded-lg text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Inga tasks kopplade till detta projekt än
          </p>
          <button
            onClick={() => navigate('/focus')}
            className="px-4 py-2 bg-copper-600 text-white rounded-lg hover:bg-copper-600"
          >
            Skapa task och koppla till projekt
          </button>
        </div>
      )}
    </div>
  );
}
