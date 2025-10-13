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

  // TreeView data - React kommer automatiskt re-rendera när activeTasks.length ändras
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

  // Track if we're programmatically selecting to prevent navigation loop
  const isSelectingProgrammatically = useRef(false);

  // SyncFusion nodeSelected event handler
  const handleNodeSelected = (args: any) => {
    // Skip if this is a programmatic selection
    if (isSelectingProgrammatically.current) {
      isSelectingProgrammatically.current = false;
      return;
    }

    // Hämta full node data med getTreeData
    if (treeRef.current && args.node) {
      const nodeData = treeRef.current.getTreeData(args.node);

      if (nodeData && nodeData[0] && nodeData[0].url) {
        navigate(nodeData[0].url);
        onClose(); // Stäng sidebar på mobil
      }
    }
  };

  // Markera aktiv nod baserat på current route (endast vid route change, inte vid TreeView update)
  useEffect(() => {
    if (treeRef.current && treeRef.current.element) {
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
      const currentlySelected = treeRef.current.selectedNodes[0];

      // Only update if the selection actually needs to change
      if (activeNodeId && activeNodeId !== currentlySelected) {
        isSelectingProgrammatically.current = true;
        treeRef.current.selectedNodes = [activeNodeId];
      }
    }
  }, [location.pathname]); // REMOVED treeData dependency to prevent loop

  return (
    <>
      <aside
        className="sidebar-responsive"
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 40,
          width: '16rem',
          backgroundColor: 'var(--e-surface)',
          borderRight: '1px solid var(--e-border)',
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 300ms ease-in-out'
        }}
      >
        {/* Header med stängknapp för mobil */}
        <div
          style={{
            padding: '1rem',
            borderBottom: '1px solid var(--e-border)',
            display: 'none'
          }}
          className="mobile-only"
        >
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              borderRadius: '0.5rem',
              transition: 'background-color 200ms',
              marginLeft: 'auto',
              display: 'block',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--e-surface-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="Stäng meny"
          >
            <X style={{ width: '1.25rem', height: '1.25rem', color: 'var(--e-text-secondary)' }} />
          </button>
        </div>

        {/* Ny uppgift-knapp */}
        <div style={{ padding: '1rem' }}>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setSelectedTask(undefined);
              setIsFormOpen(true);
              onClose();
            }}
            style={{ width: '100%' }}
          >
            <Plus style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
            Ny uppgift
          </Button>
        </div>

        {/* TreeView Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', paddingLeft: '0.75rem', paddingRight: '0.75rem', paddingBottom: '1rem' }}>
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
