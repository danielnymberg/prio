import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { Project } from '@/lib/types';
import { calculateProjectMetrics } from '@/lib/projectMetrics';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Filter
} from 'lucide-react';

type TimeHorizon = '1' | '3' | '6' | '12';

export function OverviewView() {
  const { user } = useAuth();
  const { tasks } = useTasks();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('3');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'archived')
        .order('project_deadline', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream-50 dark:bg-charcoal-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-copper-500" />
      </div>
    );
  }

  // Filtrera projekt baserat på vald tidshorisont
  const getFilteredProjects = () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + parseInt(timeHorizon));

    return projects.filter(project => {
      // Tidshorisont
      if (project.project_deadline) {
        const deadline = new Date(project.project_deadline);
        if (deadline > futureDate) return false;
      }

      // Klient-filter
      if (selectedClient !== 'all' && project.client_name !== selectedClient) {
        return false;
      }

      // Status-filter
      if (selectedStatus !== 'all' && project.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  };

  const filteredProjects = getFilteredProjects();

  // Unika klienter för filter
  const clients = Array.from(new Set(projects.map(p => p.client_name).filter(Boolean))) as string[];

  // Statistik
  const stats = {
    total: filteredProjects.length,
    completed: filteredProjects.filter(p => p.status === 'completed').length,
    active: filteredProjects.filter(p => p.status === 'active').length,
    totalBudget: filteredProjects.reduce((sum, p) => sum + p.total_budget, 0),
    totalQuotedHours: filteredProjects.reduce((sum, p) => sum + p.quoted_hours, 0)
  };

  // Projekt med deadline inom 2 veckor
  const urgentProjects = filteredProjects.filter(project => {
    if (!project.project_deadline || project.status === 'completed') return false;
    const deadline = new Date(project.project_deadline);
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
    return deadline <= twoWeeksFromNow;
  });

  // Projekt över budget
  const overBudgetProjects = filteredProjects.filter(project => {
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    const metrics = calculateProjectMetrics(project, projectTasks);
    return metrics.is_over_budget;
  });

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-cream-50">Översikt</h1>
          <p className="text-stone-600 dark:text-stone-400 mt-1">
            Planera {timeHorizon} månad{parseInt(timeHorizon) > 1 ? 'er' : ''} framåt
          </p>
        </div>

        {/* Tidshoriont-väljare */}
        <div className="flex gap-2">
          {(['1', '3', '6', '12'] as TimeHorizon[]).map((horizon) => (
            <button
              key={horizon}
              onClick={() => setTimeHorizon(horizon)}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                timeHorizon === horizon
                  ? 'bg-copper-500 text-white shadow-soft'
                  : 'bg-sand-100 dark:bg-charcoal-850 text-stone-700 dark:text-stone-300 hover:bg-sand-200 dark:hover:bg-charcoal-800'
              }`}
            >
              {horizon} mån
            </button>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-8">
        <div className="flex items-center gap-2 bg-cream-100 dark:bg-charcoal-900 px-4 py-3 rounded-xl border border-sand-200 dark:border-charcoal-800">
          <Filter className="h-4 w-4 text-stone-500" />
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="bg-transparent text-sm font-medium text-stone-700 dark:text-stone-300 focus:outline-none cursor-pointer"
          >
            <option value="all">Alla klienter</option>
            {clients.map(client => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-cream-100 dark:bg-charcoal-900 px-4 py-3 rounded-xl border border-sand-200 dark:border-charcoal-800">
          <Filter className="h-4 w-4 text-stone-500" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-transparent text-sm font-medium text-stone-700 dark:text-stone-300 focus:outline-none cursor-pointer"
          >
            <option value="all">Alla status</option>
            <option value="active">Aktiva</option>
            <option value="completed">Klara</option>
          </select>
        </div>
      </div>

      {/* Statistik-kort */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-6 bg-cream-100 dark:bg-charcoal-850 border-2 border-copper-500 dark:border-copper-400 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-copper-600 dark:text-copper-400" />
            <span className="text-sm font-medium text-stone-600 dark:text-stone-400">
              Totalt
            </span>
          </div>
          <p className="text-3xl font-bold text-stone-900 dark:text-cream-50">{stats.total}</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">projekt</p>
        </div>

        <div className="p-6 bg-cream-100 dark:bg-charcoal-850 border-2 border-success-500 dark:border-success-400 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-success-600 dark:text-success-400" />
            <span className="text-sm font-medium text-stone-600 dark:text-stone-400">
              Klara
            </span>
          </div>
          <p className="text-3xl font-bold text-stone-900 dark:text-cream-50">{stats.completed}</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">projekt</p>
        </div>

        <div className="p-6 bg-cream-100 dark:bg-charcoal-850 border-2 border-warning-500 dark:border-warning-400 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-warning-600 dark:text-warning-400" />
            <span className="text-sm font-medium text-stone-600 dark:text-stone-400">
              Totalt
            </span>
          </div>
          <p className="text-3xl font-bold text-stone-900 dark:text-cream-50">{stats.totalQuotedHours}h</p>
          <p className="text-sm text-stone-500 dark:text-stone-400">offererat</p>
        </div>

        <div className="p-6 bg-cream-100 dark:bg-charcoal-850 border-2 border-purple-500 dark:border-purple-400 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-stone-600 dark:text-stone-400">
              Budget
            </span>
          </div>
          <p className="text-2xl font-bold text-stone-900 dark:text-cream-50">
            {(stats.totalBudget / 1000).toFixed(0)}k
          </p>
          <p className="text-sm text-stone-500 dark:text-stone-400">kr totalt</p>
        </div>
      </div>

      {/* Varningar */}
      {(urgentProjects.length > 0 || overBudgetProjects.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {urgentProjects.length > 0 && (
            <div className="p-6 bg-warning-50 dark:bg-warning-950 border-2 border-warning-500 dark:border-warning-400 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                <h3 className="font-bold text-warning-900 dark:text-warning-100">
                  Brådskande deadlines
                </h3>
              </div>
              <p className="text-sm text-warning-800 dark:text-warning-200 mb-2">
                {urgentProjects.length} projekt med deadline inom 2 veckor
              </p>
              <div className="space-y-1">
                {urgentProjects.slice(0, 3).map(project => (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="text-sm text-warning-900 dark:text-warning-100 hover:underline cursor-pointer"
                  >
                    • {project.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {overBudgetProjects.length > 0 && (
            <div className="p-6 bg-error-50 dark:bg-error-950 border-2 border-error-500 dark:border-error-400 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-error-600 dark:text-error-400" />
                <h3 className="font-bold text-error-900 dark:text-error-100">
                  Budgetöverskridning
                </h3>
              </div>
              <p className="text-sm text-error-800 dark:text-error-200 mb-2">
                {overBudgetProjects.length} projekt över budget
              </p>
              <div className="space-y-1">
                {overBudgetProjects.slice(0, 3).map(project => (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="text-sm text-error-900 dark:text-error-100 hover:underline cursor-pointer"
                  >
                    • {project.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Projekttidslinje */}
      <div className="bg-cream-100 dark:bg-charcoal-850 rounded-xl border-2 border-sand-200 dark:border-charcoal-800 p-8">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-stone-900 dark:text-cream-50">
          <Calendar className="h-6 w-6" />
          Projekttidslinje
        </h2>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-stone-500 dark:text-stone-400">
              Inga projekt i denna tidsperiod
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProjects.map(project => {
              const projectTasks = tasks.filter(t => t.project_id === project.id);
              const metrics = calculateProjectMetrics(project, projectTasks);
              const daysUntilDeadline = project.project_deadline
                ? Math.ceil(
                    (new Date(project.project_deadline).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                  )
                : null;

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="p-6 border-2 rounded-xl hover:shadow-soft transition-all cursor-pointer bg-cream-50 dark:bg-charcoal-900"
                  style={{ borderColor: project.color }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-stone-900 dark:text-cream-50">{project.name}</h3>
                      {project.client_name && (
                        <p className="text-sm text-stone-600 dark:text-stone-400">
                          {project.client_name}
                        </p>
                      )}
                    </div>

                    {project.status === 'completed' && (
                      <span className="px-3 py-1 bg-success-100 dark:bg-success-950 text-success-700 dark:text-success-300 rounded-full text-sm font-medium">
                        Klart
                      </span>
                    )}

                    {daysUntilDeadline !== null && project.status !== 'completed' && (
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          daysUntilDeadline < 0
                            ? 'bg-error-100 dark:bg-error-950 text-error-700 dark:text-error-300'
                            : daysUntilDeadline <= 14
                            ? 'bg-warning-100 dark:bg-warning-950 text-warning-700 dark:text-warning-300'
                            : 'bg-copper-100 dark:bg-copper-950 text-copper-700 dark:text-copper-300'
                        }`}
                      >
                        {daysUntilDeadline < 0
                          ? `${Math.abs(daysUntilDeadline)} dagar sen`
                          : daysUntilDeadline === 0
                          ? 'Idag!'
                          : `${daysUntilDeadline} dagar kvar`}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-4 mt-3">
                    <div>
                      <span className="text-xs text-stone-500 dark:text-stone-400">
                        Färdigt
                      </span>
                      <p className="text-lg font-semibold text-stone-900 dark:text-cream-50">
                        {project.completion_percentage}%
                      </p>
                    </div>

                    <div>
                      <span className="text-xs text-stone-500 dark:text-stone-400">
                        Loggat
                      </span>
                      <p className="text-lg font-semibold text-stone-900 dark:text-cream-50">
                        {metrics.logged_hours}h
                      </p>
                    </div>

                    <div>
                      <span className="text-xs text-stone-500 dark:text-stone-400">
                        Återstår
                      </span>
                      <p className="text-lg font-semibold text-stone-900 dark:text-cream-50">
                        {metrics.estimated_remaining_hours}h
                      </p>
                    </div>

                    <div>
                      <span className="text-xs text-stone-500 dark:text-stone-400">
                        Budget
                      </span>
                      <p className="text-lg font-semibold text-stone-900 dark:text-cream-50">
                        {(project.total_budget / 1000).toFixed(0)}k
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-2 bg-sand-200 dark:bg-charcoal-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        metrics.is_over_budget
                          ? 'bg-error-500'
                          : project.completion_percentage >= 80
                          ? 'bg-success-500'
                          : 'bg-copper-500'
                      }`}
                      style={{ width: `${Math.min(project.completion_percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
