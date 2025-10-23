import { useState } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useAbsencePeriods } from '@/hooks/useAbsencePeriods';
import { Project, AbsencePeriod } from '@/lib/types';
import { GridComponent, ColumnsDirective, ColumnDirective, Page, Sort, Inject } from '@syncfusion/ej2-react-grids';
import { DialogComponent } from '@syncfusion/ej2-react-popups';
import { DateRangePickerComponent } from '@syncfusion/ej2-react-calendars';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { AlertTriangle } from 'lucide-react';

interface ResursplaneringViewProps {
  period: 'Q4' | 'Q1';
}

export function ResursplaneringView({ period }: ResursplaneringViewProps) {
  const { projects } = useProjects();
  const { absencePeriods, createAbsencePeriod, deleteAbsencePeriod } = useAbsencePeriods();
  const [isAbsenceDialogOpen, setIsAbsenceDialogOpen] = useState(false);
  const [absenceStart, setAbsenceStart] = useState<Date | undefined>(undefined);
  const [absenceEnd, setAbsenceEnd] = useState<Date | undefined>(undefined);
  const [absenceReason, setAbsenceReason] = useState('');

  // Beräkna period-datum
  const { startDate, endDate, periodName } = getPeriodDates(period);
  const today = new Date();

  // Filtrera bort arkiverade projekt och projekt från Spiris
  const activeProjects = projects.filter(p =>
    p.status !== 'archived' &&
    p.spiris_project_id
  );

  // Gruppera projekt
  const groupedProjects = groupProjectsByPhase(activeProjects, today);

  // Beräkna veckor (exkludera ledighet)
  const weeks = calculateWeeks(startDate, endDate, absencePeriods);
  const workingWeeks = weeks.filter(w => !w.isAbsence);

  // Totaler
  const totalRemaining = activeProjects.reduce((sum, p) => {
    const remaining = (p.budgeted_hours || 0) - (p.invoiced_hours || 0);
    return sum + remaining;
  }, 0);

  const avgPerWeek = workingWeeks.length > 0 ? totalRemaining / workingWeeks.length : 0;

  const handleAddAbsence = async () => {
    if (!absenceStart || !absenceEnd) return;

    await createAbsencePeriod({
      start_date: absenceStart.toISOString().split('T')[0],
      end_date: absenceEnd.toISOString().split('T')[0],
      absence_percentage: 100,
      reason: absenceReason || 'Ledighet'
    });

    setIsAbsenceDialogOpen(false);
    setAbsenceStart(undefined);
    setAbsenceEnd(undefined);
    setAbsenceReason('');
  };

  // Header template
  const headerTemplate = (text: string) => () => <span className="e-font-bold">{text}</span>;

  // Remaining hours template
  const remainingTemplate = (props: any) => {
    const remaining = (props.budgeted_hours || 0) - (props.invoiced_hours || 0);
    return <span className="e-font-medium">{remaining.toFixed(0)}h</span>;
  };

  // Weeks required template
  const weeksRequiredTemplate = (props: any) => {
    const remaining = (props.budgeted_hours || 0) - (props.invoiced_hours || 0);
    const deadline = props.project_deadline ? new Date(props.project_deadline) : null;

    if (!deadline || deadline < today) return <span>-</span>;

    const weeksLeft = Math.ceil((deadline.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const hoursPerWeek = weeksLeft > 0 ? remaining / weeksLeft : remaining;

    const color = hoursPerWeek > 20 ? '#ef4444' : hoursPerWeek > 10 ? '#f59e0b' : '#10b981';

    return (
      <span className="e-font-medium" style={{ color }}>
        {hoursPerWeek.toFixed(1)}h/v
      </span>
    );
  };

  return (
    <>
      {/* Header */}
      <div className="e-mb-16 e-flex e-align-center e-justify-between">
        <div>
          <h1 className="e-text-2xl e-font-bold e-mb-4">
            {periodName} Resursplanering
          </h1>
          <p className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>
            {startDate.toLocaleDateString('sv-SE')} - {endDate.toLocaleDateString('sv-SE')}
          </p>
        </div>
        <button
          onClick={() => setIsAbsenceDialogOpen(true)}
          className="e-btn e-outline"
        >
          <span className="e-icons e-plus"></span> Lägg till ledighet
        </button>
      </div>

      {/* Sammanfattning */}
      <div className="e-grid e-gap-8 e-mb-16" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        <div className="e-p-12 e-border e-rounded-lg">
          <p className="e-text-xs e-mb-4" style={{ color: 'var(--e-text-secondary)' }}>Arbetsveckor</p>
          <p className="e-text-xl e-font-bold e-m-0">{workingWeeks.length}</p>
        </div>
        <div className="e-p-12 e-border e-rounded-lg">
          <p className="e-text-xs e-mb-4" style={{ color: 'var(--e-text-secondary)' }}>Kvarvarande timmar</p>
          <p className="e-text-xl e-font-bold e-m-0">{totalRemaining.toFixed(0)}h</p>
        </div>
        <div className="e-p-12 e-border e-rounded-lg" style={{
          borderColor: avgPerWeek > 32 ? '#ef4444' : '#10b981',
          borderWidth: '2px'
        }}>
          <p className="e-text-xs e-mb-4" style={{ color: 'var(--e-text-secondary)' }}>Snitt/vecka</p>
          <p className="e-text-xl e-font-bold e-m-0" style={{
            color: avgPerWeek > 32 ? '#ef4444' : '#10b981'
          }}>
            {avgPerWeek.toFixed(1)}h/v
          </p>
        </div>
        <div className="e-p-12 e-border e-rounded-lg">
          <p className="e-text-xs e-mb-4" style={{ color: 'var(--e-text-secondary)' }}>Ledighet</p>
          <p className="e-text-xl e-font-bold e-m-0">{weeks.length - workingWeeks.length}v</p>
        </div>
      </div>

      {/* Ledighetsperioder */}
      {absencePeriods.length > 0 && (
        <div className="e-mb-16 e-p-12 e-border e-rounded-lg" style={{ backgroundColor: '#fef3c7' }}>
          <p className="e-text-sm e-font-bold e-mb-8">📅 Planerad ledighet:</p>
          <div className="e-flex e-flex-column e-gap-4">
            {absencePeriods.map(ap => (
              <div key={ap.id} className="e-flex e-align-center e-justify-between">
                <span className="e-text-xs">
                  {new Date(ap.start_date).toLocaleDateString('sv-SE')} - {new Date(ap.end_date).toLocaleDateString('sv-SE')}
                  {ap.reason && ` (${ap.reason})`}
                </span>
                <button
                  onClick={() => deleteAbsencePeriod(ap.id)}
                  className="e-btn e-small e-flat"
                >
                  <span className="e-icons e-delete"></span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Varning om överbelastning */}
      {avgPerWeek > 32 && (
        <div className="e-mb-16 e-p-12 e-border e-rounded-lg" style={{
          backgroundColor: '#fee2e2',
          borderColor: '#ef4444',
          borderWidth: '2px'
        }}>
          <div className="e-flex e-align-center e-gap-8">
            <AlertTriangle style={{ height: '20px', width: '20px', color: '#dc2626' }} />
            <div>
              <p className="e-font-bold e-text-sm e-m-0" style={{ color: '#7f1d1d' }}>
                Överbelastad period!
              </p>
              <p className="e-text-xs e-m-0" style={{ color: '#991b1b' }}>
                {avgPerWeek.toFixed(1)}h/vecka krävs, men 32h/vecka är max normal kapacitet.
                Överbelastning: {(avgPerWeek - 32).toFixed(1)}h/vecka
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Aktiva projekt */}
      {groupedProjects.active.length > 0 && (
        <div className="e-mb-16">
          <h2 className="e-text-lg e-font-bold e-mb-8">🟢 Aktiva projekt ({groupedProjects.active.length})</h2>
          <GridComponent
            dataSource={groupedProjects.active}
            allowPaging={false}
            allowSorting={true}
            height="auto"
            rowHeight={30}
            gridLines="Horizontal"
            enableHover={true}
          >
            <ColumnsDirective>
              <ColumnDirective field="name" headerText="Projekt" headerTemplate={headerTemplate("Projekt")} width="250" />
              <ColumnDirective field="client_name" headerText="Kund" headerTemplate={headerTemplate("Kund")} width="150" />
              <ColumnDirective field="project_deadline" headerText="Deadline" headerTemplate={headerTemplate("Deadline")} width="100" type="date" format="yyyy-MM-dd" />
              <ColumnDirective headerText="Kvar" headerTemplate={headerTemplate("Kvar")} width="80" template={remainingTemplate} textAlign="Right" />
              <ColumnDirective headerText="h/vecka" headerTemplate={headerTemplate("h/vecka")} width="90" template={weeksRequiredTemplate} textAlign="Right" />
            </ColumnsDirective>
            <Inject services={[Page, Sort]} />
          </GridComponent>
        </div>
      )}

      {/* Kommande projekt */}
      {groupedProjects.upcoming.length > 0 && (
        <div className="e-mb-16">
          <h2 className="e-text-lg e-font-bold e-mb-8">🔵 Kommande projekt ({groupedProjects.upcoming.length})</h2>
          <GridComponent
            dataSource={groupedProjects.upcoming}
            allowPaging={false}
            allowSorting={true}
            height="auto"
            rowHeight={30}
            gridLines="Horizontal"
            enableHover={true}
          >
            <ColumnsDirective>
              <ColumnDirective field="name" headerText="Projekt" headerTemplate={headerTemplate("Projekt")} width="250" />
              <ColumnDirective field="start_date" headerText="Startar" headerTemplate={headerTemplate("Startar")} width="100" type="date" format="yyyy-MM-dd" />
              <ColumnDirective field="project_deadline" headerText="Deadline" headerTemplate={headerTemplate("Deadline")} width="100" type="date" format="yyyy-MM-dd" />
              <ColumnDirective headerText="Kvar" headerTemplate={headerTemplate("Kvar")} width="80" template={remainingTemplate} textAlign="Right" />
            </ColumnsDirective>
            <Inject services={[Page, Sort]} />
          </GridComponent>
        </div>
      )}

      {/* Försenade projekt */}
      {groupedProjects.overdue.length > 0 && (
        <div className="e-mb-16">
          <h2 className="e-text-lg e-font-bold e-mb-8" style={{ color: '#dc2626' }}>
            🔴 Försenade projekt ({groupedProjects.overdue.length})
          </h2>
          <GridComponent
            dataSource={groupedProjects.overdue}
            allowPaging={false}
            allowSorting={true}
            height="auto"
            rowHeight={30}
            gridLines="Horizontal"
            enableHover={true}
          >
            <ColumnsDirective>
              <ColumnDirective field="name" headerText="Projekt" headerTemplate={headerTemplate("Projekt")} width="250" />
              <ColumnDirective field="project_deadline" headerText="Deadline" headerTemplate={headerTemplate("Deadline")} width="100" type="date" format="yyyy-MM-dd" />
              <ColumnDirective headerText="Kvar" headerTemplate={headerTemplate("Kvar")} width="80" template={remainingTemplate} textAlign="Right" />
            </ColumnsDirective>
            <Inject services={[Page, Sort]} />
          </GridComponent>
        </div>
      )}

      {/* Veckofördelning */}
      <div className="e-mb-16">
        <h2 className="e-text-lg e-font-bold e-mb-8">📅 Veckofördelning</h2>
        <div className="e-border e-rounded-lg e-p-12">
          <div className="e-flex e-flex-column e-gap-4">
            {weeks.map(week => (
              <div key={week.weekNumber} className="e-flex e-align-center e-gap-8">
                <span className="e-text-xs e-font-medium" style={{ width: '80px' }}>
                  V{week.weekNumber}
                </span>
                <div className="e-flex-1 e-border e-rounded" style={{
                  height: '24px',
                  backgroundColor: week.isAbsence ? '#fef3c7' : 'var(--e-surface)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {!week.isAbsence && (
                    <div style={{
                      height: '100%',
                      width: `${Math.min((week.hours / 40) * 100, 100)}%`,
                      backgroundColor: week.hours > 32 ? '#ef4444' : week.hours > 20 ? '#f59e0b' : '#10b981',
                      transition: 'width 0.3s'
                    }} />
                  )}
                </div>
                <span className="e-text-xs e-font-medium" style={{
                  width: '80px',
                  textAlign: 'right',
                  color: week.isAbsence ? '#92400e' : week.hours > 32 ? '#dc2626' : 'var(--e-text)'
                }}>
                  {week.isAbsence ? 'Ledighet' : `${week.hours.toFixed(0)}h`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ledighets-dialog */}
      {isAbsenceDialogOpen && (
        <DialogComponent
          visible={true}
          header="Lägg till ledighet"
          width="400px"
          isModal={true}
          close={() => setIsAbsenceDialogOpen(false)}
          showCloseIcon={true}
        >
          <div className="e-p-16">
            <div className="e-mb-16">
              <label className="e-text-sm e-font-medium e-mb-8 e-block">Period</label>
              <DateRangePickerComponent
                placeholder="Välj period"
                startDate={absenceStart || undefined}
                endDate={absenceEnd || undefined}
                change={(e: any) => {
                  setAbsenceStart(e.startDate || undefined);
                  setAbsenceEnd(e.endDate || undefined);
                }}
              />
            </div>
            <div className="e-mb-16">
              <label className="e-text-sm e-font-medium e-mb-8 e-block">Anledning (valfritt)</label>
              <TextBoxComponent
                placeholder="T.ex. Semester, julledighet..."
                value={absenceReason}
                input={(e: any) => setAbsenceReason(e.value)}
              />
            </div>
            <div className="e-flex e-gap-8 e-justify-end">
              <button onClick={() => setIsAbsenceDialogOpen(false)} className="e-btn e-outline">
                Avbryt
              </button>
              <button onClick={handleAddAbsence} className="e-btn e-primary">
                Lägg till
              </button>
            </div>
          </div>
        </DialogComponent>
      )}
    </>
  );
}

// Helper functions
function getPeriodDates(period: 'Q4' | 'Q1') {
  if (period === 'Q4') {
    return {
      startDate: new Date(2025, 9, 23), // 23 okt 2025
      endDate: new Date(2025, 11, 22), // 22 dec 2025 (sista arbetsdagen)
      periodName: 'Q4 2025'
    };
  } else {
    return {
      startDate: new Date(2026, 0, 2), // 2 jan 2026
      endDate: new Date(2026, 2, 31), // 31 mars 2026
      periodName: 'Q1 2026'
    };
  }
}

function groupProjectsByPhase(projects: Project[], today: Date) {
  const active: Project[] = [];
  const upcoming: Project[] = [];
  const overdue: Project[] = [];

  projects.forEach(project => {
    const startDate = project.start_date ? new Date(project.start_date) : undefined;
    const deadline = project.project_deadline ? new Date(project.project_deadline) : undefined;

    // Om inget startdatum, anta att det är aktivt
    if (!startDate || startDate <= today) {
      // Projekt har startat eller saknar startdatum
      if (deadline && deadline < today) {
        overdue.push(project);
      } else {
        active.push(project);
      }
    } else {
      // Projekt har inte startat än
      upcoming.push(project);
    }
  });

  return { active, upcoming, overdue };
}

interface WeekInfo {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  hours: number;
  isAbsence: boolean;
}

function calculateWeeks(startDate: Date, endDate: Date, absencePeriods: AbsencePeriod[]): WeekInfo[] {
  const weeks: WeekInfo[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekNumber = getWeekNumber(weekStart);

    // Kolla om veckan är ledighet
    const isAbsence = absencePeriods.some(ap => {
      const apStart = new Date(ap.start_date);
      const apEnd = new Date(ap.end_date);
      return weekStart <= apEnd && weekEnd >= apStart;
    });

    weeks.push({
      weekNumber,
      startDate: weekStart,
      endDate: weekEnd < endDate ? weekEnd : endDate,
      hours: 0, // Fylls i senare med faktisk projektdata
      isAbsence
    });

    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
