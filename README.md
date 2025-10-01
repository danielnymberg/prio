# Prio

**Eisenhower Priority Matrix-app** - Håll fokus på det som är viktigt

Del av DaNy-ekosystemet (shared auth med Anmärkt)

## Teknisk Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Backend:** Supabase (shared med anmarkt.beta)
- **Deploy:** Render (senare)

## Setup

### 1. Installera dependencies
```bash
npm install
```

### 2. Kör SQL-migrationen
1. Gå till [Supabase SQL Editor](https://supabase.com/dashboard/project/zvjylrvjzucyjzhnamfi/sql)
2. Kopiera SQL från `supabase/migrations/20241001_prio_tables.sql`
3. Kör SQL

### 3. Verifiera .env.local
Credentials är redan satta (shared med anmarkt.beta)

### 4. Starta dev-server
```bash
npm run dev
```

Öppna http://localhost:5174

## Projekt-struktur

```
prio/
├── src/
│   ├── components/          # React components
│   │   ├── auth/           # Login, SignUp
│   │   ├── matrix/         # Eisenhower Matrix
│   │   ├── tasks/          # Task management
│   │   ├── views/          # Dashboard, Today, Week, etc.
│   │   ├── layout/         # AppLayout, Header, Sidebar
│   │   └── ui/             # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   │   └── useTasks.ts     # ✅ Created
│   ├── lib/                # Utilities
│   │   ├── supabase.ts     # ✅ Created
│   │   ├── types.ts        # ✅ Created
│   │   └── utils.ts        # ✅ Created
│   ├── contexts/           # React contexts
│   │   ├── AuthContext.tsx # ✅ Created
│   │   └── ThemeContext.tsx# ✅ Created
│   ├── App.tsx             # ✅ Created
│   ├── main.tsx            # ✅ Created
│   └── index.css           # ✅ Created
├── supabase/
│   └── migrations/
│       └── 20241001_prio_tables.sql  # ✅ Created - RUN THIS IN SUPABASE!
├── .env.local              # ✅ Created (shared credentials)
├── .env.example            # ✅ Created
├── .gitignore              # ✅ Created
├── package.json            # ✅ Created
├── tsconfig.json           # ✅ Created
├── vite.config.ts          # ✅ Created
├── tailwind.config.js      # ✅ Created
└── postcss.config.js       # ✅ Created
```

## Databas-schema

### `tasks` table
- Eisenhower matrix tasks
- `importance` (1-10) & `urgency` (1-10)
- Computed `priority` column
- Quadrant assignment: Q1/Q2/Q3/Q4

### `projects` table
- Project grouping (future feature)
- Color-coded organization

## Nästa steg

### PRIORITERADE komponenter att bygga:
1. **Auth components** (LoginForm, SignUpForm)
2. **EisenhowerMatrix** (2x2 grid med quadrants)
3. **TaskCard** (draggable task card)
4. **TaskForm** (create/edit modal)
5. **UI components** (Button, Input, Modal, etc.)

### Eisenhower Quadrants:
- **Q1:** Important + Urgent (röd #EF4444) - "Gör nu"
- **Q2:** Important + Not Urgent (grön #10B981) - "Schemalägg"
- **Q3:** Not Important + Urgent (gul #F59E0B) - "Delegera"
- **Q4:** Not Important + Not Urgent (grå #6B7280) - "Eliminera"

## Features att implementera

- [x] Supabase setup
- [x] Auth context (shared med anmarkt.beta)
- [x] Task CRUD hooks
- [x] Theme toggle (dark mode)
- [ ] Login/Signup UI
- [ ] Eisenhower Matrix grid
- [ ] Task cards (drag & drop)
- [ ] Task create/edit form
- [ ] Dashboard views (Today, Week, All, Archive)
- [ ] Project management
- [ ] Realtime subscriptions
- [ ] Mobile responsive
- [ ] Keyboard shortcuts

## Future enhancements

- Voice control (Deepgram)
- AI assistant (DaNy)
- Analytics & insights
- Team collaboration

## Deploy

```bash
npm run build
# Deploy to Render
```

---

**Byggd med Claude Code** 🤖
