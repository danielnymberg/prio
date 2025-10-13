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

  // TreeView data structure with navigateUrl (Syncfusion's standard)
  const menuData: any[] = [
    {
      id: '1',
      text: 'Just nu',
      iconCss: 'e-icons e-target',
      navigateUrl: '/focus',
      expanded: true,
      highlight: true,
    },
    {
      id: '2',
      text: 'Översikt',
      iconCss: 'e-icons e-bar-chart',
      navigateUrl: '/overview',
    },
    {
      id: '3',
      text: 'Kalender',
      iconCss: 'e-icons e-schedule',
      navigateUrl: '/calendar',
    },
    {
      id: '4',
      text: `Alla uppgifter (${activeTasks.length})`,
      iconCss: 'e-icons e-list-unordered',
      navigateUrl: '/all',
    },
    {
      id: '5',
      text: 'Eisenhower Matrix',
      iconCss: 'e-icons e-grid-layout',
      navigateUrl: '/matrix',
    },
    {
      id: '6',
      text: 'Inställningar',
      iconCss: 'e-icons e-settings',
      navigateUrl: '/settings',
    },
    {
      id: '7',
      text: 'Avancerat',
      iconCss: 'e-icons e-more-horizontal-1',
      expanded: false,
      hasChild: true,
      child: [
        {
          id: '7-1',
          text: 'Projekt',
          iconCss: 'e-icons e-folder',
          navigateUrl: '/projects',
        },
        {
          id: '7-2',
          text: 'Importera',
          iconCss: 'e-icons e-upload-1',
          navigateUrl: '/import',
        },
        {
          id: '7-3',
          text: 'Arkiv',
          iconCss: 'e-icons e-archive',
          navigateUrl: '/archive',
        },
      ],
    },
  ];

  // Handle node selecting (before selection) - Syncfusion's way for custom navigation
  const handleNodeSelecting = (args: any) => {
    console.log('🔥 TreeView nodeSelecting triggered!', args);

    // Prevent default link navigation
    args.cancel = true;

    // Use React Router instead for SPA behavior
    const url = args.nodeData.navigateUrl;
    if (url) {
      console.log('📍 Navigating to:', url);
      navigate(url);
      onClose(); // Close sidebar on mobile after navigation
    } else {
      console.log('⚠️ No navigateUrl found in nodeData:', args.nodeData);
    }
  };

  // Custom template for highlighting current route
  const nodeTemplate = (data: any) => {
    const isActive = location.pathname === data.navigateUrl;
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
        <span className="font-medium">{data.text}</span>
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
              text: 'text',
              child: 'child',
              iconCss: 'iconCss',
              navigateUrl: 'navigateUrl', // Syncfusion's standard for navigation
              expanded: 'expanded',
              hasChildren: 'hasChild',
            }}
            nodeSelecting={handleNodeSelecting} // Before selection - intercept navigation
            nodeTemplate={nodeTemplate}
            expandOn="Click"
            allowEditing={false}
            allowDragAndDrop={false}
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
