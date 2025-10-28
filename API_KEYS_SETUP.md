# API Keys Setup Guide

## 🆓 Gratis API:er (ingen key krävs)

### SMHI (Väder)
- **Gratis:** Ja, ingen key krävs
- **API:** https://opendata.smhi.se/apidocs/metfcst/index.html
- **Användning:** Väderprognos för hela Sverige

---

## 🔑 API:er med Gratis Tier

### 1. Trafiklab (ResRobot - Kollektivtrafik)
- **Gratis tier:** 10,000 anrop/månad
- **Registrera:** https://www.trafiklab.se/api/trafiklab-apis/resrobot-v21/
- **Key i:** `VITE_TRAFIKLAB_API_KEY`
- **Användning:** SL, SJ, regionaltrafik, färjor

**Setup:**
1. Gå till https://www.trafiklab.se/
2. Skapa konto
3. Skapa nytt projekt
4. Lägg till "ResRobot v2.1"
5. Kopiera API-nyckeln till `.env.local`

---

### 2. Trafikverket (Vägtrafikinfo)
- **Gratis tier:** Ja
- **Registrera:** https://api.trafikinfo.trafikverket.se/
- **Key i:** `VITE_TRAFIKVERKET_API_KEY`
- **Användning:** Olyckor, vägarbete, köer på svenska vägar

**Setup:**
1. Gå till https://api.trafikinfo.trafikverket.se/
2. Klicka "Registrera"
3. Fyll i email
4. Bekräfta email
5. Kopiera API-nyckeln till `.env.local`

---

### 3. Google Places API
- **Gratis tier:** 5,000 anrop/månad
- **Efter:** $17 per 1,000 anrop
- **Registrera:** https://console.cloud.google.com/
- **Key i:** `VITE_GOOGLE_PLACES_API_KEY`
- **Användning:** Restauranger, caféer, butiker

**Setup:**
1. Gå till https://console.cloud.google.com/
2. Skapa nytt projekt (eller välj befintligt)
3. Aktivera "Places API (New)"
4. Gå till "Credentials" → "Create Credentials" → "API key"
5. Kopiera API-nyckeln till `.env.local`
6. (Rekommenderat) Begränsa nyckeln till endast Places API

**Obs:** Kräver kreditkort även för free tier, men debiteras inte under 5K anrop/mån.

---

## 📊 Användningsestimering (Solo-användare)

| API | Estimerad användning/mån | Kostnad |
|-----|--------------------------|---------|
| **SMHI** | 100 anrop | 0 kr |
| **Trafiklab** | 200 anrop | 0 kr (under 10K) |
| **Trafikverket** | 50 anrop | 0 kr |
| **Google Places** | 100 anrop | 0 kr (under 5K) |
| **TOTALT** | - | **0 kr/mån** |

---

## ⚙️ Setup i Production (Render)

Lägg till environment variables i Render dashboard:
1. Gå till https://dashboard.render.com/
2. Välj din service
3. Environment → Add Environment Variable
4. Lägg till alla keys från `.env.local.example`

**Viktigt:** SMHI behöver ingen key, hoppa över den!

---

## 🧪 Test utan API-keys

Alla tre API:erna har **mock data** för testing:
- **SMHI:** Funkar alltid (ingen key krävs)
- **Trafikverket:** Returnerar mock-olyckor om key saknas
- **Google Places:** Returnerar mock-restauranger om key saknas

Du kan alltså testa funktionaliteten utan att registrera keys först!

---

## 🔒 Säkerhet

**VIKTIGT:**
- Lägg ALDRIG API-keys i Git
- `.env.local` är i `.gitignore`
- Använd endast `VITE_*` prefix för frontend-keys
- Backend-keys (Upstash, etc) ska INTE ha `VITE_` prefix

---

## ❓ Felsökning

**"API key saknas" varning i console:**
- Kontrollera att `.env.local` finns
- Kontrollera att key har korrekt namn (ex: `VITE_TRAFIKLAB_API_KEY`)
- Kontrollera att dev server startats om efter `.env.local` ändrats

**Google Places error "REQUEST_DENIED":**
- Kontrollera att Places API är aktiverat i Google Cloud Console
- Kontrollera att API-nyckeln är korrekt
- Kontrollera att API-nyckeln har rätt permissions

**Trafikverket error 401:**
- Kontrollera att API-nyckeln är bekräftad (kolla email)
- Vissa keys tar 10-15 min att aktiveras

---

**Dokumentation skapad:** 2025-10-28
**Senast uppdaterad:** 2025-10-28
