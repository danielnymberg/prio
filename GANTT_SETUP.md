# 🚀 Gantt & Resursallokering - Setup Guide

## 📋 Vad är nytt?

### 1. Gantt Timeline (`/gantt`)
- Visuell projekttimeline med alla projekt
- Drag-and-drop för att ändra start/slutdatum
- Färgkodning: Grön (aktiv), Orange (snart klar), Röd (försenad), Grå (slutförd)
- Dubbelklick på projekt → öppnar ProjectDetailView
- Sparar automatiskt till Supabase vid ändringar

### 2. Resursallokering (`/allocation`)
- Editberbar tabell: Projekt × Veckor
- Klicka på cell för att allokera timmar
- Färgkodning baserat på kapacitet: Grön/Orange/Röd
- Summering per projekt + vecka
- Dubbelklick på projekt → öppnar ProjectDetailView

### 3. Förbättringar projekthantering
- ✅ Auto-beräknad completion_percentage (refresh-knapp)
- ✅ Synkad logged_hours (samma logik överallt)
- ✅ Deadline-validering (varnar om task > projekt-deadline)
- ✅ ResursplaneringView visar alla projekt (ej bara Spiris)

---

## 🗄️ Databas Setup

### Steg 1: Kör SQL-migration

**Logga in på Supabase Dashboard:**
1. Gå till https://app.supabase.com
2. Välj ditt projekt
3. Gå till **SQL Editor** (vänster meny)
4. Klicka **New Query**

**Kopiera och kör följande SQL:**

\`\`\`sql
-- ============================================
-- PROJECT ALLOCATIONS TABLE
-- Created: 2025-10-23
-- Description: Veckovis allokering av timmar per projekt
-- ============================================

CREATE TABLE IF NOT EXISTS project_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,  -- Måndag i veckan (YYYY-MM-DD)
  allocated_hours DECIMAL(5,2) NOT NULL CHECK (allocated_hours >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, project_id, week_start)
);

COMMENT ON TABLE project_allocations IS 'Veckovis resursallokering per projekt';
COMMENT ON COLUMN project_allocations.week_start IS 'Måndag i veckan (ISO week start)';
COMMENT ON COLUMN project_allocations.allocated_hours IS 'Planerade timmar för denna vecka';

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_project_allocations_user ON project_allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_project_allocations_project ON project_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_allocations_week ON project_allocations(week_start);
CREATE INDEX IF NOT EXISTS idx_project_allocations_user_week ON project_allocations(user_id, week_start);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE project_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own allocations" ON project_allocations;
CREATE POLICY "Users can view own allocations"
  ON project_allocations FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own allocations" ON project_allocations;
CREATE POLICY "Users can insert own allocations"
  ON project_allocations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own allocations" ON project_allocations;
CREATE POLICY "Users can update own allocations"
  ON project_allocations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own allocations" ON project_allocations;
CREATE POLICY "Users can delete own allocations"
  ON project_allocations FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_project_allocations_updated_at ON project_allocations;
CREATE TRIGGER update_project_allocations_updated_at
  BEFORE UPDATE ON project_allocations
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
\`\`\`

**Kör SQL:**
1. Klicka **Run** (eller Cmd/Ctrl + Enter)
2. Verifiera att det står "Success. No rows returned"

---

### Steg 2: Verifiera tabellen

**Kör denna query för att kolla att tabellen finns:**

\`\`\`sql
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'project_allocations'
ORDER BY ordinal_position;
\`\`\`

**Förväntat resultat:**
\`\`\`
table_name            | column_name        | data_type | is_nullable
---------------------|--------------------|-----------|------------
project_allocations  | id                 | uuid      | NO
project_allocations  | user_id            | uuid      | NO
project_allocations  | project_id         | uuid      | NO
project_allocations  | week_start         | date      | NO
project_allocations  | allocated_hours    | numeric   | NO
project_allocations  | created_at         | timestamp | NO
project_allocations  | updated_at         | timestamp | NO
\`\`\`

---

## 🧪 Testa funktionaliteten

### 1. Testa Gantt Timeline
1. Gå till http://localhost:5175/gantt
2. Drag-and-drop ett projekt för att ändra datum
3. Verifiera att toast visas: "Projekt uppdaterat!"
4. Kolla att datumet uppdaterades i projekttabellen

### 2. Testa Resursallokering
1. Gå till http://localhost:5175/allocation
2. Klicka på en cell och skriv in timmar (t.ex. "10")
3. Tryck Enter
4. Verifiera att allokeringen sparades
5. Summera att totalen per vecka uppdateras

### 3. Verifiera menyintegration
1. Öppna Sidebar (vänster meny)
2. Klicka på "Planering"
3. Verifiera att du ser:
   - Gantt Timeline
   - Resursallokering
   - Q4 2025
   - Q1 2026

---

## 📊 SQL-queries för felsökning

### Se alla allokeringar
\`\`\`sql
SELECT
  pa.*,
  p.name as project_name,
  TO_CHAR(pa.week_start, 'IYYY-IW') as week_number
FROM project_allocations pa
JOIN projects p ON p.id = pa.project_id
ORDER BY pa.week_start DESC, pa.allocated_hours DESC;
\`\`\`

### Summera per vecka
\`\`\`sql
SELECT
  week_start,
  TO_CHAR(week_start, 'IYYY-IW') as week_number,
  SUM(allocated_hours) as total_hours,
  COUNT(DISTINCT project_id) as num_projects
FROM project_allocations
GROUP BY week_start
ORDER BY week_start;
\`\`\`

### Summera per projekt
\`\`\`sql
SELECT
  p.name,
  SUM(pa.allocated_hours) as total_allocated,
  COUNT(DISTINCT pa.week_start) as num_weeks
FROM projects p
LEFT JOIN project_allocations pa ON pa.project_id = p.id
GROUP BY p.id, p.name
ORDER BY total_allocated DESC NULLS LAST;
\`\`\`

### Ta bort all testdata (om behövs)
\`\`\`sql
-- VARNING: Tar bort ALLA allokeringar!
TRUNCATE project_allocations CASCADE;
\`\`\`

---

## 🚢 Push till produktion

### Lokalt
\`\`\`bash
# Kolla status
git status

# Push
git push origin main
\`\`\`

### Render Auto-Deploy
- Render bygger automatiskt när du pushar till main
- Vänta 2-3 minuter på deploy
- Kolla https://prio-backend.onrender.com

### Supabase (produktionsdatabas)
1. Logga in på production Supabase
2. Kör samma SQL-migration som ovan
3. Verifiera att tabellen skapades

---

## 📝 Nästa steg (valfritt)

### Integration som kan läggas till:
1. **Gantt → Allokering**: "Auto-fördela"-knapp
2. **Allokering → Kalender**: Skapa calendar-events från allokering
3. **Capacity warnings**: Varna när total/vecka > kapacitet
4. **Project templates**: Fördefinierade allokeringsmönster

### Frågor?
- Kolla koden: `src/components/gantt/`, `src/components/allocation/`
- Hook: `src/hooks/useProjectAllocations.ts`
- Types: `src/lib/types.ts`

---

**✅ Klart att använda!**
