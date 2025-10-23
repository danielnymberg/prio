import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { Project } from '@/lib/types';
import { calculateProjectMetrics } from '@/lib/projectMetrics';
import { useNavigate } from 'react-router-dom';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import {
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { CapacityTimeline } from '@/components/capacity/CapacityTimeline';

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
      <div className="e-flex e-align-center e-justify-center" style={{
        minHeight: '100vh',
        backgroundColor: 'var(--e-surface)'
      }}>
        <div className="e-animate-spin e-rounded-full" style={{
          height: '48px',
          width: '48px',
          borderBottom: '2px solid var(--primary-500)'
        }} />
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
    <>
      {/* Header */}
      <div className="e-flex e-align-center e-justify-between e-mb-16">
        <div>
          <h1 className="e-text-2xl e-font-bold e-mb-4">
            Översikt
          </h1>
          <p className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>
            Planera {timeHorizon} månad{parseInt(timeHorizon) > 1 ? 'er' : ''} framåt
          </p>
        </div>

        {/* Tidshoriont-väljare */}
        <div className="e-flex e-gap-8">
          {(['1', '3', '6', '12'] as TimeHorizon[]).map((horizon) => (
            <button
              key={horizon}
              onClick={() => setTimeHorizon(horizon)}
              className={`e-btn ${timeHorizon === horizon ? 'e-primary' : 'e-outline'}`}
              style={{
                padding: '4px 12px',
                minHeight: '28px'
              }}
            >
              {horizon} mån
            </button>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="e-flex e-gap-8 e-mb-16">
        <DropDownListComponent
          dataSource={[{ value: 'all', text: 'Alla klienter' }, ...clients.map(c => ({ value: c, text: c }))]}
          fields={{ text: 'text', value: 'value' }}
          value={selectedClient}
          change={(e: any) => setSelectedClient(e.value)}
          placeholder="Filtrera klient"
          cssClass="e-outline"
          style={{ width: '200px' }}
        />
        <DropDownListComponent
          dataSource={[
            { value: 'all', text: 'Alla status' },
            { value: 'active', text: 'Aktiva' },
            { value: 'completed', text: 'Klara' }
          ]}
          fields={{ text: 'text', value: 'value' }}
          value={selectedStatus}
          change={(e: any) => setSelectedStatus(e.value)}
          placeholder="Filtrera status"
          cssClass="e-outline"
          style={{ width: '200px' }}
        />
      </div>

      {/* Statistik-kort */}
      <div className="e-grid e-gap-8 e-mb-16" style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'
      }}>
        <div className="e-p-12 e-border e-rounded-lg" style={{
          borderColor: 'var(--primary-500)',
          borderWidth: '2px'
        }}>
          <div className="e-flex e-align-center e-gap-4 e-mb-4">
            <Sparkles style={{ height: '16px', width: '16px', color: 'var(--primary-600)' }} />
            <span className="e-text-xs e-font-medium" style={{ color: 'var(--e-text-secondary)' }}>
              Totalt
            </span>
          </div>
          <p className="e-text-xl e-font-bold e-m-0">{stats.total}</p>
          <p className="e-text-xs e-m-0" style={{ color: 'var(--e-text-secondary)' }}>projekt</p>
        </div>

        <div className="e-p-12 e-border e-rounded-lg" style={{
          borderColor: '#10b981',
          borderWidth: '2px'
        }}>
          <div className="e-flex e-align-center e-gap-4 e-mb-4">
            <CheckCircle2 style={{ height: '16px', width: '16px', color: '#10b981' }} />
            <span className="e-text-xs e-font-medium" style={{ color: 'var(--e-text-secondary)' }}>
              Klara
            </span>
          </div>
          <p className="e-text-xl e-font-bold e-m-0">{stats.completed}</p>
          <p className="e-text-xs e-m-0" style={{ color: 'var(--e-text-secondary)' }}>projekt</p>
        </div>

        <div className="e-p-12 e-border e-rounded-lg" style={{
          borderColor: 'var(--warning-500)',
          borderWidth: '2px'
        }}>
          <div className="e-flex e-align-center e-gap-4 e-mb-4">
            <Clock style={{ height: '16px', width: '16px', color: 'var(--warning-500)' }} />
            <span className="e-text-xs e-font-medium" style={{ color: 'var(--e-text-secondary)' }}>
              Totalt
            </span>
          </div>
          <p className="e-text-xl e-font-bold e-m-0">{stats.totalQuotedHours}h</p>
          <p className="e-text-xs e-m-0" style={{ color: 'var(--e-text-secondary)' }}>offererat</p>
        </div>

        <div className="e-p-12 e-border e-rounded-lg" style={{
          borderColor: '#8b5cf6',
          borderWidth: '2px'
        }}>
          <div className="e-flex e-align-center e-gap-4 e-mb-4">
            <TrendingUp style={{ height: '16px', width: '16px', color: '#8b5cf6' }} />
            <span className="e-text-xs e-font-medium" style={{ color: 'var(--e-text-secondary)' }}>
              Budget
            </span>
          </div>
          <p className="e-text-xl e-font-bold e-m-0">{(stats.totalBudget / 1000).toFixed(0)}k</p>
          <p className="e-text-xs e-m-0" style={{ color: 'var(--e-text-secondary)' }}>kr totalt</p>
        </div>
      </div>

      {/* Varningar */}
      {(urgentProjects.length > 0 || overBudgetProjects.length > 0) && (
        <div className="e-grid e-gap-8 e-mb-16" style={{
          gridTemplateColumns: 'repeat(auto-fit, minmin(250px, 1fr))'
        }}>
          {urgentProjects.length > 0 && (
            <div className="e-p-12 e-border e-rounded-lg" style={{
              backgroundColor: '#fef3c7',
              borderColor: 'var(--warning-500)',
              borderWidth: '2px'
            }}>
              <div className="e-flex e-align-center e-gap-4 e-mb-8">
                <AlertTriangle style={{ height: '16px', width: '16px', color: 'var(--warning-600)' }} />
                <h3 className="e-font-bold e-m-0 e-text-sm" style={{ color: '#78350f' }}>
                  Brådskande deadlines
                </h3>
              </div>
              <p className="e-text-xs e-mb-8" style={{ color: '#92400e' }}>
                {urgentProjects.length} projekt med deadline inom 2 veckor
              </p>
              <div className="e-flex e-flex-column e-gap-4">
                {urgentProjects.slice(0, 3).map(project => (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="e-text-xs e-cursor-pointer"
                    style={{ color: '#78350f' }}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                  >
                    • {project.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {overBudgetProjects.length > 0 && (
            <div className="e-p-12 e-border e-rounded-lg" style={{
              backgroundColor: '#fee2e2',
              borderColor: '#ef4444',
              borderWidth: '2px'
            }}>
              <div className="e-flex e-align-center e-gap-4 e-mb-8">
                <AlertTriangle style={{ height: '16px', width: '16px', color: '#dc2626' }} />
                <h3 className="e-font-bold e-m-0 e-text-sm" style={{ color: '#7f1d1d' }}>
                  Budgetöverskridning
                </h3>
              </div>
              <p className="e-text-xs e-mb-8" style={{ color: '#991b1b' }}>
                {overBudgetProjects.length} projekt över budget
              </p>
              <div className="e-flex e-flex-column e-gap-4">
                {overBudgetProjects.slice(0, 3).map(project => (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="e-text-xs e-cursor-pointer"
                    style={{ color: '#7f1d1d' }}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
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
      <div className="e-border e-rounded-lg e-p-16">
        <h2 className="e-text-lg e-font-bold e-mb-12 e-flex e-align-center e-gap-8">
          <Calendar style={{ height: '20px', width: '20px' }} />
          Projekttidslinje
        </h2>

        {filteredProjects.length === 0 ? (
          <div className="e-text-center e-py-32">
            <p style={{ color: 'var(--e-text-secondary)' }}>
              Inga projekt i denna tidsperiod
            </p>
          </div>
        ) : (
          <div className="e-flex e-flex-column e-gap-8">
            {filteredProjects.map(project => {
              const projectTasks = tasks.filter(t => t.project_id === project.id);
              const metrics = calculateProjectMetrics(project, projectTasks);
              const daysUntilDeadline = project.project_deadline
                ? Math.ceil(
                    (new Date(project.project_deadline).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                  )
                : null;

              const getDeadlineStyle = () => {
                if (daysUntilDeadline === null || project.status === 'completed') return null;
                if (daysUntilDeadline < 0) return { bg: '#fee2e2', color: '#991b1b' };
                if (daysUntilDeadline <= 14) return { bg: '#fef3c7', color: '#78350f' };
                return { bg: '#fef3c7', color: '#78350f' };
              };
              const deadlineStyle = getDeadlineStyle();

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="e-p-12 e-border e-rounded-lg e-cursor-pointer e-transition"
                  style={{
                    borderColor: project.color,
                    borderWidth: '2px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div className="e-flex e-align-start e-justify-between e-mb-8">
                    <div className="e-flex-1">
                      <h3 className="e-font-bold e-text-base e-m-0">
                        {project.name}
                      </h3>
                      {project.client_name && (
                        <p className="e-text-xs e-m-0" style={{ color: 'var(--e-text-secondary)' }}>
                          {project.client_name}
                        </p>
                      )}
                    </div>

                    {project.status === 'completed' && (
                      <span className="e-px-8 e-py-2 e-rounded-full e-text-xs e-font-medium" style={{
                        backgroundColor: '#d1fae5',
                        color: '#065f46'
                      }}>
                        Klart
                      </span>
                    )}

                    {deadlineStyle && (
                      <span className="e-px-8 e-py-2 e-rounded-full e-text-xs e-font-medium" style={{
                        backgroundColor: deadlineStyle.bg,
                        color: deadlineStyle.color
                      }}>
                        {daysUntilDeadline! < 0
                          ? `${Math.abs(daysUntilDeadline!)} dagar sen`
                          : daysUntilDeadline === 0
                          ? 'Idag!'
                          : `${daysUntilDeadline} dagar kvar`}
                      </span>
                    )}
                  </div>

                  <div className="e-grid e-gap-8 e-mt-8" style={{
                    gridTemplateColumns: 'repeat(4, 1fr)'
                  }}>
                    <div>
                      <span className="e-text-xs" style={{ color: 'var(--e-text-secondary)' }}>
                        Färdigt
                      </span>
                      <p className="e-text-base e-font-semibold e-m-0">
                        {project.completion_percentage}%
                      </p>
                    </div>

                    <div>
                      <span className="e-text-xs" style={{ color: 'var(--e-text-secondary)' }}>
                        Loggat
                      </span>
                      <p className="e-text-base e-font-semibold e-m-0">
                        {metrics.logged_hours}h
                      </p>
                    </div>

                    <div>
                      <span className="e-text-xs" style={{ color: 'var(--e-text-secondary)' }}>
                        Återstår
                      </span>
                      <p className="e-text-base e-font-semibold e-m-0">
                        {metrics.estimated_remaining_hours}h
                      </p>
                    </div>

                    <div>
                      <span className="e-text-xs" style={{ color: 'var(--e-text-secondary)' }}>
                        Budget
                      </span>
                      <p className="e-text-base e-font-semibold e-m-0">
                        {(project.total_budget / 1000).toFixed(0)}k
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="e-mt-8 e-rounded-full e-overflow-hidden" style={{
                    height: '6px',
                    backgroundColor: 'var(--e-border)'
                  }}>
                    <div
                      className="e-transition"
                      style={{
                        height: '100%',
                        backgroundColor: metrics.is_over_budget
                          ? '#ef4444'
                          : project.completion_percentage >= 80
                          ? '#10b981'
                          : 'var(--primary-500)',
                        width: `${Math.min(project.completion_percentage, 100)}%`
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Capacity Timeline */}
      <div className="e-mt-16">
        <CapacityTimeline />
      </div>
    </>
  );
}
