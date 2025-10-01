# PRIO VOICE - Setup Guide

## Översikt

PRIO VOICE är en komplett konversationell AI-integration för Prio-appen som ger användare möjlighet att interagera med sin prioriteringsassistent genom naturligt tal på svenska.

## Arkitektur

### Core Services
- **Azure TTS** - Text-to-Speech med svensk röst (Sofie Neural)
- **Speechmatics STT** - Speech-to-Text med svenska språkmodellen
- **Claude Sonnet** - Konversationell AI för uppgiftshantering
- **Microsoft Graph** - Kalender och filintegration

### PWA Support
- Mikrofonåtkomst via secure context
- Offline capability för core funktioner
- Install prompt för mobilanvändare

## Setup

### 1. Miljövariabler

Skapa en `.env.local` fil med följande:

```bash
# Existing Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key

# Voice AI Integration
VITE_ANTHROPIC_API_KEY=sk-ant-your_claude_key
VITE_AZURE_SPEECH_KEY=your_azure_speech_key
VITE_AZURE_SPEECH_REGION=westeurope
VITE_SPEECHMATICS_KEY=your_speechmatics_key

# Microsoft Graph (valfritt)
VITE_AZURE_CLIENT_ID=your_azure_client_id
```

### 2. Azure Speech Services

1. Skapa en **Speech Service** i Azure Portal
2. Välj region: `westeurope` eller `northeurope`
3. Kopiera nyckel till `VITE_AZURE_SPEECH_KEY`

### 3. Speechmatics

1. Registrera på [speechmatics.com](https://speechmatics.com)
2. Välj Real-Time API
3. Kopiera API-nyckel till `VITE_SPEECHMATICS_KEY`

### 4. Claude API

1. Skapa konto på [console.anthropic.com](https://console.anthropic.com)
2. Generera API-nyckel
3. Kopiera till `VITE_ANTHROPIC_API_KEY`

### 5. Microsoft Graph (Valfritt)

För kalender- och filintegration:

1. Registrera app i **Azure App Registrations**
2. Lägg till permissions:
   - `User.Read`
   - `Calendars.Read`
   - `Files.Read.All`
3. Kopiera Client ID till `VITE_AZURE_CLIENT_ID`

## Användning

### Voice Interface

- **Klicka** på röstknappen för att prata
- **Dubbelklicka** för att öppna chat-historik
- **Live transkription** visas under inspelning

### Röstkommandon (Svenska)

#### Skapa tasks:
- "Skapa en task att ringa John"
- "Lägg till uppgift fixa buggen"
- "Ny task planera möte imorgon"

#### Hantera befintliga:
- "Markera som klar"
- "Ändra viktighet till 8"
- "Sätt deadline till fredag"

#### Fråga om prioriteringar:
- "Vad ska jag göra nu?"
- "Vilka tasks har jag idag?"
- "Vad är viktigt den här veckan?"

### AI Funktioner

Claude-assistenten kan:
- Skapa tasks baserat på naturlig beskrivning
- Föreslå prioriteringar enligt Eisenhower-matrisen
- Analysera din nuvarande arbetsbelastning
- Integrera med din Outlook-kalender
- Söka i dina OneDrive-filer

## Säkerhet & GDPR

### Data Protection
- Alla API-nycklar i miljövariabler (aldrig committade)
- Azure Speech använder EU-regioner
- Microsoft Graph med OAuth2-autentisering
- Ingen audio sparas permanent

### Privacy
- Conversation logs endast i browser localStorage
- Användaren kan rensa historik när som helst
- Inget data skickas utan explicit användarinteraktion

## Tekniska Detaljer

### Browser Requirements
- **Chrome/Edge**: Fullständig support
- **Firefox**: Begränsad Speech Recognition
- **Safari**: Kräver HTTPS för mikrofonåtkomst

### PWA Features
- Service Worker för offline caching
- Web App Manifest för installation
- Mikrofon permissions via navigator.mediaDevices

### Performance
- Chunked builds för snabbare laddning
- Lazy loading av voice services
- Minimal bundle size för core funktioner

## Utveckling

### Starta dev server:
```bash
npm run dev
```

### Bygga för produktion:
```bash
npm run build
```

### Testa PWA lokalt:
```bash
npm run preview
```

## Felsökning

### Vanliga problem:

1. **"Röstigenkänning inte tillgänglig"**
   - Kontrollera HTTPS (krävs för mikrofonåtkomst)
   - Testa i Chrome/Edge
   - Kontrollera miljövariabler

2. **"AI-assistent inte tillgänglig"**
   - Verifiera VITE_ANTHROPIC_API_KEY
   - Kontrollera API-kvoter
   - Kolla nätverksanslutning

3. **"Ingen ljud från TTS"**
   - Kontrollera VITE_AZURE_SPEECH_KEY
   - Verifiera region (westeurope)
   - Testa webbläsarens ljudinställningar

4. **"Microsoft Graph fel"**
   - Kontrollera VITE_AZURE_CLIENT_ID
   - Verifiera app permissions i Azure
   - Testa popup-blockerare

### Debug Mode

Aktivera detaljerad loggning:
```javascript
localStorage.setItem('prio-voice-debug', 'true');
```

## Roadmap

### Kommande funktioner:
- [ ] Push-to-talk läge
- [ ] Voice activation ("Hej Prio")
- [ ] Flerspråkig support
- [ ] Custom voice commands
- [ ] Team collaboration features
- [ ] Advanced calendar integration
- [ ] Smart meeting scheduling

### Optimeringar:
- [ ] WebRTC för bättre ljudkvalitet
- [ ] Edge computing för STT
- [ ] Compressed audio streaming
- [ ] Advanced NLP för svenska