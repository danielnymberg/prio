import {
  GanttComponent,
  Inject,
  Selection,
  DayMarkers,
  Edit,
  Filter,
  Sort,
  Toolbar,
  Resize
} from '@syncfusion/ej2-react-gantt';
import { useProjects } from '@/hooks/useProjects';
import { useMemo } from 'react';
import { addDays } from 'date-fns';

export function GanttView() {
  const { projects } = useProjects();

  // Konvertera projekt till Gantt-format
  const ganttData = useMemo(() => {
    const activeProjects = projects.filter(p => p.status !== 'archived');

    return activeProjects.map((project, index) => {
      // Använd projektets start_date eller dagens datum
      const startDate = project.start_date ? new Date(project.start_date) : new Date();

      // Använd project_deadline eller beräkna baserat på quoted_hours
      let endDate: Date;
      if (project.project_deadline) {
        endDate = new Date(project.project_deadline);
      } else {
        // Uppskatta deadline baserat på timmar (40h/vecka)
        const weeks = Math.ceil(project.quoted_hours / 40);
        endDate = addDays(startDate, weeks * 7);
      }

      // Beräkna arbetsdagar mellan start och slut
      const msPerDay = 24 * 60 * 60 * 1000;
      const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / msPerDay);

      return {
        TaskID: index + 1,
        TaskName: project.name,
        ClientName: project.client_name || 'Ingen kund',
        StartDate: startDate,
        EndDate: endDate,
        Duration: Math.max(1, diffDays), // Minst 1 dag
        Progress: project.completion_percentage || 0,
        QuotedHours: project.quoted_hours,
        HourlyRate: project.hourly_rate,
        Budget: project.quoted_hours * project.hourly_rate + (project.external_costs || 0)
      };
    });
  }, [projects]);

  return (
    <>
      <div className="e-mb-16 e-flex e-align-center e-justify-between">
        <div>
          <h1 className="e-text-2xl e-font-bold e-mb-4">
            Projektöversikt - Gantt
          </h1>
          <p className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>
            {ganttData.length} aktiva projekt
          </p>
        </div>
      </div>

      {ganttData.length > 0 ? (
        <GanttComponent
          dataSource={ganttData}
          taskFields={{
            id: 'TaskID',
            name: 'TaskName',
            startDate: 'StartDate',
            endDate: 'EndDate',
            duration: 'Duration',
            progress: 'Progress',
          }}
          height="600px"
          allowSelection={true}
          allowSorting={false}
          allowFiltering={false}
          allowResizing={false}
          enableContextMenu={false}
          enableVirtualization={false}
          timelineSettings={{
            timelineViewMode: 'Month',
            topTier: {
              unit: 'Month',
              format: 'MMM yyyy'
            },
            bottomTier: {
              unit: 'Week',
              format: 'dd MMM'
            }
          }}
          labelSettings={{
            leftLabel: 'TaskName',
            rightLabel: 'Progress'
          }}
          projectStartDate={new Date('2025-01-01')}
          projectEndDate={new Date('2025-12-31')}
        >
          <Inject services={[Selection, DayMarkers, Edit, Filter, Sort, Toolbar, Resize]} />
        </GanttComponent>
      ) : (
        <div className="e-text-center e-mt-64">
          <p>Inga aktiva projekt att visa</p>
        </div>
      )}
    </>
  );
}
