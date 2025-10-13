import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Project, UpdateProjectInput } from '@/lib/types';
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
      if (percentage < 30) return '#ef4444';
      if (percentage < 70) return 'var(--warning-500)';
      return '#10b981';
    };

    return (
      <div className="e-flex e-align-center e-gap-8">
        <div className="e-flex-1 e-rounded-full e-overflow-hidden" style={{
          backgroundColor: 'var(--e-surface-hover)',
          height: '8px'
        }}>
          <div
            className="e-transition"
            style={{
              height: '100%',
              backgroundColor: getColor(),
              width: `${percentage}%`
            }}
          />
        </div>
        <span className="e-text-xs e-font-medium" style={{
          width: '40px',
          color: 'var(--e-text)'
        }}>{percentage}%</span>
      </div>
    );
  };

  // Budget template (formatted currency)
  const budgetTemplate = (props: any) => {
    return (
      <span className="e-font-medium" style={{ color: 'var(--e-text)' }}>
        {props.total_budget.toLocaleString('sv-SE')} kr
      </span>
    );
  };

  // Status badge template
  const statusTemplate = (props: any) => {
    const getStatusStyle = () => {
      if (props.status === 'active')
        return { backgroundColor: '#10b981', color: '#ffffff' };
      if (props.status === 'completed')
        return { backgroundColor: 'var(--primary-500)', color: '#ffffff' };
      return { backgroundColor: 'var(--e-surface-hover)', color: 'var(--e-text)' };
    };

    const style = getStatusStyle();

    return (
      <span className="e-px-8 e-py-4 e-rounded-full e-text-xs" style={style}>
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
      <div className="e-flex e-align-center e-justify-center" style={{ minHeight: '100vh' }}>
        <div className="e-animate-spin e-rounded-full" style={{
          height: '48px',
          width: '48px',
          borderBottom: '2px solid var(--primary-600)',
        }} />
      </div>
    );
  }

  return (
    <div className="e-h-full e-flex e-flex-column e-gap-16 e-p-24">
      {/* Header */}
      <div className="e-flex e-align-center e-justify-between">
        <div>
          <h1 className="e-text-2xl e-font-bold e-mb-4" style={{ color: 'var(--e-text)' }}>
            Projekt
          </h1>
          <p className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>
            {projects.length} projekt totalt
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="e-flex-1 e-flex e-align-center e-justify-center">
          <div className="e-text-center">
            <p className="e-mb-16" style={{ color: 'var(--e-text-secondary)' }}>Inga projekt än</p>
            <button
              onClick={() => navigate('/projects/new')}
              className="e-px-24 e-py-12 e-rounded-lg e-text-base e-font-medium e-transition"
              style={{
                backgroundColor: 'var(--primary-600)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-700)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-600)'}
            >
              Skapa ditt första projekt
            </button>
          </div>
        </div>
      ) : (
        <div className="e-flex-1 e-rounded-xl e-overflow-hidden" style={{
          backgroundColor: 'var(--e-surface)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
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
