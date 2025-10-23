import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Project } from '@/lib/types';
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
  CommandColumn,
  Inject,
  EditSettingsModel,
  CommandModel,
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
        const updateInput: any = {
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
          // Spiris fields
          budgeted_hours: updatedData.budgeted_hours,
          budgeted_revenue: updatedData.budgeted_revenue,
          invoiced_hours: updatedData.invoiced_hours,
          invoiced_amount: updatedData.invoiced_amount,
          actual_hours_worked: updatedData.actual_hours_worked,
          project_manager: updatedData.project_manager,
          start_date: updatedData.start_date,
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

  const commands: CommandModel[] = [
    {
      buttonOption: {
        iconCss: 'e-icons e-eye',
        cssClass: 'e-flat',
        click: (args: any) => {
          const rowData = args.rowData || args;
          navigate(`/projects/${rowData.id}`);
        }
      }
    },
    { type: 'Edit', buttonOption: { iconCss: 'e-icons e-edit', cssClass: 'e-flat' } },
    { type: 'Delete', buttonOption: { iconCss: 'e-icons e-delete', cssClass: 'e-flat' } },
  ];

  // Actions template för extra knappar
  const actionsTemplate = (props: Project) => {
    return (
      <div className="e-flex e-align-center e-gap-4 e-justify-center">
        {props.status !== 'completed' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMarkComplete(props.id);
            }}
            className="e-btn e-small e-flat e-success"
            title="Markera som klar"
          >
            <span className="e-icons e-check"></span>
          </button>
        )}
        {props.status !== 'archived' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleArchive(props.id);
            }}
            className="e-btn e-small e-flat"
            title="Arkivera"
          >
            <span className="e-icons e-archive"></span>
          </button>
        )}
      </div>
    );
  };

  const handleMarkComplete = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'completed', completion_percentage: 100 })
        .eq('id', projectId);

      if (error) throw error;
      showToast.success('Projekt markerat som klart!');
      fetchProjects();
    } catch (error) {
      console.error('Error marking complete:', error);
      showToast.error('Kunde inte markera projekt som klart');
    }
  };

  const handleArchive = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'archived' })
        .eq('id', projectId);

      if (error) throw error;
      showToast.success('Projekt arkiverat!');
      fetchProjects();
    } catch (error) {
      console.error('Error archiving:', error);
      showToast.error('Kunde inte arkivera projekt');
    }
  };

  const pageSettings = { pageSize: 20, pageSizes: [10, 20, 50] };

  // Budget template (formatted currency) - OK, budget is NOT editable
  const budgetTemplate = (props: any) => {
    return (
      <span className="e-font-medium">
        {props.total_budget.toLocaleString('sv-SE')} kr
      </span>
    );
  };

  // Header template for bold text
  const headerTemplate = (headerText: string) => {
    return () => <span className="e-font-bold">{headerText}</span>;
  };

  // Actions header with icon
  const actionsHeaderTemplate = () => {
    return <span className="e-icons e-check e-font-bold" style={{ color: '#10b981', fontSize: '16px' }}></span>;
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
        <div className="e-flex e-gap-8 e-align-center">
          <div style={{ width: '320px' }}>
            <TextBoxComponent
              placeholder="Sök projekt..."
              showClearButton={true}
              input={(e: any) => setSearchText(e.value)}
              cssClass="e-outline"
            />
          </div>
          <button
            onClick={() => navigate('/projects/new')}
            className="e-btn e-primary"
          >
            <span className="e-icons e-plus"></span> Skapa projekt
          </button>
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
              width="250"
              clipMode="EllipsisWithTooltip"
              validationRules={{ required: true }}
            />
            <ColumnDirective
              field="client_name"
              headerText="Kund"
              headerTemplate={headerTemplate("Kund")}
              width="180"
              clipMode="EllipsisWithTooltip"
            />
            <ColumnDirective
              field="quoted_hours"
              headerText="Off.tim."
              headerTemplate={headerTemplate("Off.tim.")}
              width="70"
              editType="numericedit"
              format="N0"
              textAlign="Center"
              validationRules={{ required: true, min: 0 }}
            />
            <ColumnDirective
              field="hourly_rate"
              headerText="Timpris"
              headerTemplate={headerTemplate("Timpris")}
              width="80"
              editType="numericedit"
              format="N0"
              textAlign="Right"
              validationRules={{ required: true, min: 0 }}
            />
            <ColumnDirective
              field="total_budget"
              headerText="Budget"
              headerTemplate={headerTemplate("Budget")}
              width="100"
              template={budgetTemplate}
              allowEditing={false}
              textAlign="Right"
            />
            <ColumnDirective
              field="completion_percentage"
              headerText="Utfört"
              headerTemplate={headerTemplate("Utfört")}
              width="80"
              editType="numericedit"
              edit={{ params: { min: 0, max: 100, step: 5 } }}
              format="N0"
              textAlign="Center"
            />
            <ColumnDirective
              field="status_display"
              headerText="Status"
              headerTemplate={headerTemplate("Status")}
              width="90"
              allowEditing={false}
            />
            <ColumnDirective
              field="start_date"
              headerText="Start"
              headerTemplate={headerTemplate("Start")}
              width="100"
              type="date"
              format="yyyy-MM-dd"
              editType="datepickeredit"
            />
            <ColumnDirective
              field="project_deadline"
              headerText="Deadline"
              headerTemplate={headerTemplate("Deadline")}
              width="100"
              type="date"
              format="yyyy-MM-dd"
              editType="datepickeredit"
            />
            <ColumnDirective
              field="budgeted_hours"
              headerText="Budgeterade timmar"
              headerTemplate={headerTemplate("Budgeterade timmar")}
              width="120"
              editType="numericedit"
              format="N0"
              textAlign="Center"
              visible={false}
            />
            <ColumnDirective
              field="budgeted_revenue"
              headerText="Budgeterad intäkt"
              headerTemplate={headerTemplate("Budgeterad intäkt")}
              width="120"
              editType="numericedit"
              format="N0"
              textAlign="Right"
              visible={false}
            />
            <ColumnDirective
              field="invoiced_hours"
              headerText="Fakturerade timmar"
              headerTemplate={headerTemplate("Fakturerade timmar")}
              width="120"
              editType="numericedit"
              format="N2"
              textAlign="Center"
              visible={false}
            />
            <ColumnDirective
              field="invoiced_amount"
              headerText="Fakturerat belopp"
              headerTemplate={headerTemplate("Fakturerat belopp")}
              width="120"
              editType="numericedit"
              format="N0"
              textAlign="Right"
              visible={false}
            />
            <ColumnDirective
              field="actual_hours_worked"
              headerText="Arbetade timmar"
              headerTemplate={headerTemplate("Arbetade timmar")}
              width="120"
              editType="numericedit"
              format="N2"
              textAlign="Center"
              visible={false}
            />
            <ColumnDirective
              field="project_manager"
              headerText="Projektledare"
              headerTemplate={headerTemplate("Projektledare")}
              width="150"
              visible={false}
            />
            <ColumnDirective
              field="start_date"
              headerText="Startdatum"
              headerTemplate={headerTemplate("Startdatum")}
              width="120"
              type="date"
              format="yyyy-MM-dd"
              editType="datepickeredit"
              visible={false}
            />
            <ColumnDirective
              field="description"
              headerText="Beskrivning"
              headerTemplate={headerTemplate("Beskrivning")}
              width="200"
              visible={false}
            />
            <ColumnDirective
              headerText=""
              headerTemplate={actionsHeaderTemplate}
              width="80"
              template={actionsTemplate}
              textAlign="Center"
              allowEditing={false}
            />
            <ColumnDirective
              headerText="Edit"
              headerTemplate={headerTemplate("Edit")}
              width="80"
              commands={commands}
              textAlign="Center"
            />
          </ColumnsDirective>
          <Inject services={[Page, Sort, Filter, Edit, CommandColumn]} />
        </GridComponent>
      )}
    </>
  );
}
