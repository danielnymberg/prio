import { Task, Project, AbsencePeriod, CapacitySettings, PeriodCapacity, ZoomLevel } from './types';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth,
         eachWeekOfInterval, eachMonthOfInterval,
         eachDayOfInterval, format, parseISO, isWithinInterval, addDays } from 'date-fns';
import { sv } from 'date-fns/locale';

/**
 * Beräknar frånvaroprocent för en given period
 */
function getAbsencePercentageForPeriod(
  periodStart: Date,
  periodEnd: Date,
  absencePeriods: AbsencePeriod[]
): number {
  let totalAbsence = 0;
  let daysCount = 0;

  const days = eachDayOfInterval({ start: periodStart, end: periodEnd });

  for (const day of days) {
    daysCount++;
    let dayAbsence = 0;

    for (const absence of absencePeriods) {
      const absenceStart = parseISO(absence.start_date);
      const absenceEnd = parseISO(absence.end_date);

      if (isWithinInterval(day, { start: absenceStart, end: absenceEnd })) {
        dayAbsence = Math.max(dayAbsence, absence.absence_percentage);
      }
    }

    totalAbsence += dayAbsence;
  }

  return daysCount > 0 ? totalAbsence / daysCount : 0;
}

/**
 * Beräknar kapacitet för en period
 */
export function calculatePeriodCapacity(
  periodStart: Date,
  periodEnd: Date,
  periodLabel: string,
  tasks: Task[],
  projects: Project[],
  calendarEvents: any[], // Microsoft Calendar events
  absencePeriods: AbsencePeriod[],
  settings: CapacitySettings
): PeriodCapacity {
  // Beräkna tillgänglig tid baserat på arbetstid och frånvaro
  const daysInPeriod = eachDayOfInterval({ start: periodStart, end: periodEnd });
  const workingDaysInPeriod = daysInPeriod.filter(day =>
    settings.working_days.includes(day.getDay() === 0 ? 1 : day.getDay() + 1)
  ).length;

  const absencePercentage = getAbsencePercentageForPeriod(periodStart, periodEnd, absencePeriods);

  const hoursPerDay = settings.working_hours_per_week / settings.working_days.length;
  const totalHours = workingDaysInPeriod * hoursPerDay * (1 - absencePercentage / 100);

  // Beräkna möten från kalender
  const meetingHours = calendarEvents
    .filter(event => {
      const eventStart = new Date(event.start);
      return isWithinInterval(eventStart, { start: periodStart, end: periodEnd }) &&
             !event.subject?.includes('🎯 Fokus'); // Exkludera Prio-fokustid
    })
    .reduce((sum, event) => {
      const duration = (new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60 * 60);
      return sum + duration;
    }, 0);

  // Beräkna projekt-fokustid
  const projectHours = projects
    .filter(p => p.status === 'active')
    .reduce((sum, project) => {
      // Fördela quoted_hours över projektets tidsperiod
      if (project.project_deadline) {
        const projectStart = new Date(project.created_at);
        const projectEnd = new Date(project.project_deadline);

        if (isWithinInterval(periodStart, { start: projectStart, end: projectEnd }) ||
            isWithinInterval(periodEnd, { start: projectStart, end: projectEnd })) {
          const totalWeeks = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24 * 7));
          const hoursPerWeek = project.quoted_hours / totalWeeks;
          return sum + hoursPerWeek;
        }
      }
      return sum;
    }, 0);

  // Beräkna tasks
  const taskHours = tasks
    .filter(t => t.status !== 'done' && t.deadline)
    .filter(t => {
      const deadline = new Date(t.deadline!);
      return isWithinInterval(deadline, { start: periodStart, end: periodEnd });
    })
    .reduce((sum, task) => sum + ((task.estimated_duration || 0) / 60), 0);

  const usedHours = meetingHours + projectHours + taskHours;
  const availableHours = totalHours - usedHours;
  const utilization = totalHours > 0 ? (usedHours / totalHours) * 100 : 0;

  // Bestäm status baserat på thresholds
  let status: 'under' | 'sweet' | 'high' | 'full' | 'over';
  if (utilization < settings.capacity_thresholds.under) {
    status = 'under';
  } else if (utilization >= settings.capacity_thresholds.sweet_start &&
             utilization <= settings.capacity_thresholds.sweet_end) {
    status = 'sweet';
  } else if (utilization > settings.capacity_thresholds.sweet_end &&
             utilization < settings.capacity_thresholds.over) {
    status = 'high';
  } else if (utilization >= settings.capacity_thresholds.over && utilization <= 100) {
    status = 'full';
  } else {
    status = 'over';
  }

  return {
    period: format(periodStart, 'yyyy-MM-dd'),
    periodLabel,
    totalHours: Math.round(totalHours * 10) / 10,
    meetingHours: Math.round(meetingHours * 10) / 10,
    projectHours: Math.round(projectHours * 10) / 10,
    taskHours: Math.round(taskHours * 10) / 10,
    usedHours: Math.round(usedHours * 10) / 10,
    availableHours: Math.round(availableHours * 10) / 10,
    utilization: Math.round(utilization),
    status,
    absencePercentage: Math.round(absencePercentage),
  };
}

/**
 * Genererar perioder baserat på zoom-nivå
 */
export function generatePeriods(
  zoomLevel: ZoomLevel,
  baseDate: Date = new Date()
): { start: Date; end: Date; label: string; period: string }[] {
  switch (zoomLevel) {
    case 'year': {
      // Visa 12 månader från baseDate
      const months = eachMonthOfInterval({
        start: baseDate,
        end: addDays(baseDate, 365),
      });
      return months.map(month => ({
        start: startOfMonth(month),
        end: endOfMonth(month),
        label: format(month, 'MMM', { locale: sv }),
        period: format(month, 'yyyy-MM'),
      }));
    }

    case 'quarter': {
      // Visa 12 veckor (3 månader)
      const weeks = eachWeekOfInterval({
        start: baseDate,
        end: addDays(baseDate, 90),
      }, { weekStartsOn: 1 });
      return weeks.map(week => ({
        start: startOfWeek(week, { weekStartsOn: 1 }),
        end: endOfWeek(week, { weekStartsOn: 1 }),
        label: `V${format(week, 'ww')}`,
        period: format(week, "yyyy-'W'ww"),
      }));
    }

    case 'month': {
      // Visa 4-5 veckor
      const weeks = eachWeekOfInterval({
        start: startOfMonth(baseDate),
        end: endOfMonth(baseDate),
      }, { weekStartsOn: 1 });
      return weeks.map(week => ({
        start: startOfWeek(week, { weekStartsOn: 1 }),
        end: endOfWeek(week, { weekStartsOn: 1 }),
        label: `V${format(week, 'ww')}`,
        period: format(week, "yyyy-'W'ww"),
      }));
    }

    case 'week': {
      // Visa 7 dagar
      const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
      const days = eachDayOfInterval({
        start: weekStart,
        end: endOfWeek(weekStart, { weekStartsOn: 1 }),
      });
      return days.map(day => ({
        start: day,
        end: day,
        label: format(day, 'EEE d', { locale: sv }),
        period: format(day, 'yyyy-MM-dd'),
      }));
    }

    case 'day': {
      // Visa timmar (8-17)
      const hours: { start: Date; end: Date; label: string; period: string }[] = [];
      for (let hour = 8; hour <= 17; hour++) {
        const start = new Date(baseDate);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(baseDate);
        end.setHours(hour + 1, 0, 0, 0);
        hours.push({
          start,
          end,
          label: `${hour}:00`,
          period: `${format(baseDate, 'yyyy-MM-dd')}-${hour}`,
        });
      }
      return hours;
    }
  }

  return [];
}
