# 📅 Kalenderfunktion - Användarguide

**Status:** ✅ Klar att testa!
**Tid att implementera:** 45 minuter
**Features:** Steg 2 (veckokalender + drag & drop)

---

## 🎉 VAD JAG HAR BYGGT

### 1. **Veckokalendervy** 📆
- Visar veckoöversikt (måndag-fredag)
- Timkolumner 07:00-20:00 (anpassningsbart)
- Svensk lokalisering
- Dark mode support

### 2. **Tre typer av events** 🎨
- 🔵 **Möten** (Microsoft Calendar events)
- 🟠 **Fokustid** (Prio-skapade fokussessioner)
- 🔴 **Task deadlines** (tasks med deadline)

### 3. **Drag & Drop** 🖱️
- **Dra tasks från inbox** → släpp på kalendern → schemaläggs automatiskt!
- **Dra events** → flytta möten/fokustid
- **Resize events** → ändra längd på fokussessioner

### 4. **Interaktivitet** ⚡
- **Klicka på tomt slot** → "Vad vill du fokusera på?" → bokar fokustid
- **Klicka på event** → visa detaljer
- **Radera fokustid** (endast Prio-skapade, inte vanliga möten)

### 5. **Sidebar med tasks** 📋
- Inbox-tasks redo att schemaläggas
- Dölj/visa med knapp
- Visar uppskattad tid per task

---

## 🚀 HUR DU TESTAR DET

### Steg 1: Starta appen
```bash
cd /Users/danielnymberg/prio
npm run dev
```

### Steg 2: Öppna kalendern
1. Gå till http://localhost:5173
2. Logga in
3. Klicka **"Kalender"** i sidomenyn (ny ikon 📅)

### Steg 3: Koppla Microsoft (om inte redan gjort)
- Om du ser "Microsoft-konto krävs" → klicka "Gå till Inställningar"
- Under "Microsoft" → klicka "Koppla"
- Godkänn permissions
- Gå tillbaka till Kalender

### Steg 4: Testa funktionerna! 🎮

**TEST 1: Visa events**
- Du ser automatiskt alla dina Microsoft Calendar-möten
- De är färgade **blå** (🔵)

**TEST 2: Skapa fokustid från inbox**
1. Se sidebaren till vänster med inbox-tasks
2. **Dra en task** till ett ledigt slot i kalendern
3. Släpp → task får deadline + fokustid bokas i Microsoft!
4. Eventet blir **orange** (🟠)

**TEST 3: Klicka för att boka fokustid**
1. Klicka på ett ledigt slot (t.ex. imorgon kl 14)
2. Popup: "Vad vill du fokusera på?"
3. Skriv t.ex. "Wallenstam slutrapport"
4. Enter → bokad i både Prio OCH Microsoft Calendar!

**TEST 4: Flytta event**
1. Dra ett **orange fokus-event** (Prio-skapat)
2. Släpp på ny tid
3. Toast: "Händelse flyttad!"
4. Synkar till Microsoft Calendar!

**TEST 5: Ändra längd**
1. Hovra över botten/toppen av ett event
2. Cursor blir resize-pil
3. Dra för att ändra längd
4. Släpp → uppdateras i Microsoft!

**TEST 6: Radera fokustid**
1. Klicka på ett orange fokus-event
2. Modal: detaljer visas
3. Knapp: "Radera" (endast för Prio-events)
4. Confirm → borta från både Prio OCH Microsoft!

---

## 🎨 FÄRGKODNING

| Färg | Typ | Beskrivning | Kan flyttas? | Kan raderas? |
|------|-----|-------------|--------------|--------------|
| 🔵 Blå | Microsoft-möte | Vanliga kalenderhändelser | ✅ Ja | ❌ Nej* |
| 🟠 Orange | Fokustid (Prio) | Prio-bokad fokustid (börjar med "🎯 Fokus:") | ✅ Ja | ✅ Ja |
| 🔴 Röd | Task deadline | Tasks med deadline, ej schemalagda | ✅ Ja** | ❌ Nej*** |

\* Microsoft-möten kan tas bort i Outlook, inte i Prio
\** Flyttar task-deadline
\*** Radera via task-vyn istället

---

## 🛠️ TEKNISK INFO

### Nya filer skapade:
1. `/src/components/calendar/WeekCalendarView.tsx` - huvudkomponent
2. `/src/components/calendar/CalendarWithTaskSidebar.tsx` - wrapper med sidebar
3. `/src/components/calendar/TaskDragOverlay.tsx` - drag preview

### Nya Graph API-metoder:
- `updateCalendarEvent()` - flytta/ändra events
- `deleteCalendarEvent()` - radera events

### Dependencies:
- ✅ `react-big-calendar` (installerat)
- ✅ `date-fns` (redan fanns)

---

## ⚠️ BEGRÄNSNINGAR & FRAMTIDA FÖRBÄTTRINGAR

### VAD SOM INTE FUNGERAR (medvetet utelämnat - Steg 3):
❌ **Skapa vanliga möten** (med deltagare)
❌ **Bjud in personer** från Contacts
❌ **Svara på mötesförfrågningar** (accept/decline)
❌ **Recurring events** (upprepade möten)
❌ **Synka med flera kalendrar** (bara primary)

**Varför?** För att undvika att duplicera Outlook-funktioner. Vi vill att Prio är ett **komplement**, inte en ersättning!

### Vad jag REKOMMENDERAR:
✅ **Använd Outlook för:**
- Skapa möten med deltagare
- Svara på mötesförfrågningar
- Hantera recurring events

✅ **Använd Prio för:**
- Boka fokustid för tasks
- Se översikt tasks + kalender
- Dra tasks för att schemalägga
- Hitta lediga slots

---

## 🎯 ANVÄNDNINGSFALL (EXEMPEL)

### Scenario 1: Planera din vecka
```
Måndag morgon:
1. Öppna Kalender
2. Se alla möten för veckan (från Outlook)
3. Se inbox-tasks i sidebaren
4. Dra "Wallenstam rapport" (4h task) → onsdagens lediga slot
5. Dra "Presentation Oskarskyrkans" (2h) → fredagens förmiddag
6. Klart! Fokustid bokad i Outlook, ingen risk för dubbelbokning
```

### Scenario 2: Hitta tid för brådskande task
```
Fredag 14:00, ny brådskande task:
1. AI-chat: "Jag behöver fixa en bugg, tar 90 min, när kan jag?"
2. AI: "Du har ledigt 15:00-17:00 idag. Ska jag boka?"
3. Du: "Ja"
4. AI bokar → syns i kalender → ingen kan boka dig för möte
```

### Scenario 3: Omplanera efter sent möte
```
Ett möte drog över:
1. Öppna kalender
2. Dra "Fokus: Rapport" från 15:00 → 16:00
3. Microsoft-kalendern uppdateras automatiskt
4. Fortsätt jobba!
```

---

## 🐛 FELSÖKNING

### "Microsoft-konto krävs"
**Lösning:** Gå till Inställningar → Microsoft → Koppla

### Events visas inte
**Lösning:**
1. Klicka "Uppdatera"-knappen (höger överkant)
2. Kolla att du är inloggad på Microsoft (grön prick i header)
3. Öppna Console (F12) → kolla efter felmeddelanden

### Kan inte dra tasks
**Lösning:**
1. Kolla att task är i inbox (inga deadlines)
2. Se att sidebaren är synlig (knapp till vänster)
3. Försök med en annan task

### Fokustid syns inte i Outlook
**Lösning:**
1. Öppna Outlook.com eller Outlook-appen
2. Uppdatera vyn (kan ta några sekunder)
3. Leta efter event som börjar med "🎯 Fokus:"
4. Om fortfarande inte syns → kolla Microsoft-permissions i Inställningar

### Dark mode ser konstig ut
**Lösning:** Hård-refresh (Cmd+Shift+R) för att ladda ny CSS

---

## 📊 PRESTANDATIPS

### Snabbare laddning:
- Kalendern hämtar endast 14 dagar framåt (inte hela året)
- Tasks cachar i minnet (ingen re-fetch varje gång)
- Events färgkodas lokalt (ingen Graph API-call)

### Optimeringar:
- Lazy loading (kalendern laddas bara när du öppnar den)
- Debounced drag (inte 100 API-calls när du drar)
- Optimistic updates (UI uppdateras direkt, API i bakgrund)

---

## 🎓 KEYBOARD SHORTCUTS (React Big Calendar)

- **← →** = Föregående/nästa vecka
- **T** = Today (gå till idag)
- **Esc** = Stäng modal
- **Enter** (i slot-select) = Skapa fokustid

---

## 🚀 NÄSTA STEG (när du gillar det här!)

### Möjliga förbättringar (ordning efter nytta):

1. **Månadvy** (lätt, ~1h)
   - Visa hela månaden
   - Bra för långsiktig planering

2. **Dagvy** (lätt, ~30 min)
   - Zooma in på en dag
   - Större slots, lättare att se detaljer

3. **Konfliktvarning** (medel, ~2h)
   - Röd markering om du försöker boka över möte
   - "Du har redan ett möte 14:00-15:00. Boka ändå?"

4. **Smart schemaläggning** (medel, ~3h)
   - AI föreslår bästa tid baserat på:
     - Dina vanliga arbetstider
     - Energy levels (morgonpigg vs kvällsmänniska)
     - Tidigare fokus-patterns

5. **Batch-schemaläggning** (medel, ~2h)
   - Välj 5 tasks → "Fyll ut veckan automatiskt"
   - AI hittar bästa slots och bokar allt

6. **Mobile swipe** (lätt, ~1h)
   - Swipe tasks från sidebar till kalender på mobil
   - Touch-friendly gestures

7. **Print/Export** (lätt, ~1h)
   - Skriv ut veckoplanen
   - Exportera till PDF
   - Dela som bild

---

## ✅ SAMMANFATTNING

**Du har nu:**
- ✅ Veckokalender med Microsoft-integration
- ✅ Drag & drop tasks för schemaläggning
- ✅ Automatisk synkning till Outlook
- ✅ Resize och flytta events
- ✅ Klicka för att boka fokustid
- ✅ Sidebar med inbox-tasks

**Du KAN:**
- ✅ Se alla möten + tasks på ett ställe
- ✅ Planera din vecka visuellt
- ✅ Dra tasks för att schemalägga
- ✅ Boka fokustid direkt i Outlook
- ✅ Flytta/ändra fokussessioner

**Du KAN INTE (medvetet):**
- ❌ Skapa möten med deltagare
- ❌ Svara på mötesförfrågningar
- ❌ Hantera recurring events

**→ Använd Outlook för möten, Prio för fokustid!**

---

**Vill du testa det NU? Kör `npm run dev` och öppna /calendar!** 🚀
