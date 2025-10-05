import Anthropic from '@anthropic-ai/sdk';
import { Task, CreateTaskInput, UpdateTaskInput } from '@/lib/types';

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

export interface ConversationContext {
  tasks: Task[];
  calendarEvents: any[];
  recentFiles: any[];
  conversationHistory: Anthropic.MessageParam[];
}

export class ClaudeConversation {
  private context: ConversationContext;
  private conversationHistory: Anthropic.MessageParam[] = [];
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
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        system: this.buildSystemPrompt(),
        messages: this.conversationHistory,
        tools: this.getTools(),
      });

      // Hantera tool calls
      if (response.stop_reason === 'tool_use') {
        const toolResults = await this.executeTools(response.content);

        // Lägg till assistant response med tool calls
        this.conversationHistory.push({
          role: 'assistant',
          content: response.content,
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
      const textBlock = response.content.find(c => c.type === 'text');
      const assistantMessage = textBlock?.text || 'Förlåt, jag kunde inte generera ett svar.';

      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      console.error('Claude conversation error:', error);
      return 'Förlåt, jag hade problem att förstå det. Kan du försöka igen?';
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

1. KAN DU BEDÖMA DIREKT? (Skapa med värden)
   ✅ Tydlig deadline nämnd → Sätt deadline + rimlig time_sensitivity
   ✅ Tydlig prioritet ("viktigt", "akut", "snabbt") → Bedöm value_score
   ✅ Klar handling ("ringa X", "maila Y") → Bedöm effort + confidence

   Exempel:
   - "Kom ihåg att ringa Lisa imorgon kl 14"
     → deadline: imorgon 14:00, value_score: 7, time_sensitivity: 6, effort: 3
   - "Fixa presentationen innan mötet fredag"
     → deadline: fredag, value_score: 8, time_sensitivity: 8, effort: 6

2. FÖR OTYDLIGT? (Skapa som INBOX)
   ❌ Ingen deadline angiven OCH vag beskrivning
   ❌ Kräver research/beslut ("kolla", "undersök", "fundera på")
   ❌ Komplex/lång task utan tydlig plan

   → Använd DEFAULT-VÄRDEN:
   - value_score: 5
   - time_sensitivity: 5
   - confidence: 5
   - effort: 5
   - deadline: null

   Exempel:
   - "Kontrollera utbildningsmöjligheter under vintern"
     → Inbox med beskrivning, användaren bedömer senare
   - "Fundera på hur vi kan förbättra processen"
     → Inbox, för otydligt för direkt bedömning

SVARA ANVÄNDAREN:
- Direkt skapad: "Okej! Jag har lagt in '[task]' [med deadline X]"
- Inbox: "Jag har lagt det i din inbox för senare bedömning 📥"

KALENDER-INTEGRATION (MICROSOFT GRAPH):
När användaren frågar om deadlines baserat på tillgänglig tid:

1. "Når kan jag leverera X som tar Y timmar?"
   → Använd calculate_realistic_deadline med required_hours

2. "Hur mycket tid har jag kommande veckan?"
   → Använd analyze_calendar_capacity

3. "Boka in tid för X"
   → Använd block_calendar_time

VIKTIGT: Om användaren INTE är inloggad på Microsoft, förklara att de behöver logga in i inställningar för att använda kalenderfunktioner.

EXEMPEL PÅ SMART DEADLINE-FÖRSLAG:
- User: "Jag har ett uppdrag som tar 32 timmar, när kan jag leverera?"
- Du: [använder calculate_realistic_deadline med 32h]
- Svar: "Baserat på din kalender har du 45h ledigt de kommande 14 dagarna. Med 20% buffert för oväntade tasks kan du realistiskt leverera senast [datum]. Vill du att jag bokar in fokustid?"

BEFINTLIGA TASKS:
${this.context.tasks.filter(t => t.status !== 'done').slice(0, 10).map(t =>
  `- ${t.title} (value: ${t.value_score || 5}, time: ${t.time_sensitivity || 5}) ${t.deadline ? `deadline: ${t.deadline}` : ''}`
).join('\n')}`;
  }

  private getTools(): Anthropic.Tool[] {
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
    ];
  }

  private async executeTools(content: Anthropic.ContentBlock[]): Promise<Anthropic.MessageParam['content']> {
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

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
      const { blockCalendarTime, isMicrosoftLoggedIn } = await import('./microsoft-graph');

      const isLoggedIn = await isMicrosoftLoggedIn();
      if (!isLoggedIn) {
        return {
          error: 'Användaren är inte inloggad på Microsoft. Be dem logga in i inställningar först.',
          requires_login: true,
        };
      }

      const success = await blockCalendarTime(new Date(startTime), durationMinutes, taskTitle);

      if (success) {
        return {
          success: true,
          message: `✅ Blockerat ${durationMinutes} min i kalendern för "${taskTitle}"`,
          start: new Date(startTime).toLocaleString('sv-SE'),
        };
      } else {
        return { error: 'Kunde inte blockera tid i kalendern' };
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte blockera tid' };
    }
  }
}