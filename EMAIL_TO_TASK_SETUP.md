# 📧 Email-to-Task Setup Guide

## Översikt
Mejla uppgifter till `task@nymberg.se` → Claude AI tolkar → Task skapas automatiskt i Prio! 🎉

**Säkerhet:** Endast mejl från `daniel@nymberg.se` accepteras.

---

## ✅ Steg 1: Lägg till Supabase Service Role Key

1. Gå till **Supabase Dashboard** → Project Settings → API
2. Kopiera **service_role** key (den LÄNGRE nyckeln under "Project API keys")
3. Öppna `/server/.env` och ersätt:
   ```
   SUPABASE_SERVICE_ROLE_KEY=DIN_SERVICE_ROLE_KEY_HÄR
   ```
   med din riktiga nyckel.

⚠️ **VIKTIGT:** Committa ALDRIG denna nyckel till Git!

---

## ✅ Steg 2: Skapa database-tabell

1. Öppna **Supabase SQL Editor**
2. Klistra in innehållet från `/supabase/email_tasks_table.sql`
3. Klicka **Run**

Detta skapar:
- `email_tasks` tabell
- RLS policies
- Realtime subscription
- Triggers

---

## ✅ Steg 3: Konfigurera email-forwarding (SendGrid)

### 3a. Skapa SendGrid-konto
1. Gå till https://sendgrid.com/
2. Skapa gratis konto (100 mejl/dag gratis)
3. Verifiera din email

### 3b. Konfigurera Inbound Parse
1. **Settings** → **Inbound Parse** → **Add Host & URL**
2. Fyll i:
   - **Domain:** `nymberg.se`
   - **Subdomain:** `task` (blir task@nymberg.se)
   - **Destination URL:** `https://prio-backend.onrender.com/api/email-webhook`
   - **Check spam:** ✓
   - **POST raw MIME:** ❌

### 3c. DNS-konfiguration
Lägg till MX-record i din DNS (Loopia/Cloudflare):

```
Type: MX
Name: task
Value: mx.sendgrid.net
Priority: 10
TTL: Auto
```

**Loopia:**
1. Logga in → DNS → nymberg.se
2. Lägg till MX-post
3. Underdomän: `task`
4. Mailserver: `mx.sendgrid.net`
5. Prioritet: `10`

**Vänta 5-30 min för DNS propagation**

---

## ✅ Steg 4: Starta om backend

```bash
cd server
npm install
npm start
```

Eller om du kör på Render:
1. Gå till Render dashboard
2. Lägg till environment variable:
   - `SUPABASE_URL`: `https://zvjylrvjzucyjzhnamfi.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: [din service role key]
3. Klicka **Manual Deploy** → **Deploy latest commit**

Kolla logs för:
```
✅ Supabase client initialized for email-to-task
```

---

## 🧪 Steg 5: Testa!

Skicka testmejl från `daniel@nymberg.se`:

**Till:** task@nymberg.se
**Ämne:** Fixa buggen i dashboard
**Meddelande:**
```
Användare rapporterar att prioriteringsvärdena inte uppdateras
korrekt när man ändrar deadline. Måste fixas innan fredag kl 15.
```

### Vad händer:
1. ✉️ SendGrid tar emot mejlet
2. 🔄 Forwarding till `https://prio-backend.onrender.com/api/email-webhook`
3. ✅ Backend validerar: Är det från daniel@nymberg.se?
4. 🤖 Claude AI analyserar mejlet:
   - Title: "Fixa buggen i dashboard"
   - Deadline: Fredag 15:00
   - Priority: 8 (bugg + deadline = högt värde)
   - Duration: ~60 min
5. 💾 Sparas till `email_tasks` i Supabase
6. 🔔 Frontend lyssnar realtime och skapar task automatiskt
7. 🎉 Toast-notis: "📧 Task skapad från mejl: Fixa buggen i dashboard"

---

## 📊 Kontrollera att det funkar

### I Supabase:
```sql
SELECT * FROM email_tasks ORDER BY created_at DESC LIMIT 10;
```

Ska visa ditt mejl med:
- `from_email`: daniel@nymberg.se
- `subject`: Fixa buggen...
- `task_data`: JSON med Claude's tolkning
- `processed`: false → true (när task skapats)

### I Prio:
1. Öppna appen
2. Se toast-notifikation: "📧 Task skapad från mejl..."
3. Tasken finns i din tasklista med 📧 emoji

### Backend logs (Render):
```
📧 Email webhook received
📧 From: daniel@nymberg.se
📧 Subject: Fixa buggen...
🤖 Claude response: {"title":"Fixa buggen i dashboard",...}
✅ Email task saved to database: abc-123-...
```

---

## 💡 Användningsexempel

### Quick task:
```
Till: task@nymberg.se
Ämne: Ring Lisa kl 14
```
→ Task med deadline idag 14:00

### Detaljerad task:
```
Till: task@nymberg.se
Ämne: Projektplanering Wallenstam
Meddelande:
Förbereda offert:
- Uppskatta timmar för 3 leverabler
- Kolla tidigare projekt
- Skicka senast måndag
```
→ Task med deadline måndag, effort: 7

### Task med länk:
```
Till: task@nymberg.se
Ämne: Svara på offertförfrågan
Meddelande:
Kunden vill ha offert på ny webbsida.
Länk: https://example.com/brief.pdf
Deadline: fredag
```
→ Task med länk i description, deadline: fredag 17:00

---

## 🔧 Felsökning

### Mejl kommer inte fram
1. **Kolla DNS:**
   ```bash
   nslookup -type=mx task.nymberg.se
   ```
   Ska visa: `mx.sendgrid.net`

2. **Kolla SendGrid logs:**
   SendGrid → Activity → Inbound Parse

3. **Testa DNS propagation:**
   https://dnschecker.org → Sök `task.nymberg.se` MX

### Mejl blockeras (403)
- Är du säker på att du mejlar från `daniel@nymberg.se`?
- Kolla backend logs för avsändaradress

### Task skapas inte
1. **Kolla Supabase:**
   ```sql
   SELECT * FROM email_tasks WHERE processed = false;
   ```
   Om det finns oprocessade tasks → frontend-problem

2. **Kolla realtime subscription:**
   Supabase → Database → Replication → email_tasks ska vara enabled

3. **Kolla browser console:**
   Fel i EmailTaskListener?

### Claude tolkar fel
- Förbättra systemprompt i `/server/index.js` rad 76-92
- Lägg till fler exempel
- Justera parsing-logik

---

## 🔐 Säkerhet

✅ **Implementerat:**
- Whitelist: Endast daniel@nymberg.se
- Service Role Key i backend (ej exponerad till frontend)
- RLS policies på email_tasks

⚠️ **TODO (valfritt):**
- [ ] HMAC-verifiering från SendGrid
- [ ] Rate limiting (max X mejl/timme)
- [ ] Spam-filter

---

## 🚀 Nästa steg

När det funkar kan du:
- Mejla från mobilen → Task skapas automatiskt
- Forwarda mejl från andra till task@nymberg.se
- Integrera med Microsoft Outlook rules (auto-forward vissa mejl)
- Lägg till AI-kategorisering (projekt/kund)

---

## 📞 Support

Om något inte funkar:
1. Kolla backend logs (Render dashboard)
2. Kolla Supabase logs (Logs & Reports)
3. Kolla browser console (F12)
4. Skicka testmejl och följ loggar steg-för-steg
