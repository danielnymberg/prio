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
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import toast from 'react-hot-toast';

export function ProjectDetailView() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tasks } = useTasks();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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

  const handleStatusChange = async (newStatus: 'not_started' | 'active' | 'completed' | 'archived') => {
    if (!project) return;

    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'completed') {
        updateData.completion_percentage = 100;
      }

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', project.id);

      if (error) throw error;
      toast.success('Status uppdaterad!');
      fetchProject();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Kunde inte uppdatera status');
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    if (!confirm(`Är du säker på att du vill radera projektet "${project.name}"? Detta går inte att ångra.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;
      toast.success('Projekt raderat');
      navigate('/projects');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Kunde inte radera projekt');
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
      <div style={{ maxWidth: '896px' }} className="e-m-auto e-p-24">
        <p className="e-text-center" style={{ color: 'var(--e-text-secondary)' }}>Projekt hittades inte</p>
      </div>
    );
  }

  const projectTasks = tasks.filter(task => task.project_id === project.id);
  const metrics = calculateProjectMetrics(project, tasks);

  return (
    <div style={{ maxWidth: '896px', margin: '0 auto', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '12px' }}>
        <ButtonComponent
          onClick={() => navigate('/projects')}
          cssClass="e-flat e-small"
          iconCss="e-icons e-arrow-left"
          content="Tillbaka till projekt"
        />
      </div>

      {/* Projektnamn + Kund + Spiris ID (Read-only från Spiris) */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          margin: '0 0 4px 0',
          color: 'var(--color-sf-black)'
        }}>{project.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {project.client_name && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="e-icons e-small e-user"></span>
              <span style={{ fontSize: '14px', color: 'var(--color-sf-black)', opacity: 0.6 }}>
                {project.client_name}
              </span>
            </div>
          )}
          {project.spiris_project_id && (
            <span style={{ fontSize: '11px', color: 'var(--color-sf-black)', opacity: 0.4 }}>
              Spiris: {project.spiris_project_id}
            </span>
          )}
        </div>
      </div>

      {/* Start + Deadline (Editable) */}
      <div className="e-card" style={{ marginBottom: '16px' }}>
        <div className="e-card-content" style={{ padding: '12px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Startdatum
              </label>
              <InPlaceEditorComponent
                mode="Inline"
                type="Date"
                value={project.start_date ? new Date(project.start_date) : null}
                emptyText="Inget startdatum"
                actionOnBlur="Submit"
                change={async (e: any) => {
                  try {
                    const dateValue = e.value ? new Date(e.value).toISOString().split('T')[0] : null;
                    await supabase.from('projects').update({ start_date: dateValue }).eq('id', project.id);
                    toast.success('Startdatum uppdaterat');
                    fetchProject();
                  } catch (error) {
                    toast.error('Kunde inte uppdatera');
                  }
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Deadline
              </label>
              <InPlaceEditorComponent
                mode="Inline"
                type="Date"
                value={project.project_deadline ? new Date(project.project_deadline) : null}
                emptyText="Ingen deadline"
                actionOnBlur="Submit"
                change={async (e: any) => {
                  try {
                    const dateValue = e.value ? new Date(e.value).toISOString().split('T')[0] : null;
                    await supabase.from('projects').update({ project_deadline: dateValue }).eq('id', project.id);
                    toast.success('Deadline uppdaterad');
                    fetchProject();
                  } catch (error) {
                    toast.error('Kunde inte uppdatera');
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status (Kanban-style buttons) */}
      <div className="e-card" style={{ marginBottom: '16px' }}>
        <div className="e-card-header">
          <div className="e-card-title">Projektstatus</div>
        </div>
        <div className="e-card-content" style={{ padding: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <ButtonComponent
              onClick={() => handleStatusChange('active')}
              cssClass={project.status === 'active' ? 'e-primary' : 'e-outline'}
              content="Aktiv"
            />
            <ButtonComponent
              onClick={() => handleStatusChange('completed')}
              cssClass={project.status === 'completed' ? 'e-success' : 'e-success e-outline'}
              iconCss="e-icons e-check"
              content="Slutförd"
            />
            <ButtonComponent
              onClick={() => handleStatusChange('archived')}
              cssClass={project.status === 'archived' ? 'e-flat' : 'e-outline'}
              iconCss="e-icons e-folder"
              content="Arkiverad"
            />
            <div style={{ marginLeft: 'auto' }}>
              <ButtonComponent
                onClick={handleDeleteProject}
                cssClass="e-danger e-outline"
                iconCss="e-icons e-trash"
                content="Radera"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ekonomi (Read-only från Spiris) */}
      <div className="e-card" style={{ marginBottom: '16px' }}>
        <div className="e-card-header">
          <div className="e-card-title">Ekonomi</div>
        </div>
        <div className="e-card-content" style={{ padding: '12px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px'
          }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-sf-black)', opacity: 0.6, margin: '0 0 4px 0' }}>
                Offererade timmar
              </p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                {project.quoted_hours}h
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-sf-black)', opacity: 0.6, margin: '0 0 4px 0' }}>
                Timpris
              </p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                {project.hourly_rate.toLocaleString('sv-SE')} kr/h
              </p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-sf-black)', opacity: 0.6, margin: '0 0 4px 0' }}>
                Övriga kostnader
              </p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                {project.external_costs.toLocaleString('sv-SE')} kr
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress slider */}
      <ProjectProgressSlider
        project={project}
        metrics={metrics}
        onUpdate={fetchProject}
      />

      {/* Kopplade uppgifter */}
      {projectTasks.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
              Kopplade uppgifter
            </h2>
            <ButtonComponent
              onClick={() => {
                setSelectedTask(null);
                setIsTaskFormOpen(true);
              }}
              cssClass="e-primary"
              iconCss="e-icons e-plus"
              content="Skapa uppgift i projekt"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {projectTasks.map(task => (
              <div
                key={task.id}
                className="e-card"
                style={{ cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                onClick={() => {
                  setSelectedTask(task);
                  setIsTaskFormOpen(true);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="e-card-content" style={{ padding: '12px' }}>
                  <h3 style={{ fontWeight: '600', margin: '0 0 4px 0' }}>
                    {task.title}
                  </h3>
                  {task.description && (
                    <p style={{ fontSize: '14px', color: 'var(--color-sf-black)', opacity: 0.6, margin: '0 0 8px 0' }}>
                      {task.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: task.status === 'done'
                        ? 'var(--color-sf-success)'
                        : task.status === 'in_progress'
                        ? 'var(--color-sf-warning)'
                        : 'var(--color-sf-black)',
                      color: '#ffffff',
                      opacity: task.status === 'not_started' ? 0.5 : 1
                    }}>
                      {task.status === 'done' ? 'Klar' :
                       task.status === 'in_progress' ? 'Pågående' : 'Ej påbörjad'}
                    </span>
                    {task.estimated_duration && (
                      <span style={{ color: 'var(--color-sf-black)', opacity: 0.6 }}>
                        {Math.round(task.estimated_duration / 60 * 10) / 10}h
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {projectTasks.length === 0 && (
        <div className="e-card" style={{ marginTop: '16px', textAlign: 'center' }}>
          <div className="e-card-content" style={{ padding: '24px' }}>
            <p style={{ marginBottom: '16px', color: 'var(--color-sf-black)', opacity: 0.6 }}>
              Inga uppgifter kopplade till detta projekt än
            </p>
            <ButtonComponent
              onClick={() => setIsTaskFormOpen(true)}
              cssClass="e-primary"
              iconCss="e-icons e-plus"
              content="Skapa uppgift och koppla till projekt"
            />
          </div>
        </div>
      )}

      {/* UppgiftRegistrering */}
      <UppgiftRegistrering
        isOpen={isTaskFormOpen}
        onClose={() => {
          setIsTaskFormOpen(false);
          setSelectedTask(null);
        }}
        defaultProjectId={project?.id}
        taskToEdit={selectedTask}
      />
    </div>
  );
}
