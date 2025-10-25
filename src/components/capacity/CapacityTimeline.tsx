import { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useAbsencePeriods } from '@/hooks/useAbsencePeriods';
import { useCapacitySettings } from '@/hooks/useCapacitySettings';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { ZoomLevel } from '@/lib/types';
import { calculatePeriodCapacity, generatePeriods } from '@/lib/capacityCalculations';

export function CapacityTimeline() {
  const { tasks } = useTasks();
  const { projects } = useProjects();
  const { absencePeriods, loading: absenceLoading } = useAbsencePeriods();
  const { settings, loading: settingsLoading } = useCapacitySettings();

  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [baseDate] = useState(new Date());
  const [calendarEvents] = useState<any[]>([]);
  const [loading] = useState(false);

  // Beräkna kapacitet för alla perioder
  const capacityData = useMemo(() => {
    if (absenceLoading || settingsLoading || loading) return [];

    const periods = generatePeriods(zoomLevel, baseDate);
    return periods.map(({ start, end, label }) =>
      calculatePeriodCapacity(
        start,
        end,
        label,
        tasks,
        projects,
        calendarEvents,
        absencePeriods,
        settings
      )
    );
  }, [zoomLevel, baseDate, tasks, projects, calendarEvents, absencePeriods, settings, absenceLoading, settingsLoading, loading]);

  // Zoom-knappar
  const zoomButtons: { level: ZoomLevel; label: string }[] = [
    { level: 'week', label: 'Vecka' },
    { level: 'month', label: 'Månad' },
    { level: 'quarter', label: 'Kvartal' },
    { level: 'year', label: 'År' },
  ];

  if (absenceLoading || settingsLoading || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80px' }}>
        <span>Laddar...</span>
      </div>
    );
  }

  const avgUtilization = capacityData.length > 0
    ? Math.round(capacityData.reduce((sum, d) => sum + d.utilization, 0) / capacityData.length)
    : 0;

  const overloadedPeriods = capacityData.filter(d => d.status === 'over').length;
  const sweetspotPeriods = capacityData.filter(d => d.status === 'sweet').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Zoom-knappar + Kompakta stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {zoomButtons.map(({ level, label }) => (
            <ButtonComponent
              key={level}
              onClick={() => setZoomLevel(level)}
              cssClass={zoomLevel === level ? 'e-primary e-small' : 'e-outline e-small'}
              content={label}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
          <span style={{ color: 'var(--color-sf-black)', opacity: 0.6 }}>
            Snitt: <strong>{avgUtilization}%</strong>
          </span>
          <span style={{ color: 'var(--color-sf-danger)' }}>
            Över: <strong>{overloadedPeriods}</strong>
          </span>
          <span style={{ color: 'var(--color-sf-success)' }}>
            Sweet: <strong>{sweetspotPeriods}</strong>
          </span>
        </div>
      </div>

      {/* Timeline bars */}
      <div className="e-card">
        <div className="e-card-content" style={{ padding: '6px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {capacityData.map((data, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* Period label */}
                <div style={{ width: '40px', fontSize: '10px', fontWeight: '600' }}>
                  {data.periodLabel}
                </div>

                {/* Progress bar */}
                <div style={{ flex: '1', position: 'relative' }}>
                  <div style={{ height: '16px', backgroundColor: 'var(--color-sf-border)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(data.utilization, 100)}%`,
                        backgroundColor: data.status === 'under' ? '#9ca3af' :
                                        data.status === 'sweet' ? 'var(--color-sf-success)' :
                                        data.status === 'high' ? 'var(--color-sf-warning)' :
                                        data.status === 'full' ? 'var(--color-sf-warning)' :
                                        data.status === 'over' ? 'var(--color-sf-danger)' : '#9ca3af',
                        transition: 'all 0.3s'
                      }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '6px', fontSize: '10px', width: '80px', justifyContent: 'flex-end' }}>
                  <span style={{ fontWeight: '600' }}>{data.utilization}%</span>
                  <span style={{ color: 'var(--color-sf-black)', opacity: 0.5 }}>
                    {data.usedHours}/{data.totalHours}h
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
