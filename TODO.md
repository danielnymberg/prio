# TODO - Framtida förbättringar

## 🔥 AKUT: Återställ Fluent2 efter app.css-borttagning (2025-10-24)

**BAKGRUND:** app.css (512 rader custom CSS) togs bort för att fixa Gantt alignment-problem. Global CSS-reset (`* { padding: 0 }`) bröt SF-komponenter. Nu måste alla vyer återställas med ren SF Fluent2.

**STRATEGI:** EN komponent → Fixa → Build → Test → Nästa

### 🔴 Prioritet 1: KRITISKA KOLLAPSER

#### 1. Focus-vyn
- [x] Startsida: Ta bort "Starta avstämning"-knapp
- [x] Uppgiftslista: SF formatering (tog bort e-mx-auto, e-pt-24, e-cursor-pointer, e-rounded-xl)
- [x] Timer-modal: Fluent2 knappar och layout
- [x] "Task slutförd" → "Uppgift slutförd" + SF formatering
- [ ] **PROBLEM:** Ändringarna syns inte i webbläsaren trots build + dev-server omstart på ny port!

#### 2. Projekt-vyn
- [x] Header: Fixa layout (sök + knapp till höger)
- [x] Grid filter-rader: Ta bort filter för Off.tim, Timpris, Budget, Edit
- [x] Status-filter: Ändra till DropDown med fast värden
- [x] Edit-dialog: Fixa rubrik, lägg till Status-fält, lägg till Radera-knapp med varning
- [x] Ta bort "Öga"-ikon (leder ingenstans)

#### 3. Översikt
- [x] Undersök vad som är trasigt
- [x] Återställ med SF Fluent2 (inkl CapacityTimeline)

#### 4. Kalender (vänster kolumn)
- [x] "Ej schemalagda uppgifter": SF formatering

### 🟡 Prioritet 2: MINDRE FIXAR

#### 5. Uppgifter
- [x] Undersök typsnitt och formatering (utility-klasser ersatta med inline styles)

#### 6. Gantt
- [ ] Dagens datum-linje + centrera vy på dagens datum (OM SF BP)

#### 7. Resursallokering/Q1/Q4
- [x] Header formatering (grid fungerar)
- [ ] ResursplaneringView - Återstående utility-klasser i listningar och dialog (delvis fixat: templates, header, summary)

### 🟢 Prioritet 3: STRUKTUR

#### 8. Planering-menyn
- [ ] Lägg ut 4 funktioner direkt i menyn med respektive ikoner
- [ ] Ta bort "Planering" som överrubrik

### ⏸️ För senare

#### 9. Avancerat
- [ ] Import fungerar inte, skippa tills vidare

**REGLER:**
- ✅ Endast SF utility-klasser (e-flex, e-gap-*, e-text-*, e-btn)
- ✅ Build + test efter varje fix
- ✅ EN komponent i taget
- ❌ INGA custom CSS
- ❌ INGA nya wrappers

---

## 🚧 PÅGÅENDE (Högsta prioritet)

### 1. Resursplanering Q4/Q1 (PÅGÅENDE)
- ✅ Q4/Q1 ResursplaneringView skapad
- ✅ Ledighetshantering implementerad
- ✅ Veckofördelning med 32h/vecka-gräns
- ⏳ Fyll i startdatum på alla projekt
- ⏳ Testa ledighetsperioder (23-31 dec)
- ⏳ Justera fakturerade timmar och nedlagd tid

---

## ⚠️ NÄSTA PRIORITET (Kritiska buggar)

### 2. Disabled Features - Måste Aktiveras

#### **EmailTaskListener** (App.tsx:198-199)
**Problem**: Kraschar vid mount - dubbla prenumerationer i StrictMode
**Påverkan**: Email-to-task feature fungerar INTE
**Orsak**: Supabase realtime subscriptions körs dubbelt i React 18 StrictMode
**Lösning**: Implementera isSubscribed-pattern + proper cleanup
**Prioritet**: ⚠️ HÖG - Kritisk funktion

#### **ToastComponent** (App.tsx:303-316)
**Problem**: Avstängd för testing (misstänkt krasch)
**Påverkan**: Använder react-hot-toast som fallback (26 filer)
**Lösning**: Aktivera SF ToastComponent, verifiera att det fungerar
**Prioritet**: MEDEL - Workaround finns

#### **QuickCaptureBar** (App.tsx:204)
**Problem**: TaskForm/Dialog krasch-misstanke
**Påverkan**: Snabb task-capture från mobil fungerar ej
**Lösning**: Verifiera Dialog fungerar, eller ersätt med QuickCaptureFAB
**Prioritet**: MEDEL - UX-feature saknas

#### **QuickNoteInput** (App.tsx:202-203)
**Problem**: Kraschar vid expandering (Portal/Dialog issue)
**Påverkan**: Quick note-feature fungerar ej
**Lösning**: Ombyggnad med SF-kompatibel dialog
**Prioritet**: MEDEL

#### **WeeklyReviewModal** (App.tsx:206-212)
**Problem**: Portal-krasch misstanke
**Påverkan**: Veckosammanfattning visas ej
**Lösning**: Verifiera Dialog fungerar
**Prioritet**: LÅG - Valfri feature

#### **GlobalSearch** (App.tsx:319, 266-299)
**Problem**: Portal/Dialog issue
**Påverkan**: Cmd/Ctrl+K global search fungerar ej
**Lösning**: Verifiera Dialog fungerar
**Prioritet**: LÅG - Valfri feature

**Root Cause**: DialogComponent från SyncFusion använder Portals → React 18 Concurrent Mode + StrictMode orsakar `insertBefore`/`removeChild` errors

**Dokumentation**: Se DISABLED_COMPONENTS.md för detaljer

---

### 3. AI-funktioner Fungerar Inte Korrekt

#### **Röstgränssnitt (VoiceInterface.tsx)**
**Problem**: [SPECIFICERA PROBLEM]
**Påverkan**: AI-assistans via röst fungerar inte som förväntat
**Prioritet**: HÖG - Viktig feature

#### **Text-baserad AI (claude-conversation.ts)**
**Problem**: [SPECIFICERA PROBLEM]
**Påverkan**: AI-funktioner via text fungerar inte korrekt
**Prioritet**: HÖG - Viktig feature

**TODO**: Dokumentera exakta problem och buggar med AI-funktionerna

---

## ✅ KLART (2025-10-23)

### ProjectsView UX-förbättringar
- ✅ Flyttad från "Avancerat" till huvudmeny under "Uppgifter"
- ✅ Scroll fixat: height="auto", ingen dubbel scroll-container
- ✅ Kompakt layout: rowHeight=30
- ✅ Bold headers med headerTemplate
- ✅ Sökfält i header (320px, till höger)
- ✅ CommandColumn för Edit/Delete
- ✅ Snabbknappar: Klarmarkera (✓) och Arkivera
- ✅ Alla Spiris-fält redigerbara i edit-dialog
- ✅ Optimerade kolumnbredder (ingen horisontell scroll på fullskärm)
- ✅ Inga CSS overrides - ren SF BP

### OverviewView kompakt layout
- ✅ Tog bort 326 rader inline styles
- ✅ Ersatt med SF utility classes
- ✅ DropDownListComponent för filter
- ✅ Kompakta kort: 12-16px padding
- ✅ Mindre font-sizes (e-text-xs/base/xl)

### Grid-höjd enligt SF BP
- ✅ CLAUDE.md uppdaterad med best practices
- ✅ height="auto" i AppLayout's scrollande main
- ✅ ALDRIG height: '100vh' eller nested scroll-containers

### Lucide → SyncFusion e-icons
- ✅ Ersatt ALLA Lucide-ikoner med SF e-icons (38 filer)
- ✅ 100+ individuella ikon-ersättningar
- ✅ Inga externa ikon-dependencies - ren SF Fluent2
- ✅ Storlekskonvertering: height/width → fontSize
- ✅ Mapping: Calendar→e-schedule, Clock→e-time, AlertTriangle→e-warning, etc.

### Städning
- ✅ Migration 003→004 capacity_timeline (fixade namespace-konflikt)
- ✅ Raderade 11 gamla SQL-filer (create-user, cleanup, check, repair)
- ✅ Raderade duplicerade migrations och skräpfiler
- ✅ Raderade CalendarWithTaskSidebar_OLD.tsx (370 rader)
- ✅ Raderade MIGRATION_GUIDE.md, TODO_DANIEL.md, TASKFORM_NEW_STRUCTURE.md

---

## 🐛 Kända buggar

### AllTasksView: Saknar klarmarkering från Grid
**Problem**: När man klarmarkerar en uppgift från "Just nu" visas ResultImpactModal, men inte från AllTasksView Grid.

**Orsak**: AllTasksView har ingen klarmarkerings-funktion i Gridet. Grid är read-only förutom dubbel-klick för att redigera.

**Lösning** (framtida):
- Lägg till checkbox-kolumn i GridComponent
- Eller action-meny med "Markera som klar"
- Navigera till `/task/${taskId}/impact` efter klarmarkering

**Prioritet**: Medel (workaround finns via FocusView)

---

## 💡 Förbättringsförslag

### Calendar-ikon i Sidebar
Visar vit ruta istället för ikon. Använder `e-schedule` men något är fel. Låt vara tills vidare.

### Resursplanering: Startdatum-logik
**Problem**: Översikten visar alla projekt oavsett startdatum. Projekt som börjar om 2 veckor med deadline om 8 veckor visas inte korrekt.

**Behov**:
- Visa "Kommande projekt" (framtida startdatum) separat
- Visa "Aktiva projekt" (startdatum passerat, deadline framtida)
- Visa "Försenade projekt" (deadline passerat)
- Tidslinjen måste ta hänsyn till när projekt faktiskt startar

**Nästa steg**: Bygg Q4-resursplaneringsvy med korrekt logik
