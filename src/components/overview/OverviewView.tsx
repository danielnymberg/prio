import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { Project } from '@/lib/types';
import { calculateProjectMetrics } from '@/lib/projectMetrics';
import { useNavigate } from 'react-router-dom';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
// Lucide icons replaced with SyncFusion e-icons
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--e-surface)'
      }}>
        <div style={{
          height: '48px',
          width: '48px'
        }}>Laddar...</div>
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
            Översikt
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--e-text-secondary)' }}>
            Planera {timeHorizon} månad{parseInt(timeHorizon) > 1 ? 'er' : ''} framåt
          </p>
        </div>

        {/* Tidshoriont-väljare */}
        <div style={{ display: 'flex', gap: '8px' }}>
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
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
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
      <div style={{
        display: 'grid',
        gap: '8px',
        marginBottom: '16px',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))'
      }}>
        <div className="e-card" style={{ borderColor: 'var(--e-primary)', borderWidth: '2px' }}>
          <div className="e-card-content" style={{ padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <span className="e-icons e-star" style={{ fontSize: '16px', color: 'var(--e-primary)' }}></span>
              <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--e-text-secondary)' }}>
                Totalt
              </span>
            </div>
            <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{stats.total}</p>
            <p style={{ fontSize: '12px', margin: 0, color: 'var(--e-text-secondary)' }}>projekt</p>
          </div>
        </div>

        <div className="e-card" style={{ borderColor: 'var(--e-success)', borderWidth: '2px' }}>
          <div className="e-card-content" style={{ padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <span className="e-icons e-check" style={{ fontSize: '16px', color: 'var(--e-success)' }}></span>
              <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--e-text-secondary)' }}>
                Klara
              </span>
            </div>
            <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{stats.completed}</p>
            <p style={{ fontSize: '12px', margin: 0, color: 'var(--e-text-secondary)' }}>projekt</p>
          </div>
        </div>

        <div className="e-card" style={{ borderColor: 'var(--e-warning)', borderWidth: '2px' }}>
          <div className="e-card-content" style={{ padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <span className="e-icons e-time" style={{ fontSize: '16px', color: 'var(--e-warning)' }}></span>
              <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--e-text-secondary)' }}>
                Totalt
              </span>
            </div>
            <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{stats.totalQuotedHours}h</p>
            <p style={{ fontSize: '12px', margin: 0, color: 'var(--e-text-secondary)' }}>offererat</p>
          </div>
        </div>

        <div className="e-card" style={{ borderColor: 'var(--e-info)', borderWidth: '2px' }}>
          <div className="e-card-content" style={{ padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <span className="e-icons e-arrow-up" style={{ fontSize: '16px', color: 'var(--e-info)' }}></span>
              <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--e-text-secondary)' }}>
                Budget
              </span>
            </div>
            <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{(stats.totalBudget / 1000).toFixed(0)}k</p>
            <p style={{ fontSize: '12px', margin: 0, color: 'var(--e-text-secondary)' }}>kr totalt</p>
          </div>
        </div>
      </div>

      {/* Varningar */}
      {(urgentProjects.length > 0 || overBudgetProjects.length > 0) && (
        <div style={{
          display: 'grid',
          gap: '8px',
          marginBottom: '16px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
        }}>
          {urgentProjects.length > 0 && (
            <div className="e-card" style={{
              borderColor: 'var(--e-warning)',
              borderWidth: '2px',
              backgroundColor: '#fef3c7'
            }}>
              <div className="e-card-content" style={{ padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                  <span className="e-icons e-warning" style={{ fontSize: '16px', color: 'var(--e-warning)' }}></span>
                  <h3 style={{ fontWeight: 'bold', margin: 0, fontSize: '14px', color: '#78350f' }}>
                    Brådskande deadlines
                  </h3>
                </div>
                <p style={{ fontSize: '12px', marginBottom: '8px', color: '#92400e' }}>
                  {urgentProjects.length} projekt med deadline inom 2 veckor
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {urgentProjects.slice(0, 3).map(project => (
                    <div
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      style={{ fontSize: '12px', cursor: 'pointer', color: '#78350f' }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                      • {project.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {overBudgetProjects.length > 0 && (
            <div className="e-card" style={{
              borderColor: 'var(--e-error)',
              borderWidth: '2px',
              backgroundColor: '#fee2e2'
            }}>
              <div className="e-card-content" style={{ padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                  <span className="e-icons e-warning" style={{ fontSize: '16px', color: 'var(--e-error)' }}></span>
                  <h3 style={{ fontWeight: 'bold', margin: 0, fontSize: '14px', color: '#7f1d1d' }}>
                    Budgetöverskridning
                  </h3>
                </div>
                <p style={{ fontSize: '12px', marginBottom: '8px', color: '#991b1b' }}>
                  {overBudgetProjects.length} projekt över budget
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {overBudgetProjects.slice(0, 3).map(project => (
                    <div
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      style={{ fontSize: '12px', cursor: 'pointer', color: '#7f1d1d' }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                      • {project.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Projekttidslinje */}
      <div className="e-card" style={{ marginBottom: '16px' }}>
        <div className="e-card-header">
          <div className="e-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="e-icons e-schedule" style={{ fontSize: '16px' }}></span>
            Projekttidslinje
          </div>
        </div>
        <div className="e-card-content">

        {filteredProjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ color: 'var(--e-text-secondary)' }}>
              Inga projekt i denna tidsperiod
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                  className="e-card"
                  onClick={() => navigate(`/projects/${project.id}`)}
                  style={{
                    borderColor: project.color,
                    borderWidth: '2px',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div className="e-card-content" style={{ padding: '12px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontWeight: 'bold', fontSize: '16px', margin: 0 }}>
                        {project.name}
                      </h3>
                      {project.client_name && (
                        <p style={{ fontSize: '12px', margin: 0, color: 'var(--e-text-secondary)' }}>
                          {project.client_name}
                        </p>
                      )}
                    </div>

                    {project.status === 'completed' && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: '#d1fae5',
                        color: '#065f46'
                      }}>
                        Klart
                      </span>
                    )}

                    {deadlineStyle && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: '500',
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

                  <div style={{
                    display: 'grid',
                    gap: '8px',
                    marginTop: '8px',
                    gridTemplateColumns: 'repeat(4, 1fr)'
                  }}>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--e-text-secondary)' }}>
                        Färdigt
                      </span>
                      <p style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                        {project.completion_percentage}%
                      </p>
                    </div>

                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--e-text-secondary)' }}>
                        Loggat
                      </span>
                      <p style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                        {metrics.logged_hours}h
                      </p>
                    </div>

                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--e-text-secondary)' }}>
                        Återstår
                      </span>
                      <p style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                        {metrics.estimated_remaining_hours}h
                      </p>
                    </div>

                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--e-text-secondary)' }}>
                        Budget
                      </span>
                      <p style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                        {(project.total_budget / 1000).toFixed(0)}k
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{
                    marginTop: '8px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    height: '6px',
                    backgroundColor: 'var(--e-border)'
                  }}>
                    <div
                      style={{
                        height: '100%',
                        backgroundColor: metrics.is_over_budget
                          ? 'var(--e-error)'
                          : project.completion_percentage >= 80
                          ? 'var(--e-success)'
                          : 'var(--e-primary)',
                        width: `${Math.min(project.completion_percentage, 100)}%`,
                        transition: 'width 0.3s'
                      }}
                    />
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* Capacity Timeline */}
      <div style={{ marginTop: '16px' }}>
        <CapacityTimeline />
      </div>
    </>
  );
}
