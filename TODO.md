# TODO - Framtida förbättringar

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
