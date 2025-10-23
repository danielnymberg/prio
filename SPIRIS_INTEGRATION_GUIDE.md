# MINPRIO - UPPDATERAD PROJEKTVY MED SPIRIS-INTEGRATION

## 🎯 NYA FÄLT I PROJECTS-TABELLEN

### **Spiris-synkronisering**
- `spiris_project_id` - TEXT - Spiris projekt-ID (unikt)
- `spiris_last_sync` - TIMESTAMPTZ - Senaste synk-tidpunkt
- `spiris_sync_enabled` - BOOLEAN - Automatisk synk aktiverad?

### **Resursplanering (från Spiris)**
- `budgeted_hours` - NUMERIC - Kalkylerade/budgeterade timmar
- `budgeted_revenue` - NUMERIC - Budgeterad intäkt (kr)
- `invoiced_hours` - NUMERIC - Fakturerade timmar (beräknat)
- `invoiced_amount` - NUMERIC - Faktiskt fakturerat belopp (kr)
- `actual_hours_worked` - NUMERIC - Faktiskt arbetade timmar
- `project_manager` - TEXT - Projektledare
- `start_date` - DATE - Projektstart

### **Beräknade värden (i UI)**
```typescript
// Kvarvarande timmar
const remainingHours = (project.budgeted_hours || 0) - (project.invoiced_hours || 0);

// Kvarvarande budget
const remainingBudget = (project.budgeted_revenue || 0) - (project.invoiced_amount || 0);

// Färdigställningsgrad
const completionPercentage = project.budgeted_hours > 0 
  ? (project.invoiced_hours / project.budgeted_hours) * 100 
  : 0;

// Burn rate (timmar per vecka)
const weeksSinceStart = calculateWeeks(project.start_date, new Date());
const burnRate = weeksSinceStart > 0 
  ? (project.actual_hours_worked || 0) / weeksSinceStart 
  : 0;

// Projicerat slutdatum (om vi fortsätter i samma takt)
const weeksRemaining = burnRate > 0 ? remainingHours / burnRate : 0;
const projectedEndDate = addWeeks(new Date(), weeksRemaining);
```

---

## 📊 UPPDATERAD PROJECTSVIEW - KOLUMNER

### **Befintliga kolumner (behåll)**
- Projektnamn
- Kund
- Offererade timmar (quoted_hours) → **Byt till: Budgeterade timmar (budgeted_hours)**
- Timpris (hourly_rate)
- Budget (total_budget) → **Byt till: Budgeterad intäkt (budgeted_revenue)**
- Status
- Deadline (project_deadline)
- Actions (edit/delete)

### **Nya kolumner (lägg till)**
1. **Fakturerat** (invoiced_amount)
   - Format: "123 456 kr"
   - Color: Grön om > 0

2. **Fakturerade timmar** (invoiced_hours)
   - Format: "45.5h"

3. **Kvarvarande budget**
   - Beräknat: budgeted_revenue - invoiced_amount
   - Format: "56 789 kr"
   - Color: Röd om negativt (över budget)

4. **Kvarvarande timmar**
   - Beräknat: budgeted_hours - invoiced_hours
   - Format: "32.5h"
   - Color: Orange om < 10% kvar

5. **Färdigställning** (%)
   - Progress bar eller siffra
   - Color: Gradvis från röd → gul → grön

6. **Projektledare** (project_manager)
   - Text

### **Valfria kolumner (toggle i settings)**
- Arbetade timmar (actual_hours_worked)
- Startdatum (start_date)
- Spiris ID (spiris_project_id)
- Senaste synk (spiris_last_sync)

---

## 🗓️ NY VY: Q4 RESURSPLANERING

### **Syfte**
Visualisera resursbehovet för resterande år (23 okt - 31 dec 2025).

### **Layout**
```
┌─────────────────────────────────────────────────────┐
│  Q4 RESURSPLANERING 2025                            │
│  [Filtrera: Alla projekt ▾]  [Exportera till CSV]  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  📊 SAMMANFATTNING                                  │
│  ┌──────────────┬──────────────┬──────────────┐   │
│  │ Kvarvarande  │  Veckor kvar │ Timmar/vecka │   │
│  │   320h       │     10       │    32h       │   │
│  └──────────────┴──────────────┴──────────────┘   │
│                                                      │
│  ⚠️ DEADLINE INOM Q4: 8 projekt                    │
│  💰 KVARVARANDE BUDGET: 456 789 kr                 │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  📋 PROJEKT MED DEADLINE Q4                         │
│  ┌─────────────────────────────────────────────┐  │
│  │ Projekt A | Deadline: 15 nov | 45h kvar     │  │
│  │ Projekt B | Deadline: 1 dec  | 67h kvar     │  │
│  │ Projekt C | Deadline: 20 dec | 23h kvar     │  │
│  └─────────────────────────────────────────────┘  │
│                                                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  📅 VECKOFÖRDELNING (Gantt-liknande)               │
│  Week 43│████████░░░░░░░░ 32h                      │
│  Week 44│████████████░░░░ 45h                      │
│  Week 45│██████░░░░░░░░░░ 28h                      │
│  ...                                                │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### **Komponenter**

1. **Sammanfattningssektion**
   ```typescript
   interface Q4Summary {
     totalRemainingHours: number;
     weeksRemaining: number;
     averageHoursPerWeek: number;
     totalRemainingBudget: number;
     projectsWithQ4Deadline: number;
   }
   ```

2. **Projekt-lista (tabell)**
   - Kolumner:
     - Projektnamn
     - Kund
     - Deadline
     - Kvarvarande timmar
     - Kvarvarande budget
     - Prioritet (CPM från tasks)
     - Action: "Planera timmar"

3. **Veckofördelning (ScheduleComponent eller custom)**
   - Visa hur många timmar per vecka som behövs
   - Färgkodning:
     - Grön: < 40h/vecka
     - Orange: 40-50h/vecka
     - Röd: > 50h/vecka
   - Drag & drop för att fördela projekt över veckor

4. **Export-funktion**
   - CSV med alla Q4-projekt
   - Kolumner: Projekt, Kund, Deadline, Budgeterade timmar, Fakturerade timmar, Kvarvarande timmar, Kvarvarande budget

---

## 🛠️ IMPLEMENTATION GUIDE FÖR CLAUDE CODE

### **Steg 1: Databas-migration**
```bash
# Kör SQL-migration i Supabase
# Fil: 006_add_spiris_fields.sql
```

### **Steg 2: TypeScript-typer**
```typescript
// src/types/project.ts
export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  client_name?: string;
  color: string;
  status: 'active' | 'completed' | 'archived';
  
  // Befintliga ekonomifält
  quoted_hours?: number;
  hourly_rate?: number;
  external_costs?: number;
  total_budget?: number;
  project_deadline?: string;
  completion_percentage?: number;
  
  // NYA: Spiris-synk
  spiris_project_id?: string;
  spiris_last_sync?: string;
  spiris_sync_enabled?: boolean;
  
  // NYA: Resursplanering
  budgeted_hours?: number;
  budgeted_revenue?: number;
  invoiced_hours?: number;
  invoiced_amount?: number;
  actual_hours_worked?: number;
  project_manager?: string;
  start_date?: string;
  
  created_at: string;
  updated_at: string;
}

// Beräknade värden (computed)
export interface ProjectMetrics {
  remainingHours: number;
  remainingBudget: number;
  completionPercentage: number;
  burnRate: number; // timmar per vecka
  projectedEndDate?: Date;
  isOverBudget: boolean;
  isAtRisk: boolean; // deadline inom 2 veckor + < 50% klart
}
```

### **Steg 3: Uppdatera ProjectsView.tsx**

**NYA kolumner i GridComponent:**
```typescript
<ColumnDirective
  field="invoiced_amount"
  headerText="Fakturerat"
  width="120"
  format="C0"
  textAlign="Right"
  template={(props: Project) => (
    <span style={{ color: props.invoiced_amount > 0 ? '#10b981' : undefined }}>
      {formatCurrency(props.invoiced_amount || 0)}
    </span>
  )}
/>

<ColumnDirective
  field="remaining_budget"
  headerText="Kvarvarande budget"
  width="150"
  textAlign="Right"
  template={(props: Project) => {
    const remaining = (props.budgeted_revenue || 0) - (props.invoiced_amount || 0);
    return (
      <span style={{ color: remaining < 0 ? '#ef4444' : '#10b981' }}>
        {formatCurrency(remaining)}
      </span>
    );
  }}
/>

<ColumnDirective
  field="completion_percentage"
  headerText="Färdigställning"
  width="120"
  template={(props: Project) => {
    const pct = props.budgeted_hours > 0 
      ? (props.invoiced_hours / props.budgeted_hours) * 100 
      : 0;
    return (
      <ProgressBarComponent
        value={pct}
        height="20"
        showProgressValue={true}
        type="Linear"
        trackColor="#e5e7eb"
        progressColor={pct < 50 ? '#ef4444' : pct < 80 ? '#f59e0b' : '#10b981'}
      />
    );
  }}
/>
```

### **Steg 4: Skapa Q4ResourcePlanningView.tsx**

```typescript
// src/components/planning/Q4ResourcePlanningView.tsx
import { useState, useEffect } from 'react';
import { GridComponent } from '@syncfusion/ej2-react-grids';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';

export const Q4ResourcePlanningView = () => {
  const { projects } = useProjects();
  const { tasks } = useTasks();
  
  // Filtrera projekt med deadline Q4 2025
  const q4Projects = projects.filter(p => {
    if (!p.project_deadline) return false;
    const deadline = new Date(p.project_deadline);
    return deadline >= new Date('2025-10-23') && deadline <= new Date('2025-12-31');
  });
  
  // Beräkna sammanfattning
  const summary = calculateQ4Summary(q4Projects);
  
  return (
    <div className="q4-planning">
      <h1>Q4 Resursplanering 2025</h1>
      
      {/* Sammanfattning */}
      <SummaryCards summary={summary} />
      
      {/* Projekt-grid */}
      <GridComponent
        dataSource={q4Projects}
        // ... kolumner här
      />
      
      {/* Veckofördelning */}
      <WeeklyDistribution projects={q4Projects} />
    </div>
  );
};
```

### **Steg 5: Lägg till navigation**

```typescript
// src/App.tsx
<Route path="/planning/q4" element={<Q4ResourcePlanningView />} />

// Lägg till i sidomenyn
<li>
  <Link to="/planning/q4">
    <Calendar /> Q4 Planering
  </Link>
</li>
```

---

## 📝 TESTPLAN

### **1. Databas-migration**
- [ ] Kör SQL-migration i Supabase SQL Editor
- [ ] Verifiera att nya kolumner finns: `SELECT * FROM projects LIMIT 1;`
- [ ] Kolla att index skapats: `\di` eller via Supabase UI

### **2. Import-script**
- [ ] Sätt miljövariabler (SUPABASE_URL, SERVICE_KEY, USER_ID)
- [ ] Kör dry run: `python import_spiris_projects.py projektlista.xlsx`
- [ ] Granska output - verkar data korrekt?
- [ ] Kör faktisk import: `python import_spiris_projects.py projektlista.xlsx --import`
- [ ] Verifiera i MinPrio att projekt synts

### **3. ProjectsView**
- [ ] Nya kolumner visas korrekt
- [ ] Beräknade värden stämmer (remaining budget, completion %)
- [ ] Färgkodning fungerar (röd = över budget, grön = ok)
- [ ] Sortering fungerar på nya kolumner
- [ ] Edit-formulär har nya fält

### **4. Q4ResourcePlanningView**
- [ ] Visar rätt antal projekt (deadline Q4)
- [ ] Sammanfattning beräknas korrekt
- [ ] Veckofördelning är rimlig
- [ ] Export till CSV fungerar

---

## 💡 TIPS & VARNINGAR

### **Problem: Saknade budgetdata**
- ⚠️ Endast 12/53 projekt har "Kalkylerad tid" i Spiris
- 💡 **Lösning:** Komplettera manuellt i MinPrio efter import

### **Problem: Fakturerade timmar saknas**
- ⚠️ Spiris har "Intäkt" men inte direkt "fakturerade timmar"
- 💡 **Lösning:** Beräknas från: Intäkt / Timpris

### **Problem: Timpris varierar**
- ⚠️ Genomsnittligt timpris är 878 kr/h, men kan variera per projekt
- 💡 **Lösning:** Import-scriptet försöker beräkna individuellt timpris från data

### **Problem: Dubbletter vid flera importer**
- ⚠️ Om man kör import flera gånger kan projekt dupliceras
- 💡 **Lösning:** Import-scriptet kollar `spiris_project_id` först
- 💡 **Alternativ:** Radera alla Spiris-projekt först: `DELETE FROM projects WHERE spiris_project_id IS NOT NULL;`
