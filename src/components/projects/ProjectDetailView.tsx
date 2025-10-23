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
      <div className="e-flex e-align-center e-justify-center" style={{ minHeight: '100vh' }}>
        <div className="e-animate-spin e-rounded-full" style={{
          height: '48px',
          width: '48px',
          borderBottom: '2px solid var(--primary-600)',
        }} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="e-mx-auto e-p-24" style={{ maxWidth: '896px' }}>
        <p className="e-text-center" style={{ color: 'var(--e-text-secondary)' }}>Projekt hittades inte</p>
      </div>
    );
  }

  const projectTasks = tasks.filter(task => task.project_id === project.id);
  const metrics = calculateProjectMetrics(project, tasks);

  return (
    <div className="e-mx-auto e-p-24" style={{ maxWidth: '896px' }}>
      {/* Header */}
      <button
        onClick={() => navigate('/projects')}
        className="e-flex e-align-center e-gap-8 e-mb-24 e-p-0 e-text-base e-transition-colors e-cursor-pointer"
        style={{
          color: 'var(--e-text-secondary)',
          background: 'none',
          border: 'none'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--e-text)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--e-text-secondary)'}
      >
        <span className="e-icons e-arrow-left" style={{ fontSize: '16px' }}></span>
        Tillbaka till projekt
      </button>

      <div className="e-mb-24">
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
          <h1 className="e-mb-8 e-font-bold" style={{
            fontSize: '30px',
            color: 'var(--e-text)'
          }}>{project.name}</h1>
        </InPlaceEditorComponent>

        <div className="e-flex e-flex-wrap e-gap-16 e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>
          {project.client_name && (
            <div className="e-flex e-align-center e-gap-8">
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
            <div className="e-flex e-align-center e-gap-8">
              <span className="e-icons e-schedule" style={{ fontSize: '12px' }}></span>
              <span>
                Deadline: {new Date(project.project_deadline).toLocaleDateString('sv-SE')}
              </span>
            </div>
          )}

          <div className="e-flex e-align-center e-gap-8">
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
            <p className="e-mt-16" style={{ color: 'var(--e-text-secondary)' }}>
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
        <div className="e-mt-32">
          <h2 className="e-text-xl e-font-bold e-mb-16" style={{ color: 'var(--e-text)' }}>
            Kopplade tasks
          </h2>
          <div className="e-flex e-flex-column e-gap-8">
            {projectTasks.map(task => (
              <div
                key={task.id}
                className="e-p-16 e-border e-rounded-lg e-transition"
                style={{ background: 'var(--e-surface)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--e-surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--e-surface)'}
              >
                <div className="e-flex e-align-start e-justify-between">
                  <div className="e-flex-1">
                    <h3 className="e-font-semibold" style={{ color: 'var(--e-text)' }}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="e-text-sm e-mt-4" style={{ color: 'var(--e-text-secondary)' }}>
                        {task.description}
                      </p>
                    )}
                    <div className="e-flex e-align-center e-gap-16 e-mt-8 e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>
                      <span className="e-px-8 e-py-4 e-rounded" style={{
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
        <div className="e-mt-32 e-p-32 e-rounded-lg e-text-center" style={{ border: '2px dashed var(--e-border)' }}>
          <p className="e-mb-16" style={{ color: 'var(--e-text-secondary)' }}>
            Inga tasks kopplade till detta projekt än
          </p>
          <button
            onClick={() => setIsTaskFormOpen(true)}
            className="e-px-16 e-py-8 e-rounded-lg e-text-base e-font-medium e-transition e-cursor-pointer"
            style={{
              backgroundColor: 'var(--primary-600)',
              color: '#ffffff',
              border: 'none'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-700)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-600)'}
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
