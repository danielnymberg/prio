import { useState, useRef } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { TaskForm } from '@/components/tasks/TaskForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { Task, CreateTaskInput } from '@/lib/types';
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
  const { tasks, updateTask, createTask, deleteTask } = useTasks();
  const { projects } = useProjects();
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
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
  const handleRecordDoubleClick = (args: any) => {
    const task = tasks.find(t => t.id === args.rowData.id);
    if (task) {
      setSelectedTask(task);
      setIsFormOpen(true);
    }
  };

  // Handle keyboard shortcuts
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
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      if (props.result_impact && props.result_impact >= 5)
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      if (props.result_impact && props.result_impact < 5)
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500';
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs ${getImpactStyle()}`}>
        {props.impactLabel}
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Arkiv
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {completedTasks.length} slutförda uppgifter
          </p>
        </div>
      </div>

      {/* Grid eller Empty State */}
      {completedTasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<Archive className="h-16 w-16" />}
            title="Inget i arkivet"
            description="Du har inga slutförda uppgifter än. När du markerar uppgifter som klara hamnar de här."
          />
        </div>
      ) : (
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
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
            </ColumnsDirective>
            <Inject services={[Page, Sort, Filter, Group, Toolbar]} />
          </GridComponent>
        </div>
      )}

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
            showToast.success('Uppgift uppdaterad!');
          } else {
            await createTask(input as CreateTaskInput);
            showToast.success('Uppgift skapad!');
          }
        }}
        onDelete={deleteTask}
        task={selectedTask}
      />
    </div>
  );
}
