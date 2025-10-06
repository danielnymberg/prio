import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Project } from '@/lib/types';
import { ProjectForm } from './ProjectForm';
import { ProjectOnboardingModal } from '../onboarding/ProjectOnboardingModal';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, DollarSign, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export function ProjectsView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProjects();

      // Check if user has seen project onboarding
      const completed = localStorage.getItem('prio_project_onboarding_completed');
      if (!completed) {
        setShowOnboarding(true);
      }
    }
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Kunde inte hämta projekt');
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

  if (showForm) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Skapa nytt projekt</h1>
        <ProjectForm
          onSuccess={() => {
            setShowForm(false);
            fetchProjects();
          }}
          onCancel={() => setShowForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Projekt</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-copper-600 text-white rounded-lg hover:bg-copper-600"
        >
          <Plus className="h-5 w-5" />
          Nytt projekt
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Inga projekt än</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-copper-600 text-white rounded-lg hover:bg-copper-600"
          >
            Skapa ditt första projekt
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              className="p-6 border-2 rounded-xl hover:shadow-lg transition-shadow cursor-pointer"
              style={{ borderColor: project.color }}
            >
              <h3 className="font-bold text-lg mb-2">{project.name}</h3>

              {project.client_name && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {project.client_name}
                </p>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span>{project.quoted_hours}h offererat</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span>{project.total_budget.toLocaleString('sv-SE')} kr</span>
                </div>

                {project.project_deadline && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>{new Date(project.project_deadline).toLocaleDateString('sv-SE')}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Färdigt:</span>
                  <span className="font-semibold">{project.completion_percentage}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Onboarding Modal */}
      <ProjectOnboardingModal
        isOpen={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
    </div>
  );
}
