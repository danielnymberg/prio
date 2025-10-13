# Inaktiverade komponenter (2025-01-13)

## Status: Temporärt inaktiverade under Syncfusion-migrering

### Komponenter som tagits bort från App.tsx:

1. **EmailTaskListener** (rad 232)
   - Funktion: Lyssnar på realtime email-to-task konverteringar
   - Problem: Dubbla prenumerationer (StrictMode)
   - Återinför: Efter fix med isSubscribed-pattern

2. **VoiceInterface** (rad 234)
   - Funktion: AI röstassistent (STT + Claude)
   - Problem: Minnesläcka (tasks i dependency array)
   - Återinför: Efter separation av initialization och tasks-updates

3. **QuickNoteInput** (rad 236)
   - Funktion: AI chatbot FAB-knapp (expanderbar)
   - Problem: Kraschar vid expandering (Portal/Dialog)
   - Återinför: Efter ombyggnad med Syncfusion-kompatibel dialog

4. **QuickCaptureBar** (rad 238)
   - Funktion: Mobile FAB för snabbinmatning (+ och foto-knappar)
   - Problem: TaskForm/Dialog orsakar React DOM crash
   - Återinför: Efter ombyggnad till QuickCaptureFAB med SpeedDial

5. **WelcomeModal** (rad 240)
   - Funktion: Onboarding för nya användare (CPM-introduktion)
   - Problem: Misstänkt för Portal-crash
   - Återinför: Efter verifiering att Dialog fungerar

6. **KanbanOnboarding** (rad 243)
   - Funktion: Kanban-guide för befintliga användare
   - Problem: Misstänkt för Portal-crash
   - Återinför: Efter verifiering att Dialog fungerar

7. **WeeklyReviewModal** (rad 249)
   - Funktion: Veckosammanfattning (måndagar 06:00)
   - Problem: Misstänkt för Portal-crash
   - Återinför: Efter verifiering att Dialog fungerar

8. **ToastComponent** (rad 342, globalt)
   - Funktion: Global toast notifications
   - Problem: Misstänkt för Portal-crash
   - Återinför: Troligen fungerar, aktivera efter andra fixes

9. **GlobalSearch** (rad 357, globalt)
   - Funktion: Cmd/Ctrl+K global sökning
   - Problem: Misstänkt för Portal-crash
   - Återinför: Efter verifiering att Dialog fungerar

### Root cause:
- **DialogComponent** från Syncfusion använder Portals
- React 18 Concurrent Mode + StrictMode orsakar `insertBefore`/`removeChild` errors
- Lösning: Proper cleanup, isSubscribed-pattern, och separation av concerns

### Nästa steg:
1. Fixa alla minnesläckor och cleanup-problem
2. Bygga QuickCaptureFAB med SpeedDial
3. Fixa TaskForm/Dialog
4. Aktivera komponenter en i taget och verifiera
