import { Client } from '@microsoft/microsoft-graph-client';
import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID!,
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

let msalInstance: PublicClientApplication | null = null;
let graphClient: Client | null = null;

export async function initializeMicrosoftGraph(): Promise<void> {
  if (!import.meta.env.VITE_AZURE_CLIENT_ID) {
    throw new Error('Azure Client ID not configured');
  }

  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();
  }

  const accounts = msalInstance.getAllAccounts();

  if (accounts.length === 0) {
    await msalInstance.loginPopup({
      scopes: [
        'User.Read',
        'Calendars.Read',
        'Files.Read.All',
        'Calendars.ReadWrite',
      ],
    });
  }

  const account = msalInstance.getAllAccounts()[0];
  const response = await msalInstance.acquireTokenSilent({
    scopes: ['User.Read', 'Calendars.Read', 'Files.Read.All', 'Calendars.ReadWrite'],
    account,
  });

  graphClient = Client.init({
    authProvider: (done) => {
      done(null, response.accessToken);
    },
  });
}

export async function getCalendarEvents(startDate: string, endDate: string) {
  if (!graphClient) await initializeMicrosoftGraph();

  try {
    const events = await graphClient!
      .api('/me/calendar/events')
      .filter(`start/dateTime ge '${startDate}T00:00:00' and end/dateTime le '${endDate}T23:59:59'`)
      .select('subject,start,end,location,attendees,body')
      .orderby('start/dateTime')
      .top(50)
      .get();

    return events.value.map((event: any) => ({
      id: event.id,
      title: event.subject,
      start: event.start.dateTime,
      end: event.end.dateTime,
      location: event.location?.displayName || '',
      attendees: event.attendees?.length || 0,
      body: event.body?.content || '',
    }));
  } catch (error) {
    console.error('Failed to get calendar events:', error);
    return [];
  }
}

export async function searchFiles(query: string) {
  if (!graphClient) await initializeMicrosoftGraph();

  try {
    const results = await graphClient!
      .api(`/me/drive/root/search(q='${encodeURIComponent(query)}')`)
      .select('name,webUrl,lastModifiedDateTime,size,file')
      .top(10)
      .get();

    return results.value.map((file: any) => ({
      id: file.id,
      name: file.name,
      url: file.webUrl,
      lastModified: file.lastModifiedDateTime,
      size: file.size,
      type: file.file?.mimeType || 'unknown',
    }));
  } catch (error) {
    console.error('Failed to search files:', error);
    return [];
  }
}

export async function createCalendarEvent(event: {
  subject: string;
  start: string;
  end: string;
  body?: string;
  location?: string;
  attendees?: string[];
}) {
  if (!graphClient) await initializeMicrosoftGraph();

  try {
    const calendarEvent = {
      subject: event.subject,
      start: {
        dateTime: event.start,
        timeZone: 'Europe/Stockholm',
      },
      end: {
        dateTime: event.end,
        timeZone: 'Europe/Stockholm',
      },
      body: {
        contentType: 'HTML',
        content: event.body || '',
      },
      location: event.location ? {
        displayName: event.location,
      } : undefined,
      attendees: event.attendees ? event.attendees.map(email => ({
        emailAddress: {
          address: email,
        },
      })) : undefined,
    };

    const result = await graphClient!
      .api('/me/calendar/events')
      .post(calendarEvent);

    return {
      id: result.id,
      webLink: result.webLink,
      subject: result.subject,
    };
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    throw error;
  }
}

export async function getUserProfile() {
  if (!graphClient) await initializeMicrosoftGraph();

  try {
    const user = await graphClient!
      .api('/me')
      .select('displayName,mail,userPrincipalName')
      .get();

    return {
      name: user.displayName,
      email: user.mail || user.userPrincipalName,
    };
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return null;
  }
}

export async function signOut() {
  if (msalInstance) {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      await msalInstance.logoutPopup({
        account: accounts[0],
      });
    }
  }
  graphClient = null;
}

export function isSignedIn(): boolean {
  if (!msalInstance) return false;
  return msalInstance.getAllAccounts().length > 0;
}

// Helper function to format calendar events for AI context
export function formatCalendarEventsForAI(events: any[]): string {
  if (events.length === 0) return 'Inga kalenderhändelser';

  return events.map((event: any) => {
    const startTime = new Date(event.start).toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const endTime = new Date(event.end).toLocaleTimeString('sv-SE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${startTime}-${endTime}: ${event.title}${event.location ? ` (${event.location})` : ''}`;
  }).join('\n');
}

// Helper function to suggest meeting times based on calendar
export async function suggestMeetingTimes(
  date: string,
  durationMinutes: number,
  workingHours: { start: number; end: number } = { start: 9, end: 17 }
): Promise<string[]> {
  const events = await getCalendarEvents(date, date);
  const suggestions: string[] = [];

  // Create time slots for the day
  for (let hour = workingHours.start; hour < workingHours.end; hour++) {
    for (const minute of [0, 30]) {
      const slotStart = new Date(`${date}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

      // Check if this slot conflicts with existing events
      const hasConflict = events.some((event: any) => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);

        return (slotStart < eventEnd && slotEnd > eventStart);
      });

      if (!hasConflict && slotEnd.getHours() <= workingHours.end) {
        suggestions.push(`${slotStart.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}-${slotEnd.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`);
      }

      if (suggestions.length >= 5) break;
    }
    if (suggestions.length >= 5) break;
  }

  return suggestions;
}