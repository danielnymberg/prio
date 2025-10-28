import { Client } from '@microsoft/microsoft-graph-client';
import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: 'https://login.microsoftonline.com/organizations', // Multi-tenant organizational accounts
    redirectUri: window.location.origin,
    navigateToLoginRequestUrl: false, // Viktigt för PWA
  },
  cache: {
    cacheLocation: 'localStorage' as 'localStorage',
    storeAuthStateInCookie: true, // Viktigt för PWA/Service Worker kompatibilitet
  },
};

const loginRequest = {
  scopes: [
    'User.Read',
    'Calendars.Read',
    'Calendars.ReadWrite',
    'Mail.Read',
    'Mail.ReadWrite',    // Draft emails
    'Contacts.Read',     // Read contacts
  ],
};

// Initialize MSAL
let msalInstance: PublicClientApplication | null = null;

async function getMsalInstance() {
  if (!msalInstance && import.meta.env.VITE_AZURE_CLIENT_ID) {
    msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();

    // Hantera redirect callback vid retur från Microsoft login
    try {
      await msalInstance.handleRedirectPromise();
    } catch (error) {
      console.error('Error handling redirect:', error);
    }
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

export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  receivedDateTime: string;
  bodyPreview: string;
  isRead: boolean;
}

// Login to Microsoft account
export async function loginToMicrosoft(forceConsent: boolean = false): Promise<boolean> {
  const msal = await getMsalInstance();
  if (!msal) {
    throw new Error('Azure Client ID not configured');
  }

  try {
    const loginParams = {
      ...loginRequest,
      ...(forceConsent ? { prompt: 'consent' } : {}),
    };
    // Använd popup med explicit konfiguration för PWA
    await msal.loginPopup({
      ...loginParams,
      redirectUri: window.location.origin,
      prompt: forceConsent ? 'consent' : 'select_account',
    });
    return true;
  } catch (error) {
    console.error('Microsoft login failed:', error);
    // Om popup blockeras eller misslyckas, försök med redirect som fallback
    try {
      await msal.loginRedirect({
        ...loginRequest,
        redirectUri: window.location.origin,
      });
      return true;
    } catch (redirectError) {
      console.error('Microsoft redirect login also failed:', redirectError);
      return false;
    }
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
      // Microsoft Graph returnerar UTC-tid utan 'Z', lägg till för korrekt parsning
      start: event.start.dateTime + 'Z',
      end: event.end.dateTime + 'Z',
      isAllDay: event.isAllDay,
    }));
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    return [];
  }
}

// Get external meetings only (not Prio-created events)
export async function getExternalMeetings(
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
      .select('id,subject,start,end,isAllDay,categories')
      .orderby('start/dateTime')
      .get();

    // Filter out Prio-created events
    return response.value
      .filter((event: any) =>
        !event.categories?.includes('Prio Focus') &&
        !event.subject?.startsWith('🎯')
      )
      .map((event: any) => ({
        id: event.id,
        subject: event.subject,
        start: event.start.dateTime + 'Z',
        end: event.end.dateTime + 'Z',
        isAllDay: event.isAllDay,
      }));
  } catch (error) {
    console.error('Failed to fetch external meetings:', error);
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
): Promise<string | null> {
  const client = await getGraphClient();
  if (!client) return null;

  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  try {
    const event = await client.api('/me/calendar/events').post({
      subject: `🎯 ${taskTitle}`,
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
      isReminderOn: false,
    });

    return event.id;
  } catch (error) {
    console.error('Failed to block calendar time:', error);
    return null;
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

// Get unread emails (ONLY from inbox, not all folders)
export async function getUnreadEmails(maxCount: number = 50): Promise<EmailMessage[]> {
  const client = await getGraphClient();
  if (!client) return [];

  try {
    const response = await client
      .api('/me/mailFolders/inbox/messages')  // Only inbox, not all folders
      .filter('isRead eq false')
      .select('id,subject,from,receivedDateTime,bodyPreview,isRead')
      .orderby('receivedDateTime desc')
      .top(maxCount)
      .get();

    return response.value.map((email: any) => ({
      id: email.id,
      subject: email.subject || '(Inget ämne)',
      from: email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Okänd',
      receivedDateTime: email.receivedDateTime,
      bodyPreview: email.bodyPreview || '',
      isRead: email.isRead,
    }));
  } catch (error) {
    console.error('Failed to fetch unread emails:', error);
    return [];
  }
}

// Get ALL emails (read + unread)
export async function getAllEmails(maxCount: number = 50, includeRead: boolean = true): Promise<EmailMessage[]> {
  const client = await getGraphClient();
  if (!client) return [];

  try {
    let apiCall = client
      .api('/me/mailFolders/inbox/messages')
      .select('id,subject,from,receivedDateTime,bodyPreview,isRead')
      .orderby('receivedDateTime desc')
      .top(maxCount);

    if (!includeRead) {
      apiCall = apiCall.filter('isRead eq false');
    }

    const response = await apiCall.get();

    return response.value.map((email: any) => ({
      id: email.id,
      subject: email.subject || '(Inget ämne)',
      from: email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Okänd',
      receivedDateTime: email.receivedDateTime,
      bodyPreview: email.bodyPreview || '',
      isRead: email.isRead,
    }));
  } catch (error) {
    console.error('Failed to fetch all emails:', error);
    return [];
  }
}

// Search emails
export async function searchEmails(
  query: string,
  searchIn: 'sender' | 'subject' | 'both' = 'both',
  maxCount: number = 20
): Promise<EmailMessage[]> {
  const client = await getGraphClient();
  if (!client) return [];

  try {
    let filter = '';

    if (searchIn === 'sender') {
      filter = `contains(from/emailAddress/name,'${query}') or contains(from/emailAddress/address,'${query}')`;
    } else if (searchIn === 'subject') {
      filter = `contains(subject,'${query}')`;
    } else {
      filter = `contains(subject,'${query}') or contains(from/emailAddress/name,'${query}') or contains(from/emailAddress/address,'${query}')`;
    }

    const response = await client
      .api('/me/mailFolders/inbox/messages')
      .filter(filter)
      .select('id,subject,from,receivedDateTime,bodyPreview,isRead')
      .orderby('receivedDateTime desc')
      .top(maxCount)
      .get();

    return response.value.map((email: any) => ({
      id: email.id,
      subject: email.subject || '(Inget ämne)',
      from: email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Okänd',
      receivedDateTime: email.receivedDateTime,
      bodyPreview: email.bodyPreview || '',
      isRead: email.isRead,
    }));
  } catch (error) {
    console.error('Failed to search emails:', error);
    return [];
  }
}

// Get full email content
export async function getEmailContent(emailId: string): Promise<{
  subject: string;
  from: string;
  receivedDateTime: string;
  body: string;
  isRead: boolean;
} | null> {
  const client = await getGraphClient();
  if (!client) return null;

  try {
    const email = await client
      .api(`/me/messages/${emailId}`)
      .select('id,subject,from,receivedDateTime,body,isRead')
      .get();

    return {
      subject: email.subject || '(Inget ämne)',
      from: email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Okänd',
      receivedDateTime: email.receivedDateTime,
      body: email.body?.content || email.bodyPreview || '',
      isRead: email.isRead,
    };
  } catch (error) {
    console.error('Failed to get email content:', error);
    return null;
  }
}

// Mark email as read
export async function markEmailAsRead(emailId: string): Promise<boolean> {
  const client = await getGraphClient();
  if (!client) return false;

  try {
    await client.api(`/me/messages/${emailId}`).patch({
      isRead: true,
    });
    return true;
  } catch (error) {
    console.error('Failed to mark email as read:', error);
    return false;
  }
}

// Update calendar event (för att flytta/ändra möten)
export async function updateCalendarEvent(
  eventId: string,
  updates: {
    subject?: string;
    start?: Date;
    end?: Date;
    body?: string;
  }
): Promise<boolean> {
  const client = await getGraphClient();
  if (!client) return false;

  try {
    // SÄKERHETSCHECK: Hämta event först och kolla attendees
    const event = await client
      .api(`/me/calendar/events/${eventId}`)
      .select('attendees,organizer')
      .get();

    // HÅRDKODAD REGEL: Blockera om fler än 1 deltagare
    if (event.attendees && event.attendees.length > 1) {
      throw new Error('SÄKERHETSBLOCKERING: Detta möte har flera deltagare. Claude får INTE flytta möten med andra människor. Be användaren göra det manuellt.');
    }

    const updateData: any = {};

    if (updates.subject) {
      updateData.subject = updates.subject;
    }

    if (updates.start) {
      updateData.start = {
        dateTime: updates.start.toISOString(),
        timeZone: 'Europe/Stockholm',
      };
    }

    if (updates.end) {
      updateData.end = {
        dateTime: updates.end.toISOString(),
        timeZone: 'Europe/Stockholm',
      };
    }

    if (updates.body) {
      updateData.body = {
        contentType: 'text',
        content: updates.body,
      };
    }

    await client.api(`/me/calendar/events/${eventId}`).patch(updateData);
    return true;
  } catch (error) {
    console.error('Failed to update calendar event:', error);
    throw error; // Re-throw för att Claude får error message
  }
}

// Delete calendar event
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const client = await getGraphClient();
  if (!client) return false;

  try {
    // SÄKERHETSCHECK: Hämta event först och kolla attendees
    const event = await client
      .api(`/me/calendar/events/${eventId}`)
      .select('attendees,organizer')
      .get();

    // HÅRDKODAD REGEL: Blockera om fler än 1 deltagare
    if (event.attendees && event.attendees.length > 1) {
      throw new Error('SÄKERHETSBLOCKERING: Detta möte har flera deltagare. Claude får INTE radera möten med andra människor. Be användaren göra det manuellt.');
    }

    await client.api(`/me/calendar/events/${eventId}`).delete();
    return true;
  } catch (error) {
    console.error('Failed to delete calendar event:', error);
    throw error; // Re-throw för att Claude får error message
  }
}

// Search contacts
export async function searchContacts(searchQuery: string): Promise<any[]> {
  const client = await getGraphClient();
  if (!client) return [];

  try {
    const response = await client
      .api('/me/contacts')
      .filter(`startswith(displayName,'${searchQuery}') or startswith(surname,'${searchQuery}') or startswith(givenName,'${searchQuery}') or startswith(companyName,'${searchQuery}')`)
      .select('id,displayName,emailAddresses,businessPhones,mobilePhone,companyName,jobTitle')
      .top(10)
      .get();

    return response.value.map((contact: any) => ({
      id: contact.id,
      name: contact.displayName,
      email: contact.emailAddresses?.[0]?.address || null,
      phone: contact.businessPhones?.[0] || contact.mobilePhone || null,
      company: contact.companyName || null,
      jobTitle: contact.jobTitle || null
    }));
  } catch (error) {
    console.error('Failed to search contacts:', error);
    return [];
  }
}

// Get contact info
export async function getContactInfo(contactId: string): Promise<any | null> {
  const client = await getGraphClient();
  if (!client) return null;

  try {
    const contact = await client
      .api(`/me/contacts/${contactId}`)
      .select('id,displayName,emailAddresses,businessPhones,mobilePhone,companyName,jobTitle,birthday,homeAddress,businessAddress')
      .get();

    return {
      id: contact.id,
      name: contact.displayName,
      emails: contact.emailAddresses?.map((e: any) => e.address) || [],
      phones: {
        business: contact.businessPhones || [],
        mobile: contact.mobilePhone || null
      },
      company: contact.companyName || null,
      jobTitle: contact.jobTitle || null,
      birthday: contact.birthday || null,
      addresses: {
        home: contact.homeAddress || null,
        business: contact.businessAddress || null
      }
    };
  } catch (error) {
    console.error('Failed to get contact info:', error);
    return null;
  }
}

// Send email via MS Graph
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  isHtml: boolean = false
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const msal = await getMsalInstance();
    if (!msal) {
      return { success: false, error: 'Microsoft auth not configured' };
    }

    const accounts = msal.getAllAccounts();
    if (accounts.length === 0) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get access token
    let accessToken: string;
    try {
      const response = await msal.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });
      accessToken = response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        const response = await msal.acquireTokenPopup(loginRequest);
        accessToken = response.accessToken;
      } else {
        throw error;
      }
    }

    const message = {
      message: {
        subject,
        body: {
          contentType: isHtml ? 'HTML' : 'Text',
          content: body,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
      },
      saveToSentItems: true,
    };

    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send email:', errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    // MS Graph sendMail returnerar 202 Accepted utan body
    console.log('✅ Email sent successfully to:', to);

    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
