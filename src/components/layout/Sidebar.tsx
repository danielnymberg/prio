import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { useState } from 'react';
import { TaskForm } from '@/components/tasks/TaskForm';
import { Task, CreateTaskInput } from '@/lib/types';
import { TreeViewComponent } from '@syncfusion/ej2-react-navigations';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { tasks, createTask, updateTask } = useTasks();
  const navigate = useNavigate();
  const location = useLocation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>(undefined);

  // Exkludera Snabbis (≤2 min) från räknare - de visas endast i FocusView
  const activeTasks = tasks.filter(t => t.status !== 'done' && (t.estimated_duration || 999) > 2);

  // TreeView data structure
  const menuData = [
    {
      id: '1',
      name: 'Just nu',
      iconCss: 'e-icons e-target',
      url: '/focus',
      expanded: true,
      highlight: true,
    },
    {
      id: '2',
      name: 'Översikt',
      iconCss: 'e-icons e-bar-chart',
      url: '/overview',
    },
    {
      id: '3',
      name: 'Kalender',
      iconCss: 'e-icons e-schedule',
      url: '/calendar',
    },
    {
      id: '4',
      name: `Alla uppgifter (${activeTasks.length})`,
      iconCss: 'e-icons e-list-unordered',
      url: '/all',
    },
    {
      id: '5',
      name: 'Eisenhower Matrix',
      iconCss: 'e-icons e-grid-layout',
      url: '/matrix',
    },
    {
      id: '6',
      name: 'Inställningar',
      iconCss: 'e-icons e-settings',
      url: '/settings',
    },
    {
      id: '7',
      name: 'Avancerat',
      iconCss: 'e-icons e-more-horizontal-1',
      expanded: false,
      hasChild: true,
      child: [
        {
          id: '7-1',
          name: 'Projekt',
          iconCss: 'e-icons e-folder',
          url: '/projects',
        },
        {
          id: '7-2',
          name: 'Importera',
          iconCss: 'e-icons e-upload-1',
          url: '/import',
        },
        {
          id: '7-3',
          name: 'Arkiv',
          iconCss: 'e-icons e-archive',
          url: '/archive',
        },
      ],
    },
  ];

  // Handle node selection
  const handleNodeSelect = (args: any) => {
    const nodeData = args.nodeData;
    if (nodeData.url) {
      navigate(nodeData.url);
      onClose(); // Close sidebar on mobile after navigation
    }
  };

  // Custom template for highlighting current route
  const nodeTemplate = (data: any) => {
    const isActive = location.pathname === data.url;
    const isHighlight = data.highlight;

    return (
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
          isHighlight
            ? isActive
              ? 'bg-copper-500 text-white shadow-soft'
              : 'bg-copper-400 text-white hover:bg-copper-500 shadow-subtle'
            : isActive
            ? 'bg-sand-200 dark:bg-charcoal-800 text-copper-600 dark:text-copper-400'
            : 'text-stone-700 dark:text-stone-300 hover:bg-sand-100 dark:hover:bg-charcoal-850'
        }`}
      >
        <span className={data.iconCss} />
        <span className="font-medium">{data.name}</span>
      </div>
    );
  };

  return (
    <>
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-cream-50 dark:bg-charcoal-900 border-r border-sand-200 dark:border-charcoal-800
          p-6 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Stäng-knapp för mobil */}
        <div className="lg:hidden flex justify-end mb-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-sand-100 dark:hover:bg-charcoal-800 rounded-xl transition-colors"
            aria-label="Stäng meny"
          >
            <X className="h-6 w-6 text-stone-600 dark:text-stone-400" />
          </button>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setSelectedTask(undefined); // Reset för ny uppgift
            setIsFormOpen(true);
            onClose(); // Stäng sidebar på mobil efter klick
          }}
          className="w-full mb-6 min-h-[44px]"
        >
          <Plus className="h-5 w-5 mr-2" />
          Ny uppgift
        </Button>

        <nav className="space-y-1 flex-1 overflow-y-auto">
          <TreeViewComponent
            fields={{
              dataSource: menuData,
              id: 'id',
              text: 'name',
              child: 'child',
              iconCss: 'iconCss',
              expanded: 'expanded',
              hasChildren: 'hasChild',
            }}
            nodeSelected={handleNodeSelect}
            nodeTemplate={nodeTemplate}
            cssClass="sidebar-treeview"
            expandOn="Click"
          />
        </nav>
      </aside>

      <TaskForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedTask(undefined);
        }}
        onSubmit={async (input) => {
          if (selectedTask) {
            await updateTask(selectedTask.id, input);
          } else {
            await createTask(input as CreateTaskInput);
          }
        }}
        task={selectedTask}
      />
    </>
  );
}
