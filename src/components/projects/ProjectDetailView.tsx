import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Project } from '@/lib/types';
import { ArrowLeft, Calendar, DollarSign, Clock, User } from 'lucide-react';
import toast from 'react-hot-toast';

export function ProjectDetailView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
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
      toast.error('Kunde inte ladda projekt');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Projekt hittades inte</p>
          <button
            onClick={() => navigate('/projects')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Tillbaka till projekt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Tillbaka till projekt
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {project.name}
            </h1>
            {project.client_name && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span>{project.client_name}</span>
              </div>
            )}
          </div>
          <div
            className="w-4 h-4 rounded-full border-2 border-gray-300"
            style={{ backgroundColor: project.color }}
          />
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-700 dark:text-gray-300">{project.description}</p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Budget */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total budget
            </h3>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {project.total_budget.toLocaleString('sv-SE')} kr
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {project.quoted_hours}h × {project.hourly_rate} kr/h
            {(project.external_costs || 0) > 0 && ` + ${project.external_costs} kr`}
          </p>
        </div>

        {/* Quoted Hours */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Offererade timmar
            </h3>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {project.quoted_hours}h
          </p>
          <p className="text-sm text-gray-500 mt-1">
            á {project.hourly_rate} kr/h
          </p>
        </div>

        {/* Deadline */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Deadline
            </h3>
          </div>
          {project.project_deadline ? (
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {new Date(project.project_deadline).toLocaleDateString('sv-SE')}
            </p>
          ) : (
            <p className="text-lg text-gray-500 dark:text-gray-400">Ingen deadline</p>
          )}
        </div>
      </div>

      {/* Completion */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Färdigställande
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300"
                style={{ width: `${project.completion_percentage}%` }}
              />
            </div>
          </div>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            {project.completion_percentage}%
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Status
        </h3>
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          project.status === 'active'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : project.status === 'completed'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        }`}>
          {project.status === 'active' ? 'Aktivt' : project.status === 'completed' ? 'Slutfört' : 'Arkiverat'}
        </span>
      </div>
    </div>
  );
}
