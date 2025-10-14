import { useRef } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { EmptyState } from '@/components/ui/EmptyState';
import { Archive } from 'lucide-react';
import { showToast } from '@/services/toast';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Filter,
  Group,
  Toolbar,
  Inject,
  ToolbarItems,
  PageSettingsModel,
  SortSettingsModel,
  GroupSettingsModel,
} from '@syncfusion/ej2-react-grids';

export function ArchiveView() {
  const { tasks, updateTask, deleteTask } = useTasks();
  const { projects } = useProjects();
  const gridRef = useRef<GridComponent>(null);

  const completedTasks = tasks.filter(t => t.status === 'done');

  // Förbered data med extra kolumner
  const gridData = completedTasks.map(task => {
    const project = projects.find(p => p.id === task.project_id);
    const completedDate = task.completed_at ? new Date(task.completed_at) : new Date();

    // Gruppering per månad
    const completedMonth = format(completedDate, 'MMMM yyyy', { locale: sv });
    const completedFormatted = format(completedDate, 'yyyy-MM-dd HH:mm', { locale: sv });

    return {
      ...task,
      projectName: project?.name || '-',
      completedMonth,
      completedFormatted,
      impactLabel: task.result_impact
        ? task.result_impact >= 8 ? 'Hög påverkan'
        : task.result_impact >= 5 ? 'Medel påverkan'
        : 'Låg påverkan'
        : 'Ej bedömd',
      durationFormatted: task.estimated_duration
        ? task.estimated_duration >= 60
          ? `${Math.round(task.estimated_duration / 60)}h`
          : `${task.estimated_duration}m`
        : '-',
    };
  });

  const pageSettings: PageSettingsModel = {
    pageSize: 50,
    pageSizes: [20, 50, 100]
  };

  const sortSettings: SortSettingsModel = {
    columns: [{ field: 'completed_at', direction: 'Descending' as any }]
  };

  const groupSettings: GroupSettingsModel = {
    showDropArea: true,
    columns: ['completedMonth']
  };

  const toolbarItems: ToolbarItems[] = [
    'Search',
    { text: 'Återställ vald', prefixIcon: 'e-undo', id: 'restore_task' } as any,
  ];

  // Handle toolbar clicks
  const toolbarClick = async (args: any) => {
    if (args.item.id === 'restore_task' && gridRef.current) {
      const selectedRecords = gridRef.current.getSelectedRecords() as any[];
      if (selectedRecords.length === 0) {
        showToast.warning('Välj en uppgift först');
        return;
      }

      const taskId = selectedRecords[0].id;
      await updateTask(taskId, { status: 'not_started' });
      showToast.success('Uppgift återställd till aktiv');
    }
  };

  // Handle double-click
  const handleRecordDoubleClick = (_: any) => {
    // TaskForm removed
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (args: any) => {
    // Space för att öppna task
    if (args.keyCode === 32 && gridRef.current) {
      // TaskForm removed
    }
    // Delete för att radera task permanent
    else if (args.keyCode === 46 && gridRef.current) {
      const selectedRecords = gridRef.current.getSelectedRecords();
      if (selectedRecords.length > 0) {
        const taskId = (selectedRecords[0] as any).id;
        if (confirm('Är du säker på att du vill radera denna uppgift PERMANENT?')) {
          deleteTask(taskId);
          showToast.success('Uppgift raderad');
        }
        args.preventDefault();
      }
    }
  };

  // Custom template för impact
  const impactTemplate = (props: any) => {
    const getImpactStyle = () => {
      if (props.result_impact && props.result_impact >= 8)
        return { backgroundColor: '#10b981', color: '#fff' };
      if (props.result_impact && props.result_impact >= 5)
        return { backgroundColor: 'var(--warning-500)', color: '#fff' };
      if (props.result_impact && props.result_impact < 5)
        return { backgroundColor: '#6b7280', color: '#fff' };
      return { backgroundColor: 'var(--e-border)', color: 'var(--e-text)' };
    };

    return (
      <span className="e-rounded-xl e-text-xs" style={{ padding: '4px 8px', ...getImpactStyle() }}>
        {props.impactLabel}
      </span>
    );
  };

  return (
    <div className="e-h-full e-flex e-flex-column e-gap-16">
      {/* Header */}
      <div className="e-flex e-align-center e-justify-between">
        <div>
          <h1 className="e-font-bold" style={{ fontSize: 'clamp(24px, 5vw, 30px)', color: 'var(--e-text)' }}>
            Arkiv
          </h1>
          <p className="e-opacity-75" style={{ color: 'var(--e-text)' }}>
            {completedTasks.length} slutförda uppgifter
          </p>
        </div>
      </div>

      {/* Grid eller Empty State */}
      {completedTasks.length === 0 ? (
        <div className="e-flex-1 e-flex e-align-center e-justify-center">
          <EmptyState
            icon={<Archive style={{ width: '64px', height: '64px' }} />}
            title="Inget i arkivet"
            description="Du har inga slutförda uppgifter än. När du markerar uppgifter som klara hamnar de här."
          />
        </div>
      ) : (
        <div className="e-flex-1 e-rounded-lg e-overflow-hidden" style={{ background: 'var(--e-surface)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
          <GridComponent
            ref={gridRef}
            dataSource={gridData}
            allowPaging={true}
            allowSorting={true}
            allowFiltering={true}
            allowGrouping={true}
            pageSettings={pageSettings}
            sortSettings={sortSettings}
            groupSettings={groupSettings}
            toolbar={toolbarItems}
            toolbarClick={toolbarClick}
            recordDoubleClick={handleRecordDoubleClick}
            keyPressed={handleKeyDown}
            height="100%"
            rowHeight={60}
            gridLines="Horizontal"
            enableHover={true}
            enableStickyHeader={true}
          >
            <ColumnsDirective>
              <ColumnDirective
                field="title"
                headerText="Uppgift"
                width="200"
                clipMode="EllipsisWithTooltip"
              />
              <ColumnDirective
                field="completedFormatted"
                headerText="Slutförd"
                width="140"
                textAlign="Center"
              />
              <ColumnDirective
                field="impactLabel"
                headerText="Påverkan"
                width="120"
                template={impactTemplate}
              />
              <ColumnDirective
                field="projectName"
                headerText="Projekt"
                width="150"
                clipMode="Ellipsis"
              />
              <ColumnDirective
                field="durationFormatted"
                headerText="Tid"
                width="80"
                textAlign="Center"
              />
              <ColumnDirective
                field="completedMonth"
                headerText="Månad"
                width="120"
                visible={false}
              />
              <ColumnDirective
                field="completed_at"
                headerText="Slutdatum"
                visible={false}
              />
            </ColumnsDirective>
            <Inject services={[Page, Sort, Filter, Group, Toolbar]} />
          </GridComponent>
        </div>
      )}
    </div>
  );
}
