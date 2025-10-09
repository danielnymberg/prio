# Säkerhetsrevision - Prio App
**Datum:** 2025-10-09
**Status:** Pre-production säkerhetsgranskning
**Genomförd av:** Claude Code (Automated Security Analysis)

---

## Executive Summary

Prio är en avancerad task management-app med CPM-prioritering, Microsoft Graph-integration (kalender/mejl), och Claude AI-assistans. Denna revision identifierar **15 kritiska säkerhetsområden** med konkreta åtgärder innan produktionsdrift.

**Nuvarande säkerhetsnivå:** 🟡 **Medium Risk** (produktionsklar med förbättringar)
**Rekommenderad åtgärdsnivå:** 🔴 **Hög prioritet** - Åtgärda kritiska punkter innan launch

---

## 1. KRITISKA SÄKERHETSRISKER (Måste åtgärdas)

### 🔴 1.1 Backend API - Ingen autentisering på endpoints

**Problem:**
```javascript
// server/index.js:202-261
app.post('/api/claude-chat', async (req, res) => {
  // INGEN AUTH CHECK! Vem som helst kan använda din Claude API-nyckel
  const response = await anthropic.messages.create({...});
});
```

**Risk:**
- Vem som helst kan skicka requests till din backend
- Kan tömma ditt Claude API-konto (kostar pengar!)
- Kan använda Azure Speech API (kostar pengar!)
- Kan läsa/skriva till Supabase via SERVICE_ROLE_KEY

**Åtgärd:**
```javascript
// Lägg till middleware för auth
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Applicera på alla API-routes
app.post('/api/claude-chat', authenticateUser, async (req, res) => {
  // Nu har vi req.user.id
});
```

---

### 🔴 1.2 Email Webhook - Svag validering

**Problem:**
```javascript
// server/index.js:64-73
const fromEmail = req.body.from || req.body.sender || '';
const allowedSender = 'daniel@nymberg.se';

if (!fromEmail.toLowerCase().includes(allowedSender)) {
  return res.status(403).json({...});
}
```

**Risk:**
- Email spoofing: Någon kan skicka från "daniel@nymberg.se.fake.com"
- Ingen HMAC-signatur från SendGrid valideras
- Kan missbrukas för att skapa tasks i din databas

**Åtgärd:**
```javascript
// SendGrid skickar en signature som bör valideras
const crypto = require('crypto');

app.post('/api/email-webhook', (req, res, next) => {
  // 1. Validera SendGrid signature (om du använder SendGrid)
  const signature = req.headers['x-twilio-email-event-webhook-signature'];
  const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'];

  if (signature && timestamp) {
    const payload = timestamp + JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', process.env.SENDGRID_WEBHOOK_SECRET)
      .update(payload)
      .digest('base64');

    if (signature !== expectedSignature) {
      return res.status(403).json({ error: 'Invalid signature' });
    }
  }

  // 2. Exakt match på email (inte "includes")
  const fromEmail = req.body.from;
  if (fromEmail !== 'daniel@nymberg.se') {
    return res.status(403).json({ error: 'Unauthorized sender' });
  }

  next();
});
```

**Alternativ:** Whitelist IP-adresser från SendGrid:
```javascript
const SENDGRID_IPS = [
  '149.72.0.0/16',
  '168.245.0.0/16',
  // ... se SendGrid docs
];
```

---

### 🔴 1.3 Supabase RLS (Row Level Security) - Verifiering saknas

**Problem:**
Ingen RLS-konfiguration hittades i projektet. Detta är **kritiskt** för dataintegritet.

**Risk:**
- Utan RLS kan användare potentiellt läsa/skriva till varandras data
- Service Role Key i backend bypassa RLS (korrekt), men frontend ANON key skyddar inte

**Åtgärd - Skapa RLS policies:**

```sql
-- tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- email_tasks table
ALTER TABLE email_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own email tasks"
  ON email_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email tasks"
  ON email_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email tasks"
  ON email_tasks FOR UPDATE
  USING (auth.uid() = user_id);

-- profiles table (om den finns)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

**Verifiera RLS:**
```javascript
// Test att försöka läsa annan users tasks
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('user_id', 'SOMEONE_ELSES_ID'); // Ska returnera tom array
```

---

### 🔴 1.4 API-nycklar exponerade i .env (potentiellt)

**Problem:**
Backend använder flera känsliga nycklar:
- `ANTHROPIC_API_KEY` (Claude - kostar pengar)
- `AZURE_SPEECH_KEY` (Azure - kostar pengar)
- `SPEECHMATICS_API_KEY` (Speechmatics - kostar pengar)
- `SUPABASE_SERVICE_ROLE_KEY` (Ger full databastillgång!)

**Risk:**
- Om `.env` hamnar i Git → nycklar läcker
- Om servern komprometteras → alla nycklar exponeras
- Service role key kan läsa/skriva/radera ALLT i Supabase

**Åtgärd:**

1. **Verifiera .gitignore:**
```bash
# Kontrollera att .env är ignorerad
grep -r "ANTHROPIC_API_KEY" .git/  # Får INTE ge träffar
```

2. **Använd environment secrets:**
   - Render.com: Environment → Add Secret
   - Vercel: Settings → Environment Variables
   - Railway: Settings → Variables

3. **Rotera alla nycklar om de är i Git:**
   - Anthropic: Skapa ny API-nyckel
   - Azure: Regenerate key
   - Supabase: Skapa ny service role key

4. **Lägg till API rate limiting:**
```javascript
const rateLimit = require('express-rate-limit');

const claudeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // Max 100 requests per 15 min
  message: 'Too many requests from this IP'
});

app.post('/api/claude-chat', claudeLimiter, authenticateUser, async (req, res) => {
  // ...
});
```

---

## 2. HÖGA RISKER (Bör åtgärdas före launch)

### 🟠 2.1 CORS - För öppen konfiguration

**Problem:**
```javascript
app.use(cors()); // Tillåter ALLA origins
```

**Risk:**
- Vem som helst kan göra requests från sin webbsida
- CSRF-attacker möjliga

**Åtgärd:**
```javascript
app.use(cors({
  origin: [
    'https://minprio.se',
    'https://www.minprio.se',
    'http://localhost:5173' // För development
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

### 🟠 2.2 Input Validation - Saknas på backend

**Problem:**
Backend validerar inte input-data ordentligt.

**Risk:**
- NoSQL injection (Supabase är PostgreSQL men risk finns)
- Oändligt stora requests (DoS)
- Skadlig data i databas

**Åtgärd:**
```javascript
const { body, validationResult } = require('express-validator');

app.post('/api/claude-chat',
  authenticateUser,
  [
    body('messages').isArray().notEmpty(),
    body('messages.*.role').isIn(['user', 'assistant']),
    body('messages.*.content').isString().isLength({ max: 10000 }),
    body('max_tokens').optional().isInt({ min: 1, max: 4000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ...
  }
);
```

---

### 🟠 2.3 Error Messages - Läcker intern information

**Problem:**
```javascript
res.status(500).json({
  error: error.message // Kan innehålla stack traces, databaskonfiguration, etc
});
```

**Risk:**
- Attackare får information om systemets interna struktur

**Åtgärd:**
```javascript
// Prod-miljö: Generiska felmeddelanden
const isDevelopment = process.env.NODE_ENV === 'development';

app.post('/api/claude-chat', async (req, res) => {
  try {
    // ...
  } catch (error) {
    console.error('Claude API error:', error); // Logga hela felet

    res.status(500).json({
      error: isDevelopment
        ? error.message
        : 'Internal server error' // Generic message för prod
    });
  }
});
```

---

## 3. MEDELHÖGA RISKER (Förbättringsområden)

### 🟡 3.1 HTTPS - Ej verifierat

**Problem:**
Kod har ingen HTTPS-framtvingning.

**Risk:**
- Man-in-the-middle attacker
- Cookies/tokens kan stjälas

**Åtgärd:**
```javascript
// Redirect HTTP till HTTPS
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// Security headers
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://api.anthropic.com", "wss://eu2.rt.speechmatics.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

### 🟡 3.2 Session Management - 6h timeout bra, men...

**Bra:**
- 6 timmars inaktivitet logout ✅
- Auto-logout från både Prio och Microsoft ✅

**Förbättring:**
```javascript
// AuthContext.tsx - Lägg till session refresh warning
const INACTIVITY_TIMEOUT = 6 * 60 * 60 * 1000; // 6h
const WARNING_BEFORE_TIMEOUT = 5 * 60 * 1000; // Varna 5 min innan

useEffect(() => {
  let warningTimeout: NodeJS.Timeout | null = null;

  const resetTimers = () => {
    if (warningTimeout) clearTimeout(warningTimeout);
    if (inactivityTimeoutRef.current) clearTimeout(inactivityTimeoutRef.current);

    // Varna användaren 5 min innan
    warningTimeout = setTimeout(() => {
      toast('Du kommer loggas ut om 5 minuter pga inaktivitet', {
        duration: 60000,
        icon: '⏰'
      });
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE_TIMEOUT);

    // Logga ut
    inactivityTimeoutRef.current = setTimeout(async () => {
      toast.error('Utloggad efter 6 timmars inaktivitet');
      await signOut();
    }, INACTIVITY_TIMEOUT);
  };

  // ... rest of code
}, [user]);
```

---

### 🟡 3.3 Microsoft OAuth - Scope creep

**Problem:**
Appen begär många permissions:
```javascript
scopes: [
  'User.Read',
  'Calendars.Read',
  'Calendars.ReadWrite',
  'Mail.Read',
  'Mail.ReadWrite',
  'Contacts.Read',
]
```

**Risk:**
- Användare kan vara skeptiska till omfattande permissions
- Om token läcker → stor skada

**Åtgärd:**
1. **Använd minimal permissions först:**
   - Börja med `User.Read`, `Calendars.Read`, `Mail.Read`
   - Be om write-permissions endast när användaren faktiskt använder funktionen

2. **Incremental consent pattern:**
```javascript
export async function requestCalendarWritePermission() {
  const msal = await getMsalInstance();
  if (!msal) return false;

  try {
    // Be om write-permission först när användaren bokar tid
    await msal.acquireTokenPopup({
      scopes: ['Calendars.ReadWrite'],
      prompt: 'consent'
    });
    return true;
  } catch (error) {
    return false;
  }
}
```

3. **Token storage säkerhet:**
```javascript
// MSAL config
const msalConfig = {
  cache: {
    cacheLocation: 'localStorage', // ✅ OK för PWA
    storeAuthStateInCookie: true, // ✅ Bra för äldre browsers
  },
  // Lägg till:
  system: {
    tokenRenewalOffsetSeconds: 300 // Förnya 5 min innan expiry
  }
};
```

---

### 🟡 3.4 Logging & Monitoring - Saknas

**Problem:**
Ingen centraliserad logging eller monitoring.

**Risk:**
- Svårt att upptäcka säkerhetsincidenter
- Ingen audit trail

**Åtgärd:**

1. **Logga säkerhetshändelser:**
```javascript
// Backend
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'security.log', level: 'warn' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Logga viktiga händelser
app.post('/api/claude-chat', authenticateUser, (req, res) => {
  logger.info('Claude API request', {
    userId: req.user.id,
    timestamp: new Date().toISOString(),
    ip: req.ip,
  });
  // ...
});

// Logga failed auth
app.use((err, req, res, next) => {
  if (err.status === 401) {
    logger.warn('Unauthorized access attempt', {
      ip: req.ip,
      path: req.path,
      timestamp: new Date().toISOString(),
    });
  }
  next(err);
});
```

2. **Integrera error tracking:**
   - Sentry.io (gratis tier)
   - LogRocket
   - Datadog

---

## 4. POSITIVA SÄKERHETSASPEKTER ✅

**Bra gjort:**
1. ✅ **Supabase Auth** - Solid autentiseringslösning
2. ✅ **MSAL** - Officiell Microsoft OAuth-library
3. ✅ **localStorage för MSAL** - Korrekt för PWA
4. ✅ **6h timeout** - Bra balanspunkt
5. ✅ **Backend proxy för API-nycklar** - Claude/Azure keys ej i frontend
6. ✅ **Email whitelist** - Begränsar email-to-task
7. ✅ **Graceful shutdown** - Backend hanterar SIGTERM korrekt
8. ✅ **Error boundaries** - Frontend fångar React errors
9. ✅ **.gitignore** - .env är ignorerad
10. ✅ **TypeScript** - Typ-säkerhet minskar buggar

---

## 5. DATASKYDD (GDPR)

### 🔵 5.1 Personuppgifter som lagras

**Data i Supabase:**
- Email (från auth.users)
- Tasks (titel, beskrivning, deadlines)
- Projects (klientnamn, budget)
- Email content (från email_tasks)

**Data i Microsoft:**
- Kalender (bokning av fokustid)
- Email (läsa olästa mejl)

**Rekommendationer:**
1. **Lägg till Privacy Policy** (obligatoriskt för GDPR)
2. **Cookie consent** (om ni använder tracking)
3. **Data export/delete** - Ge användare möjlighet att:
```javascript
// Exportera all data
export async function exportUserData(userId: string) {
  const { data: tasks } = await supabase.from('tasks').select('*').eq('user_id', userId);
  const { data: projects } = await supabase.from('projects').select('*').eq('user_id', userId);

  return {
    tasks,
    projects,
    exportedAt: new Date().toISOString()
  };
}

// Radera all data
export async function deleteUserData(userId: string) {
  await supabase.from('tasks').delete().eq('user_id', userId);
  await supabase.from('projects').delete().eq('user_id', userId);
  await supabase.from('email_tasks').delete().eq('user_id', userId);
  await supabase.auth.admin.deleteUser(userId); // Kräver service role
}
```

---

## 6. KOSTNADSHANTERING (API Costs)

### 💰 6.1 Claude API - Okontrollerad kostnad

**Problem:**
Ingen kostnadsbegränsning eller user quotas.

**Risk:**
- En användare kan köra tusental requests
- Kostar ~$0.003/request → $3/1000 requests

**Åtgärd:**

1. **User quotas:**
```javascript
// Supabase function - check user quota
async function checkClaudeQuota(userId: string) {
  const { data: usage } = await supabase
    .from('user_api_usage')
    .select('claude_requests_today')
    .eq('user_id', userId)
    .single();

  const MAX_DAILY_REQUESTS = 100; // Free tier
  if (usage.claude_requests_today >= MAX_DAILY_REQUESTS) {
    throw new Error('Daily quota exceeded. Upgrade to Pro for more requests.');
  }

  // Increment counter
  await supabase.from('user_api_usage')
    .update({ claude_requests_today: usage.claude_requests_today + 1 })
    .eq('user_id', userId);
}
```

2. **Pricing tiers:**
```typescript
interface PricingTier {
  name: 'free' | 'pro' | 'business';
  claudeRequestsPerDay: number;
  azureTTSMinutesPerMonth: number;
  speechmaticsHoursPerMonth: number;
  price: number;
}

const TIERS: PricingTier[] = [
  { name: 'free', claudeRequestsPerDay: 50, azureTTSMinutesPerMonth: 30, speechmaticsHoursPerMonth: 1, price: 0 },
  { name: 'pro', claudeRequestsPerDay: 500, azureTTSMinutesPerMonth: 300, speechmaticsHoursPerMonth: 10, price: 99 },
  { name: 'business', claudeRequestsPerDay: -1, azureTTSMinutesPerMonth: -1, speechmaticsHoursPerMonth: -1, price: 299 },
];
```

3. **Caching:**
```javascript
// Cache vanliga Claude-svar
const NodeCache = require('node-cache');
const claudeCache = new NodeCache({ stdTTL: 3600 }); // 1h cache

app.post('/api/claude-chat', async (req, res) => {
  const cacheKey = JSON.stringify(req.body.messages);
  const cached = claudeCache.get(cacheKey);

  if (cached) {
    return res.json(cached);
  }

  const response = await anthropic.messages.create({...});
  claudeCache.set(cacheKey, response);
  res.json(response);
});
```

---

## 7. ÅTGÄRDSPLAN (Prioriterad)

### 🔴 Kritiskt (Gör NU innan launch)

1. [ ] **Lägg till autentisering på alla backend endpoints**
   - Estimerad tid: 4h
   - Kritikalitet: 🔴 Blocker

2. [ ] **Implementera Supabase RLS policies**
   - Estimerad tid: 2h
   - Kritikalitet: 🔴 Blocker

3. [ ] **Validera email webhook med HMAC signature**
   - Estimerad tid: 1h
   - Kritikalitet: 🔴 Blocker

4. [ ] **Verifiera att API-nycklar INTE är i Git**
   - Estimerad tid: 30 min
   - Kritikalitet: 🔴 Blocker

5. [ ] **Sätt CORS till production domain**
   - Estimerad tid: 15 min
   - Kritikalitet: 🔴 Blocker

### 🟠 Hög prioritet (Gör före public launch)

6. [ ] **Input validation på backend**
   - Estimerad tid: 3h
   - Kritikalitet: 🟠 Hög

7. [ ] **Rate limiting på API endpoints**
   - Estimerad tid: 2h
   - Kritikalitet: 🟠 Hög

8. [ ] **HTTPS enforcement + security headers**
   - Estimerad tid: 1h
   - Kritikalitet: 🟠 Hög

9. [ ] **User quotas för API costs**
   - Estimerad tid: 4h
   - Kritikalitet: 🟠 Hög

10. [ ] **Error logging & monitoring (Sentry)**
    - Estimerad tid: 2h
    - Kritikalitet: 🟠 Hög

### 🟡 Medium prioritet (Gör inom 2 veckor)

11. [ ] **Privacy Policy & GDPR compliance**
    - Estimerad tid: 4h
    - Kritikalitet: 🟡 Medium

12. [ ] **Data export/delete functions**
    - Estimerad tid: 3h
    - Kritikalitet: 🟡 Medium

13. [ ] **Session timeout warning**
    - Estimerad tid: 1h
    - Kritikalitet: 🟡 Medium

14. [ ] **Incremental OAuth consent**
    - Estimerad tid: 2h
    - Kritikalitet: 🟡 Medium

15. [ ] **Security audit logging**
    - Estimerad tid: 3h
    - Kritikalitet: 🟡 Medium

---

## 8. LÅNGSIKTIGA FÖRBÄTTRINGAR

### Infrastruktur
- [ ] **CDN för static assets** (CloudFlare)
- [ ] **DDoS protection** (CloudFlare)
- [ ] **Backup automation** (Supabase automated backups)
- [ ] **Disaster recovery plan**

### Testing
- [ ] **Security penetration testing**
- [ ] **Load testing** (k6, Artillery)
- [ ] **End-to-end encryption för tasks** (optional, för enterprise kunder)

### Compliance
- [ ] **SOC 2 audit** (för enterprise kunder)
- [ ] **ISO 27001 certification** (för enterprise kunder)

---

## 9. KOSTNADSBERÄKNING (Scaling)

### Gratis tier limits:
- **Claude:** $5/månad gratis kredit → ~1,600 requests
- **Azure Speech:** Gratis tier: 5 miljoner tecken/månad
- **Speechmatics:** Trial: 8h gratis
- **Supabase:** 500 MB databas, 1 GB fillagring, 2 GB bandwidth
- **Render.com (backend):** Gratis tier: 750h/månad

### Beräknad kostnad för 100 användare:
- Claude: 100 users × 50 req/dag × 30 dagar = 150k requests/månad → ~$450/månad
- Azure TTS: 100 users × 100 min/månad = 10k min → ~$150/månad
- Speechmatics: 100 users × 30 min/månad = 3k min → ~$300/månad
- Supabase Pro: $25/månad
- Backend hosting (Render): $7/månad (Starter)

**Total: ~$932/månad för 100 aktiva användare**

**Förslag:** Pricing på $9/månad per user → $900/månad revenue för 100 users (break-even)

---

## 10. SLUTSATS

**Prio är en imponerande app** med avancerad funktionalitet. Säkerhetsmässigt är grunden solid tack vare Supabase och MSAL, men **5 kritiska åtgärder måste göras innan production:**

1. Backend autentisering
2. Supabase RLS policies
3. Email webhook HMAC validation
4. API key audit
5. CORS whitelist

**Estimerad tid för kritiska åtgärder:** ~8 timmar
**Estimerad tid för alla höga prioritetsåtgärder:** ~20 timmar

Efter dessa åtgärder är appen **produktionssäker** för closed beta. För public launch bör även medium-prioritetsåtgärderna genomföras.

---

**Sammanfattning av risknivåer:**
- 🔴 **Kritiska risker:** 5 st (måste åtgärdas)
- 🟠 **Höga risker:** 5 st (bör åtgärdas)
- 🟡 **Medelhöga risker:** 5 st (förbättringsområden)
- ✅ **Positiva aspekter:** 10 st

**Rekommendation:** Åtgärda kritiska risker denna vecka, höga risker nästa vecka, sedan soft launch!
