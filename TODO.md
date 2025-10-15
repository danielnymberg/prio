# TODO - Framtida förbättringar

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

### Grid-höjd i AllTasksView
Justerat till `flex: 1` men kan behöva finputsas för olika skärmstorlekar.

### Calendar-ikon i Sidebar
Visar vit ruta istället för ikon. Använder `e-schedule` men något är fel. Låt vara tills vidare.
