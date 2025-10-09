import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isToday, isThisWeek, isPast } from 'date-fns';
import { sv } from 'date-fns/locale';
import type { Task, Quadrant } from './types';

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting
export function formatDate(date: string | null | undefined): string {
  if (!date) return '';
  return format(new Date(date), 'PPP', { locale: sv });
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '';
  return format(new Date(date), 'PPP HH:mm', { locale: sv });
}

export function formatRelativeTime(date: string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return 'Idag';
  if (isPast(d)) return 'Försenad';
  if (isThisWeek(d)) return format(d, 'EEEE', { locale: sv });
  return format(d, 'PPP', { locale: sv });
}

// Eisenhower Matrix logic
export function getTaskQuadrant(task: Task): Quadrant {
  // Use value_score and time_sensitivity, fallback to legacy fields
  const importance = task.value_score || task.importance || 5;
  const urgency = task.time_sensitivity || task.urgency || 5;

  const isImportant = importance > 5;
  const isUrgent = urgency > 5;

  if (isImportant && isUrgent) return 'Q1';
  if (isImportant && !isUrgent) return 'Q2';
  if (!isImportant && isUrgent) return 'Q3';
  return 'Q4';
}

export function filterTasksByQuadrant(tasks: Task[], quadrant: Quadrant): Task[] {
  return tasks.filter(task => getTaskQuadrant(task) === quadrant);
}

export function sortTasksByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    // Snabbis (≤2 min) alltid först
    const aIsSnabbis = (a.estimated_duration || 0) <= 2;
    const bIsSnabbis = (b.estimated_duration || 0) <= 2;

    if (aIsSnabbis && !bIsSnabbis) return -1;
    if (!aIsSnabbis && bIsSnabbis) return 1;

    // Sedan sortera på priority
    return b.priority - a.priority;
  });
}

// Task status helpers
export function getStatusColor(status: Task['status']): string {
  switch (status) {
    case 'done':
      return 'text-green-600';
    case 'in_progress':
      return 'text-copper-600';
    case 'not_started':
      return 'text-gray-600';
  }
}

export function getStatusLabel(status: Task['status']): string {
  switch (status) {
    case 'done':
      return 'Klar';
    case 'in_progress':
      return 'Pågående';
    case 'not_started':
      return 'Ej påbörjad';
  }
}

// Deadline helpers
export function isOverdue(task: Task): boolean {
  if (!task.deadline) return false;
  return isPast(new Date(task.deadline)) && task.status !== 'done';
}

export function isDueSoon(task: Task): boolean {
  if (!task.deadline) return false;
  const deadline = new Date(task.deadline);
  return isThisWeek(deadline) && !isPast(deadline);
}

// Duration helpers
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '';

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}min`;
}

export function getDurationColor(minutes: number | null | undefined): string {
  if (!minutes) return 'text-gray-500';

  if (minutes <= 2) return 'text-green-600'; // Snabbis
  if (minutes <= 15) return 'text-blue-600'; // Snabba uppgifter
  if (minutes <= 60) return 'text-copper-600';  // Korta uppgifter
  if (minutes <= 240) return 'text-amber-600'; // Medeluppgifter
  return 'text-red-600'; // Långa uppgifter
}

export function getDurationIcon(minutes: number | null | undefined): string {
  if (!minutes) return '⏱️';

  if (minutes <= 2) return '⚡'; // Snabbis
  if (minutes <= 5) return '🔵'; // Mycket snabb
  if (minutes <= 15) return '🔵'; // Snabb
  if (minutes <= 60) return '🟢'; // Kort
  if (minutes <= 240) return '🟡'; // Medel
  return '🔴'; // Lång
}

// Tidsuppskattningar för snabbt val
export const DURATION_PRESETS = [
  { label: '2 min', value: 2, icon: '⚡', description: 'Snabbis - gör direkt!' },
  { label: '5 min', value: 5, icon: '🔵', description: 'Mycket snabb' },
  { label: '15 min', value: 15, icon: '🔵', description: 'Snabb uppgift' },
  { label: '30 min', value: 30, icon: '🟢', description: 'Kort session' },
  { label: '1h', value: 60, icon: '🟢', description: 'En timme' },
  { label: '2h', value: 120, icon: '🟡', description: 'Längre session' },
  { label: '4h', value: 240, icon: '🟡', description: 'Halv dag' },
  { label: '8h', value: 480, icon: '🔴', description: 'Hel dag' },
  { label: 'Anpassad', value: -1, icon: '✏️', description: 'Ange egen tid' },
] as const;
