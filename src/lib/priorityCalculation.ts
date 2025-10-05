import { Task } from './types';

/**
 * Beräknar urgency boost baserat på hur nära deadline är
 *
 * Logik:
 * - Försenad: Sätter alltid till 10 (max urgency)
 * - < 6h till deadline: +5 boost
 * - < 24h till deadline: +3 boost
 * - < 48h till deadline: +1 boost
 */
export function calculateUrgencyBoost(deadline: string | null, baseTimeSensitivity: number): number {
  if (!deadline) return baseTimeSensitivity;

  const now = new Date().getTime();
  const deadlineTime = new Date(deadline).getTime();
  const hoursUntilDeadline = (deadlineTime - now) / (1000 * 60 * 60);

  // Försenad task - ALLTID max urgency
  if (hoursUntilDeadline < 0) {
    return 10;
  }

  // Mindre än 6 timmar - kritisk boost
  if (hoursUntilDeadline < 6) {
    return Math.min(10, baseTimeSensitivity + 5);
  }

  // Mindre än 24 timmar - hög boost
  if (hoursUntilDeadline < 24) {
    return Math.min(10, baseTimeSensitivity + 3);
  }

  // Mindre än 48 timmar - liten boost
  if (hoursUntilDeadline < 48) {
    return Math.min(10, baseTimeSensitivity + 1);
  }

  return baseTimeSensitivity;
}

/**
 * Beräknar prioritet för en task enligt CPM-modellen
 * med automatisk deadline boost
 */
export function calculatePriority(task: Task): number {
  const value = task.value_score || 5;
  const baseTimeSensitivity = task.time_sensitivity || 5;
  const confidence = task.confidence || 7;
  const effort = task.effort || 5;

  // Använd deadline boost om deadline finns
  const adjustedTimeSensitivity = calculateUrgencyBoost(
    task.deadline,
    baseTimeSensitivity
  );

  // CPM-formel: (V × T × C) / E
  const priority = (value * adjustedTimeSensitivity * confidence) / effort;

  return priority;
}

/**
 * Kollar om en task är "emergency" (deadline < 24h)
 */
export function isEmergencyTask(task: Task): boolean {
  if (!task.deadline) return false;

  const now = new Date().getTime();
  const deadlineTime = new Date(task.deadline).getTime();
  const hoursUntilDeadline = (deadlineTime - now) / (1000 * 60 * 60);

  return hoursUntilDeadline < 24 && hoursUntilDeadline > 0;
}

/**
 * Kollar om en task är försenad
 */
export function isOverdueTask(task: Task): boolean {
  if (!task.deadline) return false;

  const now = new Date().getTime();
  const deadlineTime = new Date(task.deadline).getTime();

  return deadlineTime < now;
}

/**
 * Formaterar deadline till läsbar tid kvar
 */
export function formatTimeUntilDeadline(deadline: string): string {
  const now = new Date().getTime();
  const deadlineTime = new Date(deadline).getTime();
  const hoursUntil = (deadlineTime - now) / (1000 * 60 * 60);

  if (hoursUntil < 0) {
    const hoursOverdue = Math.abs(Math.floor(hoursUntil));
    return `${hoursOverdue}h försenad`;
  }

  if (hoursUntil < 1) {
    const minutesUntil = Math.floor(hoursUntil * 60);
    return `${minutesUntil} min kvar`;
  }

  if (hoursUntil < 24) {
    return `${Math.floor(hoursUntil)}h kvar`;
  }

  const daysUntil = Math.floor(hoursUntil / 24);
  return `${daysUntil}d kvar`;
}
