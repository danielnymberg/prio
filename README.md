# Prio

**AI-driven uppgiftshantering med Microsoft 365-integration**

Prio hjälper dig att hålla fokus på det som är viktigt genom CPM-ramverket (Could/Possibly/Must), AI-assistans och smart kalenderintegration.

Del av DaNy-ekosystemet (shared auth med Anmärkt)

---

## 🎯 Kärnfunktioner

### ✅ Aktiva Features
- **Uppgiftshantering** - Skapa, redigera, prioritera tasks med importance/urgency
- **Microsoft 365-integration** - Outlook-kalender, fokustid, OneDrive
- **Email-to-Task** - Mejla till `task@nymberg.se` → Claude AI skapar tasks
- **Veckokalender** - Drag & drop tasks till kalendern, synkar med Outlook
- **AI Backend** - Claude Sonnet för smart prioritering och uppgiftstolkning
- **Kanban-board** - Visuell översikt med tidslinjer
- **Projekt-kategorisering** - Gruppera tasks i projekt
- **Dark Mode** - Fullständigt stöd för mörkt tema
- **PWA** - Installable som native app

### ⚠️ Inaktiverade Features (väntar på fix)
- **Röststyrning** - AI-assistent med svensk TTS/STT (Speechmatics + Azure Speech)
- **AI Chat** - Konversationell chatbot för uppgiftshantering
- **Quick Capture** - Mobile FAB för snabb uppgiftsinmatning
- **Email Listener** - Realtime-lyssning på email-to-task konverteringar
- **Onboarding** - Welcome modal och tutorials
- **Global Search** - Cmd/Ctrl+K sökning
- **Toast Notifications** - System för toast-meddelanden

**Varför inaktiverade?** Syncfusion DialogComponent + React 18 StrictMode orsakade crashes. Fixas snart.

---

## 🛠️ Teknisk Stack

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **UI Library:** Syncfusion EJ2 (Fluent2 theme)
- **Styling:** Ren Fluent2 CSS (inga custom overrides)
- **State:** React Context + Hooks
- **Build:** Vite (rekommenderat av Syncfusion 2025)

### Backend & Integrationer
- **Database:** Supabase (PostgreSQL + Realtime + Auth)
- **Backend Server:** Node.js/Express på Render.com
- **AI:** Anthropic Claude Sonnet 3.5
- **Calendar:** Microsoft Graph API (Outlook)
- **Voice (inaktiv):** Azure Speech + Speechmatics
- **Email:** SendGrid Inbound Parse

### Deploy
- **Frontend:** Render.com
- **Backend:** Render.com
- **Database:** Supabase (EU-region)

---

## 🚀 Setup

### 1. Installera dependencies
```bash
npm install
```

### 2. Kör SQL-migrationer
1. Gå till [Supabase SQL Editor](https://supabase.com/dashboard/project/YOUR_PROJECT/sql)
2. Kör följande migrations i ordning:
   - `supabase/migrations/20241001_prio_tables.sql`
   - `supabase/migrations/001_enable_rls.sql`
   - `supabase/migrations/002_api_usage_tracking.sql`
   - `supabase/email_tasks_table.sql`

### 3. Konfigurera miljövariabler

**Frontend (.env.local):**
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Backend
VITE_BACKEND_URL=http://localhost:10000  # eller https://your-backend.onrender.com

# Microsoft Graph
VITE_AZURE_CLIENT_ID=your_azure_client_id
```

**Backend (server/.env):**
```bash
PORT=10000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI
ANTHROPIC_API_KEY=sk-ant-your_claude_key

# Voice (om aktiverat)
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=westeurope
SPEECHMATICS_API_KEY=your_speechmatics_key

# Email Webhook
SENDGRID_WEBHOOK_SECRET=your_webhook_secret
```

### 4. Starta dev-server

**Frontend:**
```bash
npm run dev
# Öppna http://localhost:5174
```

**Backend:**
```bash
cd server
npm install
npm start
# Körs på http://localhost:10000
```

---

## 📁 Projekt-struktur

```
prio/
├── src/
│   ├── components/
│   │   ├── auth/              # Login, SignUp
│   │   ├── calendar/          # Veckokalender, drag & drop
│   │   ├── focus/             # DailyCheckIn, FocusSession
│   │   ├── layout/            # AppLayout, Header, Sidebar
│   │   ├── pwa/               # InstallPrompt, OfflineBanner
│   │   ├── settings/          # SettingsView, ApiUsageView
│   │   ├── tasks/             # TaskCard, TaskList, KanbanView
│   │   ├── ui/                # Dialog, ThemeToggle
│   │   └── views/             # Dashboard, Inbox, Kanban, Archive
│   ├── contexts/              # AuthContext, ThemeContext
│   ├── hooks/                 # useTasks, useCalendar, useMicrosoft
│   ├── lib/                   # supabase, types, utils, constants
│   ├── services/              # microsoft, azure, speechmatics
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css              # Minimal custom CSS
├── server/
│   ├── index.js               # Express server med endpoints
│   └── package.json
├── supabase/
│   └── migrations/            # SQL migrations
├── public/                    # PWA assets
├── .env.local                 # Frontend env vars
└── README.md                  # Denna fil
```

---

## 💾 Databas-schema

### `tasks` table
- Prioriterade uppgifter
- Fält: `title`, `description`, `importance`, `urgency`, `deadline`, `duration`, `project_id`
- Computed `priority` column baserat på importance + urgency
- RLS: Users kan endast se sina egna tasks

### `projects` table
- Projekt-kategorisering
- Färgkodning för visuell gruppering
- RLS: Users kan endast se sina egna projekt

### `email_tasks` table
- Email-to-task konverteringar
- JSON-data från Claude AI-tolkning
- Realtime-enabled för frontend-lyssning

### `api_usage` table
- Spårar Claude API-användning per user
- Token count, cost, daily/monthly quotas
- Pricing tiers: Free (100k tokens/mån), Pro, Business

---

## 📧 Email-to-Task Setup

**Funktion:** Mejla uppgifter till `task@nymberg.se` → Claude AI tolkar → Task skapas automatiskt!

**Setup:**
1. Följ instruktioner i `EMAIL_TO_TASK_SETUP.md`
2. Konfigurera SendGrid Inbound Parse
3. Lägg till MX-record i DNS
4. Starta backend med Supabase Service Role Key

**Säkerhet:** Endast mejl från `daniel@nymberg.se` accepteras.

Se `EMAIL_TO_TASK_SETUP.md` för detaljerad guide.

---

## 📅 Kalenderfunktion

**Features:**
- Veckokalender (må-fre, 07:00-20:00)
- Visa Microsoft Outlook-möten
- Dra tasks från inbox → schemalägg i kalender
- Skapa fokustid direkt i Outlook
- Flytta/ändra events med drag & drop
- Färgkodning: 🔵 Möten, 🟠 Fokustid, 🔴 Deadlines

**Setup:**
1. Gå till Inställningar → Microsoft
2. Klicka "Koppla" och godkänn permissions
3. Gå till Kalender-vyn
4. Dra tasks för att schemalägga!

Se `KALENDER_GUIDE.md` för användarguide.

---

## 🎤 Röststyrning (Inaktiv)

**Features:**
- Svensk TTS med Azure (Sofie Neural)
- Speech-to-Text med Speechmatics
- Konversationell AI med Claude
- Kommandon: "Skapa task", "Vad ska jag göra nu?"

**Setup:**
Se `VOICE_SETUP.md` för konfiguration.

**Status:** Byggd men inaktiverad pga DialogComponent-crashes. Återaktiveras efter fix.

---

## 🔐 Säkerhet

### Implementerat
- ✅ Row Level Security (RLS) på alla tabeller
- ✅ Bearer token authentication på backend
- ✅ CORS whitelist (localhost + minprio.se)
- ✅ Rate limiting (100 req/15 min)
- ✅ HMAC-validering för email webhooks
- ✅ API quota tracking per user
- ✅ Inga API-nycklar i frontend

### Säkerhetsmigration
Om du uppgraderar från gammal version, följ `TODO_DANIEL.md` för säkerhetsmigration.

Se `SECURITY_AUDIT.md` för fullständig säkerhetsrevision.

---

## 🐛 Kända Problem

### Kritiska (kräver åtgärd)
1. **TaskForm borttagen** - Ingen UI för att skapa/redigera uppgifter finns längre
   - Orsak: ButtonComponent onClick fungerar inte i Syncfusion DialogComponent (Portal rendering)
   - Data behålls: Alla tasks finns kvar i databasen
   - Behövs: Ny implementation av task form (route-based eller annan lösning)
2. **Grå overlay blockerar** - Sidebar backdrop orsakar interaktionsproblem

### Workarounds tillämpade
- DailyCheckIn och TaskImpact konverterade till routes (fungerar)
- Dialog wrapper med proper lifecycle management
- `showBackdrop={false}` på Sidebar
- CSS-fixes för overlay pointer-events

Se `DISABLED_COMPONENTS.md` för lista över inaktiverade komponenter.

---

## 🚀 Roadmap

### Akut (pågående)
- [ ] **Implementera ny TaskForm** - Route-based eller annan fungerande lösning
- [ ] Fixa overlay/backdrop-issues

### Kort sikt
- [ ] Eisenhower Matrix grid (2x2 quadrants)
- [ ] Återaktivera VoiceInterface
- [ ] Återaktivera QuickNoteInput (AI chat)
- [ ] Återaktivera EmailTaskListener
- [ ] Global Search (Cmd+K)
- [ ] Toast Notifications

### Medellång sikt
- [ ] Månadvy + Dagvy för kalender
- [ ] Konfliktvarning för dubbelbokningar
- [ ] Smart AI-schemaläggning
- [ ] Batch-schemaläggning
- [ ] Mobile swipe-gestures
- [ ] Keyboard shortcuts

### Lång sikt
- [ ] Analytics & insights
- [ ] Team collaboration
- [ ] Recurring tasks
- [ ] Print/Export till PDF
- [ ] Push-to-talk röstläge
- [ ] Voice activation ("Hej Prio")
- [ ] Flerspråkig support

---

## 📚 Dokumentation

- `README.md` - Denna fil (översikt)
- `VOICE_SETUP.md` - Röststyrning setup
- `EMAIL_TO_TASK_SETUP.md` - Email-to-task guide
- `KALENDER_GUIDE.md` - Kalender användarguide
- `TODO_DANIEL.md` - Säkerhetsmigration checklist
- `SECURITY_AUDIT.md` - Säkerhetsrevision
- `DISABLED_COMPONENTS.md` - Inaktiverade features
- `SYNCFUSION_MIGRATION.md` - Syncfusion migration guide
- `MIGRATION_GUIDE.md` - Teknisk migreringsguide

---

## 🏗️ Deploy

### Frontend (Render.com)
```bash
npm run build
# Deploy static site till Render
# Root directory: /
# Build command: npm run build
# Publish directory: dist
```

### Backend (Render.com)
```bash
cd server
npm install
npm start
# Deploy web service till Render
# Root directory: /server
# Build command: npm install
# Start command: npm start
```

**Environment Variables:** Se `.env.example` för referens.

---

## 🤝 Bidra

Detta är för närvarande ett privat projekt. För frågor eller bug reports, kontakta daniel@nymberg.se.

---

## 📄 Licens

Proprietary - Daniel Nymberg © 2024-2025

---

**Byggd med Claude Code** 🤖
