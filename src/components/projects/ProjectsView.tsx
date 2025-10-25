import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Project } from '@/lib/types';
import { useNavigate } from 'react-router-dom';
import { showToast } from '@/services/toast';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import {
  GridComponent,
  ColumnsDirective,
  ColumnDirective,
  Page,
  Sort,
  Inject,
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

  const pageSettings = { pageSize: 20, pageSizes: [10, 20, 50] };

  // Budget template (formatted currency)
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ height: '48px', width: '48px' }}>Laddar...</div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="e-mb-16" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
          Projekt <span className="e-text-sm e-font-normal" style={{ color: 'var(--e-text-secondary)' }}>
            ({projects.length})
          </span>
        </h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '280px' }}>
            <TextBoxComponent
              placeholder="Sök projekt..."
              showClearButton={true}
              input={(e: any) => setSearchText(e.value)}
              cssClass="e-outline"
            />
          </div>
          <ButtonComponent
            onClick={() => navigate('/projects/new')}
            cssClass="e-primary"
            iconCss="e-icons e-plus"
            content="Skapa projekt"
          />
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="e-mt-64" style={{ textAlign: 'center' }}>
          <p className="e-mb-16">Inga projekt än</p>
          <ButtonComponent
            onClick={() => navigate('/projects/new')}
            cssClass="e-primary"
            iconCss="e-icons e-plus"
            content="Skapa ditt första projekt"
          />
        </div>
      ) : (
        <GridComponent
          ref={gridRef}
          dataSource={gridData}
          allowPaging={true}
          allowSorting={true}
          pageSettings={pageSettings}
          recordDoubleClick={(args: any) => navigate(`/projects/${args.rowData.id}`)}
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
              allowFiltering={false}
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
              allowFiltering={false}
            />
            <ColumnDirective
              field="total_budget"
              headerText="Budget"
              headerTemplate={headerTemplate("Budget")}
              width="100"
              template={budgetTemplate}
              allowEditing={false}
              textAlign="Right"
              allowFiltering={false}
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
              field="status"
              headerText="Status"
              headerTemplate={headerTemplate("Status")}
              width="90"
              editType="dropdownedit"
              edit={{
                params: {
                  dataSource: [
                    { text: 'Aktiv', value: 'active' },
                    { text: 'Slutförd', value: 'completed' },
                    { text: 'Arkiverad', value: 'archived' }
                  ],
                  fields: { text: 'text', value: 'value' }
                }
              }}
              valueAccessor={(field: string, data: any) => {
                if (field === 'status') {
                  const statusMap: Record<string, string> = {
                    'active': 'Aktiv',
                    'completed': 'Slutförd',
                    'archived': 'Arkiverad'
                  };
                  return statusMap[data.status] || data.status;
                }
                return data[field];
              }}
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
              field="description"
              headerText="Beskrivning"
              headerTemplate={headerTemplate("Beskrivning")}
              width="200"
              visible={false}
            />
          </ColumnsDirective>
          <Inject services={[Page, Sort]} />
        </GridComponent>
      )}
    </>
  );
}
