import {
  GanttComponent,
  Inject,
  Selection,
  DayMarkers,
  Edit,
  Filter,
  Sort,
  Toolbar,
  Resize,
  EventMarkersDirective,
  EventMarkerDirective
} from '@syncfusion/ej2-react-gantt';
import { useProjects } from '@/hooks/useProjects';
import { useMemo, useRef } from 'react';
import { addDays, startOfWeek } from 'date-fns';

export function GanttView() {
  const { projects } = useProjects();
  const ganttRef = useRef<GanttComponent>(null);

  // Konvertera projekt till Gantt-format
  const ganttData = useMemo(() => {
    const activeProjects = projects.filter(p => p.status !== 'archived');

    return activeProjects.map((project, index) => {
      // Använd projektets start_date eller dagens datum
      const startDate = project.start_date ? new Date(project.start_date) : new Date();

      // Använd project_deadline om satt, annars +90 dagar från start
      const endDate = project.project_deadline
        ? new Date(project.project_deadline)
        : addDays(startDate, 90);

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
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
          Gantt Timeline
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-sf-black)', opacity: 0.6, marginTop: '4px' }}>
          {ganttData.length} aktiva projekt
        </p>
      </div>

      {ganttData.length > 0 ? (
        <GanttComponent
          ref={ganttRef}
          dataSource={ganttData}
          taskFields={{
            id: 'TaskID',
            name: 'TaskName',
            startDate: 'StartDate',
            endDate: 'EndDate',
            duration: 'Duration',
            progress: 'Progress',
          }}
          projectStartDate={startOfWeek(new Date(), { weekStartsOn: 1 })}
          highlightWeekends={true}
          rowHeight={36}
          dataBound={() => {
            if (ganttRef.current) {
              ganttRef.current.scrollToDate(new Date().toISOString().split('T')[0]);
            }
          }}
        >
          <EventMarkersDirective>
            <EventMarkerDirective
              day={new Date()}
              label="Idag"
            />
          </EventMarkersDirective>
          <Inject services={[Selection, DayMarkers, Edit, Filter, Sort, Toolbar, Resize]} />
        </GanttComponent>
      ) : (
        <div className="e-card" style={{ textAlign: 'center' }}>
          <div className="e-card-content" style={{ padding: '48px' }}>
            <p style={{ color: 'var(--color-sf-black)', opacity: 0.6 }}>
              Inga aktiva projekt att visa
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
