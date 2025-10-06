import { Task, CreateTaskInput, UpdateTaskInput } from '@/lib/types';
import { parseNaturalDateTime } from '@/lib/dateParser';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://prio-backend.onrender.com';

export interface ConversationContext {
  tasks: Task[];
  calendarEvents: any[];
  recentFiles: any[];
  conversationHistory: any[];
  userId: string;
}

export class ClaudeConversation {
  private context: ConversationContext;
  private conversationHistory: any[] = [];
  private onTaskCreate?: (input: CreateTaskInput) => Promise<Task>;
  private onTaskUpdate?: (id: string, input: UpdateTaskInput) => Promise<Task>;

  constructor(
    initialContext: Partial<ConversationContext>,
    callbacks?: {
      onTaskCreate?: (input: CreateTaskInput) => Promise<Task>;
      onTaskUpdate?: (id: string, input: UpdateTaskInput) => Promise<Task>;
    }
  ) {
    this.context = {
      tasks: initialContext.tasks || [],
      calendarEvents: initialContext.calendarEvents || [],
      recentFiles: initialContext.recentFiles || [],
      conversationHistory: initialContext.conversationHistory || [],
      userId: initialContext.userId || '',
    };

    this.onTaskCreate = callbacks?.onTaskCreate;
    this.onTaskUpdate = callbacks?.onTaskUpdate;
  }

  async chat(userMessage: string): Promise<string> {
    if (!userMessage.trim()) {
      // Om tom message, fortsätt bara conversation från tool results
      const response = await this.getContinuationResponse();
      return response;
    }

    // Lägg till user message
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    const response = await this.getContinuationResponse();
    return response;
  }

  private async getContinuationResponse(): Promise<string> {
    try {
      // Anropa backend istället för direkt API-call
      const response = await fetch(`${BACKEND_URL}/api/claude-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: this.conversationHistory,
          system: this.buildSystemPrompt(),
          tools: this.getTools(),
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();

      // Hantera tool calls
      if (data.stop_reason === 'tool_use') {
        const toolResults = await this.executeTools(data.content);

        // Lägg till assistant response med tool calls
        this.conversationHistory.push({
          role: 'assistant',
          content: data.content,
        });

        // Lägg till tool results
        this.conversationHistory.push({
          role: 'user',
          content: toolResults,
        });

        // Få final response
        return this.getContinuationResponse();
      }

      // Extrahera text response
      const textBlock = data.content.find((c: any) => c.type === 'text');
      const assistantMessage = textBlock?.text || 'Förlåt, jag kunde inte generera ett svar.';

      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      console.error('Claude conversation error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to communicate with AI assistant'
      );
    }
  }

  private buildSystemPrompt(): string {
    const today = new Date().toISOString().split('T')[0];

    return `Du är en svensk AI-assistent integrerad i Prio, en CPM-baserad prioriterings-app.

DAGENS DATUM: ${today}

ANVÄNDARENS KONTEXT:
${JSON.stringify({
  aktivaTasks: this.context.tasks.filter(t => t.status !== 'done').length,
  försenade: this.context.tasks.filter(t => t.deadline && new Date(t.deadline) < new Date()).length,
  inbox: this.context.tasks.filter(t => t.status === 'not_started' && !t.deadline && t.value_score === 5).length,
  dagensKalender: this.context.calendarEvents.length + ' händelser',
}, null, 2)}

KONVERSATIONSSTIL:
- Prata naturlig svenska
- Resonera högt om prioriteringar
- Ställ följdfrågor för att förstå kontext
- Var koncis men hjälpsam
- Använd emojis sparsamt (🎯📅✅)

PRIORITERINGSLOGIK (CPM - Consequence Priority Method):
- Priority = (Value × TimeSensitivity × Confidence) / Effort
- Value (1-10): Objektiva konsekvenser om det INTE görs
- TimeSensitivity (1-10): Kostnad av att vänta (inte samma som deadline!)
- Confidence (1-10): Säkerhet i bedömningen
- Effort (1-10): Uppskattad ansträngning

SMART TASK-SKAPANDE:
När användaren ber dig skapa en task, använd följande logik:

1. TOLKA NATURLIGA TIDER MED parse_natural_time
   När användaren säger "kl 14", "imorgon", "på fredag", etc:
   → Använd parse_natural_time först för att få ISO datetime
   → Sätt sedan deadline till det returnerade värdet

   Exempel:
   - "Ring Lisa kl 14" → parse_natural_time("kl 14") → deadline: 2025-10-05T14:00:00
   - "Möte imorgon kl 10" → parse_natural_time("imorgon kl 10") → deadline: 2025-10-06T10:00:00
   - "Presentation på fredag" → parse_natural_time("på fredag") → deadline: fredag 09:00

2. KAN DU BEDÖMA DIREKT? (Skapa med värden)
   ✅ Tydlig deadline nämnd → Använd parse_natural_time + sätt rimlig time_sensitivity
   ✅ Tydlig prioritet ("viktigt", "akut", "snabbt") → Bedöm value_score
   ✅ Klar handling ("ringa X", "maila Y") → Bedöm effort + confidence

3. FÖR OTYDLIGT? (Skapa som INBOX)
   ❌ Ingen deadline angiven OCH vag beskrivning
   ❌ Kräver research/beslut ("kolla", "undersök", "fundera på")
   ❌ Komplex/lång task utan tydlig plan

   → Använd DEFAULT-VÄRDEN:
   - value_score: 5
   - time_sensitivity: 5
   - confidence: 5
   - effort: 5
   - deadline: null

4. AUTOMATISK KALENDERBOKNING (VIKTIGT!)
   När en task skapas med estimated_duration >= 60 minuter:

   a) Kolla tillgänglig tid: analyze_calendar_capacity
   b) Föreslå bokning: "Du har X timmar ledigt imorgon kl 09-15. Vill du att jag bokar [duration] fokustid?"
   c) Om användaren svarar ja → block_calendar_time

   Exempel:
   - User: "Fixa presentationen, tar 4 timmar"
   - Du: [skapar task] "Jag har lagt in tasken. Du har 6h ledigt imorgon 09:00-15:00. Ska jag boka 4h fokustid imorgon 09:00?"
   - User: "Ja"
   - Du: [block_calendar_time] "✅ Jag har bokat 4h i din kalender imorgon 09:00!"

SVARA ANVÄNDAREN:
- Direkt skapad: "Okej! Jag har lagt in '[task]' [med deadline X]"
- Inbox: "Jag har lagt det i din inbox för senare bedömning 📥"
- Med kalenderbokning: "✅ Task skapad + [X timmar] bokad i kalendern!"

KALENDER-INTEGRATION (MICROSOFT GRAPH):
När användaren frågar om deadlines baserat på tillgänglig tid:

1. "Når kan jag leverera X som tar Y timmar?"
   → Använd calculate_realistic_deadline med required_hours

2. "Hur mycket tid har jag kommande veckan?"
   → Använd analyze_calendar_capacity

3. "Boka in tid för X"
   → Använd block_calendar_time

VIKTIGT: Om användaren INTE är inloggad på Microsoft, förklara att de behöver logga in i inställningar för att använda kalenderfunktioner.

VIKTIGA KALENDERFUNKTIONER:
- list_calendar_events: Visa vad som är bokat (ANVÄND ALLTID INNAN du bokar ny tid!)
- get_daily_overview: Se dagens schema + tasks (för att svara på "vad har jag idag?")
- analyze_calendar_capacity: Analysera lediga tider för längre projekt
- block_calendar_time: Boka fokustid i kalendern
- calculate_realistic_deadline: Beräkna realistisk deadline baserat på tillgänglig tid

WORKFLOW FÖR KALENDERBOKNING (VIKTIGT!):
1. ALLTID kolla befintliga bokningar med list_calendar_events INNAN du bokar ny tid
2. Om det finns konflikt - informera användaren och föreslå alternativ tid
3. Om det är klart - använd block_calendar_time
4. Bekräfta med formaterad output inklusive datum, tid och tasknamn

Exempel:
- User: "Boka in presentationen kl 14 imorgon"
- Du: [använder list_calendar_events för imorgon] → Ser möte 13-15
- Svar: "⚠️ Du har redan ett möte 13:00-15:00 imorgon. Vill du boka efter mötet, kl 15:00 istället?"

EXEMPEL PÅ SMART DEADLINE-FÖRSLAG:
- User: "Jag har ett uppdrag som tar 32 timmar, när kan jag leverera?"
- Du: [använder calculate_realistic_deadline med 32h]
- Svar: "Baserat på din kalender har du 45h ledigt de kommande 14 dagarna. Med 20% buffert för oväntade tasks kan du realistiskt leverera senast [datum]. Vill du att jag bokar in fokustid?"

PROJEKTHANTERING:
När användaren vill skapa ett projekt:
1. Extrahera: projektnamn, klient, timmar, timpris, övriga kostnader, deadline
2. Använd create_project tool
3. Bekräfta med: "Projekt skapat! Budget: [X] kr ([Y]h × [Z] kr/h + [Ö] kr övriga kostnader)"

Exempel:
- User: "Nytt projekt Wallenstam slutrapport, 40 timmar, 1950 per timme, 2000 i resor, deadline 1 december"
- Du: [använder create_project] "Projekt skapat! Budget: 80 000 kr (40h × 1 950 kr/h + 2 000 kr övriga kostnader)"

BEFINTLIGA TASKS:
${this.context.tasks.filter(t => t.status !== 'done').slice(0, 10).map(t =>
  `- ${t.title} (value: ${t.value_score || 5}, time: ${t.time_sensitivity || 5}) ${t.deadline ? `deadline: ${t.deadline}` : ''}`
).join('\n')}`;
  }

  private getTools(): any[] {
    return [
      {
        name: 'create_task',
        description: 'Skapa en ny task i Prio. Använd när användaren beskriver något de behöver göra.',
        input_schema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Kort titel på tasken'
            },
            description: {
              type: 'string',
              description: 'Detaljer (valfritt)'
            },
            value_score: {
              type: 'number',
              description: '1-10: Objektiva konsekvenser om det INTE görs. Använd 5 som default för inbox.',
              minimum: 1,
              maximum: 10,
            },
            time_sensitivity: {
              type: 'number',
              description: '1-10: Kostnad av att vänta 1h/1d (inte deadline!). Använd 5 som default för inbox.',
              minimum: 1,
              maximum: 10,
            },
            confidence: {
              type: 'number',
              description: '1-10: Säkerhet i bedömningen. Använd 5 som default för inbox.',
              minimum: 1,
              maximum: 10,
            },
            effort: {
              type: 'number',
              description: '1-10: Uppskattad ansträngning. Använd 5 som default för inbox.',
              minimum: 1,
              maximum: 10,
            },
            deadline: {
              type: 'string',
              description: 'ISO date (YYYY-MM-DD) eller datetime. Endast om användaren nämner specifik tid. Annars null.',
            },
            estimated_duration: {
              type: 'number',
              description: 'Uppskattad tid i minuter',
            },
          },
          required: ['title', 'value_score', 'time_sensitivity', 'confidence', 'effort'],
        },
      },
      {
        name: 'update_task',
        description: 'Uppdatera en befintlig task',
        input_schema: {
          type: 'object',
          properties: {
            task_id: { type: 'string' },
            changes: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['not_started', 'in_progress', 'done']
                },
                value_score: {
                  type: 'number',
                  description: '1-10: Objektiva konsekvenser om det INTE görs',
                  minimum: 1,
                  maximum: 10
                },
                time_sensitivity: {
                  type: 'number',
                  description: '1-10: Kostnad av att vänta',
                  minimum: 1,
                  maximum: 10
                },
                confidence: {
                  type: 'number',
                  description: '1-10: Säkerhet i bedömningen',
                  minimum: 1,
                  maximum: 10
                },
                effort: {
                  type: 'number',
                  description: '1-10: Uppskattad ansträngning',
                  minimum: 1,
                  maximum: 10
                },
                deadline: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                estimated_duration: { type: 'number' },
              },
            },
          },
          required: ['task_id', 'changes'],
        },
      },
      {
        name: 'analyze_priorities',
        description: 'Analysera användarens nuvarande prioriteringar och ge förslag',
        input_schema: {
          type: 'object',
          properties: {
            focus_area: {
              type: 'string',
              description: 'Område att fokusera på: work, personal, health, etc',
            },
          },
        },
      },
      {
        name: 'analyze_calendar_capacity',
        description: 'Analysera användarens kalender och hitta lediga tider för att kunna ge realistiska deadline-förslag',
        input_schema: {
          type: 'object',
          properties: {
            days_ahead: {
              type: 'number',
              description: 'Hur många dagar framåt att analysera (standard 14)',
              minimum: 1,
              maximum: 60,
            },
            min_slot_hours: {
              type: 'number',
              description: 'Minsta antal timmar per fokus-session (standard 1)',
              minimum: 0.5,
              maximum: 8,
            },
          },
        },
      },
      {
        name: 'calculate_realistic_deadline',
        description: 'Beräkna när en task verkligen kan bli klar baserat på tillgänglig tid i kalendern. ANVÄND DETTA när användaren frågar "när kan jag leverera X?" eller "när hinner jag klart?"',
        input_schema: {
          type: 'object',
          properties: {
            required_hours: {
              type: 'number',
              description: 'Antal timmar som krävs för att slutföra tasken',
              minimum: 0.5,
            },
            preferred_deadline: {
              type: 'string',
              description: 'Önskad deadline (ISO format). Valfritt - om null analyseras 30 dagar framåt',
            },
            buffer_percentage: {
              type: 'number',
              description: 'Buffert i procent för oväntade tasks (standard 20%)',
              minimum: 0,
              maximum: 50,
            },
          },
          required: ['required_hours'],
        },
      },
      {
        name: 'block_calendar_time',
        description: 'Blockera tid i användarens kalender för fokusarbete på en task',
        input_schema: {
          type: 'object',
          properties: {
            start_time: {
              type: 'string',
              description: 'Starttid (ISO datetime format)',
            },
            duration_minutes: {
              type: 'number',
              description: 'Längd på fokus-session i minuter',
              minimum: 15,
            },
            task_title: {
              type: 'string',
              description: 'Titel på tasken att fokusera på',
            },
          },
          required: ['start_time', 'duration_minutes', 'task_title'],
        },
      },
      {
        name: 'parse_natural_time',
        description: 'Konvertera naturliga tidsuttryck till ISO datetime. Använd detta för att tolka "kl 14", "imorgon", "på fredag", etc.',
        input_schema: {
          type: 'object',
          properties: {
            natural_expression: {
              type: 'string',
              description: 'Naturligt tidsuttryck från användaren (t.ex. "kl 14", "imorgon kl 10", "på fredag")',
            },
          },
          required: ['natural_expression'],
        },
      },
      {
        name: 'list_calendar_events',
        description: 'Visa användarens kalenderhändelser för ett datumintervall. ANVÄND DETTA INNAN du bokar ny tid för att undvika dubbelbokning!',
        input_schema: {
          type: 'object',
          properties: {
            start_date: {
              type: 'string',
              description: 'Startdatum (ISO format, t.ex. "2025-10-06")',
            },
            days_ahead: {
              type: 'number',
              description: 'Antal dagar framåt att visa (standard 1 för idag)',
              minimum: 1,
              maximum: 30,
            },
          },
          required: ['start_date'],
        },
      },
      {
        name: 'get_daily_overview',
        description: 'Ge en komplett översikt av dagens schema och tasks. Använd när användaren frågar "vad har jag idag?" eller "vad ska jag göra idag?"',
        input_schema: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Datum (ISO format, default: idag)',
            },
          },
        },
      },
      {
        name: 'create_project',
        description: 'Skapar ett nytt projekt baserat på användarens beskrivning. Extraherar automatiskt: projektnamn, klient, offererade timmar, timpris, övriga kostnader, deadline.',
        input_schema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Projektets namn',
            },
            client_name: {
              type: 'string',
              description: 'Kundens/beställarens namn',
            },
            quoted_hours: {
              type: 'number',
              description: 'Offererade timmar för projektet',
            },
            hourly_rate: {
              type: 'number',
              description: 'Timpris i kronor',
            },
            external_costs: {
              type: 'number',
              description: 'Övriga kostnader (resor, externa tjänster) i kronor',
            },
            project_deadline: {
              type: 'string',
              description: 'Projektets deadline i ISO-format (YYYY-MM-DD)',
            },
            description: {
              type: 'string',
              description: 'Valfri projektbeskrivning',
            },
          },
          required: ['name', 'quoted_hours', 'hourly_rate'],
        },
      },
    ];
  }

  private async executeTools(content: any[]): Promise<any> {
    const toolResults: any[] = [];

    for (const block of content) {
      if (block.type === 'tool_use') {
        let result;

        try {
          switch (block.name) {
            case 'create_task':
              result = await this.createTask(block.input as any);
              break;
            case 'update_task':
              result = await this.updateTask((block.input as any).task_id, (block.input as any).changes);
              break;
            case 'analyze_priorities':
              result = await this.analyzePriorities((block.input as any).focus_area);
              break;
            case 'analyze_calendar_capacity':
              result = await this.analyzeCalendarCapacity(
                (block.input as any).days_ahead,
                (block.input as any).min_slot_hours
              );
              break;
            case 'calculate_realistic_deadline':
              result = await this.calculateRealisticDeadline(
                (block.input as any).required_hours,
                (block.input as any).preferred_deadline,
                (block.input as any).buffer_percentage
              );
              break;
            case 'block_calendar_time':
              result = await this.blockCalendarTime(
                (block.input as any).start_time,
                (block.input as any).duration_minutes,
                (block.input as any).task_title
              );
              break;
            case 'parse_natural_time':
              result = this.parseNaturalTime((block.input as any).natural_expression);
              break;
            case 'list_calendar_events':
              result = await this.listCalendarEvents(
                (block.input as any).start_date,
                (block.input as any).days_ahead || 1
              );
              break;
            case 'get_daily_overview':
              result = await this.getDailyOverview((block.input as any).date);
              break;
            case 'create_project':
              result = await this.createProject(block.input as any);
              break;
            default:
              result = { error: 'Unknown tool' };
          }
        } catch (error) {
          result = { error: error instanceof Error ? error.message : 'Tool execution failed' };
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
    }

    return toolResults;
  }

  private async createTask(input: any) {
    if (!this.onTaskCreate) {
      return { error: 'Task creation not available' };
    }

    try {
      const task = await this.onTaskCreate(input);
      // Update local context
      this.context.tasks.push(task);
      return { success: true, task };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to create task' };
    }
  }

  private async updateTask(taskId: string, changes: any) {
    if (!this.onTaskUpdate) {
      return { error: 'Task update not available' };
    }

    try {
      const task = await this.onTaskUpdate(taskId, changes);
      // Update local context
      const index = this.context.tasks.findIndex(t => t.id === taskId);
      if (index !== -1) {
        this.context.tasks[index] = task;
      }
      return { success: true, task };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to update task' };
    }
  }

  private async analyzePriorities(focusArea?: string) {
    const activeTasks = this.context.tasks.filter(t => t.status !== 'done');
    const q1Tasks = activeTasks.filter(t => (t.value_score || t.importance || 5) >= 6 && (t.time_sensitivity || t.urgency || 5) >= 6);
    const q2Tasks = activeTasks.filter(t => (t.value_score || t.importance || 5) >= 6 && (t.time_sensitivity || t.urgency || 5) < 6);
    const overdueTasks = activeTasks.filter(t =>
      t.deadline && new Date(t.deadline) < new Date()
    );

    return {
      summary: {
        total_active: activeTasks.length,
        critical_q1: q1Tasks.length,
        important_q2: q2Tasks.length,
        overdue: overdueTasks.length,
      },
      recommendations: [
        q1Tasks.length > 0 ? 'Fokusera på Q1-tasks först' : null,
        overdueTasks.length > 0 ? `${overdueTasks.length} försenade tasks behöver uppmärksamhet` : null,
        q2Tasks.length > 5 ? 'Många Q2-tasks - överväg att schemalägga specifika tider' : null,
      ].filter(Boolean),
      focus_area: focusArea,
    };
  }

  updateContext(newContext: Partial<ConversationContext>) {
    this.context = { ...this.context, ...newContext };
  }

  getConversationHistory() {
    return this.conversationHistory;
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  private async analyzeCalendarCapacity(daysAhead: number = 14, minSlotHours: number = 1) {
    try {
      const { findFreeTimeSlots, isMicrosoftLoggedIn } = await import('./microsoft-graph');

      const isLoggedIn = await isMicrosoftLoggedIn();
      if (!isLoggedIn) {
        return {
          error: 'Användaren är inte inloggad på Microsoft. Be dem logga in i inställningar först.',
          requires_login: true,
        };
      }

      const now = new Date();
      const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      const freeSlots = await findFreeTimeSlots(now, endDate, minSlotHours * 60);
      const totalHours = freeSlots.reduce((sum, slot) => sum + slot.durationMinutes / 60, 0);

      return {
        total_free_hours: Math.round(totalHours * 10) / 10,
        free_slots_count: freeSlots.length,
        next_7_days_hours: Math.round(
          freeSlots
            .filter(slot => slot.start < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))
            .reduce((sum, slot) => sum + slot.durationMinutes / 60, 0) * 10
        ) / 10,
        summary: `${Math.round(totalHours)}h ledigt de kommande ${daysAhead} dagarna`,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte analysera kalender' };
    }
  }

  private async calculateRealisticDeadline(
    requiredHours: number,
    preferredDeadline?: string,
    bufferPercentage: number = 20
  ) {
    try {
      const { calculateRealisticDeadline, isMicrosoftLoggedIn } = await import('./microsoft-graph');

      const isLoggedIn = await isMicrosoftLoggedIn();
      if (!isLoggedIn) {
        return {
          error: 'Användaren är inte inloggad på Microsoft. Be dem logga in i inställningar först.',
          requires_login: true,
        };
      }

      const deadline = preferredDeadline ? new Date(preferredDeadline) : undefined;
      const analysis = await calculateRealisticDeadline(requiredHours, deadline, bufferPercentage);

      return {
        estimated_deadline: new Date(analysis.estimatedDeadline).toLocaleDateString('sv-SE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        total_available_hours: analysis.totalAvailableHours,
        required_hours: analysis.requiredHours,
        is_realistic: analysis.isRealistic,
        warning: analysis.warning,
        summary: analysis.isRealistic
          ? `✅ Realistiskt att hinna till ${new Date(analysis.estimatedDeadline).toLocaleDateString('sv-SE')}`
          : `⚠️ ${analysis.warning}`,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte beräkna deadline' };
    }
  }

  private async blockCalendarTime(startTime: string, durationMinutes: number, taskTitle: string) {
    try {
      const { blockCalendarTime, getCalendarEvents, isMicrosoftLoggedIn } = await import('./microsoft-graph');

      const isLoggedIn = await isMicrosoftLoggedIn();
      if (!isLoggedIn) {
        return {
          error: 'Användaren är inte inloggad på Microsoft. Be dem logga in i inställningar först.',
          requires_login: true,
        };
      }

      // ✨ NYTT: Kontrollera om tiden redan är bokad
      const start = new Date(startTime);
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      const existingEvents = await getCalendarEvents(start, end);

      if (existingEvents.length > 0) {
        return {
          warning: `⚠️ Det finns redan ${existingEvents.length} bokning(ar) under denna tid`,
          conflicts: existingEvents.map((e) => ({
            subject: e.subject,
            start: new Date(e.start).toLocaleString('sv-SE'),
            end: new Date(e.end).toLocaleString('sv-SE'),
          })),
          suggestion: 'Vill du ändå boka? (Då måste du bekräfta igen)',
        };
      }

      const success = await blockCalendarTime(start, durationMinutes, taskTitle);

      if (success) {
        const startFormatted = start.toLocaleDateString('sv-SE', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });
        const timeFormatted = start.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
        const endTimeFormatted = end.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        const durationFormatted = hours > 0 ? `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}` : `${minutes}min`;

        return {
          success: true,
          message: `✅ Jag har bokat fokustid:\n📅 Datum: ${startFormatted}\n⏰ Tid: ${timeFormatted}-${endTimeFormatted} (${durationFormatted})\n📌 Task: ${taskTitle}\n\nKontrollera gärna din kalender för att se att tiden passar!`,
        };
      } else {
        return { error: 'Kunde inte blockera tid i kalendern' };
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte blockera tid' };
    }
  }

  private parseNaturalTime(naturalExpression: string) {
    const parsed = parseNaturalDateTime(naturalExpression);

    if (parsed) {
      return {
        success: true,
        iso_datetime: parsed,
        formatted: new Date(parsed).toLocaleString('sv-SE', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
    } else {
      return {
        success: false,
        error: `Kunde inte tolka tidsuttrycket: "${naturalExpression}"`,
      };
    }
  }

  private async listCalendarEvents(startDate: string, daysAhead: number = 1) {
    try {
      const { getCalendarEvents, isMicrosoftLoggedIn } = await import('./microsoft-graph');

      const isLoggedIn = await isMicrosoftLoggedIn();
      if (!isLoggedIn) {
        return {
          error: 'Användaren är inte inloggad på Microsoft.',
          requires_login: true,
        };
      }

      const start = new Date(startDate);
      const end = new Date(start.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      const events = await getCalendarEvents(start, end);

      return {
        events: events.map((e) => ({
          subject: e.subject,
          start: new Date(e.start).toLocaleString('sv-SE'),
          end: new Date(e.end).toLocaleString('sv-SE'),
          isAllDay: e.isAllDay,
        })),
        summary: `${events.length} händelser mellan ${start.toLocaleDateString('sv-SE')} och ${end.toLocaleDateString('sv-SE')}`,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte hämta kalendern' };
    }
  }

  private async getDailyOverview(date?: string) {
    try {
      const targetDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Get calendar events for the day
      const { getCalendarEvents, isMicrosoftLoggedIn } = await import('./microsoft-graph');
      const isLoggedIn = await isMicrosoftLoggedIn();

      let calendarEvents: any[] = [];
      if (isLoggedIn) {
        calendarEvents = await getCalendarEvents(startOfDay, endOfDay);
      }

      // Get tasks for the day (tasks with deadline today or high priority)
      const tasksForToday = this.context.tasks.filter((t) => {
        if (t.status === 'done') return false;

        // Tasks with deadline today
        if (t.deadline) {
          const taskDeadline = new Date(t.deadline);
          return taskDeadline >= startOfDay && taskDeadline <= endOfDay;
        }

        // High priority tasks without deadline
        const priority = (t.value_score || 5) * (t.time_sensitivity || 5) * (t.confidence || 7) / (t.effort || 5);
        return priority > 30; // Include high priority tasks
      });

      return {
        date: targetDate.toLocaleDateString('sv-SE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        calendar_events: calendarEvents.map((e) => ({
          subject: e.subject,
          start: new Date(e.start).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
          end: new Date(e.end).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
        })),
        tasks_today: tasksForToday.map((t) => ({
          title: t.title,
          priority: Math.round((t.value_score || 5) * (t.time_sensitivity || 5) * (t.confidence || 7) / (t.effort || 5)),
          deadline: t.deadline ? new Date(t.deadline).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) : null,
          estimated_duration: t.estimated_duration ? `${Math.round(t.estimated_duration / 60)}h ${t.estimated_duration % 60}min` : null,
        })),
        summary: {
          total_events: calendarEvents.length,
          total_tasks: tasksForToday.length,
          calendar_login: isLoggedIn,
        },
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte hämta dagsöversikt' };
    }
  }

  private async createProject(input: any) {
    try {
      const { supabase } = await import('@/lib/supabase');

      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...input,
          user_id: this.context.userId,
          external_costs: input.external_costs || 0,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        project: data,
        message: `Projekt "${data.name}" skapat! Budget: ${data.total_budget.toLocaleString('sv-SE')} kr (${data.quoted_hours}h × ${data.hourly_rate} kr/h + ${data.external_costs} kr övriga kostnader)`,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte skapa projekt' };
    }
  }
}