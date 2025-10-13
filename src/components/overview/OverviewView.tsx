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
    <div className="e-mx-auto" style={{ maxWidth: '80rem', padding: '2rem' }}>
      {/* Header */}
      <div className="e-flex e-align-center e-justify-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="e-m-0 e-font-bold" style={{
            fontSize: '1.875rem',
            color: 'var(--e-text)'
          }}>
            Översikt
          </h1>
          <p style={{
            color: 'var(--e-text-secondary)',
            marginTop: '0.25rem'
          }}>
            Planera {timeHorizon} månad{parseInt(timeHorizon) > 1 ? 'er' : ''} framåt
          </p>
        </div>

        {/* Tidshoriont-väljare */}
        <div className="e-flex" style={{ gap: '0.5rem' }}>
          {(['1', '3', '6', '12'] as TimeHorizon[]).map((horizon) => (
            <button
              key={horizon}
              onClick={() => setTimeHorizon(horizon)}
              className="e-font-medium e-transition e-cursor-pointer"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.75rem',
                backgroundColor: timeHorizon === horizon ? 'var(--primary-500)' : 'var(--e-surface)',
                color: timeHorizon === horizon ? 'white' : 'var(--e-text)',
                border: timeHorizon === horizon ? 'none' : '1px solid var(--e-border)',
                boxShadow: timeHorizon === horizon ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              {horizon} mån
            </button>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="e-flex" style={{ gap: '0.75rem', marginBottom: '2rem' }}>
        <div className="e-flex e-align-center e-border e-rounded-lg" style={{
          gap: '0.5rem',
          backgroundColor: 'var(--e-surface)',
          padding: '0.75rem 1rem'
        }}>
          <Filter style={{ height: '16px', width: '16px', color: 'var(--e-text-secondary)' }} />
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="e-text-sm e-font-medium e-cursor-pointer"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--e-text)',
              outline: 'none',
              border: 'none'
            }}
          >
            <option value="all">Alla klienter</option>
            {clients.map(client => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>
        </div>

        <div className="e-flex e-align-center e-border e-rounded-lg" style={{
          gap: '0.5rem',
          backgroundColor: 'var(--e-surface)',
          padding: '0.75rem 1rem'
        }}>
          <Filter style={{ height: '16px', width: '16px', color: 'var(--e-text-secondary)' }} />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="e-text-sm e-font-medium e-cursor-pointer"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--e-text)',
              outline: 'none',
              border: 'none'
            }}
          >
            <option value="all">Alla status</option>
            <option value="active">Aktiva</option>
            <option value="completed">Klara</option>
          </select>
        </div>
      </div>

      {/* Statistik-kort */}
      <div className="e-grid" style={{
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          padding: '1.5rem',
          backgroundColor: 'var(--e-surface)',
          border: '2px solid var(--primary-500)',
          borderRadius: '0.75rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <Sparkles style={{ height: '20px', width: '20px', color: 'var(--primary-600)' }} />
            <span style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--e-text-secondary)'
            }}>
              Totalt
            </span>
          </div>
          <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--e-text)', margin: 0 }}>
            {stats.total}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--e-text-secondary)', margin: 0 }}>projekt</p>
        </div>

        <div style={{
          padding: '1.5rem',
          backgroundColor: 'var(--e-surface)',
          border: '2px solid #10b981',
          borderRadius: '0.75rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <CheckCircle2 style={{ height: '20px', width: '20px', color: '#10b981' }} />
            <span style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--e-text-secondary)'
            }}>
              Klara
            </span>
          </div>
          <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--e-text)', margin: 0 }}>
            {stats.completed}
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--e-text-secondary)', margin: 0 }}>projekt</p>
        </div>

        <div style={{
          padding: '1.5rem',
          backgroundColor: 'var(--e-surface)',
          border: '2px solid var(--warning-500)',
          borderRadius: '0.75rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <Clock style={{ height: '20px', width: '20px', color: 'var(--warning-500)' }} />
            <span style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--e-text-secondary)'
            }}>
              Totalt
            </span>
          </div>
          <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--e-text)', margin: 0 }}>
            {stats.totalQuotedHours}h
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--e-text-secondary)', margin: 0 }}>offererat</p>
        </div>

        <div style={{
          padding: '1.5rem',
          backgroundColor: 'var(--e-surface)',
          border: '2px solid #8b5cf6',
          borderRadius: '0.75rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <TrendingUp style={{ height: '20px', width: '20px', color: '#8b5cf6' }} />
            <span style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'var(--e-text-secondary)'
            }}>
              Budget
            </span>
          </div>
          <p style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: 'var(--e-text)',
            margin: 0
          }}>
            {(stats.totalBudget / 1000).toFixed(0)}k
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--e-text-secondary)', margin: 0 }}>kr totalt</p>
        </div>
      </div>

      {/* Varningar */}
      {(urgentProjects.length > 0 || overBudgetProjects.length > 0) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {urgentProjects.length > 0 && (
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#fef3c7',
              border: '2px solid var(--warning-500)',
              borderRadius: '0.75rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <AlertTriangle style={{ height: '20px', width: '20px', color: 'var(--warning-600)' }} />
                <h3 style={{ fontWeight: 'bold', color: '#78350f', margin: 0 }}>
                  Brådskande deadlines
                </h3>
              </div>
              <p style={{
                fontSize: '0.875rem',
                color: '#92400e',
                marginBottom: '0.5rem'
              }}>
                {urgentProjects.length} projekt med deadline inom 2 veckor
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {urgentProjects.slice(0, 3).map(project => (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    style={{
                      fontSize: '0.875rem',
                      color: '#78350f',
                      cursor: 'pointer',
                      textDecoration: 'none'
                    }}
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
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#fee2e2',
              border: '2px solid #ef4444',
              borderRadius: '0.75rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <AlertTriangle style={{ height: '20px', width: '20px', color: '#dc2626' }} />
                <h3 style={{ fontWeight: 'bold', color: '#7f1d1d', margin: 0 }}>
                  Budgetöverskridning
                </h3>
              </div>
              <p style={{
                fontSize: '0.875rem',
                color: '#991b1b',
                marginBottom: '0.5rem'
              }}>
                {overBudgetProjects.length} projekt över budget
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {overBudgetProjects.slice(0, 3).map(project => (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    style={{
                      fontSize: '0.875rem',
                      color: '#7f1d1d',
                      cursor: 'pointer',
                      textDecoration: 'none'
                    }}
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
      <div style={{
        backgroundColor: 'var(--e-surface)',
        borderRadius: '0.75rem',
        border: '2px solid var(--e-border)',
        padding: '2rem'
      }}>
        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--e-text)'
        }}>
          <Calendar style={{ height: '24px', width: '24px' }} />
          Projekttidslinje
        </h2>

        {filteredProjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ color: 'var(--e-text-secondary)' }}>
              Inga projekt i denna tidsperiod
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                  style={{
                    padding: '1.5rem',
                    border: `2px solid ${project.color}`,
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    backgroundColor: 'var(--e-surface)',
                    transition: 'box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontWeight: 'bold',
                        fontSize: '1.125rem',
                        color: 'var(--e-text)',
                        margin: 0
                      }}>
                        {project.name}
                      </h3>
                      {project.client_name && (
                        <p style={{
                          fontSize: '0.875rem',
                          color: 'var(--e-text-secondary)',
                          margin: 0
                        }}>
                          {project.client_name}
                        </p>
                      )}
                    </div>

                    {project.status === 'completed' && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: '#d1fae5',
                        color: '#065f46',
                        borderRadius: '9999px',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        Klart
                      </span>
                    )}

                    {deadlineStyle && (
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          backgroundColor: deadlineStyle.bg,
                          color: deadlineStyle.color
                        }}
                      >
                        {daysUntilDeadline! < 0
                          ? `${Math.abs(daysUntilDeadline!)} dagar sen`
                          : daysUntilDeadline === 0
                          ? 'Idag!'
                          : `${daysUntilDeadline} dagar kvar`}
                      </span>
                    )}
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '1rem',
                    marginTop: '0.75rem'
                  }}>
                    <div>
                      <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--e-text-secondary)'
                      }}>
                        Färdigt
                      </span>
                      <p style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: 'var(--e-text)',
                        margin: 0
                      }}>
                        {project.completion_percentage}%
                      </p>
                    </div>

                    <div>
                      <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--e-text-secondary)'
                      }}>
                        Loggat
                      </span>
                      <p style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: 'var(--e-text)',
                        margin: 0
                      }}>
                        {metrics.logged_hours}h
                      </p>
                    </div>

                    <div>
                      <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--e-text-secondary)'
                      }}>
                        Återstår
                      </span>
                      <p style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: 'var(--e-text)',
                        margin: 0
                      }}>
                        {metrics.estimated_remaining_hours}h
                      </p>
                    </div>

                    <div>
                      <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--e-text-secondary)'
                      }}>
                        Budget
                      </span>
                      <p style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: 'var(--e-text)',
                        margin: 0
                      }}>
                        {(project.total_budget / 1000).toFixed(0)}k
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{
                    marginTop: '0.75rem',
                    height: '8px',
                    backgroundColor: 'var(--e-border)',
                    borderRadius: '9999px',
                    overflow: 'hidden'
                  }}>
                    <div
                      style={{
                        height: '100%',
                        transition: 'width 0.3s',
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
      <div style={{ marginTop: '2rem' }}>
        <CapacityTimeline />
      </div>
    </div>
  );
}
