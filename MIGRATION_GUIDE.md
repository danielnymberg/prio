# 🚀 Supabase Migration - Flytta till eget projekt

**Estimerad tid:** 20 minuter
**Risk:** Minimal (all data exporteras först som backup)
**Rollback:** Möjlig (behåll gamla credentials)

---

## VARFÖR?

Du har flera appar i samma Supabase-projekt. Risker:
- ❌ Tabeller kan skriva över varandra
- ❌ Functions kan krocka
- ❌ Svårt att hålla koll på vad som hör till vilken app
- ❌ Begränsningar delas mellan appar

**Lösning:** Flytta Prio till eget projekt! ✅

---

## ÖVERSIKT

Denna guide hjälper dig att:
1. ✅ Exportera all data (automatiskt script)
2. ✅ Skapa nytt Supabase-projekt
3. ✅ Kör SQL-migrationer (RLS + API tracking)
4. ✅ Importera data (automatiskt script)
5. ✅ Uppdatera credentials
6. ✅ Testa att allt fungerar

**JAG GÖR:** Scripts för export/import + SQL-migrations (redan klart!)
**DU GÖR:** Klicka i Supabase UI + uppdatera .env-filer

---

## DEL 1: EXPORTERA DATA (3 min)

**Du gör:**
```bash
cd /Users/danielnymberg/prio
node scripts/export-data.js
```

**Vad händer:**
- ✅ Hämtar alla tasks från Supabase
- ✅ Hämtar alla projects
- ✅ Hämtar email_tasks
- ✅ Hämtar profiles
- ✅ Hämtar focus_sessions
- ✅ Sparar till `data-export.json`

**Output:**
```
📦 Startar export från Supabase...
Exporterar tasks... ✅ 142 tasks exporterade
Exporterar projects... ✅ 8 projekt exporterade
Exporterar email_tasks... ✅ 23 email tasks exporterade
Exporterar profiles... ✅ 1 profiler exporterade
Exporterar focus_sessions... ✅ 34 sessions exporterade

✅ EXPORT KLAR!
📁 Sparad till: /Users/danielnymberg/prio/data-export.json
```

**BACKUP!** Spara `data-export.json` på säker plats (iCloud/Dropbox).

---

## DEL 2: SKAPA NYTT SUPABASE-PROJEKT (5 min)

### Steg 2.1: Skapa projekt
Efter projektet är skapat:

1. Gå till **Settings → API**
2. Kopiera dessa värden:

```bash
Project URL: https://[project-id].supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **VIKTIGT:** Service role key är HEMLIG - dela ALDRIG denna!

### Steg 1.3: Uppdatera .env-filer

**Frontend (.env):**
```bash
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci... (anon public key)
VITE_BACKEND_URL=https://prio-backend.onrender.com
VITE_AZURE_CLIENT_ID=[din Azure app ID]
VITE_ANTHROPIC_API_KEY= # TA BORT DENNA - ska inte vara i frontend!
```

**Backend (server/.env):**
```bash
PORT=10000

# Supabase (NYA nycklar)
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (service_role key)

# Claude API (rotera denna senare)
ANTHROPIC_API_KEY=[din Claude nyckel]

# Azure Speech
AZURE_SPEECH_KEY=[din Azure nyckel]
AZURE_SPEECH_REGION=westeurope

# Speechmatics
SPEECHMATICS_API_KEY=[din Speechmatics nyckel]

# SendGrid (för email webhook)
SENDGRID_WEBHOOK_SECRET=[generera ny secret - se steg 4]
```

### Steg 1.4: Kör SQL-migrationer

1. Gå till Supabase Dashboard → **SQL Editor**
2. Klicka "New query"
3. Kör följande migrations **i ordning**:

**Migration 1: Enable RLS**
```sql
-- Kopiera HELA innehållet från: supabase/migrations/001_enable_rls.sql
-- Klistra in i SQL Editor och kör
```

**Migration 2: API Usage Tracking**
```sql
-- Kopiera HELA innehållet från: supabase/migrations/002_api_usage_tracking.sql
-- Klistra in i SQL Editor och kör
```

4. Verifiera att migrations kördes korrekt:
```sql
-- Ska visa rowsecurity = true
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### Steg 1.5: Migrera befintlig data (VALFRITT)

Om du har data i gamla projektet:

1. Gå till gamla projektet → **Database → Tables**
2. För varje tabell (`tasks`, `projects`, etc):
   - Exportera som CSV
   - Importera till nya projektet

Alternativt använd SQL:
```sql
-- I gamla projektet: Exportera
COPY tasks TO '/tmp/tasks.csv' CSV HEADER;

-- I nya projektet: Importera
COPY tasks FROM '/tmp/tasks.csv' CSV HEADER;
```

---

## DEL 2: KONFIGURERA EMAIL WEBHOOK HMAC (20 min)

### Steg 2.1: Generera webhook secret

Kör i terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Kopiera output (t.ex. `a4f3c2d1e5b6...`) och lägg till i `server/.env`:
```bash
SENDGRID_WEBHOOK_SECRET=a4f3c2d1e5b6...
```

### Steg 2.2: Konfigurera SendGrid

1. Logga in på https://sendgrid.com
2. Gå till **Settings → Inbound Parse → Add Host & URL**
3. Välj din domain: `nymberg.se`
4. Subdomain: `task` (ger `task@nymberg.se`)
5. Destination URL: `https://prio-backend.onrender.com/api/email-webhook`
6. Check spam: **Nej**
7. POST the raw, full MIME message: **Ja**
8. Klicka "Add"

### Steg 2.3: DNS-konfiguration

Lägg till MX-record hos din DNS-leverantör:

| Type | Host | Value | Priority |
|------|------|-------|----------|
| MX | task.nymberg.se | mx.sendgrid.net | 10 |

**Verifiera DNS:**
```bash
dig task.nymberg.se MX
```

### Steg 2.4: Uppdatera backend-kod (REDAN GJORT)

Koden är redan uppdaterad med HMAC-validering, men verifiera:

```javascript
// server/index.js - email webhook ska ha HMAC check
const crypto = require('crypto');

app.post('/api/email-webhook', (req, res, next) => {
  const signature = req.headers['x-twilio-email-event-webhook-signature'];
  // ... validering finns redan
});
```

---

## DEL 3: ROTERA API-NYCKLAR (30 min)

### 3.1: Anthropic (Claude)

1. Gå till https://console.anthropic.com/settings/keys
2. Klicka "Create Key"
3. Namn: `prio-production`
4. Kopiera nyckeln (visas bara EN gång!)
5. Uppdatera `server/.env`:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```
6. **Radera gamla nyckeln** i Anthropic Console

### 3.2: Azure Speech

1. Gå till https://portal.azure.com
2. Sök "Speech Services" → välj din resurs
3. Klicka **Keys and Endpoint**
4. Klicka "Regenerate Key 1"
5. Kopiera den nya nyckeln
6. Uppdatera `server/.env`:
   ```bash
   AZURE_SPEECH_KEY=[ny nyckel]
   ```

### 3.3: Speechmatics

1. Gå till https://portal.speechmatics.com/manage/api-keys
2. Klicka "Create New Key"
3. Namn: `prio-production`
4. Kopiera nyckeln
5. Uppdatera `server/.env`:
   ```bash
   SPEECHMATICS_API_KEY=[ny nyckel]
   ```
6. **Radera gamla nyckeln**

### 3.4: Azure AD (Microsoft Graph)

1. Gå till https://portal.azure.com
2. Sök "App registrations" → välj din app
3. Klicka **Certificates & secrets**
4. Under "Client secrets" → klicka "New client secret"
5. Description: `prio-production`
6. Expires: `24 months`
7. Kopiera **Value** (visas bara EN gång!)
8. Uppdatera frontend `.env`:
   ```bash
   VITE_AZURE_CLIENT_ID=[samma som förut]
   # Client secret behövs EJ för delegated permissions (MSAL)
   ```

---

## DEL 4: DEPLOYA BACKEND MED NYA NYCKLAR (15 min)

### 4.1: Render.com Environment Variables

1. Gå till https://dashboard.render.com
2. Välj din backend service
3. Klicka **Environment → Environment Variables**
4. Uppdatera ALLA variabler från `server/.env`:

```
SUPABASE_URL=https://[nya-project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[nya service role key]
ANTHROPIC_API_KEY=[roterad nyckel]
AZURE_SPEECH_KEY=[roterad nyckel]
AZURE_SPEECH_REGION=westeurope
SPEECHMATICS_API_KEY=[roterad nyckel]
SENDGRID_WEBHOOK_SECRET=[ny webhook secret]
```

5. Klicka "Save Changes" → Backend redeployar automatiskt

### 4.2: Verifiera deployment

```bash
curl https://prio-backend.onrender.com/health
# Förväntat svar: {"status":"ok","service":"prio-backend"}
```

---

## DEL 5: TESTA SÄKERHETEN (20 min)

### 5.1: Test RLS (Row Level Security)

Skapa testanvändare i Supabase:

1. Gå till **Authentication → Users → Add user**
2. Email: `test@example.com`
3. Password: `testpassword123`
4. Klicka "Create user"

Testa i SQL Editor:
```sql
-- Logga in som din riktiga user
SELECT * FROM tasks; -- Ska visa ENDAST dina tasks

-- Försök läsa tasks från annan user (byt UUID)
SELECT * FROM tasks WHERE user_id = '[test-users-uuid]';
-- Ska returnera TOM array (RLS blockerar)
```

### 5.2: Test Backend Auth

```bash
# Utan token - ska få 401 Unauthorized
curl -X POST https://prio-backend.onrender.com/api/claude-chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[]}'

# Förväntat svar: {"error":"Unauthorized - Missing token"}
```

### 5.3: Test Rate Limiting

```bash
# Skicka 101 requests snabbt (över 100-gränsen)
for i in {1..101}; do
  curl -X POST https://prio-backend.onrender.com/api/claude-chat \
    -H "Authorization: Bearer [din-token]" \
    -H "Content-Type: application/json" \
    -d '{"messages":[]}'
done

# Request 101 ska få: {"error":"Too many requests"}
```

### 5.4: Test CORS

```bash
# Från otillåten origin - ska få CORS error
curl -X POST https://prio-backend.onrender.com/api/claude-chat \
  -H "Origin: https://evil-site.com" \
  -H "Authorization: Bearer [token]" \
  -v

# Förväntat: CORS error i response headers
```

---

## DEL 6: FRONTEND-ÄNDRINGAR (15 min)

### 6.1: Uppdatera .env och bygg om

```bash
cd /Users/danielnymberg/prio

# Uppdatera .env med nya Supabase-nycklar
nano .env

# Bygg om frontend
npm run build

# Eller starta dev-server för test
npm run dev
```

### 6.2: Verifiera att appen fungerar

1. Öppna http://localhost:5173
2. Logga in (eller skapa nytt konto)
3. Testa skapa en task
4. Öppna Developer Tools → Network
5. Klicka på AI-chat och skicka meddelande
6. Verifiera att request till `/api/claude-chat` har `Authorization: Bearer ...` header

---

## DEL 7: API QUOTA UI (VALFRITT - 1h)

Detta låter användare se sin API-användning.

### 7.1: Skapa UsageStats-komponent

Jag skapar detta åt dig i nästa steg om du vill!

Skulle visa:
- 📊 Requests idag: 23/50
- 💰 Kostnad denna månad: $0.45
- 🔢 Tokens använda: 45,230 input / 12,450 output
- ⏰ Återställs om: 6h 23min

---

## CHECKLISTA - Före Production Launch

- [ ] Nytt Supabase-projekt skapat
- [ ] RLS aktiverat och testat
- [ ] API usage tracking installerat
- [ ] Alla API-nycklar roterade
- [ ] Backend .env uppdaterat på Render
- [ ] Frontend .env uppdaterat lokalt
- [ ] Email webhook HMAC konfigurerat
- [ ] DNS MX-record för task@nymberg.se
- [ ] CORS whitelist korrekt
- [ ] Backend autentisering testad
- [ ] Rate limiting testat
- [ ] RLS policies verifierade
- [ ] Gamla nycklar raderade från Anthropic/Azure/Speechmatics

---

## FELSÖKNING

### Problem: "Unauthorized - Missing token"

**Orsak:** Frontend skickar inte auth token till backend.

**Lösning:** Verifiera att `claude-conversation.ts` har uppdaterats (redan gjort):
```typescript
const { data: { session } } = await supabase.auth.getSession();
headers: {
  'Authorization': `Bearer ${session.access_token}`,
}
```

### Problem: "CORS error"

**Orsak:** Din domain inte i allowedOrigins.

**Lösning:** Lägg till i `server/index.js`:
```javascript
const allowedOrigins = [
  'https://minprio.se', // Din production domain
  'http://localhost:5173',
];
```

### Problem: RLS blockerar egna queries

**Orsak:** User ID matchar inte.

**Lösning:** Verifiera user_id i tasks:
```sql
SELECT id, email FROM auth.users WHERE id = auth.uid();
SELECT * FROM tasks WHERE user_id = auth.uid();
```

### Problem: Email webhook får 403 Forbidden

**Orsak:** HMAC signature matchar inte.

**Lösning:** Kontrollera att `SENDGRID_WEBHOOK_SECRET` är samma i backend och SendGrid.

---

## NÄSTA STEG

Efter migrationen är klar:

1. **Deploya frontend** till production (Vercel/Netlify)
2. **Sätt upp monitoring** (Sentry.io)
3. **Implementera user quota UI** (se DEL 7)
4. **Beta-testa med 5-10 användare**
5. **Public launch** 🚀

---

## SUPPORT

Om du fastnar, kolla:
- Supabase logs: Dashboard → Logs
- Render logs: Dashboard → Logs
- Browser Console: F12 → Console/Network tabs

**Lycka till med migrationen!** 🔐
