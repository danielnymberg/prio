import { useEffect, useState, useRef } from 'react';
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
import { TaskForm } from '@/components/tasks/TaskForm';
import { Task, CreateTaskInput } from '@/lib/types';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow, format, isToday, isTomorrow, isPast } from 'date-fns';
import { sv } from 'date-fns/locale';

export function AllTasksView() {
  const { tasks, updateTask, createTask, deleteTask } = useTasks();
  const { projects } = useProjects();
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const gridRef = useRef<GridComponent>(null);

  // Filtrera bort Snabbis (≤2 min) och slutförda
  const activeTasks = tasks.filter(
    t => t.status !== 'done' && (t.estimated_duration || 999) > 2
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
    { text: 'Ny uppgift', prefixIcon: 'e-add', id: 'add_task' }
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
        columns: gridRef.current.getColumns().map(col => ({
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
      setSelectedTask(undefined);
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
          args.preventDefault();
        }
      }
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
      if (props.priorityCategory === 'Hög') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      if (props.priorityCategory === 'Medel') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    };

    return (
      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${getColor()}`}>
        <span className="font-bold">{Math.round(props.priority)}</span>
        <span>{props.priorityCategory}</span>
      </div>
    );
  };

  const statusTemplate = (props: any) => {
    const getStatusStyle = () => {
      if (props.status === 'not_started') return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      if (props.status === 'in_progress') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs ${getStatusStyle()}`}>
        {props.statusLabel}
      </span>
    );
  };

  const deadlineTemplate = (props: any) => {
    if (!props.deadline) return <span className="text-gray-400">-</span>;

    const deadline = new Date(props.deadline);
    const isOverdue = isPast(deadline) && !isToday(deadline);

    return (
      <div className={`text-sm ${isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
        <div>{props.deadlineFormatted}</div>
        <div className="text-xs opacity-75">{props.deadlineDistance}</div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Alla uppgifter
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {activeTasks.length} aktiva uppgifter (exkl. Snabbis)
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
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

      {/* TaskForm Modal */}
      <TaskForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedTask(undefined);
        }}
        onSubmit={async (input) => {
          if (selectedTask) {
            await updateTask(selectedTask.id, input);
            toast.success('Uppgift uppdaterad');
          } else {
            await createTask(input as CreateTaskInput);
            toast.success('Uppgift skapad');
          }
        }}
        onDelete={deleteTask}
        task={selectedTask}
      />
    </div>
  );
}
