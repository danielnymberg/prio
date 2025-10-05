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
                importance: {
                  type: 'number',
                  minimum: 1,
                  maximum: 10
                },
                urgency: {
                  type: 'number',
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
}