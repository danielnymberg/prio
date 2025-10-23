import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { calculateProjectMetrics } from '@/lib/projectMetrics';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { GanttData } from '@/lib/types';
import {
  GanttComponent,
  ColumnsDirective,
  ColumnDirective,
  Inject,
  Edit,
  Selection,
  Toolbar,
  DayMarkers,
  EditSettingsModel,
} from '@syncfusion/ej2-react-gantt';

function calculateDuration(startDate: Date, endDate: Date): number {
  const diff = endDate.getTime() - startDate.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24)); // Days
}

export function GanttView() {
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { tasks } = useTasks();

  // Transform projects to Gantt data
  const ganttData = useMemo((): GanttData[] => {
    const activeProjects = projects.filter(p => p.status !== 'archived');

    return activeProjects.map(project => {
      const startDate = project.start_date
        ? new Date(project.start_date)
        : new Date(project.created_at);

      const endDate = project.project_deadline
        ? new Date(project.project_deadline)
        : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000); // +90 days

      const duration = calculateDuration(startDate, endDate);

      return {
        TaskID: project.id,
        TaskName: project.name,
        StartDate: startDate,
        EndDate: endDate,
        Duration: duration,
        Progress: project.completion_percentage,
        ResourceID: project.client_name ? [project.client_name] : [],
        Predecessor: null,
        info: project,
      };
    });
  }, [projects, tasks]);

  // Edit settings (allow editing dates)
  const editSettings: EditSettingsModel = {
    allowEditing: true,
    allowAdding: false,
    allowDeleting: false,
    allowTaskbarEditing: true,
    mode: 'Auto',
  };

  // Toolbar items
  const toolbar = ['ZoomIn', 'ZoomOut', 'ZoomToFit', 'PrevTimeSpan', 'NextTimeSpan'];

  // Handle taskbar edit (drag/resize)
  const actionComplete = async (args: any) => {
    if (args.requestType === 'save' && args.data) {
      const data = args.data as GanttData;

      try {
        const { error } = await supabase
          .from('projects')
          .update({
            start_date: data.StartDate.toISOString().split('T')[0],
            project_deadline: data.EndDate.toISOString().split('T')[0],
          })
          .eq('id', data.TaskID);

        if (error) throw error;
        toast.success('Projekt uppdaterat!');
      } catch (error) {
        console.error('Failed to update project:', error);
        toast.error('Kunde inte uppdatera projekt');
      }
    }
  };

  // Row data bound (for custom styling)
  const rowDataBound = (args: any) => {
    const data = args.data as GanttData;
    const project = data.info;

    // Color based on status
    let color = '#10b981'; // Green (default)
    if (project.status === 'completed') {
      color = '#9ca3af'; // Gray
    } else if (project.project_deadline && new Date(project.project_deadline) < new Date()) {
      color = '#ef4444'; // Red (overdue)
    } else if (project.completion_percentage > 80) {
      color = '#f59e0b'; // Orange (almost done)
    }

    if (args.row) {
      const taskbar = args.row.querySelector('.e-gantt-child-taskbar');
      if (taskbar) {
        taskbar.style.backgroundColor = color;
        taskbar.style.borderColor = color;
      }
    }
  };

  // Handle double-click to navigate
  const recordDoubleClick = (args: any) => {
    const data = args.rowData as GanttData;
    navigate(`/projects/${data.TaskID}`);
  };

  // Task label template (show remaining hours)
  const taskbarTemplate = (props: any) => {
    const data = props as GanttData;
    const projectTasks = tasks.filter(t => t.project_id === data.TaskID);
    const metrics = calculateProjectMetrics(data.info, projectTasks);

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        height: '100%',
        color: '#ffffff',
        fontSize: '12px',
        fontWeight: 500,
      }}>
        <span>{data.TaskName}</span>
        <span>{metrics.estimated_remaining_hours.toFixed(0)}h kvar</span>
      </div>
    );
  };

  return (
    <>
      {/* Header */}
      <div className="e-mb-16">
        <h1 className="e-text-2xl e-font-bold e-mb-4">
          Gantt - Projekttimeline
        </h1>
        <p className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>
          Dra och släpp projekt för att justera start/slutdatum
        </p>
      </div>

      {/* Legend */}
      <div className="e-mb-16 e-p-12 e-border e-rounded-lg" style={{ backgroundColor: 'var(--e-surface)' }}>
        <div className="e-flex e-gap-24 e-flex-wrap">
          <div className="e-flex e-align-center e-gap-8">
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: '#10b981',
              borderRadius: '2px'
            }} />
            <span className="e-text-sm">Aktiv</span>
          </div>
          <div className="e-flex e-align-center e-gap-8">
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: '#f59e0b',
              borderRadius: '2px'
            }} />
            <span className="e-text-sm">Snart klar ({'>'}80%)</span>
          </div>
          <div className="e-flex e-align-center e-gap-8">
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: '#ef4444',
              borderRadius: '2px'
            }} />
            <span className="e-text-sm">Försenad</span>
          </div>
          <div className="e-flex e-align-center e-gap-8">
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: '#9ca3af',
              borderRadius: '2px'
            }} />
            <span className="e-text-sm">Slutförd</span>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <GanttComponent
        dataSource={ganttData}
        taskFields={{
          id: 'TaskID',
          name: 'TaskName',
          startDate: 'StartDate',
          endDate: 'EndDate',
          duration: 'Duration',
          progress: 'Progress',
          resourceInfo: 'ResourceID',
          dependency: 'Predecessor',
        }}
        height="600px"
        editSettings={editSettings}
        toolbar={toolbar}
        actionComplete={actionComplete}
        rowDataBound={rowDataBound}
        recordDoubleClick={recordDoubleClick}
        taskbarTemplate={taskbarTemplate}
        allowSelection={true}
        highlightWeekends={true}
        showColumnMenu={false}
        enableContextMenu={true}
        enableImmutableMode={false}
        treeColumnIndex={1}
        projectStartDate={new Date(new Date().getFullYear(), 0, 1)} // Jan 1st
        projectEndDate={new Date(new Date().getFullYear() + 1, 11, 31)} // Dec 31st next year
      >
        <ColumnsDirective>
          <ColumnDirective field="TaskID" visible={false} />
          <ColumnDirective field="TaskName" headerText="Projekt" width="250" />
          <ColumnDirective field="StartDate" headerText="Start" format="yyyy-MM-dd" />
          <ColumnDirective field="EndDate" headerText="Slut" format="yyyy-MM-dd" />
          <ColumnDirective field="Duration" headerText="Dagar" width="80" />
          <ColumnDirective field="Progress" headerText="%" width="80" />
        </ColumnsDirective>
        <Inject services={[Edit, Selection, Toolbar, DayMarkers]} />
      </GanttComponent>
    </>
  );
}
