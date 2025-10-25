import { useMemo } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useProjectAllocations } from '@/hooks/useProjectAllocations';
import { calculateProjectMetrics } from '@/lib/projectMetrics';
import { GridComponent, ColumnsDirective, ColumnDirective, Sort, Inject, Edit, Toolbar, EditSettingsModel } from '@syncfusion/ej2-react-grids';

interface AllocationGridProps {
  startDate: Date;
  endDate: Date;
}

// Helper: Get Monday of week
function getMondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// Helper: Generate weeks between dates
function generateWeeks(start: Date, end: Date): string[] {
  const weeks: string[] = [];
  const current = new Date(start);

  while (current <= end) {
    weeks.push(getMondayOfWeek(current));
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

// Helper: Get week number
function getWeekNumber(dateString: string): number {
  const date = new Date(dateString);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function AllocationGrid({ startDate, endDate }: AllocationGridProps) {
  const { projects } = useProjects();
  const { tasks } = useTasks();
  const { allocations, setAllocation } = useProjectAllocations();

  // Generate weeks
  const weeks = useMemo(() => generateWeeks(startDate, endDate), [startDate, endDate]);

  // Filter active projects
  const activeProjects = projects.filter(p => p.status !== 'archived');

  // Prepare grid data with allocations
  const gridData = useMemo(() => {
    return activeProjects.map(project => {
      const projectTasks = tasks.filter(t => t.project_id === project.id);
      const metrics = calculateProjectMetrics(project, projectTasks);

      const row: any = {
        id: project.id,
        name: project.name,
        client_name: project.client_name,
        remaining: metrics.estimated_remaining_hours,
      };

      // Add allocation for each week
      weeks.forEach(weekStart => {
        const allocation = allocations.find(
          a => a.project_id === project.id && a.week_start === weekStart
        );
        row[`week_${weekStart}`] = allocation?.allocated_hours || 0;
      });

      // Calculate sum
      row.sum = weeks.reduce((sum, weekStart) => {
        return sum + (row[`week_${weekStart}`] || 0);
      }, 0);

      return row;
    });
  }, [activeProjects, tasks, allocations, weeks]);

  // Edit settings - Batch mode för editera flera celler innan save
  const editSettings: EditSettingsModel = {
    allowEditing: true,
    allowAdding: false,
    allowDeleting: false,
    mode: 'Batch',
  };

  // Toolbar för batch editing
  const toolbar = ['Update', 'Cancel'];

  // Handle batch save
  const actionComplete = async (args: any) => {
    if (args.requestType === 'batchsave' && args.batchChanges) {
      const changes = args.batchChanges.changedRecords || [];

      console.log('[AllocationGrid] Batch save:', changes);

      for (const change of changes) {
        const projectId = change.id;

        // Find which weeks were edited
        for (const weekStart of weeks) {
          const fieldName = `week_${weekStart}`;
          if (change[fieldName] !== undefined) {
            const hours = parseFloat(change[fieldName]) || 0;
            await setAllocation({
              project_id: projectId,
              week_start: weekStart,
              allocated_hours: hours,
            });
          }
        }
      }
    }
  };

  // Inga templates eller queryCellInfo - ren SF!

  return (
    <>
      {/* Grid - Ren SF, inga custom overrides */}
      <GridComponent
        dataSource={gridData}
        allowPaging={false}
        allowSorting={true}
        editSettings={editSettings}
        toolbar={toolbar}
        actionComplete={actionComplete}
        width="100%"
        height="auto"
        rowHeight={40}
        gridLines="Both"
        enableHover={true}
      >
        <ColumnsDirective>
          <ColumnDirective
            field="id"
            headerText="ID"
            width="80"
            isPrimaryKey={true}
            visible={false}
          />
          <ColumnDirective
            field="name"
            headerText="Projekt"
            width="200"
            allowEditing={false}
          />
          <ColumnDirective
            field="client_name"
            headerText="Kund"
            width="120"
            allowEditing={false}
          />
          <ColumnDirective
            field="remaining"
            headerText="Kvar (h)"
            width="80"
            format="N0"
            textAlign="Right"
            allowEditing={false}
          />

          {/* Dynamic week columns - NumericTextBox utan spin buttons */}
          {weeks.map(weekStart => {
            const weekNum = getWeekNumber(weekStart);
            return (
              <ColumnDirective
                key={weekStart}
                field={`week_${weekStart}`}
                headerText={`V${weekNum}`}
                width="80"
                editType="numericedit"
                edit={{ params: { min: 0, step: 0.5, format: 'N1', showSpinButton: false } }}
                textAlign="Center"
                format="N1"
              />
            );
          })}

          <ColumnDirective
            field="sum"
            headerText="SUM (h)"
            width="80"
            format="N0"
            textAlign="Right"
            allowEditing={false}
          />
        </ColumnsDirective>
        <Inject services={[Edit, Toolbar, Sort]} />
      </GridComponent>
    </>
  );
}
