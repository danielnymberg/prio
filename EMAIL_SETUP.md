# Email-to-Task Setup (daniel@nymberg.se → Prio)

## Översikt
Mejla uppgifter till `task@prio.nymberg.se` (eller liknande) så skapar Claude AI automatiskt en task i Prio.

**Säkerhet:** Endast mejl från `daniel@nymberg.se` accepteras.

## Setup med SendGrid (Rekommenderat - Gratis tier)

### Steg 1: Skapa SendGrid-konto
1. Gå till https://sendgrid.com/
2. Skapa gratis konto (upp till 100 mejl/dag gratis)
3. Verifiera din email

### Steg 2: Konfigurera Inbound Parse
1. Gå till **Settings** → **Inbound Parse**
2. Klicka **Add Host & URL**
3. Fyll i:
   - **Domain**: `nymberg.se` (eller din domän)
   - **Subdomain**: `task` (blir `task@nymberg.se`)
   - **Destination URL**: `https://prio-backend.onrender.com/api/email-webhook`
   - **Check spam**: ✓ (aktivera)
   - **POST raw, full MIME message**: ❌ (lämna av)

4. Klicka **Add**

### Steg 3: DNS-konfiguration
SendGrid visar MX-records som du måste lägga till i din DNS (t.ex. Cloudflare/Loopia):

```
Type: MX
Name: task (eller subdomain du valde)
Value: mx.sendgrid.net
Priority: 10
```

Exempel för Cloudflare:
1. Gå till din domän → DNS
2. Lägg till MX-record:
   - **Name**: `task`
   - **Mail server**: `mx.sendgrid.net`
   - **Priority**: `10`
   - **TTL**: Auto

### Steg 4: Testa
Skicka ett testmejl från `daniel@nymberg.se` till `task@nymberg.se`:

**Ämne:** Fixa buggen i dashboard
**Meddelande:**
```
Användare rapporterar att prioriteringsvärdena inte uppdateras
korrekt när man ändrar deadline. Måste fixas innan fredag kl 15.
```

Claude AI kommer att:
1. ✅ Validera att avsändaren är daniel@nymberg.se
2. 🤖 Analysera mejlet och extrahera:
   - Title: "Fixa buggen i dashboard"
   - Description: Hela mejltexten
   - Deadline: 2025-10-XX 15:00 (fredag kl 15)
   - Priority: ~8 (eftersom det är en bugg med deadline)
   - Estimated duration: ~60 min (gissning baserat på beskrivning)
3. 📬 Skicka tillbaka JSON till frontend
4. ✨ Frontend skapar automatiskt tasken i Prio

## Alternativ: Mailgun (Om SendGrid inte funkar)

### Setup med Mailgun
1. Gå till https://www.mailgun.com/
2. Skapa gratis konto
3. Lägg till din domän (`nymberg.se`)
4. Skapa Route:
   - **Expression type**: Match recipient
   - **Recipient**: `task@nymberg.se`
   - **Actions**:
     - ✓ Forward to URL
     - URL: `https://prio-backend.onrender.com/api/email-webhook`
5. Lägg till MX-records enligt Mailguns instruktioner

## Frontend Integration

Nu behöver vi lyssna på webhook-svar och skapa tasks. Antingen:

### Alternativ A: Polling från frontend (enklast)
Backend sparar tasks i en kö (t.ex. Redis eller Supabase `email_queue`-tabell).
Frontend kollar varje minut om det finns nya tasks från mejl.

### Alternativ B: WebSocket push (mer realtid)
När backend tar emot mejl, pushar den task-data via WebSocket till inloggad användare.

### Alternativ C: Direktskapande via Supabase (säkrast men kräver setup)
Backend får Supabase Service Role Key och skapar direkt i databasen.

## Säkerhet

✅ **Vad som är implementerat:**
- Whitelist: Endast `daniel@nymberg.se` accepteras
- 403 Forbidden om mejl från annan avsändare

⚠️ **Förbättringar (TODO):**
- [ ] HMAC-signatur från SendGrid för att verifiera att mejlet verkligen kommer från SendGrid
- [ ] Rate limiting (max X mejl per timme)
- [ ] Email quarantine för misstänkta mejl

## Exempel på användning

**Quick task:**
```
Till: task@nymberg.se
Ämne: Ring Lisa kl 14
```
→ Skapar task med deadline idag 14:00, effort: 2 (snabbt samtal)

**Detaljerad task:**
```
Till: task@nymberg.se
Ämne: Projektplanering Wallenstam
Meddelande:
Förbereda offert för Wallenstam-projektet.
- Uppskatta timmar för 3 leverabler
- Kolla tidigare projekt som referens
- Skicka offert senast måndag nästa vecka
```
→ Skapar task med:
- Title: "Projektplanering Wallenstam"
- Description: Hela meddelandet
- Deadline: Måndag nästa vecka (Claude tolkar "senast måndag")
- Effort: ~7 (omfattande planering)

## Felsökning

**Mejl kommer inte fram:**
- Kolla att MX-record är korrekt konfigurerat (använd `nslookup -type=mx task.nymberg.se`)
- Kolla SendGrid logs för felsökning

**Mejl blockeras:**
- Kontrollera att du mejlar från daniel@nymberg.se
- Kolla backend-logs: `heroku logs --tail` eller Render dashboard

**Claude tolkar fel:**
- Förbättra systemprompt i `/api/email-webhook`
- Lägg till fler exempel för bättre few-shot learning
