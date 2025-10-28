# AI Assistant Improvement Plan
**Datum:** 2025-10-28 (UPPDATERAD)
**Estimerad tid:** 12-16h → ~8h kvar (vissa steg redan implementerade!)
**Branch:** `feature/ai-improvements`
**Status:** DELVIS IMPLEMENTERAT - Se nedan för färdiga steg

---

## ✅ REDAN IMPLEMENTERAT (2025-10-28)

### **1. Email-funktioner**
**Status:** ✅ KLART - Implementerat 2025-10-27
- `create_email_draft` - AI skapar mejlutkast i Outlook
- `search_emails`, `list_all_emails`, `get_email_content`, `mark_email_read`
- Progressiv djupsökning (150 → 300 → 500 → 1000 mejl)
- Fungerande implementation i `microsoft-graph.ts` och `claude-conversation.ts`

### **2. Context Caching**
**Status:** ✅ KLART - Implementerat 2025-10-27
- Fil: `src/services/claude-conversation.ts:382-399`
- System prompt cachas automatiskt (90% kostnadsbesparing)
- `cache_control: { type: 'ephemeral' }` aktiverad
- **Impact:** Sonnet-kvalitet till Haiku-pris ($0.008 → $0.002 per query)

### **3. MS Graph Token Auto-refresh**
**Status:** ✅ KLART - Implementerat 2025-10-28
- MicrosoftGraphContext med auto-refresh (5 min innan expiry)
- Smart token refresh i microsoft-graph.ts
- Event-baserad status (ingen polling)
- **Impact:** Logga in ~1 gång/dag istället för varje timme
- **Dokumentation:** MS_GRAPH_FIXES.md

### **4. Voice Improvements**
**Status:** ✅ KLART - Implementerat 2025-10-28
- Partial transcript display (blå box under inspelning)
- Standardiserad TTS localStorage key (`prio-tts-speed`)
- **Impact:** Bättre UX med instant feedback
- **Dokumentation:** TRANSCRIPTION_ANALYSIS.md

---

## 🎯 MÅL

Förbättra AI-assistenten med fokus på:
1. **Latens:** Låg upplevd latens (Haiku, men Sonnet om kvalitet brister)
2. **Kvalitet:** Inga dumma fel (särskilt tid/datum-awareness)
3. **Learning:** User preferences från start (inte över tid)
4. **Autonomi:** Mejl-scanning, auto-kalenderbokning

---

## 📋 IMPLEMENTERING (7 steg, riskordnade)

### **STEG 1: Email AI - Auto-create Events** (~3h) ⚠️ HÖGST RISK

**Problem att lösa:**
- Bokningsbekräftelser (flyg, tåg, hotell) måste manuellt läggas in i kalender
- AI får samma fråga flera gånger ("När går flyget?")

**Lösning:**
1. Utöka befintlig `/api/email-webhook` (server/index.js rad 203-370)
2. Detektera bokningar: subject/body innehåller "bokning", "bekräftelse", "flight", "tåg"
3. Anropa Claude för att extrahera:
   - Titel (t.ex. "SAS SK1432 Stockholm-Göteborg")
   - Avgångstid (ISO datetime)
   - Ankomsttid (ISO datetime)
   - Plats (Arlanda T5, Stockholm C, etc.)
   - Detaljer (bokningsnummer, etc.)
4. Skapa kalenderhändelse via MS Graph API
5. Skicka bekräftelsemejl tillbaka till användaren

**Implementation:**
```javascript
// server/index.js - efter rad 285 (efter Claude extraktion)
const isBooking = subject.includes('bokning') ||
                  subject.includes('bekräftelse') ||
                  body.includes('flight') ||
                  body.includes('tåg') ||
                  body.includes('SJ') ||
                  body.includes('SAS');

if (isBooking) {
  const extractedBooking = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    system: `Extrahera bokningsdetaljer från mejlet.

    Returnera JSON:
    {
      "title": "SAS SK1432 Stockholm-Göteborg",
      "departure_time": "2025-10-29T14:10:00",
      "arrival_time": "2025-10-29T15:15:00",
      "location": "Arlanda Terminal 5",
      "details": "Bokningsnummer: ABC123, Check-in stänger 13:10"
    }`,
    messages: [{ role: 'user', content: subject + '\n\n' + body }]
  });

  const booking = JSON.parse(extractedBooking.content[0].text);

  // Skapa kalenderhändelse
  await msGraph.createEvent({
    subject: booking.title,
    start: booking.departure_time,
    end: booking.arrival_time,
    location: booking.location,
    body: booking.details
  });

  // Skicka bekräftelse
  await sendEmail({
    to: fromEmail,
    subject: 'AI har lagt in din bokning',
    body: `✅ ${booking.title} är inlagd i kalendern!`
  });
}
```

**Test:**
1. Mejla bokningsbekräftelse till ai@minprio.se
2. Kolla att kalenderhändelse skapas
3. Kolla att bekräftelsemejl skickas

**Risk:** Kan bryta befintlig email-webhook funktionalitet

**Rollback:** `git reset --hard HEAD~1`

**Commit:** `feat: auto-create calendar events from booking emails`

---

### **STEG 2: User Preferences + Smart Cache** (~2h) ⚠️ HÖG RISK

**Problem att lösa:**
- AI vet ingenting om användaren från start
- Användaren måste förklara samma sak varje gång
- Preferenser läses från DB varje API-call (långsamt)

**Lösning:**
1. Supabase tabell för att spara preferenser
2. Redis cache (24h TTL) + in-memory cache (0ms latens)
3. Inkludera i system prompt varje conversation
4. UI för att sätta preferenser (Settings)

**Implementation:**

**A) Supabase migration:**
```sql
-- migrations/007_user_preferences.sql
CREATE TABLE user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  work_hours jsonb DEFAULT '{"start": "09:00", "end": "17:00", "days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}',
  travel_patterns jsonb DEFAULT '{"frequent_routes": [], "preferred_airline": null}',
  meeting_preferences jsonb DEFAULT '{"buffer_before": 15, "buffer_after": 0, "max_per_day": 4}',
  communication_style text DEFAULT 'casual',
  custom_context text,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);
```

**B) ClaudeConversation cache:**
```typescript
// src/services/claude-conversation.ts
class ClaudeConversation {
  private cachedPreferences: UserPreferences | null = null;

  async getPreferences(): Promise<UserPreferences> {
    // 1. In-memory cache (0ms)
    if (this.cachedPreferences) {
      console.log('✅ Preferences from memory cache');
      return this.cachedPreferences;
    }

    // 2. Redis cache (5ms)
    const redisKey = `preferences:${this.context.userId}`;
    const cached = await redis.get(redisKey);
    if (cached) {
      console.log('✅ Preferences from Redis');
      this.cachedPreferences = JSON.parse(cached);
      return this.cachedPreferences;
    }

    // 3. Supabase (50ms)
    console.log('⏳ Fetching preferences from Supabase...');
    const { data } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', this.context.userId)
      .single();

    // Cache för 24h
    await redis.setex(redisKey, 86400, JSON.stringify(data));
    this.cachedPreferences = data;

    return data;
  }

  private async buildSystemPrompt(): Promise<string> {
    const prefs = await this.getPreferences();

    return `Du är en svensk AI-assistent...

ANVÄNDARENS PREFERENSER:
${prefs.custom_context || 'Inga anpassade preferenser ännu'}

Arbetstider: ${prefs.work_hours.start}-${prefs.work_hours.end} (${prefs.work_hours.days.join(', ')})
Resvanor: ${prefs.travel_patterns.frequent_routes.join(', ') || 'Inga frekventa rutter'}
Föredraget flygbolag: ${prefs.travel_patterns.preferred_airline || 'Inget föredraget'}
Kommunikationsstil: ${prefs.communication_style}
...`;
  }
}
```

**C) Settings UI:**
```tsx
// src/views/SettingsView.tsx
export function UserPreferencesSection() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);

  return (
    <div className="e-card">
      <h3>Dina preferenser</h3>

      <TextAreaComponent
        placeholder="Berätta om dig själv, hur du jobbar, reser, etc..."
        value={prefs?.custom_context}
        onChange={async (e) => {
          await supabase.from('user_preferences').upsert({
            user_id: user.id,
            custom_context: e.value
          });

          // Invalidera cache
          await fetch('/api/preferences/invalidate');
        }}
      />

      <p>Exempel: "Jag jobbar som restaureringskonsult, reser till Stockholm varje vecka med SAS,
      brukar jobba 9-17 men flexibelt, föredrar casual kommunikation"</p>
    </div>
  );
}
```

**Test:**
1. Sätt preferences i Settings
2. Fråga AI: "När brukar jag jobba?"
3. AI ska svara baserat på preferences

**Risk:** Kan påverka alla AI-svar om prompten blir för lång

**Rollback:** `git reset --hard HEAD~2`

**Commit:** `feat: user preferences with smart caching`

---

### **STEG 3: Chat History i UI** (~2h) ⚠️ MEDEL-HÖG RISK

**Problem att lösa:**
- Redis sparar endast 24h historik
- Ingen permanent logg av konversationer
- Kan inte söka i tidigare samtal

**Lösning:**
1. Spara alla conversations i Supabase (permanent)
2. Hämta historik vid mount (scroll för äldre meddelanden)
3. Sökfunktion för att hitta tidigare konversationer

**Implementation:**

**A) Supabase migration:**
```sql
-- migrations/008_conversation_history.sql
CREATE TABLE conversation_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id),
  messages jsonb NOT NULL,
  summary text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_conv_history_user_date ON conversation_history(user_id, created_at DESC);
CREATE INDEX idx_conv_history_summary ON conversation_history USING gin(to_tsvector('swedish', summary));
```

**B) Save after conversation:**
```typescript
// src/components/VoiceInterface.tsx
async function saveConversation() {
  if (conversationHistory.length === 0) return;

  // Generera AI-summary
  const summary = await claudeConversation.chat(
    `Sammanfatta denna konversation i 1-2 meningar: ${JSON.stringify(conversationHistory)}`
  );

  await supabase.from('conversation_history').insert({
    user_id: user.id,
    messages: conversationHistory,
    summary
  });

  console.log('✅ Conversation saved to history');
}

// Anropa när conversation avslutas
useEffect(() => {
  return () => saveConversation();
}, []);
```

**C) Load history i ChatUI:**
```tsx
// src/components/ChatComponent.tsx
const [allMessages, setAllMessages] = useState<Message[]>([]);

useEffect(() => {
  async function loadHistory() {
    const { data } = await supabase
      .from('conversation_history')
      .select('messages')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10); // Senaste 10 conversations

    const flattened = data.flatMap(conv => conv.messages);
    setAllMessages(flattened);
  }

  loadHistory();
}, []);
```

**D) Search function:**
```tsx
<SearchBox
  placeholder="Sök i tidigare samtal..."
  onChange={async (query) => {
    const { data } = await supabase
      .from('conversation_history')
      .select('*')
      .textSearch('summary', query)
      .eq('user_id', user.id)
      .limit(20);

    setSearchResults(data);
  }}
/>
```

**Test:**
1. Ha 3-4 konversationer med AI
2. Stäng och öppna app → historik ska finnas kvar
3. Sök "flyg" → ska hitta conversation om flyg

**Risk:** Kan påverka ChatUI rendering

**Rollback:** `git reset --hard HEAD~3`

**Commit:** `feat: persistent chat history with search`

---

### **STEG 4: Time Awareness Fix** (~2h) ⚠️ MEDEL RISK

**Problem att lösa:**
- Flyg 18:20 blir "tjugo över sex i morse" (FEL!)
- AI säger taxi kl 16 när kalendern visar kl 17 (FEL!)
- Dålig svensk tidsförståelse (morgon/kväll/natt)

**Lösning:**
1. Förbättra tid-formatering i system prompt
2. Explicit svensk tid i varje conversation
3. Bättre calendar event matching (läs FAKTISK tid)

**Implementation:**

**A) Förbättrad system prompt:**
```typescript
// src/services/claude-conversation.ts
private buildSystemPrompt(): string {
  const now = new Date();
  const swedenTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' }));
  const today = swedenTime.toISOString().split('T')[0];
  const currentTime = swedenTime.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Stockholm'
  });

  // Tid på dygnet
  const hour = swedenTime.getHours();
  let timeOfDay = '';
  if (hour >= 6 && hour < 12) timeOfDay = 'morgon';
  else if (hour >= 12 && hour < 18) timeOfDay = 'eftermiddag';
  else if (hour >= 18 && hour < 22) timeOfDay = 'kväll';
  else timeOfDay = 'natt';

  return `Du är en svensk AI-assistent...

DAGENS DATUM: ${today}
AKTUELL TID (Sverige): ${currentTime} (${timeOfDay})

VIKTIGT - TIDSFÖRSTÅELSE:
- 00:00-06:00 = "natt" (t.ex. "klockan fyra i natt")
- 06:00-12:00 = "morgon" (t.ex. "klockan åtta på morgonen")
- 12:00-18:00 = "eftermiddag" (t.ex. "klockan tre på eftermiddagen")
- 18:00-22:00 = "kväll" (t.ex. "klockan sju på kvällen")
- 22:00-24:00 = "kväll/natt" (t.ex. "klockan elva på kvällen")

När du läser tider från kalendern - ANVÄND EXAKT TID från event.start, inte gissa!

Exempel:
- Flight departure 18:20 → "sex tjugo på KVÄLLEN" (INTE "i morse"!)
- Meeting at 14:00 → "klockan två på eftermiddagen"
- Taxi at 17:00 → "klockan fem på eftermiddagen"
...`;
}
```

**B) Calendar event matching:**
```typescript
// När AI pratar om kalenderhändelser
const taxiEvent = calendarEvents.find(e =>
  e.subject.toLowerCase().includes('taxi')
);

if (taxiEvent) {
  const eventTime = new Date(taxiEvent.start.dateTime);
  const hour = eventTime.getHours();
  const minute = eventTime.getMinutes();

  // Använd EXAKT tid från kalendern
  return `Taxi klockan ${hour}:${minute.toString().padStart(2, '0')}`;
}
```

**Test:**
1. Fråga: "När går flyget?" (18:20 avgång)
   → Förväntat: "sex tjugo på kvällen"
2. Fråga: "När går taxin?" (17:00 i kalender)
   → Förväntat: "fem på eftermiddagen" (läst från kalender)

**Risk:** Kan göra prompt för lång

**Rollback:** `git reset --hard HEAD~4`

**Commit:** `fix: improve Swedish time awareness and calendar matching`

---

### **STEG 5: Spam Filtering** (~30min) ⚠️ MEDEL RISK

**Problem att lösa:**
- Nyhetsbrev och marketing-mejl syns i lista
- AI läser upp spam-mejl

**Lösning:**
Filtrera bort spam EFTER MS Graph returnerar mejl, INNAN visning till användaren

**Implementation:**
```typescript
// src/services/claude-conversation.ts - i executeTools()

function isSpam(email: any): boolean {
  const spamKeywords = [
    'unsubscribe', 'avregistrera', 'newsletter', 'nyhetsbrev',
    'marknadsföring', 'erbjudande', 'kampanj', 'rabatt',
    'prenumerera', 'marketing'
  ];

  const spamSenders = [
    'noreply@', 'no-reply@', 'newsletter@', 'marketing@',
    'info@', 'support@'
  ];

  // Check subject
  const subjectHasSpam = spamKeywords.some(kw =>
    email.subject?.toLowerCase().includes(kw)
  );

  // Check sender
  const senderIsSpam = spamSenders.some(sender =>
    email.from?.emailAddress?.address?.toLowerCase().includes(sender)
  );

  // MS Graph categories
  const categoryIsSpam = email.categories?.includes('Promotions') ||
                         email.categories?.includes('Newsletter');

  return subjectHasSpam || senderIsSpam || categoryIsSpam;
}

// Applicera filter
case 'list_unread_emails': {
  const rawEmails = await msGraphTools.listUnreadEmails(max_count);
  const filtered = rawEmails.filter(e => !isSpam(e));

  return {
    type: 'tool_result',
    content: `Hittade ${filtered.length} viktiga mejl (filtrerade ${rawEmails.length - filtered.length} spam)`
  };
}

case 'search_emails': {
  const rawResults = await msGraphTools.searchEmails(query, search_in, max_count);
  const filtered = rawResults.filter(e => !isSpam(e));

  return {
    type: 'tool_result',
    content: JSON.stringify(filtered, null, 2)
  };
}
```

**Test:**
1. Skicka nyhetsbrev till dig själv (med "unsubscribe" i body)
2. Kör list_unread_emails
3. Verifiera att nyhetsbrevet filtreras bort

**Risk:** Kan filtrera bort viktiga mejl av misstag

**Rollback:** `git reset --hard HEAD~5`

**Commit:** `feat: spam filtering for email lists`

---

### **STEG 6: Web Search (SJ/Flyg)** (~2h) ✅ LÅG RISK

**Problem att lösa:**
- Kan inte söka tågtider direkt
- Måste kolla SJ.se manuellt

**Lösning:**
Integration med Trafikverket Open API för att söka avgångar

**Implementation:**

**A) Trafikverket API-nyckel:**
```bash
# .env
TRAFIKVERKET_API_KEY=your_api_key
```

**B) Nytt tool:**
```typescript
// src/services/claude-conversation.ts - i getTools()
{
  name: 'search_train_departures',
  description: 'Sök tågtider via Trafikverket API',
  input_schema: {
    type: 'object',
    properties: {
      from_station: {
        type: 'string',
        description: 'Avgångsstation (t.ex. "Stockholm Central", "Uppsala C")'
      },
      to_station: {
        type: 'string',
        description: 'Destination (t.ex. "Gävle C", "Göteborg C")'
      },
      date: {
        type: 'string',
        description: 'Datum (ISO format, t.ex. "2025-10-29")'
      },
      before_time: {
        type: 'string',
        description: 'Måste vara framme innan (t.ex. "11:00")'
      }
    },
    required: ['from_station', 'to_station']
  }
}
```

**C) Backend implementation:**
```javascript
// server/index.js - ny endpoint
app.post('/api/trafikverket/search-trains', authenticateUser, async (req, res) => {
  const { from_station, to_station, date, before_time } = req.body;

  const response = await fetch('https://api.trafikinfo.trafikverket.se/v2/data.json', {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body: `
      <REQUEST>
        <LOGIN authenticationkey="${process.env.TRAFIKVERKET_API_KEY}" />
        <QUERY objecttype="TrainAnnouncement" schemaversion="1.9">
          <FILTER>
            <EQ name="LocationSignature" value="${from_station}" />
            <EQ name="ToLocation.LocationName" value="${to_station}" />
            <GTE name="AdvertisedTimeAtLocation" value="${date}T00:00:00" />
          </FILTER>
        </QUERY>
      </REQUEST>
    `
  });

  const data = await response.json();
  const departures = data.RESPONSE.RESULT[0].TrainAnnouncement;

  // Filtrera efter before_time om specificerat
  let filtered = departures;
  if (before_time) {
    filtered = departures.filter(d => {
      const arrivalTime = new Date(d.ToLocation[0].AdvertisedTimeAtLocation);
      const [hours, minutes] = before_time.split(':');
      const maxTime = new Date(date);
      maxTime.setHours(parseInt(hours), parseInt(minutes));

      return arrivalTime <= maxTime;
    });
  }

  res.json({
    departures: filtered.map(d => ({
      train_number: d.AdvertisedTrainIdent,
      departure: d.AdvertisedTimeAtLocation,
      arrival: d.ToLocation[0].AdvertisedTimeAtLocation,
      track: d.TrackAtLocation
    }))
  });
});
```

**Test:**
1. Fråga: "Jag behöver vara i Gävle imorgon innan kl 11, vilka tåg går?"
2. AI ska anropa search_train_departures
3. Presentera avgångar som hinner fram

**Risk:** Låg - rent tillägg, påverkar inget befintligt

**Rollback:** `git reset --hard HEAD~6`

**Commit:** `feat: train departure search via Trafikverket API`

---

### **STEG 7: Async Email Queries** (~1h) ✅ LÅG RISK

**Problem att lösa:**
- Vissa queries tar lång tid (söka i 100+ mejl)
- Användaren vill kunna mejla en fråga och få svar senare

**Lösning:**
Endpoint för email-to-AI queries med async processing

**Implementation:**

**A) Email endpoint:**
```javascript
// server/index.js
app.post('/api/email-ai-query', async (req, res) => {
  const { from, subject, body } = req.body;

  // Validera avsändare (samma som email-webhook)
  if (from !== 'daniel@nymberg.se') {
    return res.status(403).json({ error: 'Unauthorized sender' });
  }

  // Svara OK direkt
  res.json({ success: true, message: 'Query received, processing...' });

  // Processa i bakgrunden
  processEmailQuery(from, subject, body).catch(console.error);
});

async function processEmailQuery(userEmail, subject, body) {
  try {
    // 1. Hämta user
    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', userEmail)
      .single();

    // 2. Bygg context
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'not_started');

    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id);

    // 3. Anropa Claude (Sonnet för kvalitet vid async)
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      system: buildSystemPrompt({ tasks, projects, userId: user.id }),
      messages: [{ role: 'user', content: body }],
      tools: getAllTools(),
      max_tokens: 2000
    });

    // 4. Skicka svar via mejl (implementera med nodemailer eller SendGrid)
    await sendEmail({
      to: userEmail,
      subject: `Re: ${subject}`,
      body: response.content[0].text
    });

    console.log(`✅ Email query processed for ${userEmail}`);
  } catch (error) {
    console.error('Email query error:', error);
  }
}
```

**B) SendGrid integration (för att skicka mejl):**
```javascript
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail({ to, subject, body }) {
  await sgMail.send({
    from: 'ai@minprio.se',
    to,
    subject,
    text: body
  });
}
```

**Test:**
1. Mejla fråga till ai@minprio.se: "Vilka möten har jag nästa vecka?"
2. Vänta 30s
3. Få svar via mejl med lista på möten

**Risk:** Låg - separat feature, påverkar inget befintligt

**Rollback:** `git reset --hard HEAD~7`

**Commit:** `feat: async email queries with email response`

---

## 🧪 TEST-STRATEGI

Efter varje steg:
1. ✅ `npm run build` (TypeScript kompilerar)
2. ✅ Start dev server (`npm run dev`)
3. ✅ Test i webbläsare (manuell funktionstest)
4. ✅ Git commit lokalt med tydlig commit message
5. ✅ Fortsätt till nästa steg

Vid fel:
1. ❌ Läs felmeddelande
2. ❌ Fixa problemet
3. ❌ Test igen
4. ❌ Om det inte går att fixa på 30 min → Backa commit (`git reset --hard HEAD~1`)

Efter alla steg:
1. ✅ Final build (`npm run build`)
2. ✅ Kör alla 7 test cases manuellt
3. ✅ Daniel testar på morgonen
4. ✅ Om OK → Push till remote
5. ✅ Om något är skrot → Backa commits stegvis

---

## 🚀 DEPLOYMENT

**Branch:** `feature/ai-improvements`
**Push:** VÄNTAR tills Daniel har testat
**Merge:** Efter godkännande

---

## 📊 HAIKU vs SONNET

**Strategi:**
- Börjar med Haiku (snabbast, 500-800ms latens)
- Testar kvalitet med förbättrad prompt
- Om dumma fel kvarstår → Byter till Sonnet i selectModel()
- Multi-Agent kan vara aktuellt om det ger bättre kvalitet utan massiv latens

**Ekonomi:** Ignoreras - kvalitet och snabbhet är viktigare än kostnad

---

## 🔐 SÄKERHET

- Email webhook: HMAC signature validation (redan implementerat)
- Email AI queries: Validera avsändare (endast daniel@nymberg.se)
- Trafikverket API: API-nyckel i environment variable
- MS Graph: Befintliga permissions (inga nya permissions krävs)

---

## ✅ FÄRDIGT NÄR

- [ ] Alla 7 steg implementerade
- [ ] Alla 7 commits gjorda lokalt
- [ ] Build lyckas utan fel
- [ ] Dev server startar utan krasch
- [ ] Daniel har testat alla features
- [ ] Daniel godkänner push till remote

**Estimerad tid:** 12-16h arbete, klar tidigast vid lunch (14:00)
