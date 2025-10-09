# 🚀 Flytta Prio till eget Supabase-projekt

**Tid:** 20 minuter
**Risk:** Minimal (all data säkerhetskopieras först)
**Kan ångras:** Ja (behåll gamla credentials)

---

## STEG 1: Exportera data (2 min)

```bash
cd /Users/danielnymberg/prio
node scripts/export-data.js
```

✅ Skapar `data-export.json` med all din data som backup

---

## STEG 2: Skapa nytt projekt (3 min)

1. Gå till https://supabase.com/dashboard
2. Klicka **"New project"**
3. Fyll i:
   - **Name:** `Prio Production`
   - **Database Password:** Generera stark (spara i 1Password!)
   - **Region:** `North Europe (Stockholm)`
   - **Plan:** Free
4. Klicka **"Create new project"**
5. Vänta 2 minuter... ☕

---

## STEG 3: Hämta nya nycklar (1 min)

När projektet är klart:

1. Gå till **Settings → API**
2. Kopiera dessa 3 värden (behöver du snart):

```
Project URL: https://xxxxx.supabase.co
anon public: eyJhbGciOiJ...
service_role: eyJhbGciOiJ...  (HEMLIG!)
```

---

## STEG 4: Kör SQL-migrationer (3 min)

1. I Supabase dashboard, gå till **SQL Editor**
2. Klicka **"New query"**
3. Öppna filen: `supabase/migrations/001_initial_schema.sql`
4. Kopiera ALLT innehåll
5. Klistra in i SQL Editor
6. Klicka **"Run"** ✅

Upprepa för:
- `002_api_usage_tracking.sql`
- `003_enable_rls.sql`

**Färdigt!** Nu har du alla tabeller + säkerhet.

---

## STEG 5: Konfigurera Auth (2 min)

1. I Supabase dashboard, gå till **Authentication → URL Configuration**
2. Under **Redirect URLs**, lägg till:
   ```
   http://localhost:5173/*
   https://minprio.se/*
   ```
3. Klicka **"Save"**

---

## STEG 6: Importera data (2 min)

1. Uppdatera `.env` TILLFÄLLIGT (bara för import):
   ```bash
   # Backup gamla först!
   cp .env .env.backup

   # Lägg till (överst i filen):
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # Service Role från steg 3
   ```

2. Kör import:
   ```bash
   node scripts/import-data.js
   ```

3. Verifiera:
   - Öppna Supabase dashboard
   - Gå till **Table Editor → tasks**
   - Ser du dina tasks? ✅

4. **TA BORT** service role key från `.env`!
   ```bash
   # Radera raden: SUPABASE_SERVICE_ROLE_KEY=...
   ```

---

## STEG 7: Uppdatera credentials (3 min)

### Frontend `.env`:
```bash
VITE_SUPABASE_URL=https://NYA-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...NYA-ANON-KEY...
VITE_BACKEND_URL=https://prio-backend.onrender.com
VITE_AZURE_CLIENT_ID=xxx  # (samma som förut)
```

### Backend på Render.com:
1. Gå till https://dashboard.render.com
2. Välj din **prio-backend** service
3. Klicka **Environment**
4. Uppdatera:
   - `SUPABASE_URL` → nya URL:en
   - `SUPABASE_SERVICE_ROLE_KEY` → nya service role key
5. Klicka **"Save Changes"**

Backend redeployar automatiskt (tar ~2 min).

---

## STEG 8: Testa lokalt (2 min)

```bash
cd /Users/danielnymberg/prio
npm run dev
```

Öppna http://localhost:5173 och testa:
- [ ] Logga in (använd samma email/lösenord som förut)
- [ ] Se att dina tasks finns
- [ ] Skapa ny task
- [ ] Öppna Kalender
- [ ] Koppla Microsoft (om inte redan gjort)
- [ ] Se att möten visas

**Om inloggning inte fungerar:**
- Gamla användare finns inte i nya projektet (Supabase Auth migreras inte automatiskt)
- **Lösning:** Använd "Glömt lösenord" för att återställa
- Eller skapa ny användare i Supabase dashboard under **Authentication → Users**

---

## STEG 9: Deploya frontend (2 min)

```bash
git add .
git commit -m "Migrerad till nytt Supabase-projekt"
git push
```

Om du har Vercel/Netlify:
1. Gå till din deploy service
2. Uppdatera environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Trigger manual deploy

---

## ✅ KLART!

Nu har du:
- ✅ Eget Supabase-projekt för Prio (ingen risk för konflikt med andra appar)
- ✅ All data migrerad
- ✅ Row Level Security aktiverad (användare ser bara sin egen data)
- ✅ API usage tracking (för kvota-system)
- ✅ Säkra credentials

---

## 🆘 ÅNGRA MIGRATIONEN (om något går fel)

```bash
# Återställ gamla credentials
cp .env.backup .env

# Uppdatera Render.com till gamla värden
# (gå till Environment → sätt tillbaka gamla SUPABASE_URL och KEY)

# Allt funkar som innan!
```

Din `data-export.json` är backup om du behöver återskapa något.

---

## ❓ FELSÖKNING

**Problem: "Invalid login credentials"**
→ Gamla användare finns inte i nya projektet
→ Lösning: Använd "Glömt lösenord" eller skapa ny user i Supabase dashboard

**Problem: "Cannot read properties of null"**
→ Frontend använder gamla Supabase URL
→ Lösning: Kolla att `.env` är uppdaterad och kör `npm run dev` igen

**Problem: Backend får 401 Unauthorized**
→ Backend använder gamla credentials
→ Lösning: Verifiera Render.com environment variables

**Problem: Tasks visas inte efter import**
→ RLS policies blockerar
→ Lösning: Kolla att user_id i tasks matchar din auth.uid()

---

## STEG 10: Rensa gamla projektet (VALFRITT, 2 min)

⚠️ **Gör detta ENDAST när du är 100% säker att nya projektet fungerar!**

Detta raderar Prio-data från gamla projektet (så du inte har dubbletter).

```bash
node scripts/cleanup-old-project.js
```

**Scriptet frågar:**
1. Credentials för gamla projektet (Service Role Key)
2. Bekräftelse att du gjort alla steg
3. Final confirmation: "RADERA PRIO DATA"

**Vad som händer:**
- ✅ Raderar ENDAST Prio-tabeller (tasks, projects, email_tasks, profiles)
- ✅ Andra appar i gamla projektet påverkas INTE
- ✅ Backup finns fortfarande i data-export.json

**Kan jag skippa detta?**
JA! Du kan låta Prio-data ligga kvar i gamla projektet. Det skadar inte, tar bara lite plats.

---

## NÄSTA STEG

Efter migrationen:
1. ✅ Testa kalenderfunktionen! (se `KALENDER_GUIDE.md`)
2. ✅ Rotera API-nycklar (Claude, Azure, etc.) - se `TODO_DANIEL.md`
3. ✅ Verifiera säkerhet (se `SECURITY_AUDIT.md`)
4. ✅ (Valfritt) Rensa gamla projektet med cleanup-script

**Redo att testa kalendern? Kör `npm run dev` och öppna /calendar!** 📅🚀
