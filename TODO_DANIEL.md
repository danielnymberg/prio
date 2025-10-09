# 📋 DINA UPPGIFTER - Säkerhetsmigration

**Estimerad tid:** 2-3 timmar
**Deadline:** Före production launch

---

## ✅ VAD JAG HAR GJORT (KLART)

### 1. Backend-säkerhet (KLART)
- ✅ Autentisering på alla API-endpoints (`/api/claude-chat`, `/api/azure-tts`)
- ✅ Rate limiting (100 requests per 15 min)
- ✅ CORS whitelist (endast localhost + minprio.se)
- ✅ Email webhook HMAC-validering
- ✅ Bättre felhantering (inga stack traces till frontend)

### 2. Databas-säkerhet (KLART)
- ✅ RLS migration SQL-fil skapad: `supabase/migrations/001_enable_rls.sql`
- ✅ API quota tracking system: `supabase/migrations/002_api_usage_tracking.sql`
- ✅ Policies för tasks, projects, email_tasks

### 3. API Quota System (KLART)
- ✅ Token tracking per användare
- ✅ Kostnadskalkylering
- ✅ Daglig/månatlig reset
- ✅ Pricing tiers (Free, Pro, Business)
- ✅ Stöd för egna API-nycklar

### 4. Frontend (KLART)
- ✅ Claude requests skickar nu auth token
- ✅ ApiUsageView-komponent skapad (visar usage stats)
- ✅ UI för att lägga till egen Claude API-nyckel

### 5. Dokumentation (KLART)
- ✅ Säkerhetsrevision: `SECURITY_AUDIT.md`
- ✅ Migreringsguide: `MIGRATION_GUIDE.md`
- ✅ Denna TODO-lista

---

## 🔨 VAD DU MÅSTE GÖRA

### STEG 1: Skapa nytt Supabase-projekt (30 min)

**Varför?** Nya nycklar, säkrare setup, ingen risk för att gamla nycklar läckt.

1. Gå till https://supabase.com/dashboard
2. Klicka **"New Project"**
3. **Namn:** `prio-production`
4. **Database Password:** Generera stark → **SPARA DEN!**
5. **Region:** `Europe West (Frankfurt)`
6. **Pricing:** `Free` (kan uppgradera senare)
7. Klicka **"Create new project"** → vänta ~2 min

8. När projektet är klart, gå till **Settings → API**
9. Kopiera dessa **3 värden**:

```
Project URL: https://[project-id].supabase.co
anon public key: eyJhbGci...
service_role key: eyJhbGci... (HEMLIG!)
```

### STEG 2: Uppdatera .env-filer (5 min)

**Frontend (.env):**
```bash
VITE_SUPABASE_URL=https://[NYA-project-id].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci... (nya anon key)
VITE_BACKEND_URL=https://prio-backend.onrender.com
VITE_AZURE_CLIENT_ID=[samma som förut]
```

⚠️ **TA BORT `VITE_ANTHROPIC_API_KEY`** - den ska INTE vara i frontend!

**Backend (server/.env):**
```bash
PORT=10000
SUPABASE_URL=https://[NYA-project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (nya service role key)
ANTHROPIC_API_KEY=[din Claude nyckel - rotera senare]
AZURE_SPEECH_KEY=[din Azure nyckel]
AZURE_SPEECH_REGION=westeurope
SPEECHMATICS_API_KEY=[din Speechmatics nyckel]
```

### STEG 3: Kör SQL-migrationer i Supabase (10 min)

1. Öppna nya Supabase-projektet
2. Gå till **SQL Editor** (ikonen till vänster)
3. Klicka **"New query"**

**Migration 1: Enable RLS**
4. Öppna filen: `/Users/danielnymberg/prio/supabase/migrations/001_enable_rls.sql`
5. Kopiera HELA innehållet
6. Klistra in i SQL Editor
7. Klicka **"Run"** (eller Cmd+Enter)
8. Verifiera att det står **"Success"**

**Migration 2: API Usage Tracking**
9. Klicka **"New query"** igen
10. Öppna filen: `/Users/danielnymberg/prio/supabase/migrations/002_api_usage_tracking.sql`
11. Kopiera HELA innehållet
12. Klistra in i SQL Editor
13. Klicka **"Run"**
14. Verifiera **"Success"**

**Verifiera att migrations kördes:**
```sql
-- Kör detta i SQL Editor:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Ska visa rowsecurity = TRUE för tasks, projects, email_tasks
```

### STEG 4: Uppdatera Render.com environment variables (10 min)

1. Gå till https://dashboard.render.com
2. Välj din **prio-backend** service
3. Klicka **Environment** → **Environment Variables**
4. Uppdatera dessa variabler:

```
SUPABASE_URL = https://[NYA-project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY = [nya service role key]
```

5. Klicka **"Save Changes"**
6. Backend kommer redeploya automatiskt (~2 min)

### STEG 5: Generera webhook secret för SendGrid (5 min)

Kör i terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Kopiera output (t.ex. `a4f3c2d1e5b6...`) och:

1. Lägg till i **server/.env**:
   ```bash
   SENDGRID_WEBHOOK_SECRET=a4f3c2d1e5b6...
   ```

2. Lägg till i **Render.com environment variables**:
   ```
   SENDGRID_WEBHOOK_SECRET = a4f3c2d1e5b6...
   ```

### STEG 6: Testa att backend fungerar (5 min)

Kör i terminal:
```bash
# 1. Health check (ska svara OK)
curl https://prio-backend.onrender.com/health

# 2. Test att auth krävs (ska få 401)
curl -X POST https://prio-backend.onrender.com/api/claude-chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[]}'

# Förväntat svar: {"error":"Unauthorized - Missing token"}
```

Om du får `{"error":"Unauthorized - Missing token"}` → **PERFEKT!** Det betyder att auth fungerar.

### STEG 7: Bygg om frontend och testa (10 min)

```bash
cd /Users/danielnymberg/prio

# Starta dev-server
npm run dev

# Öppna http://localhost:5173
```

**Testa:**
1. Logga in (eller skapa nytt konto)
2. Skapa en task
3. Öppna AI-chat och skicka ett meddelande
4. Öppna Developer Tools (F12) → **Network** tab
5. Klicka på `/api/claude-chat` requesten
6. Under **Headers** → verifiera att du ser:
   ```
   Authorization: Bearer eyJhbGci...
   ```

Om du ser `Authorization` headern → **KLART!**

### STEG 8: Integrera ApiUsageView i settings (5 min)

Öppna `/Users/danielnymberg/prio/src/components/settings/SettingsView.tsx`

Lägg till i imports (längst upp):
```typescript
import { ApiUsageView } from './ApiUsageView';
```

Lägg till en ny tab i `tabs` arrayen (runt rad 20):
```typescript
const tabs = [
  'Allmänt',
  'Microsoft',
  'API-användning', // <-- NY TAB
  'Mejl',
  'Röststyrning',
  'Notiser',
] as const;
```

Lägg till case för ApiUsageView i switch-satsen (runt rad 200):
```typescript
{activeTab === 'API-användning' && <ApiUsageView />}
```

Spara och ladda om appen → nu finns "API-användning" tab!

---

## 🎯 NÄSTA STEG (efter migration)

### Rotera API-nycklar (30 min)

**Claude API:**
1. https://console.anthropic.com/settings/keys
2. Skapa ny nyckel → `prio-production`
3. Uppdatera i Render.com
4. Radera gamla nyckeln

**Azure Speech:**
1. https://portal.azure.com → Speech Services
2. Keys and Endpoint → "Regenerate Key 1"
3. Uppdatera i Render.com

**Speechmatics:**
1. https://portal.speechmatics.com/manage/api-keys
2. Skapa ny nyckel → `prio-production`
3. Uppdatera i Render.com
4. Radera gamla nyckeln

---

## 📊 VAD HÄNDER EFTER MIGRATIONEN?

### Användare kan nu:
- ✅ Se sin dagliga/månatliga API-användning
- ✅ Se uppskattad kostnad i realtid
- ✅ Lägga till egen Claude API-nyckel (obegränsad användning!)
- ✅ Se när quotas återställs
- ✅ Få varningar när de närmar sig gränsen

### Du får:
- 🔒 Säker backend (ingen kan använda dina API-nycklar)
- 💰 Kontroll över kostnader (quota-system)
- 📈 Insyn i användning per user
- 🛡️ Row Level Security (ingen kan se andras data)
- ⚡ Rate limiting (skydd mot DDoS)

---

## ❓ FELSÖKNING

### "Unauthorized - Missing token"
**Bra!** Det betyder att auth fungerar. Frontend skickar automatiskt token nu.

### "CORS error"
Lägg till din domain i `server/index.js`:
```javascript
const allowedOrigins = [
  'https://minprio.se', // Din production domain
  'http://localhost:5173',
];
```

### RLS blockerar mina egna queries
Verifiera att du är inloggad:
```sql
SELECT auth.uid(); -- Ska returnera ditt user ID
```

### Email webhook får fortfarande requests
Kolla Render logs:
```bash
# Gå till Render.com → Logs
# Leta efter: "⚠️ Invalid HMAC signature"
```

Om du ser detta, verifiera att `SENDGRID_WEBHOOK_SECRET` är rätt.

---

## ✅ CHECKLISTA

När du är klar, bocka av:

- [ ] Nytt Supabase-projekt skapat
- [ ] .env-filer uppdaterade (frontend + backend)
- [ ] RLS migration körts i Supabase
- [ ] API usage tracking migration körts
- [ ] Render.com environment variables uppdaterade
- [ ] Webhook secret genererat och sparat
- [ ] Backend testad (401 utan token = ✅)
- [ ] Frontend testad (auth header skickas = ✅)
- [ ] ApiUsageView integrerad i settings
- [ ] Alla API-nycklar roterade

**När allt är klart → Du är redo för production! 🚀**

---

## 📞 HJÄLP BEHÖVS?

Om något går fel, kolla:
- **Supabase logs:** Dashboard → Logs
- **Render logs:** Dashboard → Logs
- **Browser console:** F12 → Console tab

Eller skicka felmeddelandet till mig!
