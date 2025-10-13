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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <div style={{
          animation: 'spin 1s linear infinite',
          borderRadius: '9999px',
          height: '48px',
          width: '48px',
          borderBottom: '2px solid var(--copper-600)',
        }} />
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{
        maxWidth: '896px',
        marginLeft: 'auto',
        marginRight: 'auto',
        padding: '24px'
      }}>
        <p style={{
          textAlign: 'center',
          color: 'var(--e-text-secondary)'
        }}>Projekt hittades inte</p>
      </div>
    );
  }

  const projectTasks = tasks.filter(task => task.project_id === project.id);
  const metrics = calculateProjectMetrics(project, tasks);

  return (
    <div style={{
      maxWidth: '896px',
      marginLeft: 'auto',
      marginRight: 'auto',
      padding: '24px'
    }}>
      {/* Header */}
      <button
        onClick={() => navigate('/projects')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--e-text-secondary)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          marginBottom: '24px',
          padding: 0,
          fontSize: '16px',
          transition: 'color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--e-text)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--e-text-secondary)'}
      >
        <ArrowLeft style={{ height: '20px', width: '20px' }} />
        Tillbaka till projekt
      </button>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '30px',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: 'var(--e-text)'
        }}>{project.name}</h1>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          fontSize: '14px',
          color: 'var(--e-text-secondary)'
        }}>
          {project.client_name && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <User style={{ height: '16px', width: '16px' }} />
              <span>{project.client_name}</span>
            </div>
          )}

          {project.project_deadline && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Calendar style={{ height: '16px', width: '16px' }} />
              <span>
                Deadline: {new Date(project.project_deadline).toLocaleDateString('sv-SE')}
              </span>
            </div>
          )}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Clock style={{ height: '16px', width: '16px' }} />
            <span>{projectTasks.length} tasks kopplade</span>
          </div>
        </div>

        {project.description && (
          <p style={{
            marginTop: '16px',
            color: 'var(--e-text-secondary)'
          }}>
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
        <div style={{ marginTop: '32px' }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '16px',
            color: 'var(--e-text)'
          }}>Kopplade tasks</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {projectTasks.map(task => (
              <div
                key={task.id}
                style={{
                  padding: '16px',
                  border: '1px solid var(--e-border)',
                  borderRadius: '8px',
                  background: 'var(--e-surface)',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--e-surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--e-surface)'}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontWeight: '600',
                      color: 'var(--e-text)'
                    }}>{task.title}</h3>
                    {task.description && (
                      <p style={{
                        fontSize: '14px',
                        color: 'var(--e-text-secondary)',
                        marginTop: '4px'
                      }}>
                        {task.description}
                      </p>
                    )}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      marginTop: '8px',
                      fontSize: '14px',
                      color: 'var(--e-text-secondary)'
                    }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: task.status === 'done'
                          ? '#10b981'
                          : task.status === 'in_progress'
                          ? '#f59e0b'
                          : 'var(--e-surface)',
                        color: task.status === 'done' || task.status === 'in_progress'
                          ? '#ffffff'
                          : 'var(--e-text)'
                      }}>
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
        <div style={{
          marginTop: '32px',
          padding: '32px',
          border: '2px dashed var(--e-border)',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{
            color: 'var(--e-text-secondary)',
            marginBottom: '16px'
          }}>
            Inga tasks kopplade till detta projekt än
          </p>
          <button
            onClick={() => navigate('/focus')}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--copper-600)',
              color: '#ffffff',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--copper-700)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--copper-600)'}
          >
            Skapa task och koppla till projekt
          </button>
        </div>
      )}
    </div>
  );
}
