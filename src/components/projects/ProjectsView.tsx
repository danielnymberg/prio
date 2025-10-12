import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Project, CreateProjectInput, UpdateProjectInput } from '@/lib/types';
import { ProjectOnboardingModal } from '../onboarding/ProjectOnboardingModal';
import { useNavigate } from 'react-router-dom';
import { showToast } from '@/services/toast';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Filter,
  Toolbar,
  Edit,
  Inject,
  ToolbarItems,
  EditSettingsModel,
} from '@syncfusion/ej2-react-grids';

export function ProjectsView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const gridRef = useRef<GridComponent>(null);

  useEffect(() => {
    if (user) {
      fetchProjects();

      // Check if user has seen project onboarding
      const completed = localStorage.getItem('prio_project_onboarding_completed');
      if (!completed) {
        setShowOnboarding(true);
      }
    }
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      showToast.error('Kunde inte hämta projekt');
    } finally {
      setLoading(false);
    }
  };

  // Handle grid actions
  const actionComplete = async (args: any) => {
    if (args.requestType === 'save') {
      // Update existing project
      const updatedData = args.data;
      try {
        const updateInput: UpdateProjectInput = {
          name: updatedData.name,
          description: updatedData.description,
          client_name: updatedData.client_name,
          quoted_hours: updatedData.quoted_hours,
          hourly_rate: updatedData.hourly_rate,
          external_costs: updatedData.external_costs,
          project_deadline: updatedData.project_deadline,
          completion_percentage: updatedData.completion_percentage,
          color: updatedData.color,
          status: updatedData.status,
        };

        const { error } = await supabase
          .from('projects')
          .update(updateInput)
          .eq('id', updatedData.id);

        if (error) throw error;
        showToast.success('Projekt uppdaterat!');
        fetchProjects();
      } catch (error) {
        console.error('Error updating project:', error);
        showToast.error('Kunde inte uppdatera projekt');
      }
    } else if (args.requestType === 'delete') {
      // Delete project
      const deletedData = args.data[0];
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', deletedData.id);

        if (error) throw error;
        showToast.success('Projekt raderat');
        fetchProjects();
      } catch (error) {
        console.error('Error deleting project:', error);
        showToast.error('Kunde inte radera projekt');
      }
    } else if (args.requestType === 'beginEdit') {
      // User started editing
    }
  };

  const actionBegin = async (args: any) => {
    if (args.requestType === 'add') {
      // Prevent default add, we'll handle it custom
      args.cancel = true;
      navigate('/projects/new'); // Or show custom form
    }
  };

  // Prepare grid data with calculated fields
  const gridData = projects.map(project => {
    const totalBudget = project.quoted_hours * project.hourly_rate + project.external_costs;
    return {
      ...project,
      total_budget: totalBudget,
      status_display: project.status === 'active' ? 'Aktiv' : project.status === 'completed' ? 'Slutförd' : 'Arkiverad',
    };
  });

  const editSettings: EditSettingsModel = {
    allowEditing: true,
    allowAdding: false, // Disable built-in add, use custom flow
    allowDeleting: true,
    mode: 'Dialog',
    template: undefined, // Use default dialog
  };

  const toolbarItems: ToolbarItems[] = [
    'Edit',
    'Delete',
    'Update',
    'Cancel',
    'Search',
  ];

  const pageSettings = { pageSize: 20, pageSizes: [10, 20, 50] };
  const sortSettings = { columns: [{ field: 'created_at', direction: 'Descending' as any }] };

  // Progress bar template
  const progressTemplate = (props: any) => {
    const percentage = props.completion_percentage || 0;
    const getColor = () => {
      if (percentage < 30) return 'bg-red-500';
      if (percentage < 70) return 'bg-yellow-500';
      return 'bg-green-500';
    };

    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${getColor()} transition-all`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs font-medium w-10">{percentage}%</span>
      </div>
    );
  };

  // Budget template (formatted currency)
  const budgetTemplate = (props: any) => {
    return (
      <span className="font-medium">
        {props.total_budget.toLocaleString('sv-SE')} kr
      </span>
    );
  };

  // Status badge template
  const statusTemplate = (props: any) => {
    const getStatusStyle = () => {
      if (props.status === 'active')
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      if (props.status === 'completed')
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs ${getStatusStyle()}`}>
        {props.status_display}
      </span>
    );
  };

  // Handle row double-click to navigate to details
  const handleRecordDoubleClick = (args: any) => {
    navigate(`/projects/${args.rowData.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-copper-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Projekt
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {projects.length} projekt totalt
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Inga projekt än</p>
            <button
              onClick={() => navigate('/projects/new')}
              className="px-6 py-3 bg-copper-600 text-white rounded-lg hover:bg-copper-700"
            >
              Skapa ditt första projekt
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <GridComponent
            ref={gridRef}
            dataSource={gridData}
            allowPaging={true}
            allowSorting={true}
            allowFiltering={true}
            editSettings={editSettings}
            toolbar={toolbarItems}
            pageSettings={pageSettings}
            sortSettings={sortSettings}
            actionComplete={actionComplete}
            actionBegin={actionBegin}
            recordDoubleClick={handleRecordDoubleClick}
            height="100%"
            rowHeight={60}
            gridLines="Horizontal"
            enableHover={true}
            enableStickyHeader={true}
          >
            <ColumnsDirective>
              <ColumnDirective
                field="name"
                headerText="Projektnamn"
                width="200"
                clipMode="EllipsisWithTooltip"
                validationRules={{ required: true }}
              />
              <ColumnDirective
                field="client_name"
                headerText="Kund"
                width="150"
                clipMode="EllipsisWithTooltip"
              />
              <ColumnDirective
                field="quoted_hours"
                headerText="Offererade timmar"
                width="120"
                editType="numericedit"
                format="N0"
                textAlign="Center"
                validationRules={{ required: true, min: 0 }}
              />
              <ColumnDirective
                field="hourly_rate"
                headerText="Timpris (kr)"
                width="100"
                editType="numericedit"
                format="N0"
                textAlign="Right"
                validationRules={{ required: true, min: 0 }}
              />
              <ColumnDirective
                field="total_budget"
                headerText="Budget"
                width="120"
                template={budgetTemplate}
                allowEditing={false}
                textAlign="Right"
              />
              <ColumnDirective
                field="completion_percentage"
                headerText="Färdigt"
                width="150"
                template={progressTemplate}
                editType="numericedit"
                edit={{ params: { min: 0, max: 100, step: 5 } }}
              />
              <ColumnDirective
                field="status"
                headerText="Status"
                width="100"
                template={statusTemplate}
                editType="dropdownedit"
                edit={{
                  params: {
                    dataSource: [
                      { value: 'active', text: 'Aktiv' },
                      { value: 'completed', text: 'Slutförd' },
                      { value: 'archived', text: 'Arkiverad' },
                    ],
                    fields: { value: 'value', text: 'text' },
                  },
                }}
              />
              <ColumnDirective
                field="project_deadline"
                headerText="Deadline"
                width="120"
                type="date"
                format="yyyy-MM-dd"
                editType="datepickeredit"
              />
            </ColumnsDirective>
            <Inject services={[Page, Sort, Filter, Toolbar, Edit]} />
          </GridComponent>
        </div>
      )}

      {/* Onboarding Modal */}
      <ProjectOnboardingModal
        isOpen={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
    </div>
  );
}
