import { useNavigate, useLocation } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { useRef, useEffect } from 'react';
import { SidebarComponent } from '@syncfusion/ej2-react-navigations';
import { TreeViewComponent } from '@syncfusion/ej2-react-navigations';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { tasks } = useTasks();
  const navigate = useNavigate();
  const location = useLocation();
  const treeRef = useRef<TreeViewComponent>(null);
  const sidebarRef = useRef<SidebarComponent>(null);

  // Exkludera Snabbis (≤2 min) från räknare
  const activeTasks = tasks.filter(t => t.status !== 'done' && (t.estimated_duration || 999) > 2);

  // TreeView data
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
      name: 'Kalender',
      iconCss: 'e-icons e-clock',
      url: '/calendar'
    },
    {
      id: '3',
      name: `Uppgifter (${activeTasks.length})`,
      iconCss: 'e-icons e-list-unordered',
      url: '/all'
    },
    {
      id: '4',
      name: 'Projekt',
      iconCss: 'e-icons e-folder-open',
      url: '/projects'
    },
    {
      id: '5',
      name: 'Gantt Timeline',
      iconCss: 'e-icons e-agenda-date-range',
      url: '/gantt'
    },
    {
      id: '6',
      name: 'Resursallokering',
      iconCss: 'e-icons e-play',
      url: '/allocation'
    },
    {
      id: '7',
      name: 'Inställningar',
      iconCss: 'e-icons e-settings',
      url: '/settings'
    },
    {
      id: '8',
      name: 'Avancerat',
      iconCss: 'e-icons e-folder',
      expanded: false,
      subChild: [
        {
          id: '8-1',
          name: 'Importera',
          iconCss: 'e-icons e-upload',
          url: '/import'
        },
        {
          id: '8-2',
          name: 'Arkiv',
          iconCss: 'e-icons e-folder',
          url: '/archive'
        },
      ],
    },
    {
      id: '9',
      name: 'Översikt',
      iconCss: 'e-icons e-chart',
      url: '/overview'
    },
  ];

  const isSelectingProgrammatically = useRef(false);

  const handleNodeSelected = (args: any) => {
    if (isSelectingProgrammatically.current) {
      isSelectingProgrammatically.current = false;
      return;
    }

    if (treeRef.current && args.node) {
      const nodeData = treeRef.current.getTreeData(args.node);

      if (nodeData && nodeData[0] && nodeData[0].url) {
        navigate(nodeData[0].url);

        // Close sidebar only on mobile (<768px)
        const isMobile = window.matchMedia('(max-width: 767px)').matches;
        if (isMobile) {
          onClose();
        }
      }
    }
  };

  useEffect(() => {
    if (treeRef.current && treeRef.current.element) {
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

      if (activeNodeId && activeNodeId !== currentlySelected) {
        isSelectingProgrammatically.current = true;
        treeRef.current.selectedNodes = [activeNodeId];
      }
    }
  }, [location.pathname]);

  return (
    <>
      <SidebarComponent
        ref={sidebarRef}
        width="240px"
        type="Push"
        showBackdrop={false}
        isOpen={isOpen}
        close={onClose}
        position="Left"
        style={{ top: '64px', height: 'calc(100vh - 64px)' }}
      >
        <nav className="e-flex-1 e-overflow-y-auto e-px-12 e-pb-16 e-pt-16">
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
      </SidebarComponent>
    </>
  );
}
