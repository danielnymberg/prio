import { useRef, useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { EmptyState } from '@/components/ui/EmptyState';
import { Inbox } from 'lucide-react';
import { showToast } from '@/services/toast';
import { TaskForm } from '@/components/tasks/TaskForm';
import type { Task } from '@/lib/types';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Filter,
  Toolbar,
  Selection,
  Inject,
  ToolbarItems,
} from '@syncfusion/ej2-react-grids';

export function InboxView() {
  const { tasks, deleteTask } = useTasks();
  const gridRef = useRef<GridComponent>(null);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Inbox = tasks med status 'not_started' OCH låg bedömning (värde+tidskänslighet = default)
  const inboxTasks = tasks.filter(t =>
    t.status === 'not_started' &&
    !t.deadline && // Ingen deadline = behöver bedömning
    (t.value_score === 8 && t.time_sensitivity === 5) // Default-värden = ej bedömd
  );

  // Förbered data för grid
  const gridData = inboxTasks.map(task => ({
    ...task,
    descriptionShort: task.description?.substring(0, 100) || '-',
    durationFormatted: task.estimated_duration
      ? task.estimated_duration >= 60
        ? `${Math.round(task.estimated_duration / 60)}h`
        : `${task.estimated_duration}m`
      : '-',
  }));

  const pageSettings = { pageSize: 20, pageSizes: [10, 20, 50] };
  const sortSettings = { columns: [{ field: 'created_at', direction: 'Descending' as any }] };
  const selectionSettings = { type: 'Multiple' as any, checkboxOnly: false };

  const toolbarItems: ToolbarItems[] = [
    { text: 'Bedöm valda', prefixIcon: 'e-check', id: 'assess_selected' } as any,
    { text: 'Radera valda', prefixIcon: 'e-delete', id: 'delete_selected' } as any,
  ];

  // Handle toolbar clicks
  const toolbarClick = async (args: any) => {
    if (args.item.id === 'assess_selected' && gridRef.current) {
      const selectedRecords = gridRef.current.getSelectedRecords() as any[];
      if (selectedRecords.length === 0) {
        showToast.warning('Välj minst en uppgift först');
        return;
      }

      // Öppna TaskForm för första valda tasken
      const firstTask = tasks.find(t => t.id === selectedRecords[0].id);
      if (firstTask) {
        setSelectedTask(firstTask);
        setIsTaskFormOpen(true);
      }
    } else if (args.item.id === 'delete_selected' && gridRef.current) {
      const selectedRecords = gridRef.current.getSelectedRecords() as any[];
      if (selectedRecords.length === 0) {
        showToast.warning('Välj minst en uppgift först');
        return;
      }

      if (confirm(`Ta bort ${selectedRecords.length} uppgifter från inbox?`)) {
        for (const record of selectedRecords) {
          await deleteTask(record.id);
        }
        showToast.success(`${selectedRecords.length} uppgifter raderade`);
      }
    }
  };

  // Handle double-click to open task
  const handleRecordDoubleClick = (args: any) => {
    const task = tasks.find(t => t.id === args.rowData.id);
    if (task) {
      setSelectedTask(task);
      setIsTaskFormOpen(true);
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
          setIsTaskFormOpen(true);
        }
      }
      args.cancel = true; // Förhindra scroll
    }
    // Delete för att radera task
    else if (args.keyCode === 46 && gridRef.current) {
      const selectedRecords = gridRef.current.getSelectedRecords();
      if (selectedRecords.length > 0) {
        const taskId = (selectedRecords[0] as any).id;
        if (confirm('Är du säker på att du vill radera denna uppgift?')) {
          deleteTask(taskId);
          showToast.success('Uppgift raderad');
        }
        args.preventDefault();
      }
    }
  };

  return (
    <div className="e-h-full e-flex e-flex-column e-gap-16">
      {/* Header */}
      <div className="e-flex e-align-center e-justify-between">
        <div>
          <h1 className="e-text-2xl e-font-bold" style={{ color: 'var(--e-text)', margin: 0 }}>
            Inbox
          </h1>
          <p style={{ color: 'var(--e-text-secondary)', margin: 0 }}>
            {inboxTasks.length} uppgifter väntar på bedömning
          </p>
        </div>
      </div>

      {/* Tips banner */}
      {inboxTasks.length > 0 && (
        <div className="e-border e-rounded-md e-p-16" style={{ backgroundColor: 'var(--e-surface)' }}>
          <p className="e-text-sm" style={{ color: 'var(--e-text)', margin: 0 }}>
            💡 <strong>Tips:</strong> Dubbelklicka på en uppgift för att bedöma vikten, tidskänslighet och deadline.
            Uppgifter som skapats via röst eller delning hamnar här om AI:n inte kunde bedöma dem direkt.
          </p>
        </div>
      )}

      {/* Grid eller Empty State */}
      {inboxTasks.length === 0 ? (
        <div className="e-flex-1 e-flex e-align-center e-justify-center">
          <EmptyState
            icon={<Inbox style={{ height: '64px', width: '64px' }} />}
            title="Inbox är tom!"
            description="Nya uppgifter från röstassistent hamnar här för bedömning"
          />
        </div>
      ) : (
        <div className="e-flex-1 e-rounded-lg e-overflow-hidden" style={{ backgroundColor: 'var(--e-surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <GridComponent
            ref={gridRef}
            dataSource={gridData}
            allowPaging={true}
            allowSorting={true}
            allowFiltering={true}
            allowSelection={true}
            pageSettings={pageSettings}
            sortSettings={sortSettings}
            selectionSettings={selectionSettings}
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
              <ColumnDirective type="checkbox" width="50" />
              <ColumnDirective
                field="title"
                headerText="Uppgift"
                width="200"
                clipMode="EllipsisWithTooltip"
              />
              <ColumnDirective
                field="descriptionShort"
                headerText="Beskrivning"
                width="300"
                clipMode="EllipsisWithTooltip"
              />
              <ColumnDirective
                field="value_score"
                headerText="Värde"
                width="80"
                textAlign="Center"
              />
              <ColumnDirective
                field="time_sensitivity"
                headerText="Tidskänslighet"
                width="120"
                textAlign="Center"
              />
              <ColumnDirective
                field="durationFormatted"
                headerText="Tid"
                width="80"
                textAlign="Center"
              />
            </ColumnsDirective>
            <Inject services={[Page, Sort, Filter, Toolbar, Selection]} />
          </GridComponent>
        </div>
      )}

      {/* TaskForm - NYA implementationen med SyncFusion */}
      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={() => {
          setIsTaskFormOpen(false);
          setSelectedTask(null);
        }}
        taskToEdit={selectedTask}
      />
    </div>
  );
}
