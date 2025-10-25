import { Project, ProjectMetrics, Task } from './types';

export function calculateProjectMetrics(
  project: Project,
  tasks: Task[]
): ProjectMetrics {
  // Summera loggad tid från alla tasks kopplade till projektet
  // Använd actual_duration om tillgänglig, annars fallback till estimated_duration
  const logged_hours = tasks
    .filter(task => task.project_id === project.id && task.status === 'done')
    .reduce((sum, task) => {
      const duration = task.actual_duration || task.estimated_duration || 0;
      return sum + (duration / 60); // Konvertera minuter till timmar
    }, 0);

  // Beräkna återstående baserat på reglaget
  const estimated_remaining_hours =
    project.quoted_hours * (1 - project.completion_percentage / 100);

  // Beräkna fakturerbara timmar kvar
  const billable_hours_remaining = project.quoted_hours - logged_hours;

  // Är vi över budget?
  const is_over_budget = logged_hours > project.quoted_hours;

  // Hur mycket över budget är vi?
  const budget_overage_hours = Math.max(0, logged_hours - project.quoted_hours);

  // Total överskridning (redan bränt + återstår att göra)
  const total_overage_hours = is_over_budget
    ? budget_overage_hours + estimated_remaining_hours
    : Math.max(0, estimated_remaining_hours - billable_hours_remaining);

  return {
    quoted_hours: project.quoted_hours,
    logged_hours: Math.round(logged_hours * 10) / 10, // Avrunda till 1 decimal
    billable_hours_remaining: Math.round(billable_hours_remaining * 10) / 10,
    estimated_remaining_hours: Math.round(estimated_remaining_hours * 10) / 10,
    is_over_budget,
    budget_overage_hours: Math.round(budget_overage_hours * 10) / 10,
    total_overage_hours: Math.round(total_overage_hours * 10) / 10
  };
}
