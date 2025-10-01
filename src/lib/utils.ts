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
  const isImportant = task.importance > 5;
  const isUrgent = task.urgency > 5;

  if (isImportant && isUrgent) return 'Q1';
  if (isImportant && !isUrgent) return 'Q2';
  if (!isImportant && isUrgent) return 'Q3';
  return 'Q4';
}

export function filterTasksByQuadrant(tasks: Task[], quadrant: Quadrant): Task[] {
  return tasks.filter(task => getTaskQuadrant(task) === quadrant);
}

export function sortTasksByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => b.priority - a.priority);
}

// Task status helpers
export function getStatusColor(status: Task['status']): string {
  switch (status) {
    case 'done':
      return 'text-green-600';
    case 'in_progress':
      return 'text-blue-600';
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
