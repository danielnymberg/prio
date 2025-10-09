import { getUnreadEmails, isMicrosoftLoggedIn } from './microsoft-graph';

export interface EmailScheduleConfig {
  enabled: boolean;
  times: string[]; // Format: "HH:MM"
  groupBy: 'none' | 'sender' | 'subject_keyword';
  autoMarkRead: boolean;
  notifyOnly: boolean; // Om true, visa bara notis istället för att auto-skapa tasks
}

const DEFAULT_CONFIG: EmailScheduleConfig = {
  enabled: false,
  times: ['07:00', '11:45', '15:30'],
  groupBy: 'sender',
  autoMarkRead: false,
  notifyOnly: true, // Default: bara notifiera, inte auto-skapa
};

const STORAGE_KEY = 'prio_email_schedule_config';
const LAST_CHECK_KEY = 'prio_email_last_check';

// Hämta config från localStorage
export function getScheduleConfig(): EmailScheduleConfig {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
}

// Spara config till localStorage
export function saveScheduleConfig(config: Partial<EmailScheduleConfig>) {
  const current = getScheduleConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

// Kolla om det är dags att köra
function shouldCheckNow(config: EmailScheduleConfig): boolean {
  if (!config.enabled) return false;

  const now = new Date();
  const dayOfWeek = now.getDay();

  // Kör bara på vardagar (måndag-fredag)
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;

  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
  const lastCheckDate = lastCheck ? new Date(lastCheck) : null;

  // Kolla om vi redan har kört inom senaste 5 minuterna
  if (lastCheckDate) {
    const diffMinutes = (now.getTime() - lastCheckDate.getTime()) / (1000 * 60);
    if (diffMinutes < 5) return false;
  }

  // Kolla om currentTime matchar någon av de schemalagda tiderna
  return config.times.some((scheduledTime) => {
    // Tillåt ±2 minuters fönster
    const [schedHour, schedMin] = scheduledTime.split(':').map(Number);
    const schedDate = new Date(now);
    schedDate.setHours(schedHour, schedMin, 0, 0);

    const diffMinutes = Math.abs((now.getTime() - schedDate.getTime()) / (1000 * 60));
    return diffMinutes <= 2;
  });
}

// Begär notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Browser stöder inte notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// Visa notification om olästa mejl
async function showEmailNotification(unreadCount: number) {
  if (Notification.permission !== 'granted') return;

  const notification = new Notification('📧 Olästa mejl', {
    body: `Du har ${unreadCount} olästa mejl. Klicka för att skapa Quickies.`,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'prio-email-check',
    requireInteraction: false,
    data: { unreadCount },
  });

  notification.onclick = () => {
    window.focus();
    // Trigger event för att öppna email-dialog
    window.dispatchEvent(
      new CustomEvent('prio:show-email-processor', { detail: { unreadCount } })
    );
    notification.close();
  };
}

// Huvudfunktion som körs vid schemalagd tid
export async function checkScheduledEmails() {
  const config = getScheduleConfig();

  if (!shouldCheckNow(config)) return;

  // Markera att vi har kollat
  localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());

  try {
    const isLoggedIn = await isMicrosoftLoggedIn();
    if (!isLoggedIn) {
      console.log('Email scheduler: Inte inloggad på Microsoft');
      return;
    }

    const emails = await getUnreadEmails(50);

    if (emails.length === 0) {
      console.log('Email scheduler: Inga olästa mejl');
      return;
    }

    console.log(`Email scheduler: ${emails.length} olästa mejl`);

    if (config.notifyOnly) {
      // Visa bara notifikation
      await showEmailNotification(emails.length);
    } else {
      // Auto-skapa tasks (trigga event som ClaudeChat kan lyssna på)
      window.dispatchEvent(
        new CustomEvent('prio:auto-process-emails', {
          detail: {
            emails,
            groupBy: config.groupBy,
            autoMarkRead: config.autoMarkRead,
          },
        })
      );
    }
  } catch (error) {
    console.error('Email scheduler error:', error);
  }
}

// Starta scheduler (kör varje minut)
let schedulerInterval: number | null = null;

export function startEmailScheduler() {
  if (schedulerInterval) return; // Redan startad

  console.log('Email scheduler started');

  // Kör omedelbart första gången
  checkScheduledEmails();

  // Sedan varje minut
  schedulerInterval = window.setInterval(() => {
    checkScheduledEmails();
  }, 60 * 1000); // 60 sekunder
}

export function stopEmailScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('Email scheduler stopped');
  }
}

// Auto-start scheduler när användaren är inloggad
export async function initEmailScheduler() {
  const config = getScheduleConfig();
  if (config.enabled) {
    const hasPermission = await requestNotificationPermission();
    if (hasPermission) {
      startEmailScheduler();
    } else {
      console.warn('Email scheduler: Notification permission denied');
    }
  }
}
