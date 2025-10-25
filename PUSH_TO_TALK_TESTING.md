# 🎤 Push-to-Talk Testing Guide

## Vad som implementerats

### ✅ Komponenter
1. **VoicePushToTalkButton** (`src/components/voice/VoicePushToTalkButton.tsx`)
   - Robust push-to-talk med alla edge cases hanterade
   - Mouse + Touch + Keyboard support
   - SyncFusion Fluent2 styling (native button med SF CSS-klasser)

2. **AudioFeedback** (`src/services/audio/AudioFeedback.ts`)
   - Web Audio API för beeps
   - Start: 800Hz kort beep
   - Stop: 600Hz dubbel beep
   - Error: 200Hz lång beep

3. **PushToTalkAssistant** (`src/components/voice/PushToTalkAssistant.tsx`)
   - Komplett konversationsgränssnitt
   - Använder befintlig SpeechmaticsSTT
   - Integrerad med ClaudeConversation
   - Conversation history display

### ✅ Context Förbättringar
1. **Prompt Caching** (90% kostnadsbesparing)
   - Backend stödjer `system` som array med `cache_control`
   - Frontend skickar cacheable system prompt

2. **Förbättrad System Prompt**
   - Visar `estimated_duration` på tasks
   - Tydligare workflow för kalenderbokning
   - Instruktioner att använda `list_calendar_events` INNAN bokning

---

## 🧪 Hur man testar

### Steg 1: Starta utvecklingsservern
```bash
npm run dev
```

### Steg 2: Navigera till test-sidan
```
http://localhost:5173/voice-test
```

### Steg 3: Test på Desktop

#### Test 1: Mouse Push-to-Talk
1. **Håll in** vänster musknapp på den runda knappen
2. Prata: "Vad ska jag göra idag?"
3. **Släpp** musknappen
4. Förväntat:
   - 🔊 Beep när du trycker ner
   - 🔊 Dubbel beep när du släpper
   - Live transcript visas medan du pratar
   - Efter släpp: "Tänker..." visas
   - AI-svar kommer efter ~2-3s

#### Test 2: Keyboard Push-to-Talk
1. **Håll in** Space-tangenten
2. Prata: "Skapa task: Ring John"
3. **Släpp** Space
4. Förväntat: Samma som Mouse-test

#### Test 3: Edge Case - Mouse Leave
1. Håll in musknapp
2. Prata
3. **Dra musen UTANFÖR knappen** medan du fortfarande håller ner
4. Släpp musknapp utanför
5. Förväntat:
   - ✅ Inspelning STOPPAR när musen lämnar knappen
   - Detta förhindrar "evigt lyssnande" om något går fel

#### Test 4: Edge Case - Right Click
1. Håll in musknapp och prata
2. **Högerklicka** under inspelning
3. Förväntat:
   - ✅ Context menu blockeras
   - ✅ Inspelning stoppar
   - Ingen krasch

---

### Steg 4: Test på Mobil

#### Android (Chrome)
1. Öppna `http://[din-ip]:5173/voice-test`
2. **Håll finger** på knappen
3. Prata: "Vad har jag bokat imorgon?"
4. **Lyft finger**
5. Förväntat:
   - 🔊 Beep (hörs om volym på)
   - 📳 Vibration (känns i handen)
   - Live transcript visas
   - Dubbel beep + vibration när du släpper

#### iOS (Safari)
1. Samma test som Android
2. **OBS:** Vibration fungerar INTE på iOS (Apple-begränsning)
3. Förväntat:
   - 🔊 Beeps fungerar
   - ❌ Ingen vibration (normalt)

#### Test 5: Edge Case - Touch Cancel (Mobil)
1. Håll finger på knapp
2. **Swipea bort från knappen** (eller dra upp Control Center)
3. Förväntat:
   - ✅ Inspelning stoppar automatiskt
   - Ingen evig inspelning

#### Test 6: Edge Case - App Switch (Mobil)
1. Håll finger och prata
2. **Växla till annan app** (Home button)
3. Återvänd till MinPrio
4. Förväntat:
   - ✅ Inspelning har stoppat
   - Ingen background-inspelning

---

## ✅ Success Criteria

### Grundläggande funktionalitet
- [ ] Mouse push-to-talk fungerar (Chrome, Safari)
- [ ] Keyboard push-to-talk fungerar (Space key)
- [ ] Touch push-to-talk fungerar (Android, iOS)
- [ ] Audio beeps hörs (start + stop)
- [ ] Live transcript visas medan man pratar
- [ ] Transcript skickas automatiskt när man släpper

### Edge Cases
- [ ] Mouse leave stoppar inspelning
- [ ] Touch cancel stoppar inspelning
- [ ] Right-click blockeras
- [ ] Kan inte starta ny inspelning under processing
- [ ] Space key fungerar INTE när man skriver i textfält

### Conversation Flow
- [ ] Kan genomföra 3+ turns konversation
- [ ] Conversation history visas korrekt
- [ ] Claude får kontext (kalender, tasks)
- [ ] Claude svarar intelligent baserat på CPM
- [ ] "Rensa"-knappen fungerar

### Performance
- [ ] Total latens <3s från släpp till svar
- [ ] Ingen memory leak efter 10+ recordings
- [ ] WebSocket reconnectar om frånkopplad
- [ ] Ingen krasch vid mikrofon-nekad

---

## 🐛 Common Issues & Lösningar

### Problem: Ingen audio feedback
**Orsak:** Browser blockerar Web Audio utan user interaction
**Lösning:** Första gången knappen klickas kan audio vara tyst. Detta är normalt.

### Problem: "Mikrofon-åtkomst nekad"
**Orsak:** Användaren nekade mikrofon-permission
**Lösning:**
1. Chrome: Settings → Site Settings → Microphone → Allow
2. Safari: Preferences → Websites → Microphone → Allow

### Problem: WebSocket connection failed
**Orsak:** Backend inte igång eller CORS-fel
**Lösning:**
```bash
# Verifiera backend
curl https://prio-backend.onrender.com/health

# Lokal test
cd server && npm run dev
```

### Problem: Inspelning fortsätter efter släpp
**Orsak:** Event handlers inte registrerade korrekt
**Check:** Console borde visa "🛑 Stop recording" när du släpper

### Problem: Ingen transcript efter inspelning
**Orsak:** Speechmatics WebSocket timeout eller inget ljud detekterat
**Lösning:**
- Prata högre/tydligare
- Verifiera mikrofon fungerar (testa i annat program)
- Kolla Console för WebSocket errors

### Problem: Space key startar inspelning när man skriver
**Fix:** Already handled! Space ignoreras om focus är i input/textarea.

---

## 📊 Performance Metrics att logga

När du testar, notera:

```javascript
// Lägg till i console:
console.time('STT');
// ... vid släpp
console.timeEnd('STT'); // → borde vara ~300-500ms

console.time('Claude');
// ... vid Claude call
console.timeEnd('Claude'); // → borde vara ~800-1500ms med Haiku caching

console.time('Total');
// ... från släpp till svar
console.timeEnd('Total'); // → mål: <3000ms (3s)
```

---

## 🚀 Nästa Steg efter lyckad testning

Om push-to-talk fungerar bra:

1. **Implementera TTS** (Browser SpeechSynthesis först)
2. **Lägg till i Sidebar** som en länk (eller FAB)
3. **Optimera context caching** (2 min TTL)
4. **Implementera Haiku 4.5** (67% billigare, 2x snabbare)
5. **Streama Claude responses** (första ord efter 1s)

---

## 📱 Testning Checklist

### Desktop
- [ ] Chrome (macOS)
- [ ] Safari (macOS)
- [ ] Chrome (Windows)
- [ ] Edge (Windows)

### Mobil
- [ ] Chrome (Android)
- [ ] Safari (iOS)

### Scenarios
- [ ] Snabb query: "Vad ska jag göra?"
- [ ] Task creation: "Skapa task: Ring John kl 14"
- [ ] Kalender: "Vad har jag bokat imorgon?"
- [ ] Multi-turn: Fråga → Svar → Följdfråga → Svar
- [ ] Error recovery: Prata inget → släpp → bra felmeddelande

---

## 🎯 Definition of Done

Push-to-talk är **klar för production** när:
- ✅ Fungerar på Chrome desktop + mobil
- ✅ Alla edge cases hanterade (mouse leave, touch cancel)
- ✅ Audio feedback fungerar
- ✅ Latens <3s per turn
- ✅ Ingen krasch efter 20+ recordings
- ✅ Användaren kan genomföra en meningsfull konversation

**Om detta fungerar: Voice assistant foundation är klar! 🎉**
