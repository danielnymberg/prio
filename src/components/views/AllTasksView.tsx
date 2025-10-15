import { useEffect, useRef, useState } from 'react';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Filter,
  Group,
  Toolbar,
  ExcelExport,
  ColumnChooser,
  Inject,
  FilterSettingsModel,
  ToolbarItems,
  SearchSettingsModel,
  PageSettingsModel,
  SortSettingsModel,
  GroupSettingsModel
} from '@syncfusion/ej2-react-grids';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { toast } from 'react-hot-toast';
import { UppgiftRegistrering } from '@/components/tasks/UppgiftRegistrering';
import type { Task } from '@/lib/types';
import { formatDistanceToNow, format, isToday, isTomorrow, isPast } from 'date-fns';
import { sv } from 'date-fns/locale';

export function AllTasksView() {
  const { tasks, deleteTask } = useTasks();
  const { projects } = useProjects();
  const gridRef = useRef<GridComponent>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Alla aktiva uppgifter (inkl. Snabbis)
  const activeTasks = tasks.filter(t => t.status !== 'done');

  // Snabbis-uppgifter (≤2 min)
  const snabbis = activeTasks.filter(t =>
    t.estimated_duration && t.estimated_duration <= 2
  );

  // Förbered data med extra kolumner för visning
  const gridData = activeTasks.map(task => {
    const project = projects.find(p => p.id === task.project_id);

    // Deadline-gruppering
    let deadlineGroup = 'Ingen deadline';
    if (task.deadline) {
      const deadline = new Date(task.deadline);
      if (isPast(deadline) && !isToday(deadline)) {
        deadlineGroup = '🔴 Försenad';
      } else if (isToday(deadline)) {
        deadlineGroup = '🟠 Idag';
      } else if (isTomorrow(deadline)) {
        deadlineGroup = '🟡 Imorgon';
      } else {
        deadlineGroup = '🟢 Framtid';
      }
    }

    return {
      ...task,
      projectName: project?.name || '-',
      clientName: project?.client_name || '-',
      deadlineFormatted: task.deadline
        ? format(new Date(task.deadline), 'yyyy-MM-dd', { locale: sv })
        : '-',
      deadlineDistance: task.deadline
        ? formatDistanceToNow(new Date(task.deadline), {
            addSuffix: true,
            locale: sv
          })
        : '-',
      deadlineGroup,
      durationFormatted: task.estimated_duration
        ? task.estimated_duration >= 60
          ? `${Math.round(task.estimated_duration / 60)}h`
          : `${task.estimated_duration}m`
        : '-',
      priorityCategory:
        task.priority >= 50 ? 'Hög' :
        task.priority >= 20 ? 'Medel' : 'Låg',
      statusLabel:
        task.status === 'not_started' ? 'Ej påbörjad' :
        task.status === 'in_progress' ? 'Pågående' : 'Klar'
    };
  });

  // Grid-inställningar
  const pageSettings: PageSettingsModel = {
    pageSize: 20,
    pageSizes: [10, 20, 50, 100]
  };

  const filterSettings: FilterSettingsModel = {
    type: 'Menu',
    operators: {
      stringOperator: [
        { value: 'contains', text: 'Innehåller' },
        { value: 'equal', text: 'Lika med' },
        { value: 'notequal', text: 'Inte lika med' }
      ]
    }
  };

  const sortSettings: SortSettingsModel = {
    columns: [{ field: 'priority', direction: 'Descending' }]
  };

  const groupSettings: GroupSettingsModel = {
    showDropArea: true,
    columns: ['deadlineGroup']
  };

  const searchSettings: SearchSettingsModel = {
    fields: ['title', 'description', 'projectName', 'clientName'],
    ignoreCase: true
  };

  const toolbarItems: ToolbarItems[] = [
    'Search',
    'ExcelExport',
    'ColumnChooser',
    { text: 'Ny uppgift', prefixIcon: 'e-add', id: 'add_task' } as any
  ];

  // Spara och ladda grid state från localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('allTasksViewGridState');
    if (savedState && gridRef.current) {
      try {
        const state = JSON.parse(savedState);
        if (state.columns) {
          gridRef.current.setProperties({ columns: state.columns });
        }
      } catch (e) {
        console.warn('Could not load grid state:', e);
      }
    }
  }, []);

  const saveGridState = () => {
    if (gridRef.current) {
      const state = {
        columns: gridRef.current.getColumns().map((col: any) => ({
          field: col.field,
          width: col.width,
          visible: col.visible
        }))
      };
      localStorage.setItem('allTasksViewGridState', JSON.stringify(state));
    }
  };

  // Event handlers
  const handleRecordDoubleClick = (args: any) => {
    const task = tasks.find(t => t.id === args.rowData.id);
    if (task) {
      setSelectedTask(task);
      setIsFormOpen(true);
    }
  };

  const toolbarClick = (args: any) => {
    if (args.item.id === 'grid_excelexport') {
      gridRef.current?.excelExport();
    } else if (args.item.id === 'add_task') {
      setSelectedTask(null);
      setIsFormOpen(true);
    }
  };

  const handleKeyDown = (args: any) => {
    // Space för att öppna task
    if (args.keyCode === 32 && gridRef.current) {
      const selectedRecords = gridRef.current.getSelectedRecords();
      if (selectedRecords.length > 0) {
        const task = tasks.find(t => t.id === (selectedRecords[0] as any).id);
        if (task) {
          setSelectedTask(task);
          setIsFormOpen(true);
        }
      }
      args.cancel = true;
    }
    // Delete för att radera task
    else if (args.keyCode === 46 && gridRef.current) {
      const selectedRecords = gridRef.current.getSelectedRecords();
      if (selectedRecords.length > 0) {
        const taskId = (selectedRecords[0] as any).id;
        if (confirm('Är du säker på att du vill radera denna uppgift?')) {
          deleteTask(taskId);
          toast.success('Uppgift raderad');
        }
        args.preventDefault();
      }
    }
  };

  // Templates för custom rendering
  const priorityTemplate = (props: any) => {
    const getColor = () => {
      if (props.priorityCategory === 'Hög') return { bg: '#fee2e2', color: '#b91c1c' };
      if (props.priorityCategory === 'Medel') return { bg: '#fef3c7', color: '#b45309' };
      return { bg: '#f3f4f6', color: '#374151' };
    };
    const colors = getColor();

    return (
      <div className="e-flex e-align-center e-gap-8 e-rounded-full e-text-xs e-font-medium" style={{ display: 'inline-flex', padding: '4px 8px', backgroundColor: colors.bg, color: colors.color }}>
        <span className="e-font-bold">{Math.round(props.priority)}</span>
        <span>{props.priorityCategory}</span>
      </div>
    );
  };

  const statusTemplate = (props: any) => {
    const getStatusStyle = () => {
      if (props.status === 'not_started') return { bg: '#f3f4f6', color: '#374151' };
      if (props.status === 'in_progress') return { bg: '#dbeafe', color: '#1e40af' };
      return { bg: '#d1fae5', color: '#065f46' };
    };
    const colors = getStatusStyle();

    return (
      <span className="e-rounded-full e-text-xs" style={{ padding: '4px 8px', backgroundColor: colors.bg, color: colors.color }}>
        {props.statusLabel}
      </span>
    );
  };

  const deadlineTemplate = (props: any) => {
    if (!props.deadline) return <span style={{ color: 'var(--e-text-secondary)' }}>-</span>;

    const deadline = new Date(props.deadline);
    const isOverdue = isPast(deadline) && !isToday(deadline);

    return (
      <div className="e-text-sm" style={{ color: isOverdue ? '#dc2626' : 'var(--e-text)', fontWeight: isOverdue ? '600' : 'normal' }}>
        <div>{props.deadlineFormatted}</div>
        <div className="e-text-xs e-opacity-75">{props.deadlineDistance}</div>
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div className="e-flex e-align-center e-justify-between">
        <div>
          <h1 className="e-text-2xl e-font-bold" style={{ color: 'var(--e-text)', margin: 0 }}>
            Alla uppgifter
          </h1>
          <p style={{ color: 'var(--e-text-secondary)', margin: 0 }}>
            {activeTasks.length} aktiva uppgifter {snabbis.length > 0 && `(inkl. ${snabbis.length} snabbis)`}
          </p>
        </div>
      </div>

      {/* Snabbis-sektion */}
      {snabbis.length > 0 && (
        <div className="e-rounded-lg e-p-16" style={{ backgroundColor: 'var(--primary-50)', border: '1px solid var(--primary-200)' }}>
          <div className="e-flex e-align-center e-gap-8 e-mb-12">
            <span style={{ fontSize: '20px' }}>⚡</span>
            <h3 className="e-font-bold" style={{ margin: 0 }}>
              Snabbis ({snabbis.length}) - Gör direkt!
            </h3>
          </div>
          <div className="e-flex e-gap-8 e-flex-wrap">
            {snabbis.map(task => (
              <div
                key={task.id}
                className="e-rounded-md e-p-12 e-cursor-pointer"
                style={{ backgroundColor: 'white', border: '1px solid var(--primary-200)' }}
                onClick={() => {
                  setSelectedTask(task);
                  setIsFormOpen(true);
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <p className="e-font-medium e-text-sm" style={{ margin: 0 }}>{task.title}</p>
                <p className="e-text-xs" style={{ margin: '4px 0 0 0', color: 'var(--e-text-secondary)' }}>
                  {task.estimated_duration}min
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="e-rounded-lg" style={{ backgroundColor: 'var(--e-surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <GridComponent
          ref={gridRef}
          dataSource={gridData}
          allowPaging={true}
          allowSorting={true}
          allowFiltering={true}
          allowGrouping={true}
          allowExcelExport={true}
          allowTextWrap={true}
          showColumnChooser={true}
          pageSettings={pageSettings}
          filterSettings={filterSettings}
          sortSettings={sortSettings}
          groupSettings={groupSettings}
          searchSettings={searchSettings}
          toolbar={toolbarItems}
          toolbarClick={toolbarClick}
          recordDoubleClick={handleRecordDoubleClick}
          keyPressed={handleKeyDown}
          columnMenuClick={saveGridState}
          resizeStop={saveGridState}
          height="100%"
          rowHeight={60}
          gridLines="Horizontal"
          enableHover={true}
          enableStickyHeader={true}
          enablePersistence={false}
        >
          <ColumnsDirective>
            <ColumnDirective
              field="title"
              headerText="Uppgift"
              width="250"
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="priority"
              headerText="Prioritet"
              width="140"
              template={priorityTemplate}
              allowFiltering={false}
            />
            <ColumnDirective
              field="deadlineFormatted"
              headerText="Deadline"
              width="140"
              template={deadlineTemplate}
            />
            <ColumnDirective
              field="status"
              headerText="Status"
              width="120"
              template={statusTemplate}
            />
            <ColumnDirective
              field="projectName"
              headerText="Projekt"
              width="150"
              clipMode="Ellipsis"
            />
            <ColumnDirective
              field="clientName"
              headerText="Kund"
              width="150"
              clipMode="Ellipsis"
              visible={false}
            />
            <ColumnDirective
              field="durationFormatted"
              headerText="Tid"
              width="80"
              textAlign="Center"
            />
            <ColumnDirective
              field="deadlineGroup"
              headerText="Tidsgrupp"
              width="120"
              visible={false}
            />
          </ColumnsDirective>
          <Inject services={[Page, Sort, Filter, Group, Toolbar, ExcelExport, ColumnChooser]} />
        </GridComponent>
      </div>

      {/* UppgiftRegistrering */}
      <UppgiftRegistrering
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedTask(null);
        }}
        taskToEdit={selectedTask}
      />
    </div>
  );
}
