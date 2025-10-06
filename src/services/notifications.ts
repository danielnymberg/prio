import { Task } from '@/lib/types';

export type NotificationType = '24h_before' | '2h_before' | 'overdue';

export interface NotificationConfig {
  enabled: boolean;
  types: {
    [key in NotificationType]: boolean;
  };
}

const DEFAULT_CONFIG: NotificationConfig = {
  enabled: true,
  types: {
    '24h_before': true,
    '2h_before': true,
    overdue: true,
  },
};

const STORAGE_KEY = 'prio-notification-config';
const SENT_KEY = 'prio-sent-notifications';

// Get notification configuration
export function getNotificationConfig(): NotificationConfig {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_CONFIG;
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

// Save notification configuration
export function saveNotificationConfig(config: NotificationConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// Check if notification has already been sent
function hasNotificationBeenSent(
  taskId: string,
  type: NotificationType
): boolean {
  const stored = localStorage.getItem(SENT_KEY);
  if (!stored) return false;

  try {
    const sent: Record<string, NotificationType[]> = JSON.parse(stored);
    return sent[taskId]?.includes(type) || false;
  } catch {
    return false;
  }
}

// Mark notification as sent
function markNotificationSent(taskId: string, type: NotificationType): void {
  const stored = localStorage.getItem(SENT_KEY);
  let sent: Record<string, NotificationType[]> = {};

  if (stored) {
    try {
      sent = JSON.parse(stored);
    } catch {
      // Ignore parse errors
    }
  }

  if (!sent[taskId]) {
    sent[taskId] = [];
  }

  if (!sent[taskId].includes(type)) {
    sent[taskId].push(type);
  }

  localStorage.setItem(SENT_KEY, JSON.stringify(sent));
}

// Show browser notification
function showNotification(title: string, body: string, taskId: string): void {
  if (Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: taskId, // Prevents duplicate notifications
    requireInteraction: false,
  });

  // Auto-close after 10 seconds
  setTimeout(() => {
    notification.close();
  }, 10000);

  // Handle click - could navigate to task
  notification.onclick = () => {
    window.focus();
    notification.close();
    // TODO: Navigate to task detail view
  };
}

// Check tasks and send notifications
export function checkAndSendNotifications(tasks: Task[]): void {
  const config = getNotificationConfig();

  if (!config.enabled || Notification.permission !== 'granted') {
    return;
  }

  const now = new Date();

  for (const task of tasks) {
    // Skip completed tasks
    if (task.status === 'done') continue;

    // Skip tasks without deadline
    if (!task.deadline) continue;

    const deadline = new Date(task.deadline);
    const hoursUntil = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    // 24h before notification
    if (
      config.types['24h_before'] &&
      hoursUntil > 23 &&
      hoursUntil <= 24 &&
      !hasNotificationBeenSent(task.id, '24h_before')
    ) {
      showNotification(
        '📅 Deadline imorgon',
        `"${task.title}" har deadline om 24 timmar`,
        task.id
      );
      markNotificationSent(task.id, '24h_before');
    }

    // 2h before notification
    if (
      config.types['2h_before'] &&
      hoursUntil > 1.9 &&
      hoursUntil <= 2.1 &&
      !hasNotificationBeenSent(task.id, '2h_before')
    ) {
      showNotification(
        '⚡ Deadline snart!',
        `"${task.title}" har deadline om 2 timmar`,
        task.id
      );
      markNotificationSent(task.id, '2h_before');
    }

    // Overdue notification (within 1h after deadline)
    if (
      config.types['overdue'] &&
      hoursUntil < 0 &&
      hoursUntil >= -1 &&
      !hasNotificationBeenSent(task.id, 'overdue')
    ) {
      const hoursOverdue = Math.abs(hoursUntil);
      showNotification(
        '🚨 Deadline passerad!',
        `"${task.title}" är ${Math.round(hoursOverdue * 60)} minuter försenad`,
        task.id
      );
      markNotificationSent(task.id, 'overdue');
    }
  }
}

// Initialize notification service
export async function initializeNotifications(tasks: Task[]): Promise<void> {
  const hasPermission = await requestNotificationPermission();

  if (!hasPermission) {
    console.log('Notification permission not granted');
    return;
  }

  // Initial check
  checkAndSendNotifications(tasks);

  // Set up interval to check every 5 minutes
  setInterval(() => {
    checkAndSendNotifications(tasks);
  }, 5 * 60 * 1000);
}

// Clear sent notifications for completed/deleted tasks
export function clearSentNotifications(taskIds: string[]): void {
  const stored = localStorage.getItem(SENT_KEY);
  if (!stored) return;

  try {
    const sent: Record<string, NotificationType[]> = JSON.parse(stored);
    for (const taskId of taskIds) {
      delete sent[taskId];
    }
    localStorage.setItem(SENT_KEY, JSON.stringify(sent));
  } catch {
    // Ignore errors
  }
}
