import { Client } from '@microsoft/microsoft-graph-client';
import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: 'https://login.microsoftonline.com/organizations', // Multi-tenant organizational accounts
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

const loginRequest = {
  scopes: ['User.Read', 'Calendars.Read', 'Calendars.ReadWrite'],
};

// Initialize MSAL
let msalInstance: PublicClientApplication | null = null;

async function getMsalInstance() {
  if (!msalInstance && import.meta.env.VITE_AZURE_CLIENT_ID) {
    msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();
  }
  return msalInstance;
}

// Get authenticated Graph client
async function getGraphClient(): Promise<Client | null> {
  const msal = await getMsalInstance();
  if (!msal) return null;

  const accounts = msal.getAllAccounts();
  if (accounts.length === 0) {
    // No account logged in
    return null;
  }

  try {
    const response = await msal.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
    });

    return Client.init({
      authProvider: (done) => {
        done(null, response.accessToken);
      },
    });
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      // Require interactive login
      const response = await msal.acquireTokenPopup(loginRequest);
      return Client.init({
        authProvider: (done) => {
          done(null, response.accessToken);
        },
      });
    }
    throw error;
  }
}

export interface CalendarEvent {
  id: string;
  subject: string;
  start: string;
  end: string;
  isAllDay: boolean;
}

export interface FreeTimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

export interface WorkSession {
  start: Date;
  end: Date;
  durationMinutes: number;
  day: string; // "Idag", "Imorgon", etc.
}

export interface SessionPlan {
  sessions: WorkSession[];
  totalMinutes: number;
  remainingMinutes: number;
  isComplete: boolean;
}

export interface DeadlineAnalysis {
  estimatedDeadline: string;
  totalAvailableHours: number;
  requiredHours: number;
  isRealistic: boolean;
  warning?: string;
  freeSlots: FreeTimeSlot[];
}

// Login to Microsoft account
export async function loginToMicrosoft(): Promise<boolean> {
  const msal = await getMsalInstance();
  if (!msal) {
    throw new Error('Azure Client ID not configured');
  }

  try {
    await msal.loginPopup(loginRequest);
    return true;
  } catch (error) {
    console.error('Microsoft login failed:', error);
    return false;
  }
}

// Logout from Microsoft account
export async function logoutFromMicrosoft(): Promise<void> {
  const msal = await getMsalInstance();
  if (!msal) return;

  const accounts = msal.getAllAccounts();
  if (accounts.length > 0) {
    await msal.logoutPopup({ account: accounts[0] });
  }
}

// Check if user is logged in to Microsoft
export async function isMicrosoftLoggedIn(): Promise<boolean> {
  const msal = await getMsalInstance();
  if (!msal) return false;
  return msal.getAllAccounts().length > 0;
}

// Get calendar events for a date range
export async function getCalendarEvents(
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const client = await getGraphClient();
  if (!client) return [];

  try {
    const response = await client
      .api('/me/calendar/events')
      .filter(
        `start/dateTime ge '${startDate.toISOString()}' and end/dateTime le '${endDate.toISOString()}'`
      )
      .select('id,subject,start,end,isAllDay')
      .orderby('start/dateTime')
      .get();

    return response.value.map((event: any) => ({
      id: event.id,
      subject: event.subject,
      start: event.start.dateTime,
      end: event.end.dateTime,
      isAllDay: event.isAllDay,
    }));
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    return [];
  }
}

// Find free time slots in calendar with priority for preferred hours
export async function findFreeTimeSlots(
  startDate: Date,
  endDate: Date,
  minSlotDurationMinutes: number = 60,
  workHoursOnly: boolean = true,
  preferredStartHour: number = 8,
  preferredEndHour: number = 16
): Promise<FreeTimeSlot[]> {
  const events = await getCalendarEvents(startDate, endDate);
  const freeSlots: FreeTimeSlot[] = [];

  // Define work hours (6:00 - 18:00)
  const workStartHour = 6;
  const workEndHour = 18;

  let currentDate = new Date(startDate);

  while (currentDate < endDate) {
    // Skip weekends
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Set work hours for current day
    const dayStart = new Date(currentDate);
    dayStart.setHours(workHoursOnly ? workStartHour : 0, 0, 0, 0);

    const dayEnd = new Date(currentDate);
    dayEnd.setHours(workHoursOnly ? workEndHour : 23, 59, 59, 999);

    // Get events for this day
    const dayEvents = events.filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return eventStart < dayEnd && eventEnd > dayStart;
    });

    // Sort events by start time
    dayEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    // Find gaps between events
    let slotStart = dayStart;

    for (const event of dayEvents) {
      const eventStart = new Date(event.start);

      if (eventStart > slotStart) {
        const durationMinutes = (eventStart.getTime() - slotStart.getTime()) / (1000 * 60);

        if (durationMinutes >= minSlotDurationMinutes) {
          freeSlots.push({
            start: new Date(slotStart),
            end: new Date(eventStart),
            durationMinutes: Math.floor(durationMinutes),
          });
        }
      }

      slotStart = new Date(Math.max(slotStart.getTime(), new Date(event.end).getTime()));
    }

    // Check gap until end of work day
    if (dayEnd > slotStart) {
      const durationMinutes = (dayEnd.getTime() - slotStart.getTime()) / (1000 * 60);

      if (durationMinutes >= minSlotDurationMinutes) {
        freeSlots.push({
          start: new Date(slotStart),
          end: new Date(dayEnd),
          durationMinutes: Math.floor(durationMinutes),
        });
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Sort slots: preferred hours first, then by earliest time
  const sortedSlots = freeSlots.sort((a, b) => {
    const aHour = a.start.getHours();
    const bHour = b.start.getHours();
    const aInPreferred = aHour >= preferredStartHour && aHour < preferredEndHour;
    const bInPreferred = bHour >= preferredStartHour && bHour < preferredEndHour;

    // Preferred times come first
    if (aInPreferred && !bInPreferred) return -1;
    if (!aInPreferred && bInPreferred) return 1;

    // Within same category, sort by earliest time
    return a.start.getTime() - b.start.getTime();
  });

  return sortedSlots;
}

// Plan work sessions for a project
export async function planWorkSessions(
  totalMinutes: number,
  deadline: Date,
  maxSessionMinutes: number = 240 // Default 4h max per session
): Promise<SessionPlan> {
  const now = new Date();
  const freeSlots = await findFreeTimeSlots(now, deadline);

  const sessions: WorkSession[] = [];
  let remainingMinutes = totalMinutes;

  const formatDay = (date: Date): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Idag';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Imorgon';
    } else {
      return date.toLocaleDateString('sv-SE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    }
  };

  for (const slot of freeSlots) {
    if (remainingMinutes <= 0) break;

    // How much can we fit in this slot?
    const sessionMinutes = Math.min(
      remainingMinutes,
      slot.durationMinutes,
      maxSessionMinutes
    );

    // Calculate end time for this session
    const sessionEnd = new Date(slot.start.getTime() + sessionMinutes * 60 * 1000);

    sessions.push({
      start: slot.start,
      end: sessionEnd,
      durationMinutes: sessionMinutes,
      day: formatDay(slot.start),
    });

    remainingMinutes -= sessionMinutes;
  }

  return {
    sessions,
    totalMinutes,
    remainingMinutes,
    isComplete: remainingMinutes <= 0,
  };
}

// Calculate realistic deadline based on required hours and calendar
export async function calculateRealisticDeadline(
  requiredHours: number,
  preferredDeadline?: Date,
  bufferPercentage: number = 20 // 20% buffer for unexpected tasks
): Promise<DeadlineAnalysis> {
  const now = new Date();
  const searchEndDate = preferredDeadline || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  // Find all free time slots
  const freeSlots = await findFreeTimeSlots(now, searchEndDate);

  // Calculate total available hours
  const totalAvailableMinutes = freeSlots.reduce((sum, slot) => sum + slot.durationMinutes, 0);
  const totalAvailableHours = totalAvailableMinutes / 60;

  // Apply buffer (reduce available time)
  const usableHours = totalAvailableHours * (1 - bufferPercentage / 100);

  // Check if realistic
  const isRealistic = usableHours >= requiredHours;

  // Calculate when we'll have enough hours
  let accumulatedHours = 0;
  let estimatedDeadline = searchEndDate;

  for (const slot of freeSlots) {
    accumulatedHours += slot.durationMinutes / 60;
    if (accumulatedHours >= requiredHours) {
      estimatedDeadline = slot.end;
      break;
    }
  }

  const analysis: DeadlineAnalysis = {
    estimatedDeadline: estimatedDeadline.toISOString(),
    totalAvailableHours: Math.round(totalAvailableHours * 10) / 10,
    requiredHours,
    isRealistic,
    freeSlots,
  };

  // Add warnings
  if (!isRealistic) {
    analysis.warning = `Endast ${Math.round(usableHours)}h tillgängliga, behöver ${requiredHours}h. Deadline är orealistisk!`;
  } else if (preferredDeadline && estimatedDeadline > preferredDeadline) {
    analysis.warning = `Kan inte hinna till önskad deadline. Tidigast ${estimatedDeadline.toLocaleDateString('sv-SE')}`;
  }

  return analysis;
}

// Block time in calendar for focus session
export async function blockCalendarTime(
  startTime: Date,
  durationMinutes: number,
  taskTitle: string
): Promise<boolean> {
  const client = await getGraphClient();
  if (!client) return false;

  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  try {
    await client.api('/me/calendar/events').post({
      subject: `🎯 Fokus: ${taskTitle}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Europe/Stockholm',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Europe/Stockholm',
      },
      categories: ['Prio Focus'],
      showAs: 'busy',
      isReminderOn: true,
      reminderMinutesBeforeStart: 15,
    });

    return true;
  } catch (error) {
    console.error('Failed to block calendar time:', error);
    return false;
  }
}

// Block multiple sessions in calendar for a project
export async function blockMultipleSessions(
  sessions: WorkSession[],
  taskTitle: string
): Promise<{ success: boolean; bookedCount: number }> {
  const client = await getGraphClient();
  if (!client) return { success: false, bookedCount: 0 };

  let bookedCount = 0;
  const totalSessions = sessions.length;

  try {
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      const sessionLabel = totalSessions > 1 ? ` (Session ${i + 1}/${totalSessions})` : '';

      await client.api('/me/calendar/events').post({
        subject: `🎯 Fokus: ${taskTitle}${sessionLabel}`,
        start: {
          dateTime: session.start.toISOString(),
          timeZone: 'Europe/Stockholm',
        },
        end: {
          dateTime: session.end.toISOString(),
          timeZone: 'Europe/Stockholm',
        },
        categories: ['Prio Focus'],
        showAs: 'busy',
        isReminderOn: true,
        reminderMinutesBeforeStart: 15,
      });

      bookedCount++;
    }

    return { success: true, bookedCount };
  } catch (error) {
    console.error('Failed to block multiple sessions:', error);
    return { success: bookedCount > 0, bookedCount };
  }
}
