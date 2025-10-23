# SPIRIS → MINPRIO INTEGRATION - SNABBSTART

## 📋 VAD DU HAR FÅT T

1. **006_add_spiris_fields.sql** - SQL-migration för nya fält
2. **import_spiris_projects.py** - Python-script för import
3. **SPIRIS_INTEGRATION_GUIDE.md** - Detaljerad guide
4. **Projektlista2025-10-23.xlsx** - Din Spiris-export (redan uppladdad)

---

## 🚀 SNABBSTART (15 minuter totalt)

### ⚠️ VIKTIGT: Komplettera Excel FÖRST!
För bästa resultat, komplettera projektet i Excel innan import.
**Läs:** [EXCEL_KOMPLETTERING.md](computer:///mnt/user-data/outputs/EXCEL_KOMPLETTERING.md)

**Komplettera dessa kolumner:**
- ✅ Kalkylerad tid (budgeterade timmar)
- ✅ Budget intäkt (budgeterad omsättning)
- ✅ Slutdatum (för Q4-projekt)

**Varför?** → Projektspecifika timpris, exakta beräkningar, bättre Q4-planering!

---

### Steg 1: Komplettera Excel (10 min)
```
1. Öppna: Projektlista2025-10-23.xlsx
2. Fyll i "Kalkylerad tid" för alla aktiva projekt
3. Fyll i "Budget intäkt" för alla aktiva projekt  
4. Fyll i "Slutdatum" för Q4-projekt (deadline 2025-10-23 till 2025-12-31)
5. Radera projekt du INTE vill importera
6. Spara som: Projektlista_KOMPLETTERAD.xlsx
```

**Detaljerad guide:** [EXCEL_KOMPLETTERING.md](computer:///mnt/user-data/outputs/EXCEL_KOMPLETTERING.md)

---

### Steg 2: Kör databas-migration (2 min)
```bash
# Logga in på Supabase Dashboard
# Gå till SQL Editor
# Kopiera innehållet från 006_add_spiris_fields.sql
# Kör SQL:en
```

### Steg 2: Installera Python-dependencies
```bash
pip install pandas openpyxl supabase
```

### Steg 3: Sätt miljövariabler
```bash
export VITE_SUPABASE_URL='https://your-project.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='eyJhbG...'  # Från Supabase Settings → API
export MINPRIO_USER_ID='your-user-uuid-here'  # Ditt user ID
```

**Hitta ditt User ID:**
```sql
-- Kör i Supabase SQL Editor
SELECT id, email FROM auth.users WHERE email = 'din@email.se';
```

### Steg 4: Testa import (dry run)
```bash
python import_spiris_projects.py Projektlista2025-10-23.xlsx
```

Detta visar vad som kommer importeras UTAN att faktiskt spara något.

### Steg 5: Importera på riktigt
```bash
python import_spiris_projects.py Projektlista2025-10-23.xlsx --import
```

**Resultat:** 53 projekt importeras till MinPrio! 🎉

---

## 📊 VAD HÄNDER EFTER IMPORT?

### Nya fält i MinPrio Projects:

**Spiris-koppling:**
- spiris_project_id: "1", "2", "5" osv
- spiris_last_sync: När importen gjordes

**Resursplanering:**
- budgeted_hours: Kalkylerade timmar från Spiris
- budgeted_revenue: Budgeterad intäkt
- invoiced_hours: Beräknat från Intäkt / Timpris
- invoiced_amount: Fakturerat belopp från Spiris
- actual_hours_worked: Rapporterade timmar från Spiris
- project_manager: "Daniel Nymberg" osv

### Beräknade värden (i UI):
- **Kvarvarande timmar** = budgeted_hours - invoiced_hours
- **Kvarvarande budget** = budgeted_revenue - invoiced_amount
- **Färdigställning %** = (invoiced_hours / budgeted_hours) * 100

---

## ⚠️ VIKTIGT ATT VETA

### ✅ Med kompletterad Excel-fil (REKOMMENDERAT)
- **Projektspecifika timpris** beräknas automatiskt (Budget intäkt / Kalkylerad tid)
- **Exakta beräkningar** för varje projekt (olika kunder = olika priser!)
- **Bättre Q4-planering** med kompletta deadlines
- **Inga antaganden** eller defaultvärden behövs

**Exempel:**
```
Projekt A: 60 000 kr / 60h = 1 000 kr/h
Projekt B: 90 000 kr / 120h = 750 kr/h  
Projekt C: 135 000 kr / 90h = 1 500 kr/h
→ Varje projekt får sitt egna timpris!
```

### ⚠️ Utan kompletterad Excel-fil (ej rekommenderat)
Om du importerar UTAN att komplettera Excel först:
- Endast 12 av 53 projekt har budgeterade timmar
- Endast 5 av 53 projekt har deadline
- Import-scriptet gissar timpris (878 kr/h genomsnitt)
- **Resultat:** Mindre exakta beräkningar

**Lösning:** Komplettera alltid Excel INNAN import! 
Se [EXCEL_KOMPLETTERING.md](computer:///mnt/user-data/outputs/EXCEL_KOMPLETTERING.md)

---

## 🎯 NÄSTA STEG: Q4 RESURSPLANERING

### 1. Komplettera projekt-data
Gå igenom de 53 importerade projekten i MinPrio och:
- [ ] Lägg till deadline för projekt som ska bli klara Q4
- [ ] Komplettera budgeterade timmar där det saknas
- [ ] Verifiera timpris per projekt

### 2. Skapa Q4-planeringsvyn (för Claude Code)
"Claude Code, skapa en ny vy `Q4ResourcePlanningView.tsx` enligt specen i SPIRIS_INTEGRATION_GUIDE.md"

### 3. Uppdatera ProjectsView
"Claude Code, uppdatera ProjectsView.tsx med de nya kolumnerna enligt SPIRIS_INTEGRATION_GUIDE.md"

---

## 💡 TIPS FÖR Q4-PLANERING

### Beräkna veckor kvar:
```
Idag: 23 oktober 2025
Deadline Q4: 31 december 2025
Veckor kvar: ~10 veckor
```

### Om du har 320 timmar kvar:
```
320h / 10 veckor = 32h per vecka
32h / 5 dagar = 6.4h per dag

⚠️ Detta är ENDAST Q4-projekt!
⚠️ Glöm inte lägga till andra aktiviteter:
   - Intern tid
   - Semester
   - Möten
```

### Rekommendation:
- Planera max 30-35h per vecka för projekt
- Lämna 5-10h för övrigt (möten, admin, oplanerat)
- Använd MinPrio's kalendervy för att schemalägga

---

## 🆘 FELSÖKNING

### "Projektet finns redan"
- Import-scriptet kollar spiris_project_id
- Om du vill köra om: `DELETE FROM projects WHERE spiris_project_id IS NOT NULL;`

### "Permission denied"
- Kontrollera att SUPABASE_SERVICE_ROLE_KEY är rätt nyckel (inte anon key!)
- Service role key finns i Supabase Settings → API → service_role

### "No module named 'supabase'"
```bash
pip install supabase
```

### Python-versioner
- Kräver Python 3.7+
- Testa med: `python3 --version`

---

## 📞 SUPPORT

Om något krånglar:
1. Kolla SPIRIS_INTEGRATION_GUIDE.md för detaljerad info
2. Fråga Claude Code om hjälp med implementation
3. Kontrollera Supabase-loggar för databas-fel

**Lycka till med Q4-planeringen! 🚀**
