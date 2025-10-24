import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { Project } from '@/lib/types';
import { calculateProjectMetrics } from '@/lib/projectMetrics';
import { ProjectProgressSlider } from './ProjectProgressSlider';
import { UppgiftRegistrering } from '@/components/tasks/UppgiftRegistrering';
import { InPlaceEditorComponent } from '@syncfusion/ej2-react-inplace-editor';
// Lucide icons replaced with SyncFusion e-icons
import toast from 'react-hot-toast';

export function ProjectDetailView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tasks } = useTasks();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{
          height: '48px',
          width: '48px',
          border: '2px solid transparent',
          borderBottom: '2px solid var(--primary-600)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ maxWidth: '896px', margin: '0 auto', padding: '24px' }}>
        <p style={{ textAlign: 'center', color: 'var(--e-text-secondary)' }}>Projekt hittades inte</p>
      </div>
    );
  }

  const projectTasks = tasks.filter(task => task.project_id === project.id);
  const metrics = calculateProjectMetrics(project, tasks);

  return (
    <div style={{ maxWidth: '896px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <button
        onClick={() => navigate('/projects')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '24px',
          padding: 0,
          fontSize: '16px',
          color: 'var(--e-text-secondary)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          transition: 'color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--e-text)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--e-text-secondary)'}
      >
        <span className="e-icons e-arrow-left" style={{ fontSize: '16px' }}></span>
        Tillbaka till projekt
      </button>

      <div style={{ marginBottom: '24px' }}>
        <InPlaceEditorComponent
          mode="Inline"
          type="Text"
          value={project.name}
          emptyText="Projektnamn"
          actionOnBlur="Submit"
          change={async (e: any) => {
            try {
              await supabase.from('projects').update({ name: e.value }).eq('id', project.id);
              toast.success('Projektnamn uppdaterat');
              fetchProject();
            } catch (error) {
              toast.error('Kunde inte uppdatera');
            }
          }}
        >
          <h1 style={{
            fontSize: '30px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: 'var(--e-text)'
          }}>{project.name}</h1>
        </InPlaceEditorComponent>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '14px', color: 'var(--e-text-secondary)' }}>
          {project.client_name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="e-icons e-user" style={{ fontSize: '12px' }}></span>
              <InPlaceEditorComponent
                mode="Inline"
                type="Text"
                value={project.client_name}
                emptyText="Kund"
                actionOnBlur="Submit"
                change={async (e: any) => {
                  try {
                    await supabase.from('projects').update({ client_name: e.value }).eq('id', project.id);
                    fetchProject();
                  } catch (error) {
                    toast.error('Kunde inte uppdatera');
                  }
                }}
              />
            </div>
          )}

          {project.project_deadline && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="e-icons e-schedule" style={{ fontSize: '12px' }}></span>
              <span>
                Deadline: {new Date(project.project_deadline).toLocaleDateString('sv-SE')}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="e-icons e-time" style={{ fontSize: '12px' }}></span>
            <span>{projectTasks.length} tasks kopplade</span>
          </div>
        </div>

        {project.description && (
          <InPlaceEditorComponent
            mode="Inline"
            type="Text"
            value={project.description}
            emptyText="Beskrivning"
            actionOnBlur="Submit"
            change={async (e: any) => {
              try {
                await supabase.from('projects').update({ description: e.value }).eq('id', project.id);
                fetchProject();
              } catch (error) {
                toast.error('Kunde inte uppdatera');
              }
            }}
          >
            <p style={{ marginTop: '16px', color: 'var(--e-text-secondary)' }}>
              {project.description}
            </p>
          </InPlaceEditorComponent>
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
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: 'var(--e-text)' }}>
            Kopplade tasks
          </h2>
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
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontWeight: '600', color: 'var(--e-text)' }}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p style={{ fontSize: '14px', marginTop: '4px', color: 'var(--e-text-secondary)' }}>
                        {task.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', fontSize: '14px', color: 'var(--e-text-secondary)' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: task.status === 'done'
                          ? '#10b981'
                          : task.status === 'in_progress'
                          ? 'var(--warning-500)'
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
        <div style={{ marginTop: '32px', padding: '32px', borderRadius: '8px', textAlign: 'center', border: '2px dashed var(--e-border)' }}>
          <p style={{ marginBottom: '16px', color: 'var(--e-text-secondary)' }}>
            Inga tasks kopplade till detta projekt än
          </p>
          <button
            onClick={() => setIsTaskFormOpen(true)}
            className="e-btn e-primary"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            Skapa task och koppla till projekt
          </button>
        </div>
      )}

      {/* UppgiftRegistrering */}
      <UppgiftRegistrering
        isOpen={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
        defaultProjectId={project?.id}
      />
    </div>
  );
}
