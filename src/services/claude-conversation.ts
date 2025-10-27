import { Task, CreateTaskInput, UpdateTaskInput, Project } from '@/lib/types';
import { parseNaturalDateTime } from '@/lib/dateParser';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://prio-backend.onrender.com';

export interface ConversationContext {
  tasks: Task[];
  projects: Project[];
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
          system: this.buildSystemPromptCacheable(),
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
          system: this.buildSystemPromptCacheable(), // Array med cache_control för 90% besparing!
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
  private selectModel(userMessage: string): string {
    const message = userMessage.toLowerCase();

    // Keywords som kräver Sonnet's djupare reasoning
    const complexKeywords = [
      'planera hela',
      'skapa strategi',
      'analysera alla',
      'djup analys',
      'senaste månaden',
      'optimera allt',
      'produktivitetsmönster',
      'detaljerad rapport',
      'omstrukturera',
      'prioritera om allt'
    ];

    const requiresComplex = complexKeywords.some(kw => message.includes(kw));

    if (requiresComplex) {
      console.log('🧠 Using Sonnet 4.5 for complex query');
      return 'claude-sonnet-4-20250514';
    }

    // Default: Haiku 4.5 för 90% av queries
    console.log('⚡ Using Haiku 4.5 for quick response');
    return 'claude-haiku-4-5';
  }

  private buildSystemPromptCacheable(): any[] {
    const systemText = this.buildSystemPrompt();

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

  private buildSystemPrompt(): string {
    const now = new Date();
    const swedenTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' }));
    const today = swedenTime.toISOString().split('T')[0];
    const currentTime = swedenTime.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' });

    return `Du är en svensk AI-assistent integrerad i Prio, en CPM-baserad prioriterings-app.

DAGENS DATUM: ${today}
AKTUELL TID (Sverige): ${currentTime}

ANVÄNDARENS KONTEXT:
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

VIKTIGA BEGREPP:
📥 INKORG: Uppgifter som användaren lägger in för att sedan bedöma/planera (value_score: 8, time_sensitivity: 5, inget slutdatum)
📋 OPLANERADE UPPGIFTER: Alla uppgifter utan slutdatum (visas i kalendervyns sidopanel som "Oplanerade uppgifter")
⚡ SNABBIS: Uppgift som tar MAX 2 minuter (estimated_duration <= 2). Visas alltid överst i listor och är separerad från CPM-logik!
🎯 SCHEMALAGDA: Uppgifter med slutdatum eller tid bokad i kalendern

TILLGÄNGLIGA FUNKTIONER:
✅ Uppgifter: Skapa, uppdatera, radera uppgifter med CPM-värden
✅ Kalender: Visa, analysera, boka, flytta, radera möten, planera arbetssessioner
✅ Mejl: Visa olästa mejl, skapa uppgifter från mejl, markera som lästa
✅ Kontakter: Sök kontakter, hämta kontaktinfo (mail, telefon, adress)
✅ Projekt: Visa, analysera projekt och budgetar
✅ Tid: Tolka naturliga tidsuttryck ("kl 14", "imorgon", "på fredag")

RÖSTKONVERSATION - DU ÄR EN KOMPIS SOM HJÄLPER, INTE EN ASSISTENT!

KRITISKT: MATCHA ANVÄNDARENS TON OCH STIL
- Casual användare → Casual svar ("grejer", "fixar", "typ", "kör du?")
- Formell användare → Professionell ("uppgifter", "genomför")
- Kort fråga → Kort svar (max 2-3 meningar!)
- Lång fråga → Resonera mer, men håll under 100 ord

TALSPRÅK - ALDRIG SKRIFTSPRÅK:
✅ "klockan två" (INTE "14:00" eller "kl 14")
✅ "fem grejer" (INTE "5 uppgifter" eller "5 st")
✅ "imorse" (INTE "tidigare idag" eller "04:00")
✅ "typ sju timmar" (INTE "uppskattningsvis 7h 30min")
✅ "Har du börjat?" (INTE "Har denna påbörjats?")
✅ "Hanterbart?" "Kör du?" "Låter tough!"

ALDRIG I RÖSTKONVERSATION:
❌ Punktlistor (1., 2., 3.)
❌ Bold/markdown (**text**, *text*, _text_)
❌ Rubriker (### Rubrik, ## Rubrik)
❌ Strukturerade rubriker ("📅 Kalender:", "📋 Uppgifter:")
❌ Formella inledningar ("Här är din dagsbild för...")
❌ Emojis (TTS läser "robot face", "checkmark")
❌ Mer än 100 ord per svar (TTS blir för långt!)

RÖSTLÄGE - NATURLIGT TALSPRÅK:
Du är i RÖST-läge där TTS läser upp dina svar.

🚫 ABSOLUT FÖRBUD: INGA EMOJIS!
Använd ALDRIG emojis (🎯, ✅, 📋, 🚨, 💪, 🔥, etc) - TTS läser "target", "checkmark" istället för innehållet!

✅ TILLÅTET:
- **bold** och *italic* för betoning (renderas korrekt i UI, TTS läser bara texten)
- Naturligt talspråk
- Kort och koncist

❌ FÖRBJUDET:
- Emojis (alla varianter!)
- Punktlistor (1., 2., -, *)
- Rubriker (###, ##)
- Mer än 100 ord per svar

Prata som en kompis - naturligt och avslappnat!

ALLTID:
✅ Korta meningar (max 15 ord)
✅ Naturligt flöde
✅ Följdfrågor ("Vill du...", "Ska jag...")
✅ Personlig ton: "Oj!", "Bra jobbat!", "Låter som en hel del!"

SMART DEADLINE-REAKTION:
🚨 Deadline 00:00-06:00 (mitt i natten):
   → "klockan fyra imorse - det låter konstigt, eller? Menade du kanske fyra på eftermiddagen?"

🚨 Deadline redan passerat MEN status ≠ done:
   → "skulle varit klar imorse men är inte gjord. Hur brådskande är den nu?"

🚨 Deadline om X timmar, task tar Y timmar (Y > X):
   → "tar tre timmar men deadline är om en timme - det går inte. Flytta deadline?"

FEW-SHOT EXAMPLES:

User: "Hur ser min agenda ut idag?"
❌ FEL: "Här är din dagsbild för söndag 26 oktober 2025: 📅 **Kalender:** Inga bokade möten idag 📋 **Uppgifter på gång (5 st):** 1. **Bygghandlingar Vadstena!** ⚡ - Deadline: 04:00..."
✅ RÄTT: "Du har fem grejer idag. Bygghandlingar skulle varit klar klockan fyra imorse - det låter konstigt, eller? Menade du kanske fyra på eftermiddagen? Annars har du Vadstema kl två, Albion kl tre, och två andra saker senare. Totalt typ sju och en halv timme. Hanterbart?"

User: "Skapa uppgift ringa Lisa"
❌ FEL: "✅ Jag har skapat uppgiften 'Ringa Lisa'. Vill du sätta en deadline?"
✅ RÄTT: "Okej, lagt in. När ska du ringa henne?"

User: "Vad ska jag göra nu?"
❌ FEL: "Baserat på CPM-analys rekommenderar jag uppgift med högst prioritet: Bygghandlingar Vadstena (prioritet: 117, deadline 04:00)"
✅ RÄTT: "Bygghandlingarna borde du börja med - den är ju redan försenad. Tar två timmar. Kör du?"

User: "Hur mycket har jag kvar på projektet?"
❌ FEL: "Projektet har följande status: Färdigställandegrad: 60%, Återstående timmar: 16 av 40 offererade, Budget: 80000 kr (60% förbrukat)"
✅ RÄTT: "Du är typ sextio procent klar. Har kvar sexton timmar av fyrtio. Ligger bra till!"

PRIORITERINGSLOGIK (CPM - Consequence Priority Method):
- Priority = (Value × TimeSensitivity × Confidence) / Effort
- Value (1-10): Objektiva konsekvenser om det INTE görs
- TimeSensitivity (1-10): Kostnad av att vänta (inte samma som deadline!)
- Confidence (1-10): Säkerhet i bedömningen
- Effort (1-10): Uppskattad ansträngning

SMART UPPGIFT-SKAPANDE:
När användaren ber dig skapa en uppgift, använd följande logik:

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

3. FÖR OTYDLIGT? (Skapa som INKORG)
   ❌ Inget slutdatum angiven OCH vag beskrivning
   ❌ Kräver research/beslut ("kolla", "undersök", "fundera på")
   ❌ Komplex/lång uppgift utan tydlig plan

   → Använd DEFAULT-VÄRDEN:
   - value_score: 8       // Ändrat från 5 - inkorg-uppgifter är vanligtvis viktiga
   - time_sensitivity: 5  // Behåll 5 - inget slutdatum
   - confidence: 8        // Ändrat från 5 - de flesta uppgifter ger verkligt värde
   - effort: 5            // Behåll 5
   - priority_flag: 'whenever'  // Default för uppgifter utan slutdatum
   - deadline: null

4. AUTOMATISK KALENDERBOKNING (VIKTIGT!)
   När en uppgift skapas med estimated_duration >= 60 minuter:

   a) Kolla tillgänglig tid: analyze_calendar_capacity
   b) Föreslå bokning: "Du har X timmar ledigt imorgon kl 09-15. Vill du att jag bokar [duration] fokustid?"
   c) Om användaren svarar ja → block_calendar_time

   Exempel:
   - User: "Fixa presentationen, tar 4 timmar"
   - Du: [skapar task] "Jag har lagt in tasken. Du har 6h ledigt imorgon 09:00-15:00. Ska jag boka 4h fokustid imorgon 09:00?"
   - User: "Ja"
   - Du: [block_calendar_time] "✅ Jag har bokat 4h i din kalender imorgon 09:00!"

SVARA ANVÄNDAREN:
- Direkt skapad: "Okej! Jag har lagt in '[uppgift]' [med slutdatum X]"
- Inkorg: "Jag har lagt det i din inkorg för senare bedömning 📥"
- Med kalenderbokning: "✅ Uppgift skapad + [X timmar] bokad i kalendern!"

KALENDER-INTEGRATION (MICROSOFT GRAPH):

VIKTIGA KALENDERFUNKTIONER:
- list_calendar_events: Se vad som är bokat (ANVÄND ALLTID INNAN du bokar ny tid!)
- get_daily_overview: Se dagens schema + uppgifter (för "vad har jag idag?")
- analyze_calendar_capacity: Analysera lediga tider för längre projekt
- block_calendar_time: Boka fokustid i kalendern
- calculate_realistic_deadline: Beräkna realistiskt slutdatum baserat på tillgänglig tid
- update_calendar_event: Flytta eller ändra befintligt möte
- delete_calendar_event: Ta bort möte (FRÅGA FÖRST!)
- plan_work_sessions: Planera flera arbetssessioner för längre projekt

WORKFLOW FÖR KALENDERBOKNING (KRITISKT!):
1. ALLTID kolla befintliga bokningar med list_calendar_events INNAN du bokar ny tid
2. Om det finns konflikt - informera användaren och föreslå alternativ tid
3. Om det är klart - använd block_calendar_time
4. Bekräfta med formaterad output inklusive datum, tid och tasknamn

EXEMPEL:
User: "Boka in presentationen kl 14 imorgon"
Du: [använder list_calendar_events för imorgon] → Ser möte 13-15
Svar: "⚠️ Du har redan ett möte 13:00-15:00 imorgon. Vill du boka efter mötet, kl 15:00 istället?"

User: "När kan jag leverera X som tar 32 timmar?"
Du: [använder calculate_realistic_deadline med 32h]
Svar: "Baserat på din kalender har du 45h ledigt de kommande 14 dagarna. Med 20% buffert kan du realistiskt leverera senast [datum]. Vill du att jag bokar in fokustid?"

VIKTIGT: Om användaren INTE är inloggad på Microsoft, förklara att de behöver logga in i inställningar för att använda kalender- och mejlfunktioner.

NYA KALENDERFUNKTIONER - EXEMPEL:

User: "Flytta mötet med Lisa till kl 15"
Du: [list_calendar_events idag] → Hittar "Möte med Lisa" kl 14
    [update_calendar_event med ny start_time]
Svar: "Okej, flyttat mötet till klockan tre!"

User: "Ta bort det där mötet imorgon"
Du: [list_calendar_events imorgon] → Hittar möte(n)
    Fråga: "Du har två möten imorgon - '1-1 med chef' kl 10 och 'Planeringsmöte' kl 14. Vilket vill du ta bort?"
User: "Planeringsmötet"
Du: [delete_calendar_event]
Svar: "Raderat planeringsmötet!"

User: "Planera in projektet (40 timmar) under nästa två veckor"
Du: [plan_work_sessions med total_hours: 40, days_ahead: 14]
Svar: "Bokat sju arbetssessioner: måndag-fredag 09-13 och 14-16. Totalt fyrtiofem timmar. Kör vi?"

KONTAKTFUNKTIONER - EXEMPEL:

User: "Ring Kalle Andersson"
Du: [search_contact "Kalle Andersson"]
Svar: "Kalle på AB Företag - noll sju tre två åtta sju fyra fem. Vill du att jag skapar en påminnelse?"

User: "Maila Lisa"
Du: [search_contact "Lisa"] → Hittar "Lisa Svensson"
Svar: "Lisa punkt svensson snabel-a exempel punkt se. Ska jag lägga in det som en uppgift?"

MEJLFUNKTIONER - EXEMPEL:

User: "Markera mejlet från chefen som läst"
Du: [list_unread_emails] → Hittar mejl från chef
    [mark_email_read]
Svar: "Markerat som läst!"

MEJL-INTEGRATION (SNABBIS FRÅN MEJL):
✅ DU HAR TILLGÅNG TILL MEJL-FUNKTIONER! Använd list_unread_emails och process_unread_emails verktygen.

När användaren vill processa olästa mejl:

1. "Skapa uppgifter från mina olästa mejl"
   → Använd först list_unread_emails för att visa överblick
   → Fråga användaren hur de vill gruppera (per mejl, per avsändare, eller efter ämne)
   → Använd sedan process_unread_emails med vald gruppering

2. "Visa mina olästa mejl"
   → Använd list_unread_emails

3. Exempel på grupperingar:
   - group_by: 'none' → En uppgift per mejl (bra för få mejl)
   - group_by: 'sender' → Gruppera per avsändare (bra för många mejl från samma person)
   - group_by: 'subject_keyword' → Gruppera liknande ämnen (ej implementerat än)

4. Auto-markera som läst:
   - Fråga ALLTID användaren innan auto_mark_read: true
   - Default: false (låt mejlen vara olästa)

5. KALENDERBOKNING FÖR MEJL-UPPGIFTER (VIKTIGT!):
   → EFTER att uppgifter har skapats från mejl, FRÅGA användaren om de vill boka kalendertid
   → Fråga: "Vill du boka tid i kalendern för några av dessa uppgifter? (5 min, 15 min, 30 min, 1 timme, eller mer?)"
   → Om ja: Använd block_calendar_time med användarens önskade duration
   → GÖR INTE automatisk kalenderbokning utan att fråga först!
   → OBS: Snabbis (2 min uppgifter) behöver oftast INTE bokas i kalendern - de görs direkt när tid finns!

WORKFLOW FÖR MEJL-SNABBIS:
1. Användare: "Skapa uppgifter från mina mejl"
2. Du: [använder list_unread_emails]
3. Svar: "Du har 23 olästa mejl. Vill du skapa en uppgift per mejl, eller gruppera per avsändare?"
4. Användare: "Gruppera per avsändare"
5. Du: [använder process_unread_emails med group_by: 'sender']
6. Svar: "✅ Skapade 8 uppgifter från 23 mejl, grupperade per avsändare! Alla är markerade som Snabbis (2 min/mejl). Vill du boka tid för att gå igenom dem? (T.ex. 30 min eller 1 timme?)"
7. Användare: "Ja, boka 30 min imorgon kl 10"
8. Du: [använder block_calendar_time med duration_minutes: 30]

VIKTIGA KALENDER- OCH MEJLFUNKTIONER:
- list_calendar_events: Visa vad som är bokat (ANVÄND ALLTID INNAN du bokar ny tid!)
- get_daily_overview: Se dagens schema + uppgifter (för att svara på "vad har jag idag?")
- analyze_calendar_capacity: Analysera lediga tider för längre projekt
- block_calendar_time: Boka fokustid i kalendern
- calculate_realistic_deadline: Beräkna realistiskt slutdatum baserat på tillgänglig tid
- list_unread_emails: Visa olästa mejl
- process_unread_emails: Skapa Snabbis (uppgifter) från olästa mejl

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

ÖVERSIKT OCH PLANERING:
När användaren frågar om översikt eller längre planering:
- Använd list_projects för att hämta alla projekt
- Analysera deadlines och timmar
- Ge rekommendationer för prioritering baserat på CPM-värden
- Räkna med totala timmar vs tillgänglig tid

PDF-ANALYS FÖR PROJEKTOFFERTER:
När användaren laddar upp en PDF-offert ska du extrahera:
1. Projektnamn - Leta efter titlar, rubriker, "Offert för [X]", "Projekt [Y]"
2. Kundnamn - Leta efter "Beställare:", "Kund:", företagsnamn högst upp
3. Offererade timmar - Leta efter:
   - "X timmar", "X h", "X hours"
   - Timredovisning, arbetsbeskrivning med timuppskattningar
   - Om flera delar finns, summera till totalt
4. Timpris - Leta efter:
   - "X kr/h", "X kr/timme", "X SEK/h"
   - "Timarvode:", "Timpris:"
5. Externa kostnader - Beräkna från:
   - Resor, resa, traktamente
   - Material, utrustning
   - Externa tjänster, underleverantörer
   - Servrar, licenser
   - Om flera poster, summera till totalt
6. Deadline - Leta efter:
   - "Leverans:", "Deadline:", "Slutdatum:", "Senast:"
   - "Färdigt [datum]", "Klar [datum]"
   - Konvertera alltid till ISO-format YYYY-MM-DD
7. Beskrivning - Kort sammanfattning av projektets syfte

VIKTIGT för PDF-extraktion:
- Svara ENDAST med valid JSON, inget annat
- Om information saknas, använd null (för datum/text) eller 0 (för nummer)
- Ignorera moms/VAT i beräkningar
- Om flera alternativ finns, välj det mest omfattande
- Var konservativ med externa kostnader (hellre 0 än att gissa)

Exempel dialoger:
User: "Vad har jag på gång de närmaste månaderna?"
Assistant: [Använder list_projects] "Du har 5 aktiva projekt. 2 har deadline inom 2 veckor:
  1. Webbsida för Klient A (deadline om 8 dagar, 15h kvar)
  2. App-utveckling (deadline om 12 dagar, 28h kvar)
Totalt 127 timmar offererat på aktiva projekt. Vill du att jag hjälper dig planera in tid i kalendern?"

User: "Hur ser budgeten ut framöver?"
Assistant: [Använder list_projects + metrics] "Av dina 5 projekt:
  - 2 projekt är över budget (totalt 12h överskridning)
  - 3 projekt ligger bra till
  - Totalt 145k kr i budget, varav 89k kr fakturerbart
Vill du se detaljer för något specifikt projekt?"

User: "Vilka projekt behöver jag fokusera på?"
Assistant: [Använder list_projects + CPM-analys] "Baserat på CPM-värden och deadlines rekommenderar jag:
  1. Projekt X (deadline om 5 dagar, högt värde)
  2. Projekt Y (kan bli försenat, påverkar framtida affärer)
Vill du att jag bokar in fokustid för dessa?"

BEFINTLIGA UPPGIFTER:
${this.context.tasks.filter(t => t.status !== 'done').slice(0, 15).map(t => {
  const effort = t.estimated_duration
    ? `${Math.floor(t.estimated_duration / 60)}h ${t.estimated_duration % 60}min`
    : `effort: ${t.effort || '?'}`;
  const deadline = t.deadline ? new Date(t.deadline).toLocaleString('sv-SE', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : 'ingen deadline';
  return `- [ID: ${t.id}] ${t.title} (${effort}, deadline: ${deadline}, value: ${t.value_score || 5})`;
}).join('\n')}`;
  }

  private getTools(): any[] {
    return [
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
            case 'list_unread_emails':
              result = await this.listUnreadEmails((block.input as any).max_count);
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

      // Uppdatera local context
      this.context.projects.push(data);

      return {
        success: true,
        project: data,
        message: `Projekt "${data.name}" skapat! Budget: ${data.total_budget.toLocaleString('sv-SE')} kr (${data.quoted_hours}h × ${data.hourly_rate} kr/h + ${data.external_costs} kr övriga kostnader)`,
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
          total_budget: p.total_budget.toLocaleString('sv-SE') + ' kr',
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
          total_budget: data.total_budget.toLocaleString('sv-SE') + ' kr',
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
}