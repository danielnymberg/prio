# SyncFusion Fluent2 - Komplett Guide för MinPrio

## 📋 INNEHÅLLSFÖRTECKNING

1. [Grundprinciper](#grundprinciper)
2. [Setup & Konfiguration](#setup--konfiguration)
3. [Grundläggande Komponenter](#grundläggande-komponenter)
4. [Avancerade Komponenter](#avancerade-komponenter)
5. [Best Practices](#best-practices)
6. [Vanliga Problem](#vanliga-problem)
7. [Performance & Optimering](#performance--optimering)
8. [Fluent2 Tema](#fluent2-tema)

---

## 🎯 GRUNDPRINCIPER

### KRITISKA REGLER

1. **DIREKTIMPORT ALLTID**
   ```typescript
   // ✅ RÄTT - Direkt från @syncfusion-paket
   import { GridComponent } from '@syncfusion/ej2-react-grids';
   import { KanbanComponent } from '@syncfusion/ej2-react-kanban';
   import { GanttComponent } from '@syncfusion/ej2-react-gantt';
   
   // ❌ FEL - Aldrig skapa custom wrappers
   import { MyCustomGrid } from './components/MyCustomGrid';
   ```

2. **SERVICE INJECTION OBLIGATORISK**
   ```typescript
   // ✅ RÄTT - Injicera services för funktionalitet
   <GridComponent>
     <Inject services={[Page, Sort, Filter, Group]} />
   </GridComponent>
   
   // ❌ FEL - Glömma inject = funktioner fungerar inte
   <GridComponent />
   ```

3. **VILLKORLIG RENDERING FÖR DIALOG**
   ```typescript
   // ✅ RÄTT
   if (!isOpen) return null;
   return <DialogComponent isModal={true} visible={isOpen} />
   
   // ❌ FEL - Renderar alltid = React DOM crash
   return <DialogComponent isModal={true} visible={isOpen} />
   ```

4. **RESPEKTERA FLUENT2 - INGA CSS OVERRIDES**
   ```css
   /* ❌ FEL - Förstör Fluent2-tema */
   .e-grid { background: red !important; }
   
   /* ✅ RÄTT - Använd SyncFusions inbyggda props */
   <GridComponent cssClass="custom-grid" />
   ```

---

## 🔧 SETUP & KONFIGURATION

### Installation

```bash
# Core packages
npm install @syncfusion/ej2-react-grids
npm install @syncfusion/ej2-react-kanban
npm install @syncfusion/ej2-react-gantt
npm install @syncfusion/ej2-react-treegrid
npm install @syncfusion/ej2-react-schedule

# Licensing
import { registerLicense } from '@syncfusion/ej2-base';
registerLicense('YOUR_LICENSE_KEY');
```

### Fluent2 CSS Import (VIKTIGT - ORDNING SPELAR ROLL)

```typescript
// main.tsx - Importera i DENNA ordning
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

---

## 📦 GRUNDLÄGGANDE KOMPONENTER

### GridComponent - Data Grid

**När använda:** Tabellbaserad datavisning, sortering, filtrering, paginering

```typescript
import { 
  GridComponent, 
  ColumnsDirective, 
  ColumnDirective,
  Inject,
  Page, 
  Sort, 
  Filter,
  Group,
  Edit,
  Toolbar
} from '@syncfusion/ej2-react-grids';

function TaskGrid() {
  const tasks = [...]; // Din data
  
  const editSettings = { 
    allowAdding: true, 
    allowEditing: true, 
    allowDeleting: true,
    mode: 'Dialog' // eller 'Normal', 'Batch'
  };
  
  const toolbarOptions = ['Add', 'Edit', 'Delete', 'Update', 'Cancel'];
  
  return (
    <GridComponent
      dataSource={tasks}
      allowPaging={true}
      allowSorting={true}
      allowFiltering={true}
      allowGrouping={true}
      editSettings={editSettings}
      toolbar={toolbarOptions}
      height="auto"
    >
      <ColumnsDirective>
        <ColumnDirective 
          field="id" 
          headerText="ID" 
          width="100" 
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
          editType="dropdownedit"
        />
        <ColumnDirective 
          field="deadline" 
          headerText="Deadline" 
          width="150"
          type="date"
          format="yyyy-MM-dd"
        />
      </ColumnsDirective>
      <Inject services={[Page, Sort, Filter, Group, Edit, Toolbar]} />
    </GridComponent>
  );
}
```

**Viktiga Props:**
- `dataSource`: Array av objekt eller DataManager
- `allowPaging`: Boolean för paginering
- `pageSettings`: { pageSize: 20, pageCount: 5 }
- `sortSettings`: { columns: [{ field: 'priority', direction: 'Descending' }] }
- `filterSettings`: { type: 'Menu' }
- `height`: "auto" för dynamisk höjd, "450px" för fix

### ButtonComponent - Knappar

**När använda:** ALLTID för knappar i SyncFusion-kontext. DOCK: Använd INTE ButtonComponent direkt i DialogComponent (React 17+ bug). Använd istället vanliga HTML buttons med SyncFusion CSS-klasser.

```typescript
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';

// ✅ Normal användning
<ButtonComponent 
  cssClass="e-primary e-round"
  onClick={handleClick}
>
  Spara
</ButtonComponent>

// ✅ I DialogComponent (workaround för React 17+ bug)
<DialogComponent visible={isOpen}>
  <button 
    className="e-btn e-primary" 
    onClick={handleSave}
  >
    Spara
  </button>
  <button 
    className="e-btn" 
    onClick={handleCancel}
  >
    Avbryt
  </button>
</DialogComponent>
```

**CSS-klasser:**
- `e-primary`: Primär knapp (blå)
- `e-success`: Grön knapp
- `e-danger`: Röd knapp
- `e-warning`: Orange knapp
- `e-round`: Rundade hörn
- `e-flat`: Platt design
- `e-outline`: Endast kant

### DialogComponent - Modaler

**När använda:** Pop-up dialoger, formulär, bekräftelser

```typescript
import { DialogComponent } from '@syncfusion/ej2-react-popups';

function TaskDialog({ isOpen, onClose, onSave }) {
  // ⚠️ KRITISKT - Villkorlig rendering
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

### Form Components - Formulär

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

---

## 🚀 AVANCERADE KOMPONENTER

### GanttComponent - Projektplanering & Tidslinje

**När använda:** Projektplanering, tidslinje-visualisering, beroenden mellan uppgifter, resurstilldelning, critical path

**Perfekt för MinPrio:** 
- Visa uppgifter över tid
- Hantera deadlines visuellt
- Identifiera beroenden
- Capacity planning (kommande funktion)

```typescript
import { 
  GanttComponent, 
  ColumnsDirective, 
  ColumnDirective,
  Inject,
  Edit,
  Selection,
  Toolbar,
  DayMarkers,
  CriticalPath,
  Sort,
  Filter
} from '@syncfusion/ej2-react-gantt';

function ProjectTimeline() {
  const tasks = [
    {
      TaskID: 1,
      TaskName: 'Projekt Kickoff',
      StartDate: new Date('2025-10-25'),
      EndDate: new Date('2025-10-26'),
      Duration: 1,
      Progress: 100
    },
    {
      TaskID: 2,
      TaskName: 'Designfas',
      StartDate: new Date('2025-10-26'),
      Duration: 5,
      Progress: 40,
      ParentId: 1
    },
    {
      TaskID: 3,
      TaskName: 'Utveckling',
      StartDate: new Date('2025-11-01'),
      Duration: 10,
      Progress: 0,
      Predecessor: '2', // Startar efter task 2
      Resources: [{ ResourceId: 1, Unit: 100 }]
    }
  ];
  
  const taskFields = {
    id: 'TaskID',
    name: 'TaskName',
    startDate: 'StartDate',
    endDate: 'EndDate',
    duration: 'Duration',
    progress: 'Progress',
    dependency: 'Predecessor',
    child: 'SubTasks',
    parentID: 'ParentId',
    resourceInfo: 'Resources'
  };
  
  const editSettings = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    allowTaskbarEditing: true, // Drag & drop taskbars
    showDeleteConfirmDialog: true
  };
  
  const toolbarOptions = [
    'Add', 'Edit', 'Delete', 'Update', 'Cancel',
    'ExpandAll', 'CollapseAll',
    'CriticalPath', 'ZoomIn', 'ZoomOut', 'ZoomToFit'
  ];
  
  const splitterSettings = {
    columnIndex: 3 // Splitta vid kolumn 3
  };
  
  const labelSettings = {
    leftLabel: 'TaskName',
    rightLabel: 'Progress'
  };
  
  // Resource data
  const resources = [
    { ResourceId: 1, ResourceName: 'Daniel' },
    { ResourceId: 2, ResourceName: 'Team Member' }
  ];
  
  const resourceFields = {
    id: 'ResourceId',
    name: 'ResourceName'
  };
  
  return (
    <GanttComponent
      dataSource={tasks}
      taskFields={taskFields}
      editSettings={editSettings}
      toolbar={toolbarOptions}
      allowSelection={true}
      allowSorting={true}
      allowFiltering={true}
      highlightWeekends={true}
      splitterSettings={splitterSettings}
      labelSettings={labelSettings}
      resources={resources}
      resourceFields={resourceFields}
      height="600px"
      projectStartDate={new Date('2025-10-25')}
      projectEndDate={new Date('2025-12-31')}
      enableCriticalPath={true}
      gridLines="Both"
    >
      <ColumnsDirective>
        <ColumnDirective field="TaskID" width="80" />
        <ColumnDirective field="TaskName" headerText="Uppgift" width="250" />
        <ColumnDirective field="StartDate" headerText="Start" />
        <ColumnDirective field="EndDate" headerText="Slut" />
        <ColumnDirective field="Duration" headerText="Varaktighet" />
        <ColumnDirective field="Progress" headerText="Progress" />
      </ColumnsDirective>
      <Inject services={[
        Edit, Selection, Toolbar, DayMarkers, 
        CriticalPath, Sort, Filter
      ]} />
    </GanttComponent>
  );
}
```

**Gantt Key Features:**
- **Drag & Drop:** Flytta taskbars för att ändra start/slut
- **Resize:** Dra kanter för att ändra varaktighet
- **Dependencies:** Visa beroenden mellan uppgifter (Predecessor)
- **Critical Path:** Visa kritisk väg (uppgifter som påverkar projektets slutdatum)
- **Milestones:** Uppgifter med Duration: 0
- **Baselines:** Visa planerad vs faktisk tid
- **Resource Allocation:** Tilldela resurser till uppgifter

**Viktiga Props:**
- `enableCriticalPath`: true för att highlighta kritisk väg
- `highlightWeekends`: true för att färga veckoslut
- `allowTaskbarEditing`: true för drag & drop av taskbars
- `gridLines`: 'Both', 'Horizontal', 'Vertical', 'None'

### KanbanComponent - Kanban Board

**När använda:** Workflow-visualisering, task tracking, status management

**Perfekt för MinPrio:**
- Visualisera uppgifter per status (To Do, Doing, Done)
- Drag & drop mellan kolumner
- WIP limits (Work In Progress)
- Swimlanes för kategorisering

```typescript
import { 
  KanbanComponent, 
  ColumnsDirective, 
  ColumnDirective 
} from '@syncfusion/ej2-react-kanban';

function TaskKanban() {
  const tasks = [
    {
      Id: 1,
      Title: 'Implementera API',
      Status: 'InProgress',
      Summary: 'Bygga REST API för uppgifter',
      Priority: 'High',
      Assignee: 'Daniel',
      Tags: 'Backend,API'
    },
    {
      Id: 2,
      Title: 'Designa UI',
      Status: 'Open',
      Summary: 'Skapa mockups för dashboard',
      Priority: 'Medium',
      Assignee: 'Designer',
      Tags: 'Frontend,Design'
    },
    {
      Id: 3,
      Title: 'Testa funktionalitet',
      Status: 'Review',
      Summary: 'Enhetstester för nya features',
      Priority: 'Low',
      Assignee: 'Tester',
      Tags: 'Testing,QA'
    }
  ];
  
  const cardSettings = {
    contentField: 'Summary',
    headerField: 'Title',
    tagsField: 'Tags',
    grabberField: 'Priority',
    footerCssField: 'FooterCss'
  };
  
  const swimlaneSettings = {
    keyField: 'Assignee' // Gruppera efter person
  };
  
  // Card template för custom design
  const cardTemplate = (props) => {
    return (
      <div className="kanban-card">
        <div className="card-header">
          <span className="card-id">#{props.Id}</span>
          <span className={`priority-badge ${props.Priority}`}>
            {props.Priority}
          </span>
        </div>
        <div className="card-title">{props.Title}</div>
        <div className="card-content">{props.Summary}</div>
        <div className="card-footer">
          <span className="assignee">{props.Assignee}</span>
          <span className="tags">{props.Tags}</span>
        </div>
      </div>
    );
  };
  
  return (
    <KanbanComponent
      id="kanban"
      dataSource={tasks}
      keyField="Status"
      cardSettings={cardSettings}
      swimlaneSettings={swimlaneSettings}
      allowDragAndDrop={true}
      allowKeyboard={true}
      dialogSettings={{
        fields: [
          { key: 'Id', type: 'TextBox' },
          { key: 'Title', type: 'TextBox' },
          { key: 'Status', type: 'DropDown' },
          { key: 'Summary', type: 'TextArea' },
          { key: 'Priority', type: 'DropDown' }
        ]
      }}
    >
      <ColumnsDirective>
        <ColumnDirective 
          headerText="Att Göra" 
          keyField="Open"
          allowToggle={true}
        />
        <ColumnDirective 
          headerText="Pågående" 
          keyField="InProgress"
          allowToggle={true}
          maxCount={3} // WIP limit
        />
        <ColumnDirective 
          headerText="Granskning" 
          keyField="Review"
          allowToggle={true}
        />
        <ColumnDirective 
          headerText="Klart" 
          keyField="Close"
          allowToggle={true}
        />
      </ColumnsDirective>
    </KanbanComponent>
  );
}
```

**Kanban Key Features:**
- **Drag & Drop:** Flytta kort mellan kolumner
- **Swimlanes:** Horisontella rader för gruppering
- **WIP Limits:** maxCount per kolumn
- **Card Templates:** Custom HTML för kort
- **Toggle Columns:** Kollapsa/expandera kolumner
- **Dialog Editing:** Popup för att redigera kort

**Viktiga Props:**
- `keyField`: Fält som bestämmer kolumn ("Status")
- `cardSettings`: Mappning av fält till kortet
- `swimlaneSettings.keyField`: Fält för swimlanes
- `allowDragAndDrop`: true för drag & drop
- `columns[].maxCount`: WIP limit för kolumn

### ScheduleComponent - Kalender & Event Management

**När använda:** Kalendervy, möten, events, tidsplanering

**Perfekt för MinPrio:**
- Visa deadlines i kalender
- Integrera med Microsoft Graph Calendar
- Bokade tider / upptagen tid
- Återkommande uppgifter

```typescript
import { 
  ScheduleComponent, 
  ViewsDirective, 
  ViewDirective,
  Day, 
  Week, 
  WorkWeek, 
  Month, 
  Agenda,
  TimelineViews,
  TimelineMonth,
  Inject 
} from '@syncfusion/ej2-react-schedule';

function TaskScheduler() {
  const events = [
    {
      Id: 1,
      Subject: 'Projektmöte',
      StartTime: new Date(2025, 9, 25, 10, 0),
      EndTime: new Date(2025, 9, 25, 12, 0),
      IsAllDay: false,
      Status: 'Confirmed',
      Priority: 'High',
      Location: 'Kontor A',
      Description: 'Diskutera Q4 mål'
    },
    {
      Id: 2,
      Subject: 'Deadline: API Implementation',
      StartTime: new Date(2025, 9, 30, 17, 0),
      EndTime: new Date(2025, 9, 30, 17, 0),
      IsAllDay: false,
      Status: 'Pending',
      Priority: 'High'
    }
  ];
  
  const eventSettings = {
    dataSource: events,
    fields: {
      id: 'Id',
      subject: { name: 'Subject' },
      startTime: { name: 'StartTime' },
      endTime: { name: 'EndTime' },
      isAllDay: { name: 'IsAllDay' },
      location: { name: 'Location' },
      description: { name: 'Description' }
    }
  };
  
  // Custom event template
  const eventTemplate = (props) => {
    return (
      <div className="template-wrap">
        <div className="subject">{props.Subject}</div>
        {props.Location && (
          <div className="location">📍 {props.Location}</div>
        )}
        <div className="time">
          {new Date(props.StartTime).toLocaleTimeString('sv-SE', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    );
  };
  
  // Work hours
  const workHours = {
    highlight: true,
    start: '08:00',
    end: '17:00'
  };
  
  return (
    <ScheduleComponent
      width="100%"
      height="650px"
      currentView="Week"
      selectedDate={new Date(2025, 9, 25)}
      eventSettings={eventSettings}
      workHours={workHours}
      showWeekend={true}
      showQuickInfo={true}
      allowDragAndDrop={true}
      allowResizing={true}
      allowKeyboardInteraction={true}
      editorTemplate={eventTemplate}
    >
      <ViewsDirective>
        <ViewDirective option="Day" />
        <ViewDirective option="Week" />
        <ViewDirective option="WorkWeek" />
        <ViewDirective option="Month" />
        <ViewDirective option="Agenda" />
        <ViewDirective option="TimelineDay" />
        <ViewDirective option="TimelineWeek" />
      </ViewsDirective>
      <Inject services={[
        Day, Week, WorkWeek, Month, Agenda,
        TimelineViews, TimelineMonth
      ]} />
    </ScheduleComponent>
  );
}
```

**Schedule Key Features:**
- **Multiple Views:** Day, Week, Month, Agenda, Timeline
- **Drag & Drop:** Flytta events
- **Resize:** Ändra varaktighet
- **Recurring Events:** Återkommande events (FREQ=DAILY;INTERVAL=1;COUNT=10)
- **Resources:** Multi-resource scheduling
- **Work Hours:** Highlighta arbetstid
- **Timezone:** Stöd för tidszoner

**Viktiga Props:**
- `currentView`: 'Day', 'Week', 'Month', 'Agenda', 'TimelineWeek'
- `workHours`: { start: '08:00', end: '17:00', highlight: true }
- `allowDragAndDrop`: true för drag & drop
- `allowResizing`: true för resize
- `showQuickInfo`: true för quick info popup

**Timeline Views för Resources:**
```typescript
// Perfekt för att visa resurser (t.ex. personer) horisontellt
const resourceDataSource = [
  { Id: 1, Text: 'Daniel', Color: '#1aaa55' },
  { Id: 2, Text: 'Team Member', Color: '#357cd2' }
];

<ScheduleComponent
  currentView="TimelineWeek"
  group={{ resources: ['Projects'] }}
>
  <ResourcesDirective>
    <ResourceDirective
      field="ProjectId"
      title="Project"
      name="Projects"
      dataSource={resourceDataSource}
      textField="Text"
      idField="Id"
      colorField="Color"
    />
  </ResourcesDirective>
  <ViewsDirective>
    <ViewDirective option="TimelineDay" />
    <ViewDirective option="TimelineWeek" />
    <ViewDirective option="TimelineMonth" />
  </ViewsDirective>
</ScheduleComponent>
```

### TreeGridComponent - Hierarkisk Data Grid

**När använda:** Hierarkisk data, parent-child relationer, expanderbara rader

**Perfekt för MinPrio:**
- Uppgifter med sub-uppgifter
- Projektstruktur (projekt → faser → tasks)
- Kategorisering med nesting

```typescript
import { 
  TreeGridComponent, 
  ColumnsDirective, 
  ColumnDirective,
  Inject,
  Page,
  Sort,
  Filter,
  Edit,
  Toolbar,
  Aggregate
} from '@syncfusion/ej2-react-treegrid';

function HierarchicalTasks() {
  const tasks = [
    {
      taskID: 1,
      taskName: 'Huvudprojekt',
      startDate: new Date('2025-10-25'),
      endDate: new Date('2025-12-31'),
      duration: 67,
      progress: 40,
      subtasks: [
        {
          taskID: 2,
          taskName: 'Planering',
          startDate: new Date('2025-10-25'),
          endDate: new Date('2025-11-01'),
          duration: 7,
          progress: 100,
          subtasks: [
            {
              taskID: 3,
              taskName: 'Kravspecifikation',
              startDate: new Date('2025-10-25'),
              duration: 3,
              progress: 100
            },
            {
              taskID: 4,
              taskName: 'Designa arkitektur',
              startDate: new Date('2025-10-28'),
              duration: 4,
              progress: 100
            }
          ]
        },
        {
          taskID: 5,
          taskName: 'Utveckling',
          startDate: new Date('2025-11-02'),
          endDate: new Date('2025-11-30'),
          duration: 28,
          progress: 50
        }
      ]
    }
  ];
  
  const editSettings = {
    allowEditing: true,
    allowAdding: true,
    allowDeleting: true,
    mode: 'Row', // eller 'Cell', 'Dialog'
    newRowPosition: 'Below' // eller 'Above', 'Child'
  };
  
  const toolbarOptions = [
    'Add', 'Edit', 'Delete', 'Update', 'Cancel',
    'ExpandAll', 'CollapseAll', 'Indent', 'Outdent'
  ];
  
  return (
    <TreeGridComponent
      dataSource={tasks}
      treeColumnIndex={1} // Kolumn med expand/collapse
      childMapping="subtasks"
      allowPaging={true}
      allowSorting={true}
      allowFiltering={true}
      editSettings={editSettings}
      toolbar={toolbarOptions}
      height="450px"
    >
      <ColumnsDirective>
        <ColumnDirective 
          field="taskID" 
          headerText="ID" 
          width="90" 
          isPrimaryKey={true}
        />
        <ColumnDirective 
          field="taskName" 
          headerText="Uppgift" 
          width="250"
        />
        <ColumnDirective 
          field="startDate" 
          headerText="Start" 
          width="150"
          type="date"
          format="yyyy-MM-dd"
        />
        <ColumnDirective 
          field="duration" 
          headerText="Varaktighet" 
          width="120"
          textAlign="Right"
        />
        <ColumnDirective 
          field="progress" 
          headerText="Progress" 
          width="120"
          template={(props) => (
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${props.progress}%` }}
              />
              <span>{props.progress}%</span>
            </div>
          )}
        />
      </ColumnsDirective>
      <Inject services={[Page, Sort, Filter, Edit, Toolbar, Aggregate]} />
    </TreeGridComponent>
  );
}
```

**TreeGrid Key Features:**
- **Hierarchical Display:** Visa parent-child med indentation
- **Expand/Collapse:** Klicka för att expandera/kollapsa
- **Indent/Outdent:** Flytta rows upp/ner i hierarkin
- **Self-Referential Data:** Stöd för både nested och flat data med parentID
- **Aggregates:** Summeringar per nivå

**Viktiga Props:**
- `childMapping`: Fält med barn ("subtasks")
- `treeColumnIndex`: Vilken kolumn som ska visa tree
- `editSettings.newRowPosition`: 'Above', 'Below', 'Child'

**Self-Referential Data Format:**
```typescript
// Flat data med parentID
const flatTasks = [
  { taskID: 1, taskName: 'Parent', parentID: null },
  { taskID: 2, taskName: 'Child 1', parentID: 1 },
  { taskID: 3, taskName: 'Child 2', parentID: 1 },
  { taskID: 4, taskName: 'Grandchild', parentID: 2 }
];

<TreeGridComponent
  dataSource={flatTasks}
  idMapping="taskID"
  parentIdMapping="parentID"
/>
```

---

## 💡 BEST PRACTICES

### 1. Data Management

```typescript
// ✅ RÄTT - Använd DataManager för stora dataset
import { DataManager, Query } from '@syncfusion/ej2-data';

const dataManager = new DataManager({
  url: 'https://api.example.com/tasks',
  adaptor: new UrlAdaptor(),
  crossDomain: true
});

<GridComponent dataSource={dataManager} />

// ✅ RÄTT - Local data med filtering/sorting
const localData = tasks.filter(t => !t.deleted);
<GridComponent dataSource={localData} />

// ❌ FEL - Mutera state direkt
tasks[0].title = 'New title'; // ALDRIG!
```

### 2. Performance Optimization

```typescript
// ✅ Virtual Scrolling för stora dataset
<GridComponent
  dataSource={largeDataset}
  enableVirtualization={true}
  height="600px"
>
  {/* Renderar endast synliga rader */}
</GridComponent>

// ✅ Load on Demand för Gantt
<GanttComponent
  dataSource={projects}
  enableTimelineVirtualization={true}
  loadChildOnDemand={true}
/>

// ✅ Kanban Virtual Scrolling
<KanbanComponent
  dataSource={largeCards}
  enableVirtualization={true}
  height="600px"
/>
```

### 3. Event Handling

```typescript
// ✅ RÄTT - Använd SyncFusion events
<GridComponent
  actionBegin={(args) => {
    if (args.requestType === 'save') {
      // Validera före save
      if (!args.data.title) {
        args.cancel = true;
        toast.error('Titel krävs');
      }
    }
  }}
  actionComplete={(args) => {
    if (args.requestType === 'save') {
      toast.success('Sparat!');
      // Uppdatera server
      saveToDatabase(args.data);
    }
  }}
/>

// ✅ RÄTT - Kanban drag events
<KanbanComponent
  dragStart={(args) => {
    console.log('Dragging:', args.data);
  }}
  dragStop={(args) => {
    // Uppdatera status i databas
    updateTaskStatus(args.data[0].Id, args.data[0].Status);
  }}
/>
```

### 4. Template Customization

```typescript
// ✅ RÄTT - Custom templates för flexibilitet
const priorityTemplate = (props) => {
  const getColor = (priority) => {
    switch(priority) {
      case 'High': return '#ff4444';
      case 'Medium': return '#ffaa00';
      case 'Low': return '#44ff44';
      default: return '#cccccc';
    }
  };
  
  return (
    <span 
      className="priority-badge"
      style={{ 
        backgroundColor: getColor(props.priority),
        padding: '4px 8px',
        borderRadius: '4px',
        color: 'white'
      }}
    >
      {props.priority}
    </span>
  );
};

<GridComponent>
  <ColumnsDirective>
    <ColumnDirective 
      field="priority" 
      template={priorityTemplate}
    />
  </ColumnsDirective>
</GridComponent>
```

### 5. Fluent2 Theme Respect

```typescript
// ✅ RÄTT - Använd cssClass för customization
<GridComponent cssClass="minprio-task-grid" />

// CSS:
.minprio-task-grid .e-row.overdue {
  background-color: #fff4f4; // Subtle red tint
}

.minprio-task-grid .e-row.high-priority {
  font-weight: 600;
}

// ❌ FEL - !important overrides
.e-grid .e-headercell {
  background: red !important; // Förstör Fluent2
}
```

---

## ⚠️ VANLIGA PROBLEM & LÖSNINGAR

### Problem 1: DialogComponent Renderas Alltid

**Symptom:** Dialog visas även när visible=false, React DOM crash

```typescript
// ❌ FEL
return <DialogComponent visible={isOpen} />

// ✅ RÄTT - Villkorlig rendering
if (!isOpen) return null;
return <DialogComponent visible={isOpen} />
```

### Problem 2: GridComponent Features Fungerar Inte

**Symptom:** Sortering/filtrering/paging fungerar inte

```typescript
// ❌ FEL - Glömt Inject
<GridComponent allowPaging={true} />

// ✅ RÄTT - Inject services
<GridComponent allowPaging={true}>
  <Inject services={[Page, Sort, Filter]} />
</GridComponent>
```

### Problem 3: ButtonComponent onClick Fungerar Inte i Dialog

**Symptom:** onClick körs inte när ButtonComponent är i DialogComponent

```typescript
// ❌ FEL - React 17+ bug
<DialogComponent>
  <ButtonComponent onClick={handleClick}>Spara</ButtonComponent>
</DialogComponent>

// ✅ RÄTT - Använd HTML button med SF classes
<DialogComponent>
  <button className="e-btn e-primary" onClick={handleClick}>
    Spara
  </button>
</DialogComponent>
```

### Problem 4: Gantt Dependencies Fungerar Inte

**Symptom:** Beroenden mellan tasks visas inte

```typescript
// ❌ FEL - Fel format på Predecessor
{ TaskID: 3, Predecessor: 2 } // Number fungerar inte

// ✅ RÄTT - String format
{ TaskID: 3, Predecessor: '2' } // Startar efter task 2
{ TaskID: 4, Predecessor: '2FS+2' } // Finish-to-Start med 2 dagars lag
{ TaskID: 5, Predecessor: '3SS-1' } // Start-to-Start med -1 dag
```

### Problem 5: Schedule Events Syns Inte

**Symptom:** Events visas inte i calendar

```typescript
// ❌ FEL - Fel datum format
{ StartTime: '2025-10-25', EndTime: '2025-10-26' } // String

// ✅ RÄTT - Date object
{ 
  StartTime: new Date(2025, 9, 25, 10, 0), // Månad är 0-indexed
  EndTime: new Date(2025, 9, 25, 12, 0)
}
```

### Problem 6: Svenska Lokalisering Fungerar Inte

**Symptom:** UI fortfarande på engelska

```typescript
// ❌ FEL - Laddar inte locale före setCulture
setCulture('sv-SE');
L10n.load(svSELocale);

// ✅ RÄTT - Ladda FÖRE setCulture
L10n.load(svSELocale);
setCulture('sv-SE');
```

---

## 🚀 PERFORMANCE & OPTIMERING

### Virtualization

Använd virtualization för stora dataset (>1000 rader):

```typescript
// Grid Virtualization
<GridComponent
  dataSource={largeData}
  enableVirtualization={true}
  height="600px" // MÅSTE ha fix höjd
/>

// Gantt Timeline Virtualization
<GanttComponent
  enableTimelineVirtualization={true}
  enableVirtualization={true}
/>

// Kanban Virtualization
<KanbanComponent
  enableVirtualization={true}
  height="600px"
/>
```

### Load on Demand

```typescript
// Gantt Load Children on Demand
<GanttComponent
  loadChildOnDemand={true}
  taskFields={{
    id: 'TaskID',
    name: 'TaskName',
    hasChildMapping: 'HasChildren' // Viktigt!
  }}
/>
```

### Batch Editing

```typescript
// Grid Batch Mode - Spara flera ändringar samtidigt
<GridComponent
  editSettings={{
    allowEditing: true,
    mode: 'Batch' // Flera rader kan editeras före save
  }}
  toolbar={['Update', 'Cancel']}
/>
```

### Pagination

```typescript
// Använd paging för bättre performance
<GridComponent
  allowPaging={true}
  pageSettings={{
    pageSize: 20, // Antal rader per sida
    pageCount: 5, // Antal sidor i pager
    pageSizes: [10, 20, 50, 100] // Dropdown för att välja pageSize
  }}
/>
```

---

## 🎨 FLUENT2 TEMA

### Tema-struktur

Fluent2 följer Microsoft Fluent Design System 2.0:
- Ren, modern design
- Monokrom-vänlig
- Bra kontrast
- Subtle shadows och borders

### CSS Variables

```css
/* Fluent2 CSS Variables (tillgängliga globalt) */
:root {
  --primary-color: #0078d4;
  --primary-dark: #106ebe;
  --primary-light: #2b88d8;
  
  --background-color: #ffffff;
  --surface-color: #f3f2f1;
  
  --text-primary: #323130;
  --text-secondary: #605e5c;
  
  --border-color: #edebe9;
  --hover-color: #f3f2f1;
  
  --danger-color: #d13438;
  --warning-color: #ffaa44;
  --success-color: #107c10;
}
```

### Dark Mode

```typescript
// Byt tema dynamiskt
import { setCulture, setCurrencyCode } from '@syncfusion/ej2-base';

function toggleTheme(isDark: boolean) {
  if (isDark) {
    // Ladda dark theme CSS
    import('@syncfusion/ej2-base/styles/fluent2-dark.css');
    import('@syncfusion/ej2-react-grids/styles/fluent2-dark.css');
    // ... andra komponenter
  } else {
    // Ladda light theme CSS
    import('@syncfusion/ej2-base/styles/fluent2.css');
    import('@syncfusion/ej2-react-grids/styles/fluent2.css');
    // ... andra komponenter
  }
}
```

### Custom Colors (Respektfullt)

```css
/* ✅ RÄTT - Lägg till dina färger via CSS variables */
.minprio-theme {
  --primary-color: #1a73e8; /* Din brand color */
  --primary-dark: #1557b0;
  --primary-light: #4285f4;
}

.minprio-theme .e-btn.e-primary {
  background-color: var(--primary-color);
}

/* ❌ FEL - Förstör Fluent2 */
.e-grid {
  background: linear-gradient(45deg, red, blue) !important;
}
```

---

## 📚 QUICK REFERENCE

### Import Paths

```typescript
// Core Components
import { GridComponent } from '@syncfusion/ej2-react-grids';
import { KanbanComponent } from '@syncfusion/ej2-react-kanban';
import { GanttComponent } from '@syncfusion/ej2-react-gantt';
import { ScheduleComponent } from '@syncfusion/ej2-react-schedule';
import { TreeGridComponent } from '@syncfusion/ej2-react-treegrid';

// Form Components
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { DatePickerComponent } from '@syncfusion/ej2-react-calendars';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';

// Popups
import { DialogComponent } from '@syncfusion/ej2-react-popups';
import { ToastComponent } from '@syncfusion/ej2-react-notifications';

// Services (för Inject)
import { 
  Page, Sort, Filter, Group, Edit, Toolbar,
  ExcelExport, PdfExport, Search
} from '@syncfusion/ej2-react-grids';
```

### Service Injection Cheat Sheet

```typescript
// GridComponent
<Inject services={[Page, Sort, Filter, Group, Edit, Toolbar]} />

// GanttComponent
<Inject services={[Edit, Selection, Toolbar, DayMarkers, CriticalPath]} />

// ScheduleComponent
<Inject services={[Day, Week, WorkWeek, Month, Agenda, TimelineViews]} />

// TreeGridComponent
<Inject services={[Page, Sort, Filter, Edit, Toolbar, Aggregate]} />

// KanbanComponent - Ingen inject behövs!
```

### Event Props Cheat Sheet

**Grid:**
- `actionBegin`: Före action (cancel möjligt)
- `actionComplete`: Efter action
- `actionFailure`: Vid fel
- `recordClick`: Rad click
- `cellClick`: Cell click

**Kanban:**
- `cardClick`: Kort click
- `cardDoubleClick`: Kort dubbelclick
- `dragStart`: Före drag
- `dragStop`: Efter drag
- `dataBinding`: Före data bind

**Gantt:**
- `taskbarEditing`: Taskbar drag/resize
- `actionBegin`: Före action
- `actionComplete`: Efter action
- `rowSelected`: Rad selected

**Schedule:**
- `eventClick`: Event click
- `eventRendered`: Event rendered
- `actionBegin`: Före action
- `actionComplete`: Efter action
- `popupOpen`: Popup öppnas

---

## 🎯 MINPRIO-SPECIFIKA USE CASES

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
    <GridComponent>
      <ColumnsDirective>
        <ColumnDirective field="title" headerText="Uppgift" />
        <ColumnDirective 
          field="cpm" 
          headerText="CPM Priority"
          template={priorityTemplate}
        />
        <ColumnDirective field="deadline" headerText="Deadline" />
      </ColumnsDirective>
    </GridComponent>
  );
}
```

### 2. Capacity Planning Timeline

```typescript
function CapacityTimeline() {
  // 52 veckor framåt
  const weeks = Array.from({ length: 52 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + (i * 7));
    return date;
  });
  
  return (
    <GanttComponent
      dataSource={projects}
      projectStartDate={new Date()}
      projectEndDate={weeks[51]}
      viewType="ResourceView"
      showOverAllocation={true}
      taskType="FixedWork"
    >
      {/* Visa workload bars per vecka */}
    </GanttComponent>
  );
}
```

### 3. Status Kanban med CPM Colors

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
        <div className="card-deadline">
          {formatDeadline(props.Deadline)}
        </div>
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

### 4. Calendar med Deadlines & Scheduled Work

```typescript
function TaskCalendar() {
  const combinedEvents = [
    ...calendarEvents, // Microsoft Graph events
    ...deadlines.map(d => ({
      Id: `deadline-${d.id}`,
      Subject: `⏰ ${d.title}`,
      StartTime: new Date(d.deadline),
      EndTime: new Date(d.deadline),
      IsAllDay: true,
      IsReadonly: false,
      CategoryColor: '#ff4444'
    }))
  ];
  
  return (
    <ScheduleComponent
      dataSource={combinedEvents}
      currentView="Month"
      showQuickInfo={true}
      eventClick={(args) => {
        if (args.event.Id.startsWith('deadline-')) {
          // Öppna task dialog
          openTaskDialog(extractTaskId(args.event.Id));
        }
      }}
    />
  );
}
```

---

## 📝 SAMMANFATTNING

### DO's ✅
- Importera direkt från @syncfusion/ej2-react-*
- Injicera services för funktionalitet
- Använd villkorlig rendering för DialogComponent
- Respektera Fluent2-tema
- Använd DataManager för stora dataset
- Virtualization för >1000 rader
- Svenska lokalisering med L10n

### DON'Ts ❌
- Skapa custom wrappers
- Glömma Inject services
- Rendera Dialog utan villkorlig check
- CSS !important overrides på Fluent2
- ButtonComponent i DialogComponent (React 17+ bug)
- Mutera state direkt
- Ignorera actionBegin events för validering

### Komponenter för MinPrio

| Komponent | Användningsområde | Prioritet |
|-----------|-------------------|-----------|
| **GridComponent** | Task list, alla uppgifter | 🔴 Hög |
| **KanbanComponent** | Status board, workflow | 🔴 Hög |
| **ScheduleComponent** | Kalender, deadlines | 🟡 Medel |
| **GanttComponent** | Timeline, capacity planning | 🟡 Medel |
| **TreeGridComponent** | Hierarkiska uppgifter | 🟢 Låg |
| **DialogComponent** | Formulär, popups | 🔴 Hög |
| **Form Components** | Input, date, dropdown | 🔴 Hög |

---

## 🔗 RESURSER

- **Officiell Dokumentation:** https://ej2.syncfusion.com/react/documentation/
- **Demos:** https://ej2.syncfusion.com/react/demos/
- **API Reference:** https://ej2.syncfusion.com/react/documentation/api/
- **Community License:** https://www.syncfusion.com/sales/communitylicense
- **GitHub:** https://github.com/syncfusion/ej2-react-ui-components

---

**Version:** 1.0  
**Datum:** 2025-10-25  
**Författare:** Daniel (med Claude's hjälp)  
**Uppdaterad för:** SyncFusion EJ2 React (v31.x), Fluent2 Theme
