import { useEffect, useRef, useState } from 'react';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Filter,
  Group,
  Inject,
  FilterSettingsModel,
  PageSettingsModel,
  SortSettingsModel,
  GroupSettingsModel
} from '@syncfusion/ej2-react-grids';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { toast } from 'react-hot-toast';
import { UppgiftRegistrering } from '@/components/tasks/UppgiftRegistrering';
import type { Task } from '@/lib/types';
import { formatDistanceToNow, format, isToday, isPast } from 'date-fns';
import { sv } from 'date-fns/locale';

export function AllTasksView() {
  const { tasks, deleteTask } = useTasks();
  const { projects } = useProjects();
  const gridRef = useRef<GridComponent>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchText, setSearchText] = useState('');

  // Alla aktiva uppgifter (inkl. Snabbis)
  const activeTasks = tasks.filter(t => t.status !== 'done');

  // Snabbis-uppgifter (≤2 min)
  const snabbis = activeTasks.filter(t =>
    t.estimated_duration && t.estimated_duration <= 2
  );

  // Förbered data med extra kolumner för visning + client-side search
  const gridData = activeTasks
    .filter(task => {
      if (!searchText) return true;
      const search = searchText.toLowerCase();
      const project = projects.find(p => p.id === task.project_id);
      return (
        task.title?.toLowerCase().includes(search) ||
        task.description?.toLowerCase().includes(search) ||
        project?.name?.toLowerCase().includes(search) ||
        project?.client_name?.toLowerCase().includes(search)
      );
    })
    .map(task => {
    const project = projects.find(p => p.id === task.project_id);

    // Deadline-gruppering
    let deadlineGroup = 'Någon gång';
    if (task.deadline) {
      const deadline = new Date(task.deadline);
      const now = new Date();
      const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (isPast(deadline) && !isToday(deadline)) {
        deadlineGroup = 'Försenade 🔴';
      } else if (daysUntil <= 1) {
        deadlineGroup = 'Idag 🟠';
      } else if (daysUntil <= 3) {
        deadlineGroup = 'Imorgon 🟡';
      } else if (daysUntil <= 7) {
        deadlineGroup = 'Inom 7 dagar 📅';
      } else if (daysUntil <= 14) {
        deadlineGroup = 'Inom 14 dagar 📅';
      } else if (daysUntil <= 30) {
        deadlineGroup = 'Inom 30 dagar 📅';
      } else {
        deadlineGroup = 'Någon gång';
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
    columns: ['deadlineGroup'],
    captionTemplate: '${key} - ${count} Objekt'
  };


  // Rensa gammal grid state (pga kolumn-ändringar)
  useEffect(() => {
    localStorage.removeItem('allTasksViewGridState');
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
    const badgeClass =
      props.priorityCategory === 'Hög' ? 'e-badge-danger' :
      props.priorityCategory === 'Medel' ? 'e-badge-warning' :
      'e-badge-secondary';

    return (
      <span className={`e-badge e-badge-pill ${badgeClass}`}>
        {Math.round(props.priority)} {props.priorityCategory}
      </span>
    );
  };

  const statusTemplate = (props: any) => {
    const badgeClass =
      props.status === 'done' ? 'e-badge-success' :
      props.status === 'in_progress' ? 'e-badge-info' :
      'e-badge-secondary';

    return (
      <span className={`e-badge e-badge-pill ${badgeClass}`}>
        {props.statusLabel}
      </span>
    );
  };

  const deadlineTemplate = (props: any) => {
    if (!props.deadline) return <span style={{ color: 'var(--color-sf-black)', opacity: 0.4 }}>-</span>;

    const deadline = new Date(props.deadline);
    const isOverdue = isPast(deadline) && !isToday(deadline);

    return (
      <span style={{
        color: isOverdue ? 'var(--color-sf-danger)' : 'var(--color-sf-black)',
        fontWeight: isOverdue ? '600' : 'normal'
      }}>
        {props.deadlineFormatted}
      </span>
    );
  };

  // Header template for bold text (som ProjectsView)
  const headerTemplate = (headerText: string) => {
    return () => <span className="e-font-bold">{headerText}</span>;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
          Alla uppgifter <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--color-sf-black)', opacity: 0.6 }}>
            ({activeTasks.length})
          </span>
        </h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '280px' }}>
            <TextBoxComponent
              placeholder="Sök uppgifter..."
              showClearButton={true}
              input={(e: any) => setSearchText(e.value)}
              cssClass="e-outline"
            />
          </div>
          <ButtonComponent
            onClick={() => {
              setSelectedTask(null);
              setIsFormOpen(true);
            }}
            cssClass="e-primary"
            iconCss="e-icons e-plus"
            content="Ny uppgift"
          />
        </div>
      </div>

      {/* Snabbis-sektion */}
      {snabbis.length > 0 && (
        <div className="e-card">
          <div className="e-card-header">
            <div className="e-card-title">⚡ Snabbis ({snabbis.length}) - Gör direkt!</div>
          </div>
          <div className="e-card-content" style={{ padding: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {snabbis.map(task => (
                <div
                  key={task.id}
                  className="e-card"
                  style={{ cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                  onClick={() => {
                    setSelectedTask(task);
                    setIsFormOpen(true);
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div className="e-card-content" style={{ padding: '12px' }}>
                    <p style={{ fontWeight: '500', fontSize: '14px', margin: '0 0 4px 0' }}>{task.title}</p>
                    <p style={{ fontSize: '12px', margin: 0, opacity: 0.6 }}>
                      {task.estimated_duration}min
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <GridComponent
          ref={gridRef}
          dataSource={gridData}
          allowPaging={true}
          allowSorting={true}
          allowFiltering={true}
          allowGrouping={true}
          allowTextWrap={false}
          pageSettings={pageSettings}
          filterSettings={filterSettings}
          sortSettings={sortSettings}
          groupSettings={groupSettings}
          recordDoubleClick={handleRecordDoubleClick}
          keyPressed={handleKeyDown}
          columnMenuClick={saveGridState}
          resizeStop={saveGridState}
          height="auto"
          rowHeight={30}
          gridLines="Horizontal"
          enableHover={true}
          enableStickyHeader={true}
          enablePersistence={false}
        >
          <ColumnsDirective>
            <ColumnDirective
              field="title"
              headerText="Uppgift"
              headerTemplate={headerTemplate("Uppgift")}
              width="250"
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="priority"
              headerText="Prioritet"
              headerTemplate={headerTemplate("Prioritet")}
              width="140"
              template={priorityTemplate}
              allowFiltering={false}
            />
            <ColumnDirective
              field="deadlineFormatted"
              headerText="Deadline"
              headerTemplate={headerTemplate("Deadline")}
              width="140"
              template={deadlineTemplate}
            />
            <ColumnDirective
              field="status"
              headerText="Status"
              headerTemplate={headerTemplate("Status")}
              width="120"
              template={statusTemplate}
            />
            <ColumnDirective
              field="projectName"
              headerText="Projekt"
              headerTemplate={headerTemplate("Projekt")}
              width="150"
              clipMode="Ellipsis"
            />
            <ColumnDirective
              field="clientName"
              headerText="Kund"
              headerTemplate={headerTemplate("Kund")}
              width="150"
              clipMode="Ellipsis"
              visible={false}
            />
            <ColumnDirective
              field="durationFormatted"
              headerText="Tid"
              headerTemplate={headerTemplate("Tid")}
              width="80"
              textAlign="Center"
            />
            <ColumnDirective
              field="deadlineGroup"
              headerText="Tidsgrupp"
              headerTemplate={headerTemplate("Tidsgrupp")}
              width="120"
              visible={false}
            />
          </ColumnsDirective>
          <Inject services={[Page, Sort, Filter, Group]} />
        </GridComponent>

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
