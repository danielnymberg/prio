import { Task, CreateTaskInput, UpdateTaskInput, Project } from '@/lib/types';
import { parseNaturalDateTime } from '@/lib/dateParser';
import { getDepartures, searchLocations } from './resrobot-api';
import { getWeatherSummary, formatWeatherSummary } from './smhi-api';
import { getSituations, getCommuteStatus, formatSituations } from './trafikverket-api';
import { nearbySearch, formatPlaces, filterByPreferences } from './google-places-api';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://prio-backend.onrender.com';

export interface ConversationContext {
  tasks: Task[];
  projects: Project[];
  calendarEvents: any[];
  recentFiles: any[];
  conversationHistory: any[];
  userId: string;
}

export interface UserPreferences {
  user_id: string;
  work_hours: {
    start: string;
    end: string;
    days: string[];
  };
  travel_patterns: {
    frequent_routes: string[];
    preferred_airline: string | null;
  };
  meeting_preferences: {
    buffer_before: number;
    buffer_after: number;
    max_per_day: number;
  };
  communication_style: string;
  custom_context: string | null;
}

export class ClaudeConversation {
  private context: ConversationContext;
  private conversationHistory: any[] = [];
  private cachedPreferences: UserPreferences | null = null;
  private onTaskCreate?: (input: CreateTaskInput) => Promise<Task>;
  private onTaskUpdate?: (id: string, input: UpdateTaskInput) => Promise<Task>;
  private onTaskDelete?: (id: string) => Promise<boolean>;

  constructor(
    initialContext: Partial<ConversationContext>,
    callbacks?: {
      onTaskCreate?: (input: CreateTaskInput) => Promise<Task>;
      onTaskUpdate?: (id: string, input: UpdateTaskInput) => Promise<Task>;
      onTaskDelete?: (id: string) => Promise<boolean>;
    }
  ) {
    this.context = {
      tasks: initialContext.tasks || [],
      projects: initialContext.projects || [],
      calendarEvents: initialContext.calendarEvents || [],
      recentFiles: initialContext.recentFiles || [],
      conversationHistory: initialContext.conversationHistory || [],
      userId: initialContext.userId || '',
    };

    this.onTaskCreate = callbacks?.onTaskCreate;
    this.onTaskUpdate = callbacks?.onTaskUpdate;
    this.onTaskDelete = callbacks?.onTaskDelete;
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

  /**
   * STREAMING chat - för voice assistant med incremental TTS
   * @param userMessage User's message (tom string = continuation från tool results)
   * @param onChunk Callback för varje text-chunk (för incremental TTS)
   * @returns Full response text
   */
  async chatStreaming(
    userMessage: string,
    onChunk: (text: string) => void
  ): Promise<string> {
    // Lägg till user message (om inte tom = continuation)
    if (userMessage.trim()) {
      this.conversationHistory.push({
        role: 'user',
        content: userMessage,
      });
    }

    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const lastUserMessage = this.conversationHistory[this.conversationHistory.length - 1];
      const userText = typeof lastUserMessage?.content === 'string' ? lastUserMessage.content : '';
      const selectedModel = this.selectModel(userText);

      // Fetch with streaming
      const response = await fetch(`${BACKEND_URL}/api/claude-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: this.conversationHistory,
          system: await this.buildSystemPromptCacheable(),
          tools: this.getTools(),
          max_tokens: 2000,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error(`Stream failed: ${response.status}`);
      }

      // Read SSE stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let buffer = '';
      let finalMessage: any = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'text') {
                fullResponse += data.text;
                onChunk(data.text); // ✅ Skicka chunk till TTS!
              } else if (data.type === 'message') {
                // Spara final message (kan innehålla tool calls!)
                finalMessage = data.message;
              } else if (data.type === 'error') {
                throw new Error(data.error);
              } else if (data.type === 'done') {
                // Stream complete
                break;
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }

      // KRITISKT: Hantera tool calls om de finns!
      if (finalMessage && finalMessage.stop_reason === 'tool_use') {
        console.log('🔧 Tool use detected in streaming, executing tools...');

        // Exekvera tools
        const toolResults = await this.executeTools(finalMessage.content);

        // Lägg till assistant response med tool calls
        this.conversationHistory.push({
          role: 'assistant',
          content: finalMessage.content,
        });

        // Lägg till tool results
        this.conversationHistory.push({
          role: 'user',
          content: toolResults,
        });

        // Rekursivt anrop för att få final response EFTER tool execution
        return this.chatStreaming('', onChunk); // Tom string = continuation
      }

      // Add to conversation history (normal text response)
      this.conversationHistory.push({
        role: 'assistant',
        content: fullResponse,
      });

      return fullResponse;

    } catch (error) {
      console.error('Streaming chat error:', error);
      throw error;
    }
  }

  private async getContinuationResponse(): Promise<string> {
    try {
      // Hämta Supabase session token
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // Intelligent model selection baserat på query-typ
      const lastUserMessage = this.conversationHistory[this.conversationHistory.length - 1];
      const userText = typeof lastUserMessage?.content === 'string'
        ? lastUserMessage.content
        : '';
      const selectedModel = this.selectModel(userText);

      // Anropa backend med auth token
      const response = await fetch(`${BACKEND_URL}/api/claude-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: this.conversationHistory,
          system: await this.buildSystemPromptCacheable(), // Array med cache_control för 90% besparing!
          tools: this.getTools(),
          max_tokens: 2000,
          model: selectedModel, // Haiku (90%) eller Sonnet (10%)
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

  /**
   * Intelligent model selection: Haiku 4.5 (90%) vs Sonnet 4.5 (10%)
   *
   * Haiku: Snabbare (2x), billigare (67%), bra för quick queries
   * Sonnet: Smartare, för komplex planering och djup analys
   */
  private async getPreferences(): Promise<UserPreferences | null> {
    // 1. In-memory cache (0ms)
    if (this.cachedPreferences) {
      console.log('✅ Preferences from memory cache');
      return this.cachedPreferences;
    }

    try {
      // 2. Fetch from backend (which checks Redis, then Supabase)
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log('❌ No session - skipping preferences');
        return null;
      }

      console.log('⏳ Fetching preferences from backend...');
      const response = await fetch(`${BACKEND_URL}/api/preferences`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch preferences:', response.statusText);
        return null;
      }

      const result = await response.json();

      if (result.success && result.preferences) {
        this.cachedPreferences = result.preferences;
        console.log(`✅ Preferences loaded (from ${result.from_cache ? 'Redis cache' : 'Supabase'})`);
        return this.cachedPreferences;
      }

      return null;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      return null;
    }
  }

  private selectModel(userMessage: string): string {
    const q = userMessage.toLowerCase();

    // SONNET keywords - komplex reasoning
    const sonnetKeywords = [
      'planera',      // Planering (vecka, månad, etc)
      'analysera',    // Analys av projekt, tasks
      'optimera',     // Optimering
      'granska',      // Granskning
      'jämför',       // Jämförelser
      'utvärdera',    // Utvärdering
      'leta',         // Sökning (oavsett vad)
      'sök',          // Sökning (oavsett vad)
      'hitta',        // Sökning (oavsett vad)
      'finn',         // Sökning (oavsett vad)
    ];

    const needsSonnet = sonnetKeywords.some(keyword => q.includes(keyword));

    if (needsSonnet) {
      console.log('🧠 Sonnet 4.5 -', userMessage);
      return 'claude-sonnet-4-20250514';
    }

    // HAIKU default - enkla queries, snabba svar
    console.log('⚡ Haiku 4.5 -', userMessage);
    return 'claude-haiku-4-5';
  }

  private async buildSystemPromptCacheable(): Promise<any[]> {
    const systemText = await this.buildSystemPrompt();

    // Split system prompt into cacheable parts
    // Static instructions (samma för alla samtal) - cacheas
    const staticInstructions = systemText.split('BEFINTLIGA UPPGIFTER:')[0];

    // Dynamic context (ändras per samtal) - cacheas INTE
    const dynamicContext = 'BEFINTLIGA UPPGIFTER:' + systemText.split('BEFINTLIGA UPPGIFTER:')[1];

    return [
      {
        type: 'text',
        text: staticInstructions.trim(),
        cache_control: { type: 'ephemeral' } // 5 min cache, 90% billigare!
      },
      {
        type: 'text',
        text: dynamicContext.trim()
      }
    ];
  }

  private async buildSystemPrompt(): Promise<string> {
    const now = new Date();

    // Korrekt svensk tid med Intl API (undviker toLocaleString bug)
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Stockholm',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')!.value;
    const month = parts.find(p => p.type === 'month')!.value;
    const day = parts.find(p => p.type === 'day')!.value;
    const hour = parseInt(parts.find(p => p.type === 'hour')!.value);
    const minute = parts.find(p => p.type === 'minute')!.value;

    const today = `${year}-${month}-${day}`;
    const currentTime = `${hour.toString().padStart(2, '0')}:${minute}`;

    // Beräkna veckodag direkt med Intl (säkrare än Date-objekt med timezone)
    const weekday = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Stockholm',
      weekday: 'long'
    }).format(now);

    // Beräkna tid på dygnet
    let timeOfDay = '';
    if (hour >= 6 && hour < 12) timeOfDay = 'morgon';
    else if (hour >= 12 && hour < 18) timeOfDay = 'eftermiddag';
    else if (hour >= 18 && hour < 22) timeOfDay = 'kväll';
    else timeOfDay = 'natt';

    // Hämta user preferences
    const prefs = await this.getPreferences();

    // Bygg preferences section
    let prefsSection = '';
    if (prefs) {
      prefsSection = `

ANVÄNDARENS PREFERENSER:
${prefs.custom_context || 'Inga anpassade preferenser ännu'}

Arbetstider: ${prefs.work_hours.start}-${prefs.work_hours.end} (${prefs.work_hours.days.join(', ')})
Resvanor: ${prefs.travel_patterns.frequent_routes.join(', ') || 'Inga frekventa rutter'}
Föredraget flygbolag: ${prefs.travel_patterns.preferred_airline || 'Inget föredraget'}
Kommunikationsstil: ${prefs.communication_style}
Mötespreferenser: ${prefs.meeting_preferences.buffer_before} min buffert före möten, max ${prefs.meeting_preferences.max_per_day} möten/dag`;
    }

    return `Svensk AI-assistent i Prio (CPM prioritering).

DATUM/TID: ${today} (${weekday}) ${currentTime} (${timeOfDay})
${prefsSection}

KONTEXT:
${JSON.stringify({
  aktivaTasks: this.context.tasks.filter(t => t.status !== 'done').length,
  försenade: this.context.tasks.filter(t => t.deadline && new Date(t.deadline) < new Date()).length,
  inbox: this.context.tasks.filter(t => t.status === 'not_started' && !t.deadline && t.value_score === 8).length,
  oplanerade: this.context.tasks.filter(t => t.status !== 'done' && !t.deadline).length,
  aktivaProjekt: this.context.projects.filter(p => p.status === 'active').length,
  totalProjektBudget: this.context.projects.reduce((sum, p) => sum + (p.total_budget || 0), 0).toLocaleString('sv-SE') + ' kr',
  dagensKalender: this.context.calendarEvents.map(e => ({
    subject: e.subject,
    start: e.start,
    end: e.end,
    isAllDay: e.isAllDay
  })),
}, null, 2)}

BEGREPP:
• INKORG: value:8, time_sens:5, inget slutdatum
• SNABBIS: ≤2min
• OPLANERADE: Inget slutdatum
• SCHEMALAGDA: Med slutdatum/tid

USER:
• Hem: S:t Hansgatan, Visby | Kontor: Tutviksvägen 33, Haninge
• Pendlar Visby↔Stockholm
• Använd get_current_location före transport

TON (kompis, ej assistent):
• Casual: "grejer", "fixar", "typ", "kör du?"
• Kort fråga = 1-2 meningar MAX
• ALDRIG upprepa/förklara uppenbara saker
• Tal: Klockslag/antal >4 som siffror, ≤4 som ord
• Markdown: [Text](URL), **bold** för tider/datum
• Röst: Max 100 ord, inga emojis/listor/rubriker

ERROR:
• tool_result med 'error' → meddela (aldrig gissa/tekniska detaljer)
• Lista fel i slutet: [API-FEL: Trafikverket - timeout]

CPM: (Value × TimeSensitivity × Confidence) / Effort

REGLER:
• parse_natural_time för "kl 14", "imorgon"
• Otydligt → INKORG (val:8, time:5, conf:8, eff:5)
• ≥60min → föreslå kalenderbokning
• list_calendar_events innan bokning
• Mejl: synonym-mapping, progressiv sökning 150→300→500→1000

TASKS (top 20):
${this.context.tasks
  .filter(t => t.status !== 'done')
  .sort((a, b) => {
    if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
    if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
    const aPrio = ((a.value_score || 5) * (a.time_sensitivity || 5) * (a.confidence || 5)) / (a.effort || 5);
    const bPrio = ((b.value_score || 5) * (b.time_sensitivity || 5) * (b.confidence || 5)) / (b.effort || 5);
    return bPrio - aPrio;
  })
  .slice(0, 20)
  .map(t => {
    const dur = t.estimated_duration ? `${Math.floor(t.estimated_duration / 60)}h` : `e:${t.effort || 5}`;
    const dl = t.deadline ? new Date(t.deadline).toLocaleString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
    return `${t.id}:${t.title}(${dur},${dl},v:${t.value_score || 5})`;
  }).join('\n')}`;
  }

  private getTools(): any[] {
    const tools = [
      {
        name: 'create_task',
        description: 'Skapa en ny uppgift i Prio. Använd när användaren beskriver något de behöver göra.',
        input_schema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Kort titel på uppgiften'
            },
            description: {
              type: 'string',
              description: 'Detaljer (valfritt)'
            },
            value_score: {
              type: 'number',
              description: '1-10: Objektiva konsekvenser om det INTE görs. Använd 8 som default för inkorg.',
              minimum: 1,
              maximum: 10,
            },
            time_sensitivity: {
              type: 'number',
              description: '1-10: Kostnad av att vänta 1h/1d (inte slutdatum!). Använd 5 som default för inkorg.',
              minimum: 1,
              maximum: 10,
            },
            confidence: {
              type: 'number',
              description: '1-10: Säkerhet i bedömningen. Använd 8 som default för inkorg.',
              minimum: 1,
              maximum: 10,
            },
            effort: {
              type: 'number',
              description: '1-10: Uppskattad ansträngning. Använd 5 som default för inkorg.',
              minimum: 1,
              maximum: 10,
            },
            deadline: {
              type: 'string',
              description: 'ISO date (YYYY-MM-DD) eller datetime. Endast om användaren nämner specifik tid. Annars null.',
            },
            priority_flag: {
              type: 'string',
              enum: ['asap', 'whenever', 'someday'],
              description: 'För uppgifter utan slutdatum: asap (gör snart! +50% prio), whenever (när det passar), someday (uppsamling -30%). Används INTE om slutdatum finns.',
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
        description: 'Uppdatera en befintlig uppgift. VIKTIGT: Använd uppgifts-ID från listan BEFINTLIGA UPPGIFTER, inte uppgiftstiteln!',
        input_schema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'UUID för uppgiften (finns i [ID: ...] i BEFINTLIGA UPPGIFTER-listan)'
            },
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
        name: 'delete_task',
        description: 'Ta bort en uppgift permanent. VIKTIGT: Använd uppgifts-ID från listan BEFINTLIGA UPPGIFTER, inte uppgiftstiteln!',
        input_schema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'UUID för uppgiften att radera (finns i [ID: ...] i BEFINTLIGA UPPGIFTER-listan)'
            },
          },
          required: ['task_id'],
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
        description: 'Beräkna när en uppgift verkligen kan bli klar baserat på tillgänglig tid i kalendern. ANVÄND DETTA när användaren frågar "när kan jag leverera X?" eller "när hinner jag klart?"',
        input_schema: {
          type: 'object',
          properties: {
            required_hours: {
              type: 'number',
              description: 'Antal timmar som krävs för att slutföra uppgiften',
              minimum: 0.5,
            },
            preferred_deadline: {
              type: 'string',
              description: 'Önskat slutdatum (ISO format). Valfritt - om null analyseras 30 dagar framåt',
            },
            buffer_percentage: {
              type: 'number',
              description: 'Buffert i procent för oväntade uppgifter (standard 20%)',
              minimum: 0,
              maximum: 50,
            },
          },
          required: ['required_hours'],
        },
      },
      {
        name: 'block_calendar_time',
        description: 'Blockera tid i användarens kalender för fokusarbete på en uppgift',
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
              description: 'Titel på uppgiften att fokusera på',
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
        description: 'Ge en komplett översikt av dagens schema och uppgifter. Använd när användaren frågar "vad har jag idag?" eller "vad ska jag göra idag?"',
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
      {
        name: 'list_projects',
        description: 'Lista användarens projekt. Använd detta för att se befintliga projekt, söka efter projekt, eller svara på frågor om projekt.',
        input_schema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['active', 'completed', 'archived', 'all'],
              description: 'Filtrera på projektstatus (default: active)',
            },
            search: {
              type: 'string',
              description: 'Sök efter projektnamn eller klientnamn',
            },
          },
        },
      },
      {
        name: 'get_project',
        description: 'Hämta detaljerad information om ett specifikt projekt.',
        input_schema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'ID på projektet att hämta',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'update_project',
        description: 'Uppdatera ett befintligt projekt (t.ex. ändra färdigställandegrad, status, deadline).',
        input_schema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'ID på projektet att uppdatera',
            },
            changes: {
              type: 'object',
              properties: {
                completion_percentage: {
                  type: 'number',
                  description: 'Färdigställandegrad 0-100%',
                  minimum: 0,
                  maximum: 100,
                },
                status: {
                  type: 'string',
                  enum: ['active', 'completed', 'archived'],
                  description: 'Projektstatus',
                },
                project_deadline: {
                  type: 'string',
                  description: 'Ny deadline i ISO-format',
                },
              },
            },
          },
          required: ['project_id', 'changes'],
        },
      },
      {
        name: 'process_unread_emails',
        description: 'Hämta olästa mejl och skapa uppgifter (Snabbis) automatiskt. Grupperar mejl efter avsändare/ämne och skapar en uppgift per mejl eller grupp.',
        input_schema: {
          type: 'object',
          properties: {
            max_emails: {
              type: 'number',
              description: 'Max antal mejl att hämta (standard 50)',
              minimum: 1,
              maximum: 100,
            },
            group_by: {
              type: 'string',
              enum: ['none', 'sender', 'subject_keyword'],
              description: 'Gruppering: none (en uppgift per mejl), sender (gruppera per avsändare), subject_keyword (gruppera liknande ämnen)',
            },
            auto_mark_read: {
              type: 'boolean',
              description: 'Markera mejl som lästa efter att uppgift skapats (standard false)',
            },
          },
        },
      },
      {
        name: 'list_unread_emails',
        description: 'Visa olästa mejl utan att skapa uppgifter. Använd detta för att ge användaren en överblick innan de beslutar vad som ska göras.',
        input_schema: {
          type: 'object',
          properties: {
            max_count: {
              type: 'number',
              description: 'Max antal mejl att visa (standard 20)',
              minimum: 1,
              maximum: 100,
            },
          },
        },
      },
      {
        name: 'list_all_emails',
        description: 'Lista ALLA mejl (både lästa och olästa). Använd när användaren vill se alla mejl eller leta efter något äldre mejl.',
        input_schema: {
          type: 'object',
          properties: {
            max_count: {
              type: 'number',
              description: 'Max antal mejl att visa (standard 50)',
              minimum: 1,
              maximum: 100,
            },
            include_read: {
              type: 'boolean',
              description: 'Inkludera lästa mejl (standard true)',
            },
          },
        },
      },
      {
        name: 'search_emails',
        description: 'Sök mejl efter avsändare, ämne eller båda. Använd när användaren vill hitta specifika mejl.',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Sökord (namn, företag, eller ämne)',
            },
            search_in: {
              type: 'string',
              enum: ['sender', 'subject', 'both'],
              description: 'Var att söka (standard: both)',
            },
            max_count: {
              type: 'number',
              description: 'Max antal resultat (standard 20)',
              minimum: 1,
              maximum: 50,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_email_content',
        description: 'Hämta fullständigt innehåll från ett mejl. Använd när användaren vill läsa hela mejlet (inte bara preview).',
        input_schema: {
          type: 'object',
          properties: {
            email_id: {
              type: 'string',
              description: 'ID på mejlet (från list_unread_emails, list_all_emails, eller search_emails)',
            },
          },
          required: ['email_id'],
        },
      },
      {
        name: 'create_email_draft',
        description: 'Skapa ett mejlutkast i Outlook. Användaren kan sedan granska och skicka det manuellt. Använd när användaren ber om att skriva/förbereda ett mejl.',
        input_schema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'Mottagarens e-postadress',
            },
            subject: {
              type: 'string',
              description: 'Mejlets ämnesrad',
            },
            body: {
              type: 'string',
              description: 'Mejlets innehåll (HTML eller plain text)',
            },
          },
          required: ['to', 'subject', 'body'],
        },
      },
      {
        name: 'update_calendar_event',
        description: 'Flytta eller ändra ett befintligt möte i kalendern. Använd när användaren vill flytta möte, ändra titel, eller uppdatera detaljer.',
        input_schema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'ID på kalenderhändelsen (från list_calendar_events)',
            },
            updates: {
              type: 'object',
              properties: {
                subject: {
                  type: 'string',
                  description: 'Ny titel på mötet',
                },
                start_time: {
                  type: 'string',
                  description: 'Ny starttid (ISO datetime)',
                },
                end_time: {
                  type: 'string',
                  description: 'Ny sluttid (ISO datetime)',
                },
                body: {
                  type: 'string',
                  description: 'Uppdaterad beskrivning',
                },
              },
            },
          },
          required: ['event_id', 'updates'],
        },
      },
      {
        name: 'delete_calendar_event',
        description: 'Ta bort ett möte från kalendern. ANVÄND MED FÖRSIKTIGHET - fråga användaren först!',
        input_schema: {
          type: 'object',
          properties: {
            event_id: {
              type: 'string',
              description: 'ID på kalenderhändelsen att radera (från list_calendar_events)',
            },
          },
          required: ['event_id'],
        },
      },
      {
        name: 'plan_work_sessions',
        description: 'Planera in arbetssessioner för ett projekt över flera dagar. Använd när användaren vill boka flera fokustider för längre projekt.',
        input_schema: {
          type: 'object',
          properties: {
            total_hours: {
              type: 'number',
              description: 'Totalt antal timmar att planera in',
              minimum: 1,
            },
            task_title: {
              type: 'string',
              description: 'Titel på uppgiften/projektet',
            },
            days_ahead: {
              type: 'number',
              description: 'Planera in inom X dagar (standard 7)',
              minimum: 1,
              maximum: 30,
            },
            preferred_duration: {
              type: 'number',
              description: 'Önskad längd per session i minuter (standard 120)',
              minimum: 30,
            },
          },
          required: ['total_hours', 'task_title'],
        },
      },
      {
        name: 'mark_email_read',
        description: 'Markera ett specifikt mejl som läst. Använd när användaren vill markera mejl manuellt.',
        input_schema: {
          type: 'object',
          properties: {
            email_id: {
              type: 'string',
              description: 'ID på mejlet (från list_unread_emails)',
            },
          },
          required: ['email_id'],
        },
      },
      {
        name: 'search_contact',
        description: 'Sök kontakt i användarens kontaktbok. Använd när användaren vill ringa/maila någon och behöver kontaktinfo.',
        input_schema: {
          type: 'object',
          properties: {
            search_query: {
              type: 'string',
              description: 'Namn på person eller företag att söka efter',
            },
          },
          required: ['search_query'],
        },
      },
      {
        name: 'get_contact_info',
        description: 'Hämta detaljerad info om en specifik kontakt (mail, telefon, adress, födelsedag).',
        input_schema: {
          type: 'object',
          properties: {
            contact_id: {
              type: 'string',
              description: 'ID på kontakten (från search_contact)',
            },
          },
          required: ['contact_id'],
        },
      },
      {
        name: 'search_departures',
        description: 'Sök avgångar för tåg, bussar, och färjor i hela Sverige (ResRobot API). Använd när användaren frågar "när går tåget/färjan" eller liknande.',
        input_schema: {
          type: 'object',
          properties: {
            station_name: {
              type: 'string',
              description: 'Sök station med namn. Exempel: "Visby", "Nynäshamn", "Stockholm Central"',
            },
            station_id: {
              type: 'string',
              description: 'Station ID (om känt). Används direkt istället för station_name.',
            },
            max_journeys: {
              type: 'number',
              description: 'Max antal avgångar att hämta (default: 10)',
            },
            date: {
              type: 'string',
              description: 'Datum för avgångar (YYYY-MM-DD). Default: idag',
            },
            time: {
              type: 'string',
              description: 'Tid för avgångar (HH:MM). Default: nu',
            },
          },
        },
      },
      {
        name: 'search_station',
        description: 'Hitta stationer/hållplatser i Sverige (tåg, buss, färja). Använd för att hitta station-ID eller verifiera stationsnamn.',
        input_schema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Sök efter station. Exempel: "Nynäshamn hamn", "Visby färjeterminal"',
            },
            max_results: {
              type: 'number',
              description: 'Max antal resultat (default: 10)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'plan_public_transit_trip',
        description: 'Planera kollektivtrafikresa A→B i Sverige (tåg, buss, färja) med ResRobot. Ger kompletta resor med byten, avgångar och restid.',
        input_schema: {
          type: 'object',
          properties: {
            origin_name: {
              type: 'string',
              description: 'Från station (namn). Exempel: "Stockholm Central", "Visby"',
            },
            destination_name: {
              type: 'string',
              description: 'Till station (namn). Exempel: "Göteborg Central", "Nynäshamn hamn"',
            },
            date: {
              type: 'string',
              description: 'Resedatum (YYYY-MM-DD). Default: idag',
            },
            time: {
              type: 'string',
              description: 'Resetid (HH:MM). Default: nu',
            },
            search_for_arrival: {
              type: 'boolean',
              description: 'Sök för ankomsttid istället för avgång (default: false)',
            },
          },
          required: ['origin_name', 'destination_name'],
        },
      },
      {
        name: 'get_current_location',
        description: 'Hämta användarens aktuella position (stad). ANVÄND INNAN transportfrågor! Kombinerar GPS + kalender för smart positionsbestämning.',
        input_schema: {
          type: 'object',
          properties: {
            time_context: {
              type: 'string',
              description: 'Tidskontext för frågan: "now" (nu/snart), "tonight" (ikväll), "tomorrow" (imorgon), "later" (framtid)',
              enum: ['now', 'tonight', 'tomorrow', 'later'],
            },
          },
        },
      },
      {
        name: 'get_weather_forecast',
        description: 'Hämta väderprognos från SMHI för en specifik plats. Returnerar temperatur, regn, vind, molnighet. Använd INNAN reserekommendationer (påverkar transportval).',
        input_schema: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitud (ex: 59.2419 för Tyresö, 59.3293 för Stockholm C)',
            },
            longitude: {
              type: 'number',
              description: 'Longitud (ex: 18.2558 för Tyresö, 18.0686 för Stockholm C)',
            },
            location_name: {
              type: 'string',
              description: 'Platsnamn för användarvänlig output (ex: "Tyresö", "Stockholm")',
            },
          },
          required: ['latitude', 'longitude'],
        },
      },
      {
        name: 'get_traffic_situation',
        description: 'Hämta trafiksituation från Trafikverket (olyckor, vägarbete, köer). Använd INNAN bilresa-rekommendationer för Stockholm-området.',
        input_schema: {
          type: 'object',
          properties: {
            roads: {
              type: 'array',
              items: { type: 'string' },
              description: 'Vägnummer att kolla (ex: ["E4", "222", "73"]). Vanliga Stockholm-vägar: E4, 222 (Värmdöleden), 73 (Nynäsvägen)',
            },
            check_commute: {
              type: 'boolean',
              description: 'Om true, kollar standardrutt Tyresö-Stockholm (E4, Värmdöleden, Nynäsvägen)',
            },
          },
        },
      },
      {
        name: 'find_nearby_places',
        description: 'Hitta restauranger, caféer, butiker nära en plats (Google Places). Använd för mat/shopping-rekommendationer.',
        input_schema: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitud för sökning (ex: 59.3293 för Stockholm C)',
            },
            longitude: {
              type: 'number',
              description: 'Longitud för sökning (ex: 18.0686 för Stockholm C)',
            },
            radius: {
              type: 'number',
              description: 'Sökradie i meter (max 50000). Standard: 1000m för lunch, 500m för kaffe',
            },
            type: {
              type: 'string',
              description: 'Platstyp: "restaurant", "cafe", "grocery_store", "pharmacy", "atm", etc',
            },
            keyword: {
              type: 'string',
              description: 'Sökord (ex: "vegetarian", "pizza", "sushi")',
            },
            open_now: {
              type: 'boolean',
              description: 'Endast öppna platser nu',
            },
            exclude_keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Exkludera platser med dessa ord (ex: ["sushi", "shellfish"] för skaldjursallergiker)',
            },
            max_price: {
              type: 'number',
              description: 'Max prisnivå (0-4, där 0=gratis, 4=mycket dyrt)',
            },
          },
          required: ['latitude', 'longitude'],
        },
      },
      // Multi-modal route planning (Google Routes API)
      {
        name: 'get_directions',
        description: 'Planera resa A→B med olika färdmedel (bil, cykel, gång, kollektivtrafik). Jämför restid och avstånd. Använd för "hur tar jag mig till X" frågor.',
        input_schema: {
          type: 'object',
          properties: {
            origin_lat: {
              type: 'number',
              description: 'Startpunkt latitud',
            },
            origin_lng: {
              type: 'number',
              description: 'Startpunkt longitud',
            },
            destination_lat: {
              type: 'number',
              description: 'Destination latitud',
            },
            destination_lng: {
              type: 'number',
              description: 'Destination longitud',
            },
            modes: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['DRIVE', 'BICYCLE', 'WALK', 'TRANSIT'],
              },
              description: 'Färdmedel att jämföra (default: [BICYCLE, WALK, TRANSIT])',
            },
          },
          required: ['origin_lat', 'origin_lng', 'destination_lat', 'destination_lng'],
        },
      },
      // Anthropic Web Search (built-in tool)
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 5,
      },
    ];

    console.log(`🛠️ Loaded ${tools.length} tools:`, tools.map(t => t.name).join(', '));
    return tools;
  }

  private isSpam(email: any): boolean {
    const spamKeywords = [
      'unsubscribe', 'avregistrera', 'newsletter', 'nyhetsbrev',
      'marknadsföring', 'erbjudande', 'kampanj', 'rabatt',
      'prenumerera', 'marketing', 'sale', 'deal', 'offer'
    ];

    const spamSenders = [
      'noreply@', 'no-reply@', 'newsletter@', 'marketing@',
      'info@', 'support@', 'promo@', 'promotions@'
    ];

    // Check subject
    const subjectHasSpam = spamKeywords.some(kw =>
      email.subject?.toLowerCase().includes(kw)
    );

    // Check sender
    const senderEmail = email.from?.emailAddress?.address?.toLowerCase() || '';
    const senderIsSpam = spamSenders.some(sender =>
      senderEmail.includes(sender)
    );

    // MS Graph categories
    const categoryIsSpam = email.categories?.includes('Promotions') ||
                           email.categories?.includes('Newsletter') ||
                           email.categories?.includes('Marketing');

    return subjectHasSpam || senderIsSpam || categoryIsSpam;
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
            case 'delete_task':
              result = await this.deleteTask((block.input as any).task_id);
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
            case 'list_projects':
              result = await this.listProjects(
                (block.input as any).status,
                (block.input as any).search
              );
              break;
            case 'get_project':
              result = await this.getProject((block.input as any).project_id);
              break;
            case 'update_project':
              result = await this.updateProject(
                (block.input as any).project_id,
                (block.input as any).changes
              );
              break;
            case 'process_unread_emails':
              result = await this.processUnreadEmails(
                (block.input as any).max_emails,
                (block.input as any).group_by,
                (block.input as any).auto_mark_read
              );
              break;
            case 'list_unread_emails': {
              const rawResult = await this.listUnreadEmails((block.input as any).max_count);

              // Kolla om det är ett success response med emails
              if ('emails' in rawResult && Array.isArray(rawResult.emails)) {
                const filtered = rawResult.emails.filter((e: any) => !this.isSpam(e));
                const spamCount = rawResult.emails.length - filtered.length;

                result = {
                  ...rawResult,
                  emails: filtered,
                  count: filtered.length,
                  _spam_filtered: spamCount
                };
              } else {
                result = rawResult; // Error response, returnera som är
              }
              break;
            }
            case 'list_all_emails': {
              const rawResult = await this.listAllEmails((block.input as any).max_count, (block.input as any).include_read);

              if ('emails' in rawResult && Array.isArray(rawResult.emails)) {
                const filtered = rawResult.emails.filter((e: any) => !this.isSpam(e));
                const spamCount = rawResult.emails.length - filtered.length;

                result = {
                  ...rawResult,
                  emails: filtered,
                  count: filtered.length,
                  _spam_filtered: spamCount
                };
              } else {
                result = rawResult;
              }
              break;
            }
            case 'search_emails': {
              const rawResult = await this.searchEmails(
                (block.input as any).query,
                (block.input as any).search_in,
                (block.input as any).max_count
              );

              if ('emails' in rawResult && Array.isArray(rawResult.emails)) {
                const filtered = rawResult.emails.filter((e: any) => !this.isSpam(e));
                const spamCount = rawResult.emails.length - filtered.length;

                result = {
                  ...rawResult,
                  emails: filtered,
                  count: filtered.length,
                  _spam_filtered: spamCount
                };
              } else {
                result = rawResult;
              }
              break;
            }
            case 'get_email_content':
              result = await this.getEmailContent((block.input as any).email_id);
              break;
            case 'create_email_draft':
              result = await this.createEmailDraft((block.input as any).to, (block.input as any).subject, (block.input as any).body);
              break;
            case 'update_calendar_event':
              result = await this.updateCalendarEvent((block.input as any).event_id, (block.input as any).updates);
              break;
            case 'delete_calendar_event':
              result = await this.deleteCalendarEvent((block.input as any).event_id);
              break;
            case 'plan_work_sessions':
              result = await this.planWorkSessions(
                (block.input as any).total_hours,
                (block.input as any).task_title,
                (block.input as any).days_ahead,
                (block.input as any).preferred_duration
              );
              break;
            case 'mark_email_read':
              result = await this.markEmailRead((block.input as any).email_id);
              break;
            case 'search_contact':
              result = await this.searchContact((block.input as any).search_query);
              break;
            case 'get_contact_info':
              result = await this.getContactDetails((block.input as any).contact_id);
              break;
            case 'search_departures':
              {
                const input = block.input as any;
                let stationId = input.station_id;

                // If station_name provided, search for station first
                if (!stationId && input.station_name) {
                  const stations = await searchLocations({
                    input: input.station_name,
                    maxNo: 1,
                    type: 'S',
                  });
                  if (stations.length > 0) {
                    stationId = stations[0].id;
                  } else {
                    result = { error: `Hittade ingen station: ${input.station_name}` };
                    break;
                  }
                }

                if (!stationId) {
                  result = { error: 'Station ID eller station_name krävs' };
                  break;
                }

                result = await getDepartures({
                  id: stationId,
                  maxJourneys: input.max_journeys,
                  date: input.date,
                  time: input.time,
                });
              }
              break;

            case 'search_station':
              result = await searchLocations({
                input: (block.input as any).name,
                maxNo: (block.input as any).max_results,
                type: 'S',
              });
              break;

            case 'plan_public_transit_trip':
              {
                const input = block.input as any;
                const { searchLocations, planTrip } = await import('./resrobot-api');

                // Find origin station
                const originStations = await searchLocations({
                  input: input.origin_name,
                  maxNo: 1,
                  type: 'S'
                });

                if (originStations.length === 0) {
                  result = { error: `Hittade ingen station: ${input.origin_name}` };
                  break;
                }

                // Find destination station
                const destStations = await searchLocations({
                  input: input.destination_name,
                  maxNo: 1,
                  type: 'S'
                });

                if (destStations.length === 0) {
                  result = { error: `Hittade ingen station: ${input.destination_name}` };
                  break;
                }

                // Plan trip
                const trips = await planTrip({
                  originId: originStations[0].id,
                  destId: destStations[0].id,
                  date: input.date,
                  time: input.time,
                  searchForArrival: input.search_for_arrival,
                  numTrips: 3
                });

                result = {
                  success: true,
                  origin: originStations[0].name,
                  destination: destStations[0].name,
                  trips_found: trips.length,
                  trips: trips.map(t => ({
                    departure: t.departure,
                    arrival: t.arrival,
                    duration: t.duration,
                    changes: t.changes,
                    legs: t.legs.map(leg => ({
                      transport: leg.name,
                      from: leg.origin,
                      to: leg.destination,
                      departure: leg.departure,
                      arrival: leg.arrival
                    }))
                  }))
                };
              }
              break;

            case 'get_current_location':
              result = await this.getCurrentLocation((block.input as any).time_context || 'now');
              break;

            case 'get_weather_forecast':
              {
                const input = block.input as any;
                const summary = await getWeatherSummary(input.latitude, input.longitude);
                const formatted = formatWeatherSummary(summary);

                result = {
                  success: true,
                  location: input.location_name || `${input.latitude}, ${input.longitude}`,
                  summary: formatted,
                  raw_data: {
                    current: summary.now,
                    next3Hours: summary.next3Hours,
                    rainWarning: summary.rainWarning,
                    rainStartTime: summary.rainStartTime,
                  },
                };
              }
              break;

            case 'get_traffic_situation':
              {
                const input = block.input as any;

                if (input.check_commute) {
                  // Standard Stockholm commute check
                  const commuteStatus = await getCommuteStatus();
                  result = {
                    success: true,
                    commute: commuteStatus.message,
                    hasIssues: commuteStatus.hasIssues,
                    situations: commuteStatus.situations,
                    formatted: formatSituations(commuteStatus.situations),
                  };
                } else if (input.roads && input.roads.length > 0) {
                  // Custom roads check
                  const situations = await getSituations({ roads: input.roads });
                  result = {
                    success: true,
                    roads: input.roads,
                    situationCount: situations.length,
                    situations,
                    formatted: formatSituations(situations),
                  };
                } else {
                  result = {
                    error: 'Either check_commute=true or roads array required',
                  };
                }
              }
              break;

            case 'find_nearby_places':
              {
                const input = block.input as any;

                // Perform nearby search
                let places = await nearbySearch({
                  location: { lat: input.latitude, lng: input.longitude },
                  radius: input.radius || 1000,
                  type: input.type,
                  keyword: input.keyword,
                  openNow: input.open_now,
                });

                // Filter by preferences (dietary restrictions, price, etc)
                if (input.exclude_keywords || input.max_price !== undefined) {
                  places = filterByPreferences(places, {
                    excludeKeywords: input.exclude_keywords,
                    maxPrice: input.max_price,
                    minRating: 3.5, // Always filter low-rated places
                    openNow: input.open_now,
                  });
                }

                result = {
                  success: true,
                  count: places.length,
                  places: places.slice(0, 10), // Top 10
                  formatted: formatPlaces(places, 5), // Show 5 in summary
                };
              }
              break;

            case 'get_directions':
              {
                const input = block.input as any;
                const modes = input.modes || ['BICYCLE', 'WALK', 'TRANSIT'];

                // Get session for auth
                const { supabase } = await import('@/lib/supabase');
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                  result = { error: 'Not authenticated' };
                  break;
                }

                // Fetch routes for all travel modes in parallel
                const routePromises = modes.map(async (mode: string) => {
                  const response = await fetch(`${BACKEND_URL}/api/google-routes`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                      origin: { lat: input.origin_lat, lng: input.origin_lng },
                      destination: { lat: input.destination_lat, lng: input.destination_lng },
                      travelMode: mode
                    })
                  });

                  if (!response.ok) {
                    return { mode, error: `API error: ${response.status}` };
                  }

                  const data = await response.json();
                  const route = data.routes?.[0];

                  if (!route) {
                    return { mode, error: 'Ingen rutt hittades' };
                  }

                  return {
                    mode,
                    duration: route.duration,
                    distance: route.distanceMeters,
                    duration_minutes: Math.ceil(parseInt(route.duration.replace('s', '')) / 60),
                    distance_km: (route.distanceMeters / 1000).toFixed(1)
                  };
                });

                const routes = await Promise.all(routePromises);
                const successful = routes.filter(r => !r.error);

                // Sort by duration (fastest first)
                successful.sort((a, b) => (a.duration_minutes || 999) - (b.duration_minutes || 999));

                const modeNames: Record<string, string> = {
                  BICYCLE: 'Cykel',
                  WALK: 'Gång',
                  TRANSIT: 'Kollektivtrafik',
                  DRIVE: 'Bil'
                };

                result = {
                  success: true,
                  routes: successful,
                  fastest: successful[0],
                  formatted: successful.map((r, i) =>
                    `${i+1}. ${modeNames[r.mode]}: ${r.duration_minutes} min (${r.distance_km} km)`
                  ).join('\n')
                };
              }
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

  private async deleteTask(taskId: string) {
    try {
      if (!this.onTaskDelete) {
        return { error: 'Task delete inte tillgängligt' };
      }

      const task = this.context.tasks.find(t => t.id === taskId);
      if (!task) {
        return { error: `Hittade ingen task med ID ${taskId}` };
      }

      const success = await this.onTaskDelete(taskId);

      if (success) {
        // Ta bort från context
        this.context.tasks = this.context.tasks.filter(t => t.id !== taskId);

        return {
          success: true,
          message: `✅ Uppgift "${task.title}" har raderats!`,
        };
      } else {
        return { error: 'Kunde inte radera tasken' };
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte radera task' };
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
        q1Tasks.length > 0 ? 'Fokusera på Q1-uppgifter först' : null,
        overdueTasks.length > 0 ? `${overdueTasks.length} försenade uppgifter behöver uppmärksamhet` : null,
        q2Tasks.length > 5 ? 'Många Q2-uppgifter - överväg att schemalägga specifika tider' : null,
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

  loadHistory(history: any[]) {
    this.conversationHistory = history;
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
          location: e.location?.displayName,
          isOnlineMeeting: e.isOnlineMeeting,
          attendees: e.attendees?.length || 0,
          organizer: e.organizer?.emailAddress?.name,
        })),
        summary: `${events.length} händelser mellan ${start.toLocaleDateString('sv-SE')} och ${end.toLocaleDateString('sv-SE')}`,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte hämta kalendern' };
    }
  }

  private formatTimeWithPeriod(date: Date): string {
    const hour = date.getHours();
    const time = date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

    if (hour >= 0 && hour < 6) return `${time} (natt)`;
    if (hour >= 6 && hour < 12) return `${time} (morgon)`;
    if (hour >= 12 && hour < 18) return `${time} (eftermiddag)`;
    return `${time} (kväll)`;
  }

  private expandSearchTerms(query: string): string[] {
    const synonyms: { [key: string]: string[] } = {
      'tåg': ['SJ', 'MTRX', 'Snälltåget', 'bokningsbekräftelse', 'tågresa', 'tågresor'],
      'flyg': ['SAS', 'Norwegian', 'Ryanair', 'boarding', 'flight', 'flyg'],
      'taxi': ['Uber', 'Taxibokning', 'Bolt', 'Cabonline', 'taxi'],
      'hotell': ['booking.com', 'Hotels.com', 'hotell', 'reservation'],
    };

    const queries = [query];
    const lowerQuery = query.toLowerCase();

    for (const [keyword, terms] of Object.entries(synonyms)) {
      if (lowerQuery.includes(keyword)) {
        queries.push(...terms);
        break; // Hitta första matchningen och använd den
      }
    }

    return queries;
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
          start: this.formatTimeWithPeriod(new Date(e.start)),
          end: this.formatTimeWithPeriod(new Date(e.end)),
        })),
        tasks_today: tasksForToday.map((t) => ({
          title: t.title,
          priority: Math.round((t.value_score || 5) * (t.time_sensitivity || 5) * (t.confidence || 7) / (t.effort || 5)),
          deadline: t.deadline ? this.formatTimeWithPeriod(new Date(t.deadline)) : null,
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

      // Uppdatera local context
      this.context.projects.push(data);

      return {
        success: true,
        project: data,
        message: `Projekt "${data.name}" skapat! Budget: ${data.total_budget ? data.total_budget.toLocaleString('sv-SE') : '0'} kr (${data.quoted_hours}h × ${data.hourly_rate} kr/h + ${data.external_costs} kr övriga kostnader)`,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte skapa projekt' };
    }
  }

  private async listProjects(status?: string, search?: string) {
    try {
      const { supabase } = await import('@/lib/supabase');

      let query = supabase
        .from('projects')
        .select('*')
        .eq('user_id', this.context.userId);

      // Filter by status
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      // Search in name or client_name
      if (search) {
        query = query.or(`name.ilike.%${search}%,client_name.ilike.%${search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        projects: data.map((p: any) => ({
          id: p.id,
          name: p.name,
          client_name: p.client_name,
          status: p.status,
          total_budget: p.total_budget ? p.total_budget.toLocaleString('sv-SE') + ' kr' : '0 kr',
          quoted_hours: p.quoted_hours + 'h',
          completion_percentage: p.completion_percentage + '%',
          deadline: p.project_deadline ? new Date(p.project_deadline).toLocaleDateString('sv-SE') : 'Ingen deadline',
        })),
        count: data.length,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte lista projekt' };
    }
  }

  private async getProject(projectId: string) {
    try {
      const { supabase } = await import('@/lib/supabase');

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', this.context.userId)
        .single();

      if (error) throw error;

      return {
        success: true,
        project: {
          id: data.id,
          name: data.name,
          client_name: data.client_name,
          description: data.description,
          status: data.status,
          quoted_hours: data.quoted_hours,
          hourly_rate: data.hourly_rate,
          external_costs: data.external_costs,
          total_budget: data.total_budget ? data.total_budget.toLocaleString('sv-SE') + ' kr' : '0 kr',
          completion_percentage: data.completion_percentage,
          project_deadline: data.project_deadline ? new Date(data.project_deadline).toLocaleDateString('sv-SE') : null,
          created_at: new Date(data.created_at).toLocaleDateString('sv-SE'),
        },
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte hämta projekt' };
    }
  }

  private async updateProject(projectId: string, changes: any) {
    try {
      const { supabase } = await import('@/lib/supabase');

      const { data, error } = await supabase
        .from('projects')
        .update(changes)
        .eq('id', projectId)
        .eq('user_id', this.context.userId)
        .select()
        .single();

      if (error) throw error;

      // Uppdatera local context
      const index = this.context.projects.findIndex((p) => p.id === projectId);
      if (index !== -1) {
        this.context.projects[index] = data;
      }

      return {
        success: true,
        project: data,
        message: `Projekt "${data.name}" uppdaterat!`,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte uppdatera projekt' };
    }
  }

  private async listUnreadEmails(maxCount: number = 20) {
    try {
      const { getUnreadEmails, isMicrosoftLoggedIn } = await import('./microsoft-graph');

      const isLoggedIn = await isMicrosoftLoggedIn();
      if (!isLoggedIn) {
        return {
          error: 'Användaren är inte inloggad på Microsoft.',
          requires_login: true,
        };
      }

      const emails = await getUnreadEmails(maxCount);

      return {
        success: true,
        count: emails.length,
        emails: emails.map((e) => ({
          id: e.id,
          subject: e.subject,
          from: e.from,
          received: new Date(e.receivedDateTime).toLocaleString('sv-SE'),
          preview: e.bodyPreview.substring(0, 100) + (e.bodyPreview.length > 100 ? '...' : ''),
        })),
        summary: `${emails.length} olästa mejl`,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte hämta mejl' };
    }
  }

  private async listAllEmails(maxCount: number = 50, includeRead: boolean = true) {
    try {
      const { getAllEmails, isMicrosoftLoggedIn } = await import('./microsoft-graph');

      const isLoggedIn = await isMicrosoftLoggedIn();
      if (!isLoggedIn) {
        return {
          error: 'Användaren är inte inloggad på Microsoft.',
          requires_login: true,
        };
      }

      const emails = await getAllEmails(maxCount, includeRead);

      return {
        success: true,
        count: emails.length,
        emails: emails.map((e) => ({
          id: e.id,
          subject: e.subject,
          from: e.from,
          received: new Date(e.receivedDateTime).toLocaleString('sv-SE'),
          preview: e.bodyPreview.substring(0, 100) + (e.bodyPreview.length > 100 ? '...' : ''),
          isRead: e.isRead,
        })),
        summary: includeRead ? `${emails.length} mejl totalt` : `${emails.length} olästa mejl`,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte hämta mejl' };
    }
  }

  private async searchEmails(query: string, searchIn: string = 'both', maxCount: number = 20) {
    try {
      const { searchEmails, getAllEmails, isMicrosoftLoggedIn } = await import('./microsoft-graph');

      const isLoggedIn = await isMicrosoftLoggedIn();
      if (!isLoggedIn) {
        return {
          error: 'Användaren är inte inloggad på Microsoft.',
          requires_login: true,
        };
      }

      // RETRY LOGIC: 3 försök med olika strategier

      // Försök 1: Direkt sökning
      let emails = await searchEmails(query, searchIn as any, maxCount);

      if (emails.length === 0) {
        console.log(`🔄 Försök 1 misslyckades (${query}), provar med expanderade termer...`);

        // Försök 2: Expandera med synonymer
        const expandedTerms = this.expandSearchTerms(query);

        for (const term of expandedTerms) {
          emails = await searchEmails(term, searchIn as any, maxCount);
          if (emails.length > 0) {
            console.log(`✅ Försök 2 lyckades med: ${term}`);
            break;
          }
        }
      }

      if (emails.length === 0) {
        console.log('🔄 Försök 2 misslyckades, hämtar alla mejl och filtrerar lokalt...');

        // Försök 3: Hämta alla mejl och filtrera client-side
        const allEmails = await getAllEmails(100, true);
        emails = allEmails.filter(e => {
          const searchText = `${e.subject} ${e.from} ${e.bodyPreview}`.toLowerCase();
          const terms = this.expandSearchTerms(query);
          return terms.some(term => searchText.includes(term.toLowerCase()));
        });

        if (emails.length > 0) {
          console.log(`✅ Försök 3 lyckades, hittade ${emails.length} mejl genom local filtering`);
        }
      }

      return {
        success: true,
        count: emails.length,
        query,
        search_in: searchIn,
        emails: emails.map((e) => ({
          id: e.id,
          subject: e.subject,
          from: e.from,
          received: new Date(e.receivedDateTime).toLocaleString('sv-SE'),
          preview: e.bodyPreview.substring(0, 100) + (e.bodyPreview.length > 100 ? '...' : ''),
          isRead: e.isRead,
        })),
        summary: emails.length > 0
          ? `Hittade ${emails.length} mejl för "${query}"`
          : `Hittade inga mejl för "${query}"`,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte söka mejl' };
    }
  }

  private async getEmailContent(emailId: string) {
    try {
      const { getEmailContent, isMicrosoftLoggedIn } = await import('./microsoft-graph');

      const isLoggedIn = await isMicrosoftLoggedIn();
      if (!isLoggedIn) {
        return {
          error: 'Användaren är inte inloggad på Microsoft.',
          requires_login: true,
        };
      }

      const email = await getEmailContent(emailId);

      if (!email) {
        return { error: 'Mejlet hittades inte' };
      }

      return {
        success: true,
        email: {
          subject: email.subject,
          from: email.from,
          received: new Date(email.receivedDateTime).toLocaleString('sv-SE'),
          body: email.body,
          isRead: email.isRead,
        },
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte hämta mejlinnehåll' };
    }
  }

  private async createEmailDraft(to: string, subject: string, body: string) {
    try {
      const { createEmailDraft, isMicrosoftLoggedIn } = await import('./microsoft-graph');

      const isLoggedIn = await isMicrosoftLoggedIn();
      if (!isLoggedIn) {
        return {
          error: 'Användaren är inte inloggad på Microsoft.',
          requires_login: true,
        };
      }

      const result = await createEmailDraft(to, subject, body);

      if (!result.success) {
        return { error: result.error || 'Kunde inte skapa mejlutkast' };
      }

      return {
        success: true,
        message: `Mejlutkast skapat till ${to} med ämne "${subject}". Du hittar det i Outlook under Utkast.`,
        draftId: result.draftId,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte skapa mejlutkast' };
    }
  }

  private async processUnreadEmails(
    maxEmails: number = 50,
    groupBy: 'none' | 'sender' | 'subject_keyword' = 'none',
    autoMarkRead: boolean = false
  ) {
    try {
      const { getUnreadEmails, markEmailAsRead, isMicrosoftLoggedIn } = await import('./microsoft-graph');

      const isLoggedIn = await isMicrosoftLoggedIn();
      if (!isLoggedIn) {
        return {
          error: 'Användaren är inte inloggad på Microsoft.',
          requires_login: true,
        };
      }

      const emails = await getUnreadEmails(maxEmails);

      if (emails.length === 0) {
        return {
          success: true,
          message: '✅ Inga olästa mejl att processa!',
          tasks_created: 0,
        };
      }

      const tasksCreated: any[] = [];

      if (groupBy === 'none') {
        // Skapa en task per mejl
        for (const email of emails) {
          const taskTitle = `📧 ${email.subject}`;
          const taskDescription = `Från: ${email.from}\nMottaget: ${new Date(email.receivedDateTime).toLocaleString('sv-SE')}\n\n${email.bodyPreview}`;

          if (this.onTaskCreate) {
            const task = await this.onTaskCreate({
              title: taskTitle,
              description: taskDescription,
              value_score: 6,
              time_sensitivity: 5,
              confidence: 7,
              effort: 2,
              estimated_duration: 2, // 2 min = Quickie
              priority_flag: 'whenever',
            });

            if (task) {
              tasksCreated.push(task);
              if (autoMarkRead) {
                await markEmailAsRead(email.id);
              }
            }
          }
        }
      } else if (groupBy === 'sender') {
        // Gruppera per avsändare
        const grouped = new Map<string, typeof emails>();
        for (const email of emails) {
          const sender = email.from;
          if (!grouped.has(sender)) {
            grouped.set(sender, []);
          }
          grouped.get(sender)!.push(email);
        }

        for (const [sender, senderEmails] of grouped) {
          const taskTitle = `📧 ${senderEmails.length} mejl från ${sender}`;
          const taskDescription = senderEmails
            .map((e, i) => `${i + 1}. ${e.subject}\n   ${new Date(e.receivedDateTime).toLocaleString('sv-SE')}`)
            .join('\n\n');

          if (this.onTaskCreate) {
            const task = await this.onTaskCreate({
              title: taskTitle,
              description: taskDescription,
              value_score: 6,
              time_sensitivity: 5,
              confidence: 7,
              effort: Math.min(senderEmails.length, 10), // 1 poäng per mejl, max 10
              estimated_duration: Math.min(senderEmails.length * 2, 120), // 2 min per mejl, max 2h
              priority_flag: 'whenever',
            });

            if (task) {
              tasksCreated.push(task);
              if (autoMarkRead) {
                for (const email of senderEmails) {
                  await markEmailAsRead(email.id);
                }
              }
            }
          }
        }
      }

      return {
        success: true,
        tasks_created: tasksCreated.length,
        emails_processed: emails.length,
        marked_as_read: autoMarkRead,
        message: `✅ Skapade ${tasksCreated.length} Snabbis från ${emails.length} mejl!`,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte processa mejl' };
    }
  }

  private async updateCalendarEvent(eventId: string, updates: any) {
    try {
      const { updateCalendarEvent, isMicrosoftLoggedIn } = await import('./microsoft-graph');

      const isLoggedIn = await isMicrosoftLoggedIn();
      if (!isLoggedIn) {
        return {
          error: 'Användaren är inte inloggad på Microsoft.',
          requires_login: true,
        };
      }

      const updateData: any = {};
      if (updates.subject) updateData.subject = updates.subject;
      if (updates.start_time) updateData.start = new Date(updates.start_time);
      if (updates.end_time) updateData.end = new Date(updates.end_time);
      if (updates.body) updateData.body = updates.body;

      const success = await updateCalendarEvent(eventId, updateData);

      if (success) {
        return {
          success: true,
          message: 'Mötet har uppdaterats!',
        };
      } else {
        return { error: 'Kunde inte uppdatera mötet' };
      }
    } catch (error) {
      // Säkerhetsblockering returneras som är (innehåller instruktion till Claude)
      return { error: error instanceof Error ? error.message : 'Kunde inte uppdatera möte' };
    }
  }

  private async deleteCalendarEvent(eventId: string) {
    try {
      const { deleteCalendarEvent, isMicrosoftLoggedIn } = await import('./microsoft-graph');

      const isLoggedIn = await isMicrosoftLoggedIn();
      if (!isLoggedIn) {
        return {
          error: 'Användaren är inte inloggad på Microsoft.',
          requires_login: true,
        };
      }

      const success = await deleteCalendarEvent(eventId);

      if (success) {
        return {
          success: true,
          message: 'Mötet har tagits bort från kalendern!',
        };
      } else {
        return { error: 'Kunde inte radera mötet' };
      }
    } catch (error) {
      // Säkerhetsblockering returneras som är (innehåller instruktion till Claude)
      return { error: error instanceof Error ? error.message : 'Kunde inte radera möte' };
    }
  }

  private async planWorkSessions(
    totalHours: number,
    taskTitle: string,
    daysAhead: number = 7,
    preferredDuration: number = 120
  ) {
    try {
      const { planWorkSessions, blockCalendarTime, isMicrosoftLoggedIn } = await import('./microsoft-graph');

      const isLoggedIn = await isMicrosoftLoggedIn();
      if (!isLoggedIn) {
        return {
          error: 'Användaren är inte inloggad på Microsoft.',
          requires_login: true,
        };
      }

      const now = new Date();
      const deadline = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
      const totalMinutes = totalHours * 60;

      const plan = await planWorkSessions(totalMinutes, deadline, preferredDuration);

      if (!plan.isComplete) {
        return {
          warning: `Kunde bara planera ${Math.round((totalMinutes - plan.remainingMinutes) / 60)}h av ${totalHours}h begärda timmar`,
          sessions_planned: plan.sessions.length,
          remaining_hours: Math.round(plan.remainingMinutes / 60),
        };
      }

      // Boka alla sessioner i kalendern
      for (const session of plan.sessions) {
        await blockCalendarTime(session.start, session.durationMinutes, taskTitle);
      }

      return {
        success: true,
        sessions_planned: plan.sessions.length,
        sessions: plan.sessions.map(s => ({
          start: new Date(s.start).toLocaleString('sv-SE'),
          duration: s.durationMinutes + ' min',
        })),
        total_hours: totalHours,
        message: `Planerade ${plan.sessions.length} arbetssessioner för "${taskTitle}"`,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte planera sessioner' };
    }
  }

  private async markEmailRead(emailId: string) {
    try {
      const { markEmailAsRead, isMicrosoftLoggedIn } = await import('./microsoft-graph');

      const isLoggedIn = await isMicrosoftLoggedIn();
      if (!isLoggedIn) {
        return {
          error: 'Användaren är inte inloggad på Microsoft.',
          requires_login: true,
        };
      }

      const success = await markEmailAsRead(emailId);

      if (success) {
        return {
          success: true,
          message: 'Mejlet har markerats som läst!',
        };
      } else {
        return { error: 'Kunde inte markera mejl som läst' };
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte markera mejl' };
    }
  }

  private async searchContact(searchQuery: string) {
    try {
      const { searchContacts, isMicrosoftLoggedIn } = await import('./microsoft-graph');

      const isLoggedIn = await isMicrosoftLoggedIn();
      if (!isLoggedIn) {
        return {
          error: 'Användaren är inte inloggad på Microsoft.',
          requires_login: true,
        };
      }

      const contacts = await searchContacts(searchQuery);

      return {
        success: true,
        count: contacts.length,
        contacts: contacts.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          company: c.company,
          jobTitle: c.jobTitle,
        })),
        message: `Hittade ${contacts.length} kontakter för "${searchQuery}"`,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte söka kontakter' };
    }
  }

  private async getContactDetails(contactId: string) {
    try {
      const { getContactInfo, isMicrosoftLoggedIn } = await import('./microsoft-graph');

      const isLoggedIn = await isMicrosoftLoggedIn();
      if (!isLoggedIn) {
        return {
          error: 'Användaren är inte inloggad på Microsoft.',
          requires_login: true,
        };
      }

      const contact = await getContactInfo(contactId);

      if (contact) {
        return {
          success: true,
          contact: {
            name: contact.name,
            emails: contact.emails,
            phones: contact.phones,
            company: contact.company,
            jobTitle: contact.jobTitle,
            birthday: contact.birthday,
            addresses: contact.addresses,
          },
        };
      } else {
        return { error: 'Kontakt hittades inte' };
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Kunde inte hämta kontakt' };
    }
  }

  /**
   * Get current location with smart time-aware logic
   * - "now"/"soon" → GPS or currently ongoing physical meeting
   * - "tonight"/"tomorrow"/"later" → Next physical meeting location or fallback to home
   */
  private async getCurrentLocation(timeContext: 'now' | 'tonight' | 'tomorrow' | 'later' = 'now') {
    try {
      const now = new Date();
      const ONE_HOUR = 60 * 60 * 1000;

      // Check if we need future location (not "now")
      const needsFutureLocation = timeContext !== 'now';

      // Try to get calendar events for context
      let upcomingPhysicalMeeting: any = null;
      let ongoingPhysicalMeeting: any = null;

      try {
        const { getCalendarEvents, isMicrosoftLoggedIn } = await import('./microsoft-graph');
        const isLoggedIn = await isMicrosoftLoggedIn();

        if (isLoggedIn) {
          // Get events for today + next 2 days
          const endDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
          const events = await getCalendarEvents(now, endDate);

          // Filter physical meetings (not online)
          const physicalMeetings = events.filter((e: any) => !e.isOnlineMeeting && e.location?.displayName);

          // Find ongoing meeting (started, not ended yet)
          ongoingPhysicalMeeting = physicalMeetings.find((e: any) => {
            const start = new Date(e.start);
            const end = new Date(e.end);
            return start <= now && end > now;
          });

          // Find next upcoming meeting
          upcomingPhysicalMeeting = physicalMeetings.find((e: any) => {
            const start = new Date(e.start);
            return start > now;
          });
        }
      } catch (error) {
        console.error('Failed to fetch calendar for location context:', error);
      }

      // LOGIC FOR "NOW" / "SOON"
      if (!needsFutureLocation) {
        // 1. Try GPS first
        let gpsLocation = null;
        try {
          const { getCurrentPosition } = await import('./geolocation');
          gpsLocation = await getCurrentPosition();
        } catch (error) {
          console.error('GPS failed:', error);
        }

        // 2. Check if user has upcoming meeting within 60 min
        let upcomingMeetingContext = null;
        if (upcomingPhysicalMeeting) {
          const meetingStart = new Date(upcomingPhysicalMeeting.start);
          const timeUntilMeeting = meetingStart.getTime() - now.getTime();

          if (timeUntilMeeting < ONE_HOUR) {
            const location = this.normalizeLocation(upcomingPhysicalMeeting.location.displayName);
            upcomingMeetingContext = {
              meeting_location: location,
              meeting_subject: upcomingPhysicalMeeting.subject,
              minutes_until_meeting: Math.round(timeUntilMeeting / 60000),
            };
          }
        }

        // Return GPS + meeting context if both available
        if (gpsLocation && gpsLocation.city) {
          return {
            city: gpsLocation.city,
            source: 'gps',
            latitude: gpsLocation.latitude,
            longitude: gpsLocation.longitude,
            accuracy: gpsLocation.accuracy,
            timestamp: gpsLocation.timestamp,
            ...(upcomingMeetingContext && {
              upcoming_meeting: upcomingMeetingContext,
              context: `GPS-position: ${gpsLocation.city}. Möte "${upcomingMeetingContext.meeting_subject}" på ${upcomingMeetingContext.meeting_location} om ${upcomingMeetingContext.minutes_until_meeting} min`
            })
          };
        }

        // If GPS failed but has upcoming meeting, use meeting location
        if (upcomingMeetingContext) {
          return {
            city: upcomingMeetingContext.meeting_location,
            source: 'calendar_upcoming',
            context: `Möte "${upcomingMeetingContext.meeting_subject}" börjar om ${upcomingMeetingContext.minutes_until_meeting} min (GPS saknas)`,
            meeting: upcomingMeetingContext.meeting_subject,
          };
        }

        // 3. Ongoing physical meeting → User is probably there
        if (ongoingPhysicalMeeting) {
          const location = this.normalizeLocation(ongoingPhysicalMeeting.location.displayName);
          return {
            city: location,
            source: 'calendar_ongoing',
            context: `Pågående möte: "${ongoingPhysicalMeeting.subject}"`,
            meeting: ongoingPhysicalMeeting.subject,
          };
        }

        // 4. Fallback: Home (Visby)
        return {
          city: 'Visby',
          source: 'default',
          context: 'Ingen aktiv position eller möte - antar hemma (Visby)',
        };
      }

      // LOGIC FOR "TONIGHT" / "TOMORROW" / "LATER"
      if (upcomingPhysicalMeeting) {
        const location = this.normalizeLocation(upcomingPhysicalMeeting.location.displayName);
        const meetingStart = new Date(upcomingPhysicalMeeting.start);

        return {
          city: location,
          source: 'calendar_future',
          context: `Nästa fysiska möte: "${upcomingPhysicalMeeting.subject}" ${meetingStart.toLocaleDateString('sv-SE')} ${meetingStart.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`,
          meeting: upcomingPhysicalMeeting.subject,
          meeting_time: meetingStart.toISOString(),
        };
      }

      // Fallback: Home (Visby)
      return {
        city: 'Visby',
        source: 'default',
        context: 'Inga kommande fysiska möten - antar hemma (Visby)',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Kunde inte hämta position',
        city: 'Visby',
        source: 'error_fallback',
      };
    }
  }

  /**
   * Normalize location names to consistent city names
   * Maps aliases like "hemma", "kontoret" to actual cities
   */
  private normalizeLocation(location: string): string {
    const normalized = location.toLowerCase().trim();

    const aliases: Record<string, string> = {
      'hemma': 'Visby',
      'kontoret': 'Visby',
      'kontor': 'Visby',
      'tyresö': 'Stockholm',
      'tutviksvägen': 'Stockholm',
      'tyreso': 'Stockholm',
    };

    return aliases[normalized] || location;
  }
}