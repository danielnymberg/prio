import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { useState, useRef, useEffect } from 'react';
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
  const treeRef = useRef<TreeViewComponent>(null);

  // Exkludera Snabbis (≤2 min) från räknare
  const activeTasks = tasks.filter(t => t.status !== 'done' && (t.estimated_duration || 999) > 2);

  // TreeView data med SyncFusion standard fields + custom 'url' field
  const treeData: { [key: string]: any }[] = [
    {
      id: '1',
      name: 'Just nu',
      iconCss: 'e-icons e-home',
      url: '/focus',
      cssClass: 'focus-item'
    },
    {
      id: '2',
      name: 'Översikt',
      iconCss: 'e-icons e-chart',
      url: '/overview'
    },
    {
      id: '3',
      name: 'Kalender',
      iconCss: 'e-icons e-schedule',
      url: '/calendar'
    },
    {
      id: '4',
      name: `Alla uppgifter (${activeTasks.length})`,
      iconCss: 'e-icons e-list-unordered',
      url: '/all'
    },
    {
      id: '5',
      name: 'Eisenhower Matrix',
      iconCss: 'e-icons e-grid',
      url: '/matrix'
    },
    {
      id: '6',
      name: 'Inställningar',
      iconCss: 'e-icons e-settings',
      url: '/settings'
    },
    {
      id: '7',
      name: 'Avancerat',
      iconCss: 'e-icons e-folder',
      expanded: false,
      subChild: [
        {
          id: '7-1',
          name: 'Projekt',
          iconCss: 'e-icons e-folder-open',
          url: '/projects'
        },
        {
          id: '7-2',
          name: 'Importera',
          iconCss: 'e-icons e-upload',
          url: '/import'
        },
        {
          id: '7-3',
          name: 'Arkiv',
          iconCss: 'e-icons e-archive',
          url: '/archive'
        },
      ],
    },
  ];

  // SyncFusion nodeSelected event handler
  const handleNodeSelected = (args: any) => {
    // Hämta full node data med getTreeData
    if (treeRef.current && args.node) {
      const nodeData = treeRef.current.getTreeData(args.node);

      if (nodeData && nodeData[0] && nodeData[0].url) {
        navigate(nodeData[0].url);
        onClose(); // Stäng sidebar på mobil
      }
    }
  };

  // Markera aktiv nod baserat på current route
  useEffect(() => {
    if (treeRef.current) {
      // Hitta noden som matchar current path
      const findNodeByUrl = (nodes: any[], url: string): string | null => {
        for (const node of nodes) {
          if (node.url === url) return node.id;
          if (node.subChild) {
            const found = findNodeByUrl(node.subChild, url);
            if (found) return found;
          }
        }
        return null;
      };

      const activeNodeId = findNodeByUrl(treeData, location.pathname);
      if (activeNodeId) {
        // Sätt selected node programmatiskt
        treeRef.current.selectedNodes = [activeNodeId];
      }
    }
  }, [location.pathname]);

  return (
    <>
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-40
          w-64 bg-cream-50 dark:bg-charcoal-900
          border-r border-sand-200 dark:border-charcoal-800
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Header med stängknapp för mobil */}
        <div className="p-4 border-b border-sand-200 dark:border-charcoal-800 lg:hidden">
          <button
            onClick={onClose}
            className="p-2 hover:bg-sand-100 dark:hover:bg-charcoal-800 rounded-lg transition-colors ml-auto block"
            aria-label="Stäng meny"
          >
            <X className="h-5 w-5 text-stone-600 dark:text-stone-400" />
          </button>
        </div>

        {/* Ny uppgift-knapp */}
        <div className="p-4">
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setSelectedTask(undefined);
              setIsFormOpen(true);
              onClose();
            }}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ny uppgift
          </Button>
        </div>

        {/* TreeView Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <TreeViewComponent
            ref={treeRef}
            fields={{
              dataSource: treeData,
              id: 'id',
              text: 'name',
              iconCss: 'iconCss',
              child: 'subChild',
              expanded: 'expanded'
            }}
            nodeSelected={handleNodeSelected}
            expandOn="Click"
            cssClass="sidebar-tree"
            fullRowNavigable={true}
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
