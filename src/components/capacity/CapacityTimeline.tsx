import { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useAbsencePeriods } from '@/hooks/useAbsencePeriods';
import { useCapacitySettings } from '@/hooks/useCapacitySettings';
import { ZoomLevel } from '@/lib/types';
import { calculatePeriodCapacity, generatePeriods } from '@/lib/capacityCalculations';
// Lucide icons replaced with SyncFusion e-icons

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
      <div className="e-flex e-align-center e-justify-center" style={{ height: '16rem' }}>
        <span className="e-icons e-loader e-animate-spin" style={{ fontSize: '32px', color: 'var(--primary-600)' }}></span>
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
    <div className="e-flex e-flex-column" style={{ gap: '1.5rem' }}>
      {/* Header */}
      <div className="e-flex e-flex-column e-align-start e-justify-between" style={{ gap: '1rem' }}>
        <div>
          <h2 className="e-text-xl e-font-bold e-flex e-align-center" style={{ color: 'var(--primary-900)', gap: '0.5rem' }}>
            📊 Kapacitetsöversikt
          </h2>
          <p className="e-text-sm e-mt-4" style={{ color: 'var(--e-text-secondary)' }}>
            Din beläggning baserat på tasks, projekt och möten
          </p>
        </div>

        {/* Zoom-knappar */}
        <div className="e-flex e-align-center e-rounded e-border" style={{ gap: '0.5rem', backgroundColor: 'var(--e-surface)', padding: '0.25rem' }}>
          {zoomButtons.map(({ level, label }) => (
            <button
              key={level}
              onClick={() => setZoomLevel(level)}
              className="e-px-16 e-py-8 e-rounded e-text-sm e-font-medium e-transition e-cursor-pointer"
              style={{
                backgroundColor: zoomLevel === level ? 'var(--primary-600)' : 'transparent',
                color: zoomLevel === level ? '#ffffff' : 'var(--e-text-secondary)',
                border: 'none'
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Info cards */}
      <div className="e-grid e-grid-cols-2" style={{ gap: '0.75rem' }}>
        {[
          {
            label: 'Snittbeläggning',
            value: `${avgUtilization}%`,
            iconCss: 'e-icons e-arrow-up',
            color: avgUtilization >= settings.capacity_thresholds.over ? '#ef4444' : avgUtilization >= settings.capacity_thresholds.sweet_start ? '#10b981' : 'var(--primary-600)',
            bgColor: avgUtilization >= settings.capacity_thresholds.over ? '#fef2f2' : avgUtilization >= settings.capacity_thresholds.sweet_start ? '#f0fdf4' : '#fef3e8',
          },
          {
            label: 'Överbelagda',
            value: overloadedPeriods,
            iconCss: 'e-icons e-alert',
            color: '#ef4444',
            bgColor: '#fef2f2',
          },
          {
            label: 'Sweetspot',
            value: sweetspotPeriods,
            iconCss: 'e-icons e-schedule',
            color: '#10b981',
            bgColor: '#f0fdf4',
          },
          {
            label: 'Ledigt',
            value: `${totalAvailableHours}h`,
            iconCss: 'e-icons e-schedule',
            color: 'var(--primary-500)',
            bgColor: '#eff6ff',
          },
        ].map((stat, i) => {
          return (
            <div
              key={i}
              style={{
                backgroundColor: stat.bgColor,
                borderRadius: '0.75rem',
                padding: '1rem',
                border: '2px solid var(--e-border)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ color: stat.color, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={stat.iconCss} style={{ fontSize: '16px', color: stat.color }}></span>
                  <p style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--e-text-secondary)' }}>{stat.label}</p>
                </div>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--e-text)' }}>
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline visualization */}
      <div style={{ backgroundColor: 'var(--e-surface)', borderRadius: '0.75rem', padding: '1.5rem', border: '2px solid var(--e-border)', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Timeline header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: '600', color: 'var(--e-text-secondary)', paddingBottom: '0.5rem', borderBottom: '1px solid var(--e-border)' }}>
            <span style={{ width: '5rem' }}>Period</span>
            <span style={{ flex: '1', textAlign: 'center' }}>Beläggning</span>
            <span style={{ width: '4rem', textAlign: 'right' }}>%</span>
            <span style={{ width: '8rem', textAlign: 'right' }}>Timmar</span>
          </div>

          {/* Timeline bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {capacityData.map((data, idx) => (
              <div key={idx} style={{ borderRadius: '0.5rem', padding: '0.5rem', transition: 'all 0.2s', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Period label */}
                  <div style={{ width: '5rem', fontSize: '0.875rem', fontWeight: '500', color: 'var(--e-text)' }}>
                    {data.periodLabel}
                  </div>

                  {/* Progress bar */}
                  <div style={{ flex: '1', position: 'relative' }}>
                    <div style={{ height: '2rem', backgroundColor: 'var(--e-surface)', borderRadius: '9999px', overflow: 'hidden', border: '1px solid var(--e-border)' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(data.utilization, 100)}%`,
                          backgroundColor: data.status === 'under' ? '#9ca3af' :
                                          data.status === 'sweet' ? '#10b981' :
                                          data.status === 'high' ? 'var(--warning-500)' :
                                          data.status === 'full' ? 'var(--warning-500)' :
                                          data.status === 'over' ? '#ef4444' : '#9ca3af',
                          transition: 'all 0.3s'
                        }}
                      />
                    </div>
                    {/* Sweetspot range indicator */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '0',
                        height: '2rem',
                        border: '2px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '9999px',
                        pointerEvents: 'none',
                        left: `${settings.capacity_thresholds.sweet_start}%`,
                        width: `${settings.capacity_thresholds.sweet_end - settings.capacity_thresholds.sweet_start}%`
                      }}
                    />
                  </div>

                  {/* Percentage */}
                  <div style={{ width: '4rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: 'var(--e-text)' }}>
                    {data.utilization}%
                  </div>

                  {/* Hours */}
                  <div style={{ width: '8rem', textAlign: 'right', fontSize: '0.875rem', color: 'var(--e-text-secondary)' }}>
                    {data.usedHours}h / {data.totalHours}h
                  </div>
                </div>

                {/* Expanded details - visible on hover via CSS or always visible, simplified for inline styles */}
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--e-surface)', borderRadius: '0.5rem', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', border: '1px solid var(--e-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--e-text-secondary)' }}>Möten:</span>
                    <span style={{ fontWeight: '500', color: 'var(--primary-500)' }}>{data.meetingHours}h</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--e-text-secondary)' }}>Projekt:</span>
                    <span style={{ fontWeight: '500', color: 'var(--primary-600)' }}>{data.projectHours}h</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--e-text-secondary)' }}>Tasks:</span>
                    <span style={{ fontWeight: '500', color: '#10b981' }}>{data.taskHours}h</span>
                  </div>
                  {data.absencePercentage > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--e-border)' }}>
                      <span style={{ color: 'var(--e-text-secondary)' }}>Frånvaro:</span>
                      <span style={{ fontWeight: '500', color: '#ef4444' }}>{data.absencePercentage}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ backgroundColor: 'var(--e-surface)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--e-border)' }}>
        <p style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--e-text)', marginBottom: '0.75rem' }}>
          Beläggningsnivåer:
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {[
            { label: `Under ${settings.capacity_thresholds.under}%`, color: '#9ca3af' },
            { label: `${settings.capacity_thresholds.sweet_start}-${settings.capacity_thresholds.sweet_end}% (Sweetspot)`, color: '#10b981' },
            { label: `${settings.capacity_thresholds.sweet_end}-${settings.capacity_thresholds.over}%`, color: 'var(--warning-500)' },
            { label: `${settings.capacity_thresholds.over}-100%`, color: 'var(--warning-500)' },
            { label: 'Över 100%', color: '#ef4444' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '1rem', height: '1rem', borderRadius: '0.25rem', backgroundColor: item.color }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--e-text-secondary)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
