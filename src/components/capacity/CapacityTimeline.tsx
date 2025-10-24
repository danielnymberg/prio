import { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useAbsencePeriods } from '@/hooks/useAbsencePeriods';
import { useCapacitySettings } from '@/hooks/useCapacitySettings';
import { ZoomLevel } from '@/lib/types';
import { calculatePeriodCapacity, generatePeriods } from '@/lib/capacityCalculations';

export function CapacityTimeline() {
  const { tasks } = useTasks();
  const { projects } = useProjects();
  const { absencePeriods, loading: absenceLoading } = useAbsencePeriods();
  const { settings, loading: settingsLoading } = useCapacitySettings();

  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('month');
  const [baseDate] = useState(new Date());
  const [calendarEvents] = useState<any[]>([]); // TODO: Microsoft Graph integration
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
    { level: 'year', label: 'År' },
    { level: 'quarter', label: 'Kvartal' },
    { level: 'month', label: 'Månad' },
    { level: 'week', label: 'Vecka' },
  ];

  if (absenceLoading || settingsLoading || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <span className="e-icons e-loader" style={{ fontSize: '32px', color: 'var(--e-primary)' }}></span>
      </div>
    );
  }

  const avgUtilization = capacityData.length > 0
    ? Math.round(capacityData.reduce((sum, d) => sum + d.utilization, 0) / capacityData.length)
    : 0;

  const overloadedPeriods = capacityData.filter(d => d.status === 'over').length;
  const sweetspotPeriods = capacityData.filter(d => d.status === 'sweet').length;
  const totalAvailableHours = Math.round(capacityData.reduce((sum, d) => sum + d.availableHours, 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Card */}
      <div className="e-card">
        <div className="e-card-header">
          <div className="e-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="e-icons e-schedule" style={{ fontSize: '16px' }}></span>
            Kapacitetsöversikt
          </div>
        </div>
        <div className="e-card-content">
          <p style={{ fontSize: '14px', color: 'var(--e-text-secondary)', marginBottom: '16px' }}>
            Din beläggning baserat på tasks, projekt och möten
          </p>

          {/* Zoom-knappar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', backgroundColor: 'var(--e-surface-alt)', borderRadius: '8px', border: '1px solid var(--e-border)' }}>
            {zoomButtons.map(({ level, label }) => (
              <button
                key={level}
                onClick={() => setZoomLevel(level)}
                className={`e-btn ${zoomLevel === level ? 'e-primary' : 'e-flat'}`}
                style={{
                  padding: '4px 16px',
                  minHeight: '28px'
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px'
      }}>
        {[
          {
            label: 'Snittbeläggning',
            value: `${avgUtilization}%`,
            iconCss: 'e-icons e-arrow-up',
            color: avgUtilization >= settings.capacity_thresholds.over ? 'var(--e-error)' : avgUtilization >= settings.capacity_thresholds.sweet_start ? 'var(--e-success)' : 'var(--e-primary)',
            bgColor: avgUtilization >= settings.capacity_thresholds.over ? '#fef2f2' : avgUtilization >= settings.capacity_thresholds.sweet_start ? '#f0fdf4' : 'var(--e-surface-alt)',
          },
          {
            label: 'Överbelagda',
            value: overloadedPeriods,
            iconCss: 'e-icons e-warning',
            color: 'var(--e-error)',
            bgColor: '#fef2f2',
          },
          {
            label: 'Sweetspot',
            value: sweetspotPeriods,
            iconCss: 'e-icons e-check',
            color: 'var(--e-success)',
            bgColor: '#f0fdf4',
          },
          {
            label: 'Ledigt',
            value: `${totalAvailableHours}h`,
            iconCss: 'e-icons e-time',
            color: 'var(--e-primary)',
            bgColor: 'var(--e-surface-alt)',
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="e-card"
            style={{
              borderColor: stat.color,
              borderWidth: '2px',
              backgroundColor: stat.bgColor
            }}
          >
            <div className="e-card-content" style={{ padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <span className={stat.iconCss} style={{ fontSize: '16px', color: stat.color }}></span>
                <p style={{ fontSize: '12px', fontWeight: '500', color: 'var(--e-text-secondary)', margin: 0 }}>{stat.label}</p>
              </div>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Timeline visualization */}
      <div className="e-card">
        <div className="e-card-content">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Timeline header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', fontWeight: '600', color: 'var(--e-text-secondary)', paddingBottom: '8px', borderBottom: '1px solid var(--e-border)' }}>
              <span style={{ width: '80px' }}>Period</span>
              <span style={{ flex: '1', textAlign: 'center' }}>Beläggning</span>
              <span style={{ width: '64px', textAlign: 'right' }}>%</span>
              <span style={{ width: '128px', textAlign: 'right' }}>Timmar</span>
            </div>

            {/* Timeline bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {capacityData.map((data, idx) => (
                <div key={idx} style={{ borderRadius: '8px', padding: '8px', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Period label */}
                    <div style={{ width: '80px', fontSize: '14px', fontWeight: '500' }}>
                      {data.periodLabel}
                    </div>

                    {/* Progress bar */}
                    <div style={{ flex: '1', position: 'relative' }}>
                      <div style={{ height: '32px', backgroundColor: 'var(--e-surface-alt)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--e-border)' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(data.utilization, 100)}%`,
                            backgroundColor: data.status === 'under' ? '#9ca3af' :
                                            data.status === 'sweet' ? 'var(--e-success)' :
                                            data.status === 'high' ? 'var(--e-warning)' :
                                            data.status === 'full' ? 'var(--e-warning)' :
                                            data.status === 'over' ? 'var(--e-error)' : '#9ca3af',
                            transition: 'all 0.3s'
                          }}
                        />
                      </div>
                      {/* Sweetspot range indicator */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '0',
                          height: '32px',
                          border: '2px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: '16px',
                          pointerEvents: 'none',
                          left: `${settings.capacity_thresholds.sweet_start}%`,
                          width: `${settings.capacity_thresholds.sweet_end - settings.capacity_thresholds.sweet_start}%`
                        }}
                      />
                    </div>

                    {/* Percentage */}
                    <div style={{ width: '64px', textAlign: 'right', fontSize: '14px', fontWeight: '600' }}>
                      {data.utilization}%
                    </div>

                    {/* Hours */}
                    <div style={{ width: '128px', textAlign: 'right', fontSize: '14px', color: 'var(--e-text-secondary)' }}>
                      {data.usedHours}h / {data.totalHours}h
                    </div>
                  </div>

                  {/* Expanded details */}
                  <div style={{ marginTop: '8px', padding: '12px', backgroundColor: 'var(--e-surface-alt)', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', border: '1px solid var(--e-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--e-text-secondary)' }}>Möten:</span>
                      <span style={{ fontWeight: '500', color: 'var(--e-primary)' }}>{data.meetingHours}h</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--e-text-secondary)' }}>Projekt:</span>
                      <span style={{ fontWeight: '500', color: 'var(--e-primary)' }}>{data.projectHours}h</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--e-text-secondary)' }}>Tasks:</span>
                      <span style={{ fontWeight: '500', color: 'var(--e-success)' }}>{data.taskHours}h</span>
                    </div>
                    {data.absencePercentage > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--e-border)' }}>
                        <span style={{ color: 'var(--e-text-secondary)' }}>Frånvaro:</span>
                        <span style={{ fontWeight: '500', color: 'var(--e-error)' }}>{data.absencePercentage}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="e-card">
        <div className="e-card-content">
          <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>
            Beläggningsnivåer:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {[
              { label: `Under ${settings.capacity_thresholds.under}%`, color: '#9ca3af' },
              { label: `${settings.capacity_thresholds.sweet_start}-${settings.capacity_thresholds.sweet_end}% (Sweetspot)`, color: 'var(--e-success)' },
              { label: `${settings.capacity_thresholds.sweet_end}-${settings.capacity_thresholds.over}%`, color: 'var(--e-warning)' },
              { label: `${settings.capacity_thresholds.over}-100%`, color: 'var(--e-warning)' },
              { label: 'Över 100%', color: 'var(--e-error)' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: item.color }} />
                <span style={{ fontSize: '14px', color: 'var(--e-text-secondary)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
