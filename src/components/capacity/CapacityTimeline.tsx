import { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useAbsencePeriods } from '@/hooks/useAbsencePeriods';
import { useCapacitySettings } from '@/hooks/useCapacitySettings';
import { ZoomLevel } from '@/lib/types';
import { calculatePeriodCapacity, generatePeriods } from '@/lib/capacityCalculations';
import { Loader2, TrendingUp, AlertCircle, Calendar } from 'lucide-react';

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

  // Färg för status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'under': return 'bg-gray-400';
      case 'sweet': return 'bg-green-500';
      case 'high': return 'bg-yellow-500';
      case 'full': return 'bg-orange-500';
      case 'over': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  if (absenceLoading || settingsLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-copper-600" />
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-charcoal-900 dark:text-sand-50">
            Kapacitetsöversikt
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
            Visualisering av din beläggning över tid
          </p>
        </div>

        {/* Zoom-knappar */}
        <div className="flex items-center gap-2 bg-white dark:bg-charcoal-800 rounded-lg p-1 border border-sand-200 dark:border-charcoal-700">
          {zoomButtons.map(({ level, label }) => (
            <button
              key={level}
              onClick={() => setZoomLevel(level)}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${zoomLevel === level
                  ? 'bg-copper-600 text-white'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-sand-100 dark:hover:bg-charcoal-700'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Snittbeläggning',
            value: `${avgUtilization}%`,
            icon: TrendingUp,
            color: 'text-copper-600',
            bgColor: 'bg-copper-50 dark:bg-copper-900/20',
          },
          {
            label: 'Överbelagda perioder',
            value: overloadedPeriods,
            icon: AlertCircle,
            color: 'text-red-600',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
          },
          {
            label: 'Sweetspot perioder',
            value: sweetspotPeriods,
            icon: Calendar,
            color: 'text-green-600',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
          },
          {
            label: 'Lediga timmar',
            value: `${totalAvailableHours}h`,
            icon: Calendar,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className={`${stat.bgColor} rounded-lg p-4 border border-sand-200 dark:border-charcoal-700`}
            >
              <div className="flex items-center gap-3">
                <div className={`${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-stone-600 dark:text-stone-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-charcoal-900 dark:text-sand-50">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline visualization */}
      <div className="bg-white dark:bg-charcoal-850 rounded-xl p-6 border border-sand-200 dark:border-charcoal-800">
        <div className="space-y-4">
          {/* Timeline header */}
          <div className="flex items-center justify-between text-sm text-stone-600 dark:text-stone-400">
            <span>Period</span>
            <span>Beläggning</span>
            <span>Timmar</span>
          </div>

          {/* Timeline bars */}
          <div className="space-y-3">
            {capacityData.map((data, idx) => (
              <div key={idx} className="group">
                <div className="flex items-center gap-4">
                  {/* Period label */}
                  <div className="w-20 text-sm font-medium text-charcoal-900 dark:text-sand-50">
                    {data.periodLabel}
                  </div>

                  {/* Progress bar */}
                  <div className="flex-1 relative">
                    <div className="h-8 bg-stone-100 dark:bg-charcoal-900 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getStatusColor(data.status)} transition-all duration-300`}
                        style={{ width: `${Math.min(data.utilization, 100)}%` }}
                      />
                    </div>
                    {/* Sweetspot range indicator */}
                    <div
                      className="absolute top-0 h-8 border-2 border-green-500 border-opacity-30 rounded-full pointer-events-none"
                      style={{
                        left: `${settings.capacity_thresholds.sweet_start}%`,
                        width: `${settings.capacity_thresholds.sweet_end - settings.capacity_thresholds.sweet_start}%`,
                      }}
                    />
                  </div>

                  {/* Percentage */}
                  <div className="w-16 text-right text-sm font-semibold text-charcoal-900 dark:text-sand-50">
                    {data.utilization}%
                  </div>

                  {/* Hours */}
                  <div className="w-32 text-right text-sm text-stone-600 dark:text-stone-400">
                    {data.usedHours}h / {data.totalHours}h
                  </div>
                </div>

                {/* Expanded details on hover */}
                <div className="hidden group-hover:block mt-2 p-3 bg-sand-50 dark:bg-charcoal-900 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-stone-600 dark:text-stone-400">Möten:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">{data.meetingHours}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600 dark:text-stone-400">Projekt:</span>
                    <span className="font-medium text-copper-600 dark:text-copper-400">{data.projectHours}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600 dark:text-stone-400">Tasks:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{data.taskHours}h</span>
                  </div>
                  {data.absencePercentage > 0 && (
                    <div className="flex justify-between pt-2 border-t border-sand-200 dark:border-charcoal-800">
                      <span className="text-stone-600 dark:text-stone-400">Frånvaro:</span>
                      <span className="font-medium text-red-600 dark:text-red-400">{data.absencePercentage}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-charcoal-850 rounded-xl p-4 border border-sand-200 dark:border-charcoal-800">
        <p className="text-sm font-medium text-charcoal-900 dark:text-sand-50 mb-3">
          Beläggningsnivåer:
        </p>
        <div className="flex flex-wrap gap-4">
          {[
            { label: `Under ${settings.capacity_thresholds.under}%`, color: 'bg-gray-400' },
            { label: `${settings.capacity_thresholds.sweet_start}-${settings.capacity_thresholds.sweet_end}% (Sweetspot)`, color: 'bg-green-500' },
            { label: `${settings.capacity_thresholds.sweet_end}-${settings.capacity_thresholds.over}%`, color: 'bg-yellow-500' },
            { label: `${settings.capacity_thresholds.over}-100%`, color: 'bg-orange-500' },
            { label: 'Över 100%', color: 'bg-red-500' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${item.color}`} />
              <span className="text-sm text-stone-600 dark:text-stone-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
