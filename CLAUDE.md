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

### 6. SVENSKA NAMN för nya komponenter
- Nya filer: `UppgiftRegistrering.tsx`, `DagligCheckIn.tsx`
- Appen är endast för svensk användare

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

### Grid Height Best Practice
SyncFusion Grid **kräver explicit höjd** på parent:
```tsx
<div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
  <div>Header</div>
  <div style={{ flex: 1, minHeight: 0 }}>
    <GridComponent height="100%" />
  </div>
</div>
```

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
- [ ] Funktionalitet testad i webbläsare
- [ ] Endast EN ändring per commit
- [ ] Inga nya CSS-overrides på SF-komponenter
- [ ] Inga nya wrappers (använd SF direkt)
- [ ] Svenska namn för nya komponenter
- [ ] Följer SyncFusion Fluent2 best practice
