# Prio - Kodstandarder för Claude

## 🎯 Projektöversikt
MinPrio är en personlig uppgiftshanterare byggd med SyncFusion Fluent2 React-komponenter. Ensam användare, svensk app.

## 🔴 ABSOLUTA FÖRBUD

### 1. INGA WRAPPERS
- Använd SyncFusion-komponenter DIREKT
- Importera från `@syncfusion/ej2-react-*`
- Undantag: Dialog wrapper för modaler (ej DialogComponent direkt), SyncButton för knappar

### 2. EN ÄNDRING I TAGET
- Gör ALDRIG flera orelaterade ändringar samtidigt
- Om användaren ber om X - gör ENDAST X

### 3. INGA PÅTVINGADE FEATURES
- Microsoft-login, onboarding etc ska vara VALFRIA
- Fråga alltid innan du lägger till ny funktionalitet

### 4. INGEN "FÖRBÄTTRING" AV FUNGERANDE KOD
- Om något fungerar - ÄNDRA INTE
- Refactoring endast om explicit efterfrågat

## 🟢 ALLTID GÖR

### 1. Importera direkt från SyncFusion
```tsx
import { GridComponent } from '@syncfusion/ej2-react-grids';
import { DialogComponent } from '@syncfusion/ej2-react-popups';
```

### 2. Villkorlig rendering för DialogComponent
```tsx
if (!isOpen) return null;

return <DialogComponent visible={true} ... />
```

### 3. Testa lokalt innan commit
- Kör `npm run build` för att verifiera TypeScript
- Testa i webbläsaren att funktionalitet fungerar

### 4. Kontrollera SF bibliotek INNAN implementation
- Vid nya komponenter/features: Sök SyncFusion docs FÖRST
- Välj korrekt Fluent2-komponent enligt SF best practice
- Spara tid genom att göra rätt från början

### 5. REN FLUENT2 ÖVERALLT
- Inga CSS-overrides på SyncFusion-komponenter
- Låt Fluent2-tema göra jobbet
- Använd endast SF utility-klasser (`e-flex`, `e-text-sm` etc)
- Använd SF's inbyggda props istället för custom CSS:
  - `rowHeight`, `headerRowHeight` för Grid
  - `height="auto"` för Grid i scrollbar main-container
  - ALDRIG `height: '100vh'` eller custom scroll-containers

### 6. SVENSKA NAMN för nya komponenter
- Nya filer: `UppgiftRegistrering.tsx`, `DagligCheckIn.tsx`
- Appen är endast för svensk användare

### 7. SYNCFUSION LICENSE & CSS - OBLIGATORISKT
- **License key**:
  - Registreras i `main.tsx` via `registerLicense()`
  - Läses från `.env.local`: `VITE_SYNCFUSION_LICENSE_KEY`
  - **Enterprise Edition** täcker ALLA komponenter (Grid, Gantt, Schedule, etc)
  - **Production**: Lägg till samma key som environment variable på Render
  - **Verifiera**: Console ska visa `[SF License] ✓ Registered`
- **CSS-import**: VID NYA SF-KOMPONENTER → lägg till CSS i `main.tsx`
- Exempel: Vid `GanttComponent` → lägg till `import '@syncfusion/ej2-react-gantt/styles/fluent2.css';`
- **VIKTIGT**: CSS-import FÖRE komponenten används första gången
- **Format**: Alltid `/styles/fluent2.css` (konsekvent med resten)

### 8. NYA SF-KOMPONENTER - OBLIGATORISK PROCESS
**FÖRE implementation:**
1. ✅ Läs SF dokumentation för komponenten
2. ✅ Hitta minimal working example i SF docs
3. ✅ Kopiera EXAKT kod från exempel
4. ✅ Testa minimal version i webbläsare (inte bara build!)
5. ✅ Lägg till features EN i taget
6. ✅ Testa i webbläsare efter varje feature

**ALDRIG:**
- ❌ Implementera utan att läsa docs
- ❌ Anta att props fungerar som du tror
- ❌ Gissa på configuration
- ❌ Lägga till flera features samtidigt
- ❌ Commita utan att testa i webbläsare

### 9. GRID EDITING - SF BEST PRACTICE

**Batch Edit Mode (för många cell-edits):**
```tsx
const editSettings = {
  allowEditing: true,
  mode: 'Batch'  // Editera flera → klicka Update
};
const toolbar = ['Update', 'Cancel'];

<GridComponent
  editSettings={editSettings}
  toolbar={toolbar}
>
  <Inject services={[Edit, Toolbar]} />
</GridComponent>
```

**NumericEdit params:**
```tsx
<ColumnDirective
  editType="numericedit"
  edit={{ params: {
    min: 0,
    step: 0.5,
    format: 'N1',
    showSpinButton: false  // VIKTIGT: Dölj pilar, tillåt fritext
  }}}
/>
```

**KRITISKT:**
- ❌ INGEN `recordDoubleClick` på editerbara Grids (konflikt med edit-mode!)
- ❌ INGA `template` på editerbara kolumner (blockerar editing!)
- ✅ Använd `queryCellInfo` för styling istället för template
- ✅ `format="N1"` på kolumn + i edit params för konsistens

### 10. TEMPLATE RESTRICTIONS - När template BLOCKERAR SF

**Templates blockerar SF funktionalitet:**
- ❌ Editerbara kolumner med template → editing fungerar INTE
- ❌ queryCellInfo + complex styling → kan störa edit mode
- ✅ Använd `format` prop istället för template när möjligt
- ✅ Templates endast på read-only kolumner
- ✅ queryCellInfo för enkel cell-styling (bakgrundsfärg, font-weight)

**Exempel - FEL:**
```tsx
<ColumnDirective
  editType="numericedit"
  template={(props) => <div>{props.value}h</div>}  // ❌ Blockerar edit!
/>
```

**Exempel - RÄTT:**
```tsx
<ColumnDirective
  editType="numericedit"
  format="N1"  // ✅ SF format istället
/>
```

## ⚠️ KRITISKA KOMPONENTER - FUNGERAR, ÄNDRA EJ

- `GridComponent` i AllTasksView, ArchiveView
- `ScheduleComponent` i CalendarView
- `ButtonComponent` via SyncButton (wrapper behövs för onClick)
- `DialogComponent` med villkorlig rendering

## 🛑 VARNINGSSIGNALER

Dessa fraser indikerar att du gör för mycket:
- "Jag ska också bara..."
- "Medan jag ändå håller på..."
- "Detta ger bättre struktur..."
- "Jag optimerar lite..."

**STOPP när du hör dig själv säga detta!**

## 📝 VID PROBLEM

1. **STOPP** - gör inte fler ändringar
2. Identifiera EXAKT vad som är trasigt
3. Fixa ENDAST det problemet
4. Testa lokalt
5. Fråga användaren om osäker
6. **JÄMFÖR INTE** med andra platser i appen - kan leda till felaktiga antaganden
7. Om oklart syfte - FRÅGA användaren
8. Vid stora problem - bygg om från grunden, ta bort ALL gammal kod

## 🚫 PROJEKT-SPECIFIKT

- **Ensam användare** = ingen onboarding behövs
- **Microsoft Graph** = valfritt, inte automatiskt
- **Azure AD** fungerar inte lokalt = hantera gracefully
- **HTTPS lokalt** = problem, kör med http
- **SVENSKA NAMN** = nya komponenter ska ha svenska namn

## 📋 VANLIGA MISSTAG

### TaskForm DialogComponent
**Problem:** Kraschade med DOM-fel
**Lösning:** Villkorlig rendering `if (!isOpen) return null`

### ButtonComponent i DialogComponent
**Problem:** onClick fungerar inte på ButtonComponent inne i DialogComponent (React 17+ issue)
**Lösning:** Använd vanliga HTML `<button>` med SyncFusion CSS-klasser (`e-btn e-primary` etc)

### Microsoft Auto-login
**Problem:** Blockerade inloggning vid fel Azure-config
**Lösning:** Gör valfri, inte automatisk

### CSS-overrides
**Problem:** Overrides på SyncFusion-komponenter orsakar sidoeffekter
**Lösning:** Ta bort alla CSS-overrides, använd ren Fluent2

### Gantt + AllocationGrid (2025-10-23)
**Problem:** Implementerade utan att läsa SF docs först
**Konsekvens:** 2h felsökning - license popup, pilar täcker celler, loop
**Lärdomar:**
1. LÄS SF DOCS FÖRST - kopiera exakt från exempel
2. Testa minimal version i WEBBLÄSARE innan features
3. `showSpinButton: false` för NumericTextBox i Grid
4. INGA templates på editerbara kolumner
5. INGEN `recordDoubleClick` på editerbara Grids
6. Batch mode + Toolbar för Grid editing
7. EN komponent i taget - testa - commit - nästa

### Gantt License & Navigation Fix (2025-10-24)
**Problem:** License popup + navigation slutade fungera med Gantt
**Grundorsaker:**
1. **Versionsmismatch:** Gantt v31.2.3 när övriga var v31.1.23
2. **Tom services array:** `<Inject services={[]} />` förvirrade SF modulsystem
3. **Saknade moduler:** Gantt auto-aktiverar Selection som MÅSTE injekteras

**Lösning:**
1. Nedgradera Gantt till samma version som övriga SF-komponenter
2. Injektera ALLA moduler Gantt använder: `Selection, DayMarkers, Edit, Filter, Sort, Toolbar, Resize`
3. Ta bort ogiltiga props (showToolbar finns ej i v31.1.23)
4. Använd `allowSelection={true}` explicit för att undvika konflikter

**KRITISKA LÄRDOMAR:**
- **Gantt kräver explicit modulladdning** även för standard-features
- **Håll ALLTID samma version** på alla SF-paket (kontrollera package.json!)
- **Tom services-array = ALDRIG ok**, använd rätt moduler eller ta bort Inject helt
- **Selection-modulen är obligatorisk** för Gantt även om du inte använder selection
- **Testa navigationen** efter att lägga till nya SF-komponenter

## 🏗️ Arkitektur

### Tech Stack
- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js (Supabase + custom server)
- **UI:** SyncFusion EJ2 React (Fluent2 theme)
- **State:** React hooks (useTasks, useProjects, useAuth)
- **Database:** Supabase PostgreSQL
- **Deploy:** Render (auto-deploy från main branch)

### Viktiga algoritmer
- **CPM (Consequence-Priority Model):** `(Value × Time × Confidence) / Effort`
- **Focus Algorithm:** Prioritering baserad på CPM + kontext (energi, tillgänglig tid, strategi)
- **Working Hours:** Beräknar arbetstimmar (hoppar över helger)

### CPM-parametrar (1-10 skala)
- `value_score`: Objektiva konsekvenser om uppgiften INTE görs
- `time_sensitivity`: Faktisk kostnad av fördröjning
- `confidence`: Säkerhet i bedömningen
- `effort`: Uppskattad ansträngning

## 🎨 UI/UX Principer

### SyncFusion Fluent2 Komponenter
- **Forms:** DialogComponent med FormValidator
- **Inputs:** TextBoxComponent, NumericTextBoxComponent, DateTimePickerComponent
- **Selection:** DropDownListComponent, ChipListComponent, RadioButtonComponent
- **Data:** GridComponent, ScheduleComponent
- **Layout:** Flex utilities (`e-flex`, `e-flex-column`, `e-gap-*`)

### Grid Best Practice - UPPDATERAD 2025-10-23
**VIKTIGT:** Grid i scrollande main-container (AppLayout):

✅ **RÄTT:**
```tsx
// AppLayout har redan e-overflow-y-auto på main
<>
  <div className="e-mb-16">Header</div>
  <GridComponent
    height="auto"
    rowHeight={30}
    headerRowHeight={20}
  />
</>
```

❌ **FEL:**
```tsx
// Skapar dubbel scroll!
<div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
  <div style={{ flex: 1, minHeight: 0 }}>
    <GridComponent height="100%" />
  </div>
</div>
```

**Kompakta layouter:**
- `headerRowHeight={20}` - Tight header
- `rowHeight={30}` - Kompakta rader (istället för 60px default)
- Bold headers: `headerTemplate={() => <span className="e-font-bold">Text</span>}`

### Responsive Design
- Desktop: Sidebar synlig, 2-kolumns layout
- Mobil (<768px): Sidebar dold, 1-kolumn layout
- Använd SF's responsive utilities, inga media queries

## 🧪 Testing

### Lokal utveckling
```bash
npm run dev          # Start dev server
npm run build        # Build för production
npm run preview      # Testa production build
```

### Deployment
- **Auto-deploy:** Push till `main` → Render bygger automatiskt
- **Manual deploy:** Via Render API med RENDER_API_KEY

## 📚 Resurser

- **SyncFusion Docs:** https://ej2.syncfusion.com/react/documentation/
- **Fluent2 Theme:** https://ej2.syncfusion.com/react/documentation/appearance/theme
- **Grid BP:** https://ej2.syncfusion.com/react/documentation/grid/getting-started

## ✅ Checklista innan commit

- [ ] Build lyckas lokalt (`npm run build`)
- [ ] Funktionalitet testad i **WEBBLÄSARE** (inte bara build!)
- [ ] Endast EN ändring per commit
- [ ] Inga nya CSS-overrides på SF-komponenter
- [ ] Inga nya wrappers (använd SF direkt)
- [ ] Svenska namn för nya komponenter
- [ ] Följer SyncFusion Fluent2 best practice

### För nya SF-komponenter (extra viktigt!):
- [ ] SF dokumentation läst FÖRE implementation
- [ ] Minimal example kopierad EXAKT från SF docs
- [ ] Testad i webbläsare INNAN features lagts till
- [ ] License key täcker komponenten (Enterprise Edition)
- [ ] CSS import tillagd i `main.tsx`
- [ ] INGA templates på editerbara kolumner
- [ ] `showSpinButton: false` om NumericTextBox i Grid
