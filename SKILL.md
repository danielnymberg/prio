# SyncFusion Fluent2 Skill

## Syfte

Denna skill guidar Claude i att korrekt implementera och arbeta med SyncFusion EJ2 React-komponenter med Fluent2-temat för MinPrio-projektet. Målet är att säkerställa konsistent, korrekt och optimerad användning av SyncFusion-biblioteket enligt etablerade best practices.

## När ska denna skill användas?

Använd denna skill när:
- Användaren ber om att skapa eller modifiera SyncFusion-komponenter
- Användaren nämner GridComponent, KanbanComponent, GanttComponent, ScheduleComponent, DialogComponent eller andra SyncFusion-komponenter
- Användaren arbetar med MinPrio-projektet och behöver UI-komponenter
- Användaren ber om task management, kalendrar, datagrids, kanban boards eller formulär

## KRITISKA REGLER - FÖLJ ALLTID

### 1. Direktimport - Aldrig Custom Wrappers

**RÄTT sätt:**
```typescript
import { GridComponent, ColumnsDirective, ColumnDirective } from '@syncfusion/ej2-react-grids';
import { KanbanComponent } from '@syncfusion/ej2-react-kanban';
import { DialogComponent } from '@syncfusion/ej2-react-popups';
```

**FEL sätt (ALDRIG göra detta):**
```typescript
import { MyCustomGrid } from './components/MyCustomGrid';
import { CustomDialog } from './wrappers/CustomDialog';
```

**Varför:** SyncFusion-komponenter har komplex intern state management och lifecycle. Custom wrappers bryter ofta denna funktionalitet och orsakar svåra att debugga problem.

### 2. Service Injection - Obligatorisk för Funktionalitet

**RÄTT sätt:**
```typescript
import { GridComponent, Inject, Page, Sort, Filter, Edit, Toolbar } from '@syncfusion/ej2-react-grids';

<GridComponent dataSource={data}>
  <Inject services={[Page, Sort, Filter, Edit, Toolbar]} />
</GridComponent>
```

**FEL sätt:**
```typescript
<GridComponent dataSource={data} />
// Komponenten renderas men funktionalitet saknas!
```

**Varför:** SyncFusion använder dependency injection. Utan injicerade services kommer funktioner som sortering, filtrering och paginering inte att fungera alls.

### 3. Villkorlig Rendering för DialogComponent - Förhindra React DOM Crashes

**RÄTT sätt:**
```typescript
function MyDialog({ isOpen, onClose }) {
  if (!isOpen) return null;
  
  return (
    <DialogComponent
      isModal={true}
      visible={isOpen}
      close={onClose}
    >
      {/* innehåll */}
    </DialogComponent>
  );
}
```

**FEL sätt:**
```typescript
function MyDialog({ isOpen, onClose }) {
  return (
    <DialogComponent
      isModal={true}
      visible={isOpen}
      close={onClose}
    >
      {/* innehåll */}
    </DialogComponent>
  );
}
```

**Varför:** DialogComponent modifierar DOM direkt. Att rendera den när `visible={false}` orsakar konflikter mellan React's virtual DOM och SyncFusions DOM-manipulation, vilket leder till crashes.

### 4. Respektera Fluent2 - Inga CSS Overrides med !important

**RÄTT sätt:**
```typescript
<GridComponent cssClass="custom-grid" />

// I CSS:
.custom-grid {
  --primary-color: #1a73e8;
}
```

**FEL sätt:**
```css
.e-grid {
  background: red !important;
  color: blue !important;
}
```

**Varför:** Fluent2-temat är noggrant designat för konsistens och tillgänglighet. CSS overrides med !important förstör temat och skapar underhållsproblem.

### 5. ButtonComponent i Dialog - React 17+ Bug Workaround

**RÄTT sätt:**
```typescript
<DialogComponent visible={isOpen}>
  <button className="e-btn e-primary" onClick={handleSave}>
    Spara
  </button>
  <button className="e-btn" onClick={handleCancel}>
    Avbryt
  </button>
</DialogComponent>
```

**FEL sätt:**
```typescript
<DialogComponent visible={isOpen}>
  <ButtonComponent cssClass="e-primary" onClick={handleSave}>
    Spara
  </ButtonComponent>
</DialogComponent>
```

**Varför:** Det finns en känd bug i SyncFusion med React 17+ där ButtonComponent inuti DialogComponent orsakar event handler-problem. Använd vanliga HTML buttons med SyncFusion CSS-klasser istället.

## Komponentöversikt

### GridComponent - Datagrids och Tabeller

**När använda:**
- Tabellbaserad datavisning
- Sortering, filtrering, paginering av data
- Task lists, uppgiftslistor
- CRUD-operationer på strukturerad data

**Grundläggande struktur:**
```typescript
import { 
  GridComponent, 
  ColumnsDirective, 
  ColumnDirective,
  Inject,
  Page, 
  Sort, 
  Filter,
  Edit,
  Toolbar
} from '@syncfusion/ej2-react-grids';

function TaskGrid() {
  const tasks = [...]; // Din data
  
  const editSettings = { 
    allowAdding: true, 
    allowEditing: true, 
    allowDeleting: true,
    mode: 'Dialog'
  };
  
  return (
    <GridComponent
      dataSource={tasks}
      allowPaging={true}
      allowSorting={true}
      allowFiltering={true}
      editSettings={editSettings}
      toolbar={['Add', 'Edit', 'Delete']}
      height="auto"
    >
      <ColumnsDirective>
        <ColumnDirective 
          field="id" 
          headerText="ID" 
          isPrimaryKey={true}
          visible={false}
        />
        <ColumnDirective 
          field="title" 
          headerText="Uppgift" 
          width="250"
          validationRules={{ required: true }}
        />
        <ColumnDirective 
          field="priority" 
          headerText="Prioritet" 
          width="150"
        />
      </ColumnsDirective>
      <Inject services={[Page, Sort, Filter, Edit, Toolbar]} />
    </GridComponent>
  );
}
```

**Viktiga props:**
- `dataSource`: Array av objekt
- `allowPaging`, `allowSorting`, `allowFiltering`: Boolean för funktionalitet
- `editSettings`: Konfiguration för CRUD
- `toolbar`: Array av toolbar items
- `height`: "auto" för dynamisk, "450px" för fix höjd

### KanbanComponent - Kanban Boards

**När använda:**
- Status tracking (Backlog → Todo → Doing → Done)
- Visuell workflow management
- Drag-and-drop task organization

**Grundläggande struktur:**
```typescript
import { KanbanComponent, ColumnsDirective, ColumnDirective } from '@syncfusion/ej2-react-kanban';

function StatusKanban() {
  const tasks = [...];
  
  const cardSettings = {
    contentField: 'Summary',
    headerField: 'Title',
  };
  
  return (
    <KanbanComponent
      dataSource={tasks}
      keyField="Status"
      cardSettings={cardSettings}
    >
      <ColumnsDirective>
        <ColumnDirective headerText="Backlog" keyField="backlog" />
        <ColumnDirective headerText="Todo" keyField="todo" />
        <ColumnDirective headerText="Doing" keyField="doing" maxCount={3} />
        <ColumnDirective headerText="Done" keyField="done" />
      </ColumnsDirective>
    </KanbanComponent>
  );
}
```

**OBS:** KanbanComponent behöver INGEN Inject - services!

### DialogComponent - Modaler och Popups

**När använda:**
- Formulär för att skapa/redigera data
- Bekräftelsedialoger
- Detaljvyer som popups

**Grundläggande struktur:**
```typescript
import { DialogComponent } from '@syncfusion/ej2-react-popups';

function TaskDialog({ isOpen, onClose, onSave }) {
  // KRITISKT - Villkorlig rendering
  if (!isOpen) return null;
  
  return (
    <DialogComponent
      width="500px"
      isModal={true}
      visible={isOpen}
      close={onClose}
      header="Redigera Uppgift"
      showCloseIcon={true}
      animationSettings={{ effect: 'FadeZoom' }}
      footerTemplate={
        <div>
          <button className="e-btn e-primary" onClick={onSave}>
            Spara
          </button>
          <button className="e-btn" onClick={onClose}>
            Avbryt
          </button>
        </div>
      }
    >
      <div className="dialog-content">
        {/* Formulärinnehåll */}
      </div>
    </DialogComponent>
  );
}
```

### GanttComponent - Timeline och Projektplanering

**När använda:**
- Projektplanering med dependencies
- Timeline-visualisering
- Capacity planning
- Critical path analysis

**Grundläggande struktur:**
```typescript
import { GanttComponent, Inject, Edit, Selection, Toolbar } from '@syncfusion/ej2-react-gantt';

function ProjectGantt() {
  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    dependency: 'Predecessor',
    child: 'subtasks'
  };
  
  return (
    <GanttComponent
      dataSource={projectData}
      taskFields={taskFields}
      editSettings={{ allowEditing: true, allowTaskbarEditing: true }}
      toolbar={['Add', 'Edit', 'Delete']}
    >
      <Inject services={[Edit, Selection, Toolbar]} />
    </GanttComponent>
  );
}
```

### ScheduleComponent - Kalendrar

**När använda:**
- Kalendervyer (Day, Week, Month, Agenda)
- Event management
- Deadline tracking
- Integration med Microsoft Graph Calendar

**Grundläggande struktur:**
```typescript
import { ScheduleComponent, Day, Week, Month, Agenda, Inject } from '@syncfusion/ej2-react-schedule';

function TaskCalendar() {
  const events = [...];
  
  return (
    <ScheduleComponent
      dataSource={events}
      currentView="Month"
      showQuickInfo={true}
      eventSettings={{
        dataSource: events,
        fields: {
          id: 'Id',
          subject: { name: 'Subject' },
          startTime: { name: 'StartTime' },
          endTime: { name: 'EndTime' }
        }
      }}
    >
      <Inject services={[Day, Week, Month, Agenda]} />
    </ScheduleComponent>
  );
}
```

### Form Components - Formulärkomponenter

**När använda:**
- Input fields
- Date pickers
- Dropdowns
- Alla formulär där användaren matar in data

**Grundläggande struktur:**
```typescript
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { DatePickerComponent } from '@syncfusion/ej2-react-calendars';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';

function TaskForm() {
  return (
    <div className="form-group">
      <TextBoxComponent
        placeholder="Uppgiftstitel"
        floatLabelType="Auto"
        value={title}
        onChange={(e) => setTitle(e.value)}
      />
      
      <DatePickerComponent
        placeholder="Välj deadline"
        floatLabelType="Auto"
        format="yyyy-MM-dd"
        value={deadline}
        change={(e) => setDeadline(e.value)}
      />
      
      <DropDownListComponent
        dataSource={priorities}
        fields={{ text: 'label', value: 'value' }}
        placeholder="Välj prioritet"
        floatLabelType="Auto"
        value={priority}
        change={(e) => setPriority(e.value)}
      />
    </div>
  );
}
```

## Setup och Konfiguration

### Installation

```bash
# Core packages
npm install @syncfusion/ej2-react-grids
npm install @syncfusion/ej2-react-kanban
npm install @syncfusion/ej2-react-gantt
npm install @syncfusion/ej2-react-schedule
npm install @syncfusion/ej2-react-popups
npm install @syncfusion/ej2-react-inputs
npm install @syncfusion/ej2-react-calendars
npm install @syncfusion/ej2-react-dropdowns
npm install @syncfusion/ej2-react-buttons
```

### Licensiering

```typescript
import { registerLicense } from '@syncfusion/ej2-base';
registerLicense('YOUR_LICENSE_KEY');
```

### Fluent2 CSS Import - ORDNINGEN ÄR KRITISK

**I main.tsx eller App.tsx:**
```typescript
// IMPORTERA I DENNA ORDNING
import '@syncfusion/ej2-base/styles/fluent2.css';
import '@syncfusion/ej2-buttons/styles/fluent2.css';
import '@syncfusion/ej2-calendars/styles/fluent2.css';
import '@syncfusion/ej2-dropdowns/styles/fluent2.css';
import '@syncfusion/ej2-inputs/styles/fluent2.css';
import '@syncfusion/ej2-lists/styles/fluent2.css';
import '@syncfusion/ej2-navigations/styles/fluent2.css';
import '@syncfusion/ej2-popups/styles/fluent2.css';
import '@syncfusion/ej2-splitbuttons/styles/fluent2.css';
import '@syncfusion/ej2-grids/styles/fluent2.css';
import '@syncfusion/ej2-react-schedule/styles/fluent2.css';
import '@syncfusion/ej2-notifications/styles/fluent2.css';

// Sedan din egen CSS
import './index.css';
```

### Svenska Lokalisering

```typescript
import { L10n, setCulture } from '@syncfusion/ej2-base';
import svSELocale from './locales/sv-SE.json';

L10n.load(svSELocale);
setCulture('sv-SE');
```

## Performance och Optimering

### 1. Virtual Scrolling för Stora Dataset

**När använda:** >1000 rader i grid

```typescript
<GridComponent
  dataSource={largeDataset}
  enableVirtualization={true}
  height="450px"
>
  {/* columns */}
</GridComponent>
```

### 2. DataManager för Backend Integration

```typescript
import { DataManager, ODataV4Adaptor } from '@syncfusion/ej2-data';

const dataManager = new DataManager({
  url: 'https://api.minprio.se/tasks',
  adaptor: new ODataV4Adaptor(),
  crossDomain: true
});

<GridComponent dataSource={dataManager} />
```

### 3. Lazy Loading för Gantt och TreeGrid

```typescript
<GanttComponent
  dataSource={tasks}
  loadChildOnDemand={true}
  taskFields={taskFields}
/>
```

### 4. Debounce för Search och Filter

```typescript
const filterSettings = {
  type: 'Menu',
  operators: {
    stringOperator: [
      { value: 'startsWith', text: 'Börjar med' }
    ]
  }
};
```

## Vanliga Fel och Lösningar

### Problem 1: "Cannot read property of undefined" i Grid

**Orsak:** Glömt att injicera services
**Lösning:**
```typescript
<GridComponent>
  <Inject services={[Page, Sort, Filter]} />
</GridComponent>
```

### Problem 2: Dialog öppnas inte eller crashar React

**Orsak:** Saknar villkorlig rendering
**Lösning:**
```typescript
if (!isOpen) return null;
return <DialogComponent visible={isOpen} />;
```

### Problem 3: ButtonComponent fungerar inte i Dialog

**Orsak:** React 17+ bug
**Lösning:** Använd vanliga HTML buttons med SyncFusion CSS-klasser
```typescript
<button className="e-btn e-primary" onClick={handleClick}>
  Klicka här
</button>
```

### Problem 4: Fluent2-temat ser trasigt ut

**Orsak:** CSS importeras i fel ordning
**Lösning:** Importera base först, sedan komponenter, sedan egen CSS

### Problem 5: Grid uppdateras inte när data ändras

**Orsak:** Muterande state direkt
**Lösning:**
```typescript
// RÄTT
setTasks([...tasks, newTask]);

// FEL
tasks.push(newTask);
```

## Service Injection Snabbreferens

```typescript
// GridComponent
<Inject services={[Page, Sort, Filter, Group, Edit, Toolbar, ExcelExport, PdfExport]} />

// GanttComponent
<Inject services={[Edit, Selection, Toolbar, DayMarkers, CriticalPath]} />

// ScheduleComponent
<Inject services={[Day, Week, WorkWeek, Month, Agenda, TimelineViews, TimelineMonth]} />

// TreeGridComponent
<Inject services={[Page, Sort, Filter, Edit, Toolbar, Aggregate]} />

// KanbanComponent - Ingen inject behövs!
```

## MinPrio-Specifika Use Cases

### 1. Task Grid med CPM Priority

```typescript
function CPMTaskGrid() {
  const priorityTemplate = (props) => {
    const cpm = calculateCPM(props);
    return (
      <div className={`cpm-badge priority-${getPriorityLevel(cpm)}`}>
        {cpm.toFixed(2)}
      </div>
    );
  };
  
  return (
    <GridComponent dataSource={tasks}>
      <ColumnsDirective>
        <ColumnDirective field="title" headerText="Uppgift" />
        <ColumnDirective 
          field="cpm" 
          headerText="CPM Priority"
          template={priorityTemplate}
        />
      </ColumnsDirective>
      <Inject services={[Page, Sort, Filter]} />
    </GridComponent>
  );
}
```

### 2. Kanban med Status och CPM Colors

```typescript
function StatusKanban() {
  const cardTemplate = (props) => {
    const cpm = calculateCPM(props);
    const color = getCPMColor(cpm);
    
    return (
      <div 
        className="kanban-card" 
        style={{ borderLeft: `4px solid ${color}` }}
      >
        <div className="card-cpm">CPM: {cpm.toFixed(2)}</div>
        <div className="card-title">{props.Title}</div>
      </div>
    );
  };
  
  return (
    <KanbanComponent
      dataSource={tasks}
      cardSettings={{ template: cardTemplate }}
    >
      <ColumnsDirective>
        <ColumnDirective headerText="Backlog" keyField="backlog" />
        <ColumnDirective headerText="Todo" keyField="todo" />
        <ColumnDirective headerText="Doing" keyField="doing" maxCount={3} />
        <ColumnDirective headerText="Done" keyField="done" />
      </ColumnsDirective>
    </KanbanComponent>
  );
}
```

### 3. Calendar med Microsoft Graph Integration

```typescript
function TaskCalendar() {
  const combinedEvents = [
    ...msGraphEvents,
    ...deadlines.map(d => ({
      Id: `deadline-${d.id}`,
      Subject: `⏰ ${d.title}`,
      StartTime: new Date(d.deadline),
      EndTime: new Date(d.deadline),
      IsAllDay: true,
      CategoryColor: '#ff4444'
    }))
  ];
  
  return (
    <ScheduleComponent
      dataSource={combinedEvents}
      currentView="Month"
      eventClick={(args) => {
        if (args.event.Id.startsWith('deadline-')) {
          openTaskDialog(extractTaskId(args.event.Id));
        }
      }}
    >
      <Inject services={[Day, Week, Month, Agenda]} />
    </ScheduleComponent>
  );
}
```

## CSS och Styling

### Fluent2 Button Classes

```html
<!-- Primär knapp -->
<button className="e-btn e-primary">Spara</button>

<!-- Success knapp -->
<button className="e-btn e-success">Godkänn</button>

<!-- Danger knapp -->
<button className="e-btn e-danger">Ta bort</button>

<!-- Warning knapp -->
<button className="e-btn e-warning">Varna</button>

<!-- Outline knapp -->
<button className="e-btn e-outline">Avbryt</button>

<!-- Rundad knapp -->
<button className="e-btn e-primary e-round">Klicka</button>

<!-- Flat knapp -->
<button className="e-btn e-flat">Info</button>
```

### Custom Theming (Respektfullt)

```css
/* Definiera custom CSS variables */
.minprio-theme {
  --sf-primary: #1a73e8;
  --sf-primary-dark: #1557b0;
  --sf-primary-light: #4285f4;
}

/* Applicera på specifika komponenter */
.minprio-theme .e-btn.e-primary {
  background-color: var(--sf-primary);
}

.minprio-theme .e-grid .e-headercell {
  background-color: var(--sf-primary-light);
}
```

## Event Handling

### Grid Events

```typescript
<GridComponent
  actionBegin={(args) => {
    // Före action - möjlighet att cancel
    if (args.requestType === 'delete') {
      if (!confirm('Är du säker?')) {
        args.cancel = true;
      }
    }
  }}
  actionComplete={(args) => {
    // Efter action
    if (args.requestType === 'save') {
      showToast('Sparad!');
    }
  }}
  recordClick={(args) => {
    // När rad klickas
    console.log('Selected row:', args.rowData);
  }}
/>
```

### Kanban Events

```typescript
<KanbanComponent
  cardClick={(args) => {
    openTaskDialog(args.data);
  }}
  dragStop={(args) => {
    updateTaskStatus(args.data, args.dropTarget);
  }}
/>
```

### Dialog Events

```typescript
<DialogComponent
  open={() => console.log('Dialog opened')}
  close={handleClose}
  beforeOpen={(args) => {
    // Möjlighet att cancel
    if (!isValid) {
      args.cancel = true;
    }
  }}
/>
```

## Sammanfattning - Checklist

När du implementerar SyncFusion-komponenter, verifiera alltid:

- [ ] Direktimport från @syncfusion/ej2-react-*
- [ ] Inject services för nödvändig funktionalitet
- [ ] Villkorlig rendering för DialogComponent
- [ ] Fluent2 CSS importerad i rätt ordning
- [ ] Inga CSS !important overrides
- [ ] Vanliga HTML buttons i Dialog (inte ButtonComponent)
- [ ] Svenska lokalisering konfigurerad
- [ ] Virtual scrolling för stora dataset
- [ ] Event handlers för validering
- [ ] Immutable state updates

## Resurser

- **Officiell Dokumentation:** https://ej2.syncfusion.com/react/documentation/
- **Demos:** https://ej2.syncfusion.com/react/demos/
- **API Reference:** https://ej2.syncfusion.com/react/documentation/api/
- **Community License:** https://www.syncfusion.com/sales/communitylicense

---

**Version:** 1.0  
**Skapad:** 2025-10-25  
**För:** MinPrio-projektet med SyncFusion EJ2 React v31.x och Fluent2 Theme
