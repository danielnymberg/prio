import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Project, UpdateProjectInput } from '@/lib/types';
import { useNavigate } from 'react-router-dom';
import { showToast } from '@/services/toast';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Filter,
  Edit,
  Inject,
  EditSettingsModel,
} from '@syncfusion/ej2-react-grids';

export function ProjectsView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const gridRef = useRef<GridComponent>(null);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id);

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

  // Prepare grid data with calculated fields and search filter
  const gridData = projects
    .map(project => {
      const totalBudget = project.quoted_hours * project.hourly_rate + project.external_costs;
      return {
        ...project,
        total_budget: totalBudget,
        status_display: project.status === 'active' ? 'Aktiv' : project.status === 'completed' ? 'Slutförd' : 'Arkiverad',
      };
    })
    .filter(project => {
      if (!searchText) return true;
      const search = searchText.toLowerCase();
      return (
        project.name?.toLowerCase().includes(search) ||
        project.client_name?.toLowerCase().includes(search) ||
        project.description?.toLowerCase().includes(search)
      );
    });

  const editSettings: EditSettingsModel = {
    allowEditing: true,
    allowAdding: false,
    allowDeleting: true,
    mode: 'Dialog',
  };

  const pageSettings = { pageSize: 20, pageSizes: [10, 20, 50] };

  // Progress bar template
  const progressTemplate = (props: any) => {
    const percentage = props.completion_percentage || 0;

    return (
      <div className="e-flex e-align-center e-gap-8">
        <div className="e-flex-1 e-rounded-full e-overflow-hidden" style={{
          height: '8px'
        }}>
          <div
            className="e-transition"
            style={{
              height: '100%',
              width: `${percentage}%`
            }}
          />
        </div>
        <span className="e-text-xs e-font-medium" style={{
          width: '40px'
        }}>{percentage}%</span>
      </div>
    );
  };

  // Budget template (formatted currency)
  const budgetTemplate = (props: any) => {
    return (
      <span className="e-font-medium">
        {props.total_budget.toLocaleString('sv-SE')} kr
      </span>
    );
  };

  // Status badge template
  const statusTemplate = (props: any) => {
    return (
      <span className="e-px-8 e-py-4 e-rounded-full e-text-xs">
        {props.status_display}
      </span>
    );
  };

  // Header template for bold text
  const headerTemplate = (headerText: string) => {
    return () => <span className="e-font-bold">{headerText}</span>;
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
          width: '48px'
        }} />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="e-mb-16 e-flex e-align-center e-justify-between">
        <div>
          <h1 className="e-text-2xl e-font-bold e-mb-4">
            Projekt
          </h1>
          <p className="e-text-sm">
            {projects.length} projekt totalt
          </p>
        </div>
        <div style={{ width: '320px' }}>
          <TextBoxComponent
            placeholder="Sök projekt..."
            showClearButton={true}
            input={(e: any) => setSearchText(e.value)}
            cssClass="e-outline"
          />
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="e-text-center e-mt-64">
          <p className="e-mb-16">Inga projekt än</p>
          <button
            onClick={() => navigate('/projects/new')}
            className="e-px-24 e-py-12 e-rounded-lg e-text-base e-font-medium e-transition"
            style={{
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Skapa ditt första projekt
          </button>
        </div>
      ) : (
        <GridComponent
          ref={gridRef}
          dataSource={gridData}
          allowPaging={true}
          allowSorting={true}
          allowFiltering={true}
          editSettings={editSettings}
          pageSettings={pageSettings}
          actionComplete={actionComplete}
          actionBegin={actionBegin}
          recordDoubleClick={handleRecordDoubleClick}
          height="auto"
          rowHeight={30}
          gridLines="Horizontal"
          enableHover={true}
        >
          <ColumnsDirective>
            <ColumnDirective
              field="id"
              headerText="ID"
              width="80"
              isPrimaryKey={true}
              visible={false}
            />
            <ColumnDirective
              field="name"
              headerText="Projektnamn"
              headerTemplate={headerTemplate("Projektnamn")}
              width="200"
              clipMode="EllipsisWithTooltip"
              validationRules={{ required: true }}
            />
            <ColumnDirective
              field="client_name"
              headerText="Kund"
              headerTemplate={headerTemplate("Kund")}
              width="150"
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="quoted_hours"
              headerText="Offererade timmar"
              headerTemplate={headerTemplate("Offererade timmar")}
              width="120"
              editType="numericedit"
              format="N0"
              textAlign="Center"
              validationRules={{ required: true, min: 0 }}
            />
            <ColumnDirective
              field="hourly_rate"
              headerText="Timpris (kr)"
              headerTemplate={headerTemplate("Timpris (kr)")}
              width="100"
              editType="numericedit"
              format="N0"
              textAlign="Right"
              validationRules={{ required: true, min: 0 }}
            />
            <ColumnDirective
              field="total_budget"
              headerText="Budget"
              headerTemplate={headerTemplate("Budget")}
              width="120"
              template={budgetTemplate}
              allowEditing={false}
              textAlign="Right"
            />
            <ColumnDirective
              field="completion_percentage"
              headerText="Färdigt"
              headerTemplate={headerTemplate("Färdigt")}
              width="150"
              template={progressTemplate}
              editType="numericedit"
              edit={{ params: { min: 0, max: 100, step: 5 } }}
            />
            <ColumnDirective
              field="status"
              headerText="Status"
              headerTemplate={headerTemplate("Status")}
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
              headerTemplate={headerTemplate("Deadline")}
              width="120"
              type="date"
              format="yyyy-MM-dd"
              editType="datepickeredit"
            />
          </ColumnsDirective>
          <Inject services={[Page, Sort, Filter, Edit]} />
        </GridComponent>
      )}
    </>
  );
}
