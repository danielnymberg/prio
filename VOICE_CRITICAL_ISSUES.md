# 🚨 Voice Assistant - Kritiska Problem (2025-10-26)

## 🎯 MÅLSÄTTNING

**PRIMÄR:** Minimera onödig latens på UI-sidan
**SEKUNDÄR:** Robust push-to-talk för bilkörning (hands-free)
**TERTIÄR:** Branschledande latens (nice-to-have)

---

## ✅ VAD SOM FUNGERAR (verifierat med test)

### 1. **Mouse Hold-to-Talk Events** ✅
**Fil:** `VoicePushToTalkButton.tsx`
- Håll musknapp → `🖱️ MOUSE DOWN event`
- Släpp musknapp → `🖱️ MOUSE UP event`
- Button blir blå under recording
- Native `<div role="button">` med SF-klasser

**Console-bevis:**
```
🖱️ MOUSE DOWN event {button: 0}
🎤 Start recording
🖱️ MOUSE UP event {button: 0}
🛑 Stop recording
```

### 2. **Space Key Hold-to-Talk** ✅
- Space fungerar samma som mouse
- Ignoreras korrekt i input-fält

### 3. **Speechmatics Transcript Accumulation** ✅
**Fil:** `speechmatics-stt.ts`
- WebSocket connection fungerar
- AddTranscript messages tas emot
- metadata.transcript används (korrekt spacing för svenska)
- accumulated transcript byggs upp korrekt

**Console-bevis:**
```
✅ Accumulated: Tjena!
✅ Accumulated: Tjena! Vi måste
✅ Accumulated: Tjena! Vi måste gå igenom
```

### 4. **Persistent WebSocket** ✅
- WebSocket återanvänds mellan turns
- Ingen reconnect-overhead från turn 2+

**Console-bevis:**
```
Turn 1: 🔌 Opening new WebSocket connection
Turn 2: 🔄 Reusing existing WebSocket connection
```

### 5. **Claude Streaming** ✅
**Fil:** `claude-conversation.ts`, `server/index.js`
- SSE streaming via `/api/claude-stream`
- Text chunks kommer löpande från Claude
- Haiku 4.5 används

**Console-bevis:**
```
⚡ Using Haiku 4.5 for quick response
🔊 Queuing sentence: [text...]
```

### 6. **TTS Speed Settings UI** ✅
**Fil:** `SettingsView.tsx`
- "Rösthastighet" sektion finns i Settings
- RadioButtons: Långsam (1.0x) / Normal (1.2x) / Snabb (1.5x)
- Sparas i localStorage

### 7. **TTS Queue System** ✅
**Fil:** `SimpleTTS.ts`
- speakQueued() fungerar
- Meningar köas och spelas i ordning

---

## 🔴 KRITISKA PROBLEM (verifierat med test)

### **PROBLEM 1: Mikrofon STÄNGS INTE AV vid knappsläpp** 🚨

**Symptom:**
```
Släpp knapp → Mikrofon FORTSÄTTER lyssna
Console: 🎤 Pausing microphone (keeping stream for reuse)
MEN: AudioContext + MediaStream är INTE pausad!
```

**Orsak:**
`stopMicrophone()` disconnectar audio nodes men:
- ❌ MediaStream tracks INTE stoppade (behålls för reuse)
- ❌ Audio fortsätter skickas via WebSocket (isStreaming check fungerar ej)

**Console-bevis:**
```
🎤 Pausing microphone (keeping stream for reuse)
[Audio fortsätter skickas - AudioAdded messages fortsätter!]
```

**Fix behövd:**
```typescript
stopMicrophone() {
  // Pausa AudioContext (om det ens går?)
  // ELLER: Sätt flag som hindrar onaudioprocess från att skicka
  // ELLER: Stäng MediaStream tracks temporärt
}
```

---

### **PROBLEM 2: Bara sista ordet skickas till Claude** 🚨

**Symptom:**
```
Du säger: "Tjena! Vi måste gå igenom projektet"
Accumulated: "Tjena! Vi måste gå igenom"  ✅ Korrekt!
Skickas till Claude: "igenom"  ❌ Bara sista ordet!
```

**Orsak:**
`PushToTalkAssistant.tsx` rad 200-201:
```typescript
const fullTranscript = (finalText + partialText).trim();
// ❌ Använder STATE (partialText = sista partial)
// ✅ Accumulated finns i callback men används EJ!
```

**Console-bevis:**
```
✅ Accumulated: Tjena! Vi måste gå igenom  ← RÄTT text här!
📝 Transcript: {text: 'igenom', isFinal: true}  ← Callback skickar!
✅ Full transcript: igenom  ← State har bara sista!
🤖 Streaming from Claude: igenom  ← FEL text till Claude!
```

**Fix behövd:**
```typescript
// Ta bort state-baserad fullTranscript
// Använd text från callback med isFinal: true direkt!

// I handleRecordingStop:
// Vänta på callback med isFinal: true
// DEN innehåller hela accumulated
// Skicka till Claude direkt
```

---

### **PROBLEM 3: User's text visas INTE i UI** 🚨

**Symptom:**
Chattfönstret innehåller bara AI-svar, inte vad DU sa.

**Orsak:**
User message läggs inte till i `messages` state före Claude-anrop.

**Fix behövd:**
```typescript
// I sendToClaude FÖRE streaming:
setMessages(prev => [...prev, {
  role: 'user',
  text: userMessage,
  timestamp: new Date()
}]);
```

---

### **PROBLEM 4: EndOfTranscript kommer ALDRIG** 🚨

**Symptom:**
```
📤 Sending EndOfStream
⏳ Waiting for EndOfTranscript...
[2s timeout]
⏱️ Timeout waiting for EndOfTranscript
```

**Orsak:**
EndOfTranscript skickas endast när SESSION AVSLUTAS helt (vid disconnect).
För persistent sessions mellan turns kommer det ALDRIG.

**Fix behövd:**
```typescript
// Använd fixed delay istället:
this.ws.send(JSON.stringify({message: 'EndOfStream', last_seq_no}));
await new Promise(resolve => setTimeout(resolve, 800));  // 800ms buffert
// Nu har Speechmatics hunnit processa sista ljuden
this.onTranscriptCallback?.(this.accumulatedTranscript, true);
```

---

### **PROBLEM 5: Markdown syns i UI + TTS strippar fel**

**Symptom UI:**
```
Claude svarar: "**Gå igenom dina uppgifter?**"
UI visar: "**Gå igenom dina uppgifter?**"  ← Stjärnor syns
```

**Symptom TTS:**
```
SimpleTTS strippar ** → Tom text!
Console: "Text blev tom efter emoji-stripping"
TTS: [tystnad]
```

**Orsak:**
```typescript
// SimpleTTS.ts rad 34:
.replace(/\*\*/g, '')  // ❌ Tar bort ** men förlorar texten!
// "**bold**" → "" (tom!)
```

**Fix behövd:**
```typescript
// Ta bort ** men BEHÅLL texten:
.replace(/\*\*(.+?)\*\*/g, '$1')  // "**bold**" → "bold"
.replace(/\*(.+?)\*/g, '$1')      // "*italic*" → "italic"
```

**För UI - rendera markdown korrekt:**
```typescript
// ELLER: Låt markdown finnas i UI (ser bättre ut!)
// TTS strippar det, UI renderar som bold/italic
```

---

### **PROBLEM 6: 1-3 ord försvinner om man börjar prata direkt**

**Symptom:**
- Tryck knapp → Börja prata DIREKT
- Första 1-3 orden försvinner

**Orsak:**
WebSocket connection + audio streaming tar 500-1000ms att starta.

**Fix behövd:**
- Audio feedback (beep) när REDO att prata
- Visuell feedback (ikon pulserar när redo)

---

### **PROBLEM 7: TTS Stop-knapp kanske borta?**

**Status:** Osäker - behöver verifieras i nästa session

**Fix om borta:**
Se rad 482-498 i `PushToTalkAssistant.tsx` - ska finnas där.

---

## 🎯 PRIORITERAD FIXLISTA FÖR NÄSTA SESSION

### **KRITISKT (måste fixas):**
1. 🔴 Stoppa mikrofon vid knappsläpp (MediaStream tracks måste pausas/stoppas)
2. 🔴 Använd callback accumulated (inte state partialText)
3. 🔴 Visa user message i UI
4. 🔴 Fixed 800ms delay efter EndOfStream (WhatsApp-stil)

### **VIKTIGT (stor UX-förbättring):**
5. 🟡 Audio feedback när redo att prata
6. 🟡 Fixa TTS markdown stripping (behåll text!)

### **NICE-TO-HAVE:**
7. 🟢 Verifiera TTS stop-knapp synlig
8. 🟢 Touch-support (mobil)

---

## 📊 NUVARANDE COMMITS (opushade ändringar)

**Lokala ändringar (INTE pushade till Render):**
- SettingsView.tsx: TTS speed UI
- speechmatics-stt.ts: EndOfTranscript väntan (fungerar ej)
- SimpleTTS.ts: getTTSRate() från localStorage

**Senaste pushade commit:**
- 6735560 - Fix: conversation_config nesting

**Status:** Buggig version på produktion, lokala ändringar inte pushade.

---

## 🧪 TEST-RESULTAT (från lokal körning)

**URL:** http://localhost:5174/

**Test 1: Håll → Prata "Tjena! Vi måste gå igenom projektet" → Släpp**

**Console:**
```
✅ Accumulated: Tjena! Vi måste gå igenom
⏱️ Timeout waiting for EndOfTranscript (2s)
📝 Transcript: {text: 'Tjena! Vi måste gå', isFinal: true}  ← Callback
✅ Full transcript: igenom  ← State (FEL!)
🤖 Streaming from Claude: igenom  ← Bara sista ordet!
```

**Resultat:**
- ❌ Bara "igenom" skickades till Claude
- ❌ Mikrofon fortsatte lyssna efter släpp
- ❌ User's text "Tjena! Vi måste gå igenom" försvann från UI

---

## 💡 ENKEL FIX-STRATEGI (för nästa session)

### **FIX 1: stopMicrophone - STÄNG AudioContext**

**speechmatics-stt.ts stopMicrophone():**
```typescript
private stopMicrophone() {
  // Disconnect nodes
  this.processor?.disconnect();
  this.source?.disconnect();

  // KRITISKT: STÄNG AudioContext (pausar all audio processing)
  if (this.audioContext && this.audioContext.state !== 'closed') {
    this.audioContext.close();
    this.audioContext = null;  // Tvinga recreate nästa gång
  }

  // Eller om vi vill reuse: suspend istället för close
  // this.audioContext.suspend();
}
```

### **FIX 2: Använd callback accumulated**

**PushToTalkAssistant.tsx:**
```typescript
// Ta bort state-baserad kombination av finalText + partialText
// Lägg till listener för callback med isFinal: true

const handleRecordingStart = () => {
  let accumulatedFromCallback = '';

  await sttRef.current.startListening((text, isFinal) => {
    if (isFinal) {
      accumulatedFromCallback = text;  // ✅ HELA texten!
    } else {
      setPartialText(text);  // Bara för live-visning
    }
  });
};

const handleRecordingStop = () => {
  await sttRef.current.stopListening(true);
  // accumulatedFromCallback innehåller HELA texten
  sendToClaude(accumulatedFromCallback);
};
```

### **FIX 3: 800ms delay**

**speechmatics-stt.ts:**
```typescript
async stopListening(sendAccumulated = true) {
  this.stopMicrophone();  // Mikrofon AV

  this.ws.send(JSON.stringify({message: 'EndOfStream', last_seq_no}));

  // Fixed delay för Speechmatics att processa sista ljuden
  await new Promise(resolve => setTimeout(resolve, 800));

  if (sendAccumulated && this.accumulatedTranscript.trim()) {
    this.onTranscriptCallback?.(this.accumulatedTranscript, true);
    this.accumulatedTranscript = '';
  }

  // WebSocket öppen för nästa turn
}
```

---

## 🔧 TEKNISK ARKITEKTUR (nuläge)

**Flow:**
```
PushToTalkAssistant (UI)
  ↓
SpeechmaticsSTT (WebSocket wrapper)
  ↓
Backend Proxy (server/index.js)
  ↓
Speechmatics Real-time API
  ↓
Backend Proxy
  ↓
Frontend: Accumulated transcript
  ↓
ClaudeConversation (chatStreaming)
  ↓
Backend /api/claude-stream
  ↓
Anthropic Streaming API
  ↓
SimpleTTS (speakQueued)
```

**Backend config:**
- `max_delay: 1.0` (snabb processing)
- `language: 'sv'` (svenska)
- `enable_partials: true` (live transcript)

---

## 📝 COMMITS FRÅN DENNA SESSION

```
d46993e - Ersätt VoiceInterface med PushToTalkAssistant
9dd11b9 - Fix: Push-to-Talk Button Events
619be2b - Feat: TTS Stop-knapp + Strippa Emojis
73366e5 - Fix: Transcript spacing (metadata.transcript)
935eccc - Feat: Streaming Responses + Conversational AI
9f7c7c8 - CRITICAL FIX: EndOfStream + Vänta EndOfTranscript
a1eaee2 - Feat: Persistent WebSocket
7f63318 - Feat: TTS Speed Settings
6735560 - Fix: conversation_config nesting  ← SENASTE PUSH
```

**Opushade lokala ändringar:**
- SettingsView.tsx: TTS speed UI
- speechmatics-stt.ts: EndOfTranscript-logik (fungerar EJ)
- SimpleTTS.ts: getTTSRate()
- server/index.js: conversation_config borttagen

---

## ❓ OBESVARADE FRÅGOR (för nästa session)

1. **Markdown i UI:** Behålla `**bold**` visuellt eller strippa?
2. **Delay efter EndOfStream:** 500ms, 800ms eller 1000ms?
3. **Audio feedback:** Beep när redo att prata?
4. **Touch-support:** Prioritet för mobil-testning?

---

## 🧪 TESTINSTRUKTIONER FÖR NÄSTA SESSION

**Setup:**
```bash
# Terminal 1:
cd server && node index.js

# Terminal 2:
npm run dev
# → http://localhost:5174/
```

**Test 1: Verifiera mikrofonproblem**
```
Håll knapp → Prata "Test ett två tre" → Släpp
Console: Kolla om AudioAdded fortsätter efter släpp
Förväntat: INGA AudioAdded efter släpp
Nuläge: AudioAdded fortsätter ❌
```

**Test 2: Verifiera accumulated används**
```
Console: Jämför "Accumulated" vs "Full transcript"
Förväntat: Samma text
Nuläge: Accumulated har allt, Full har bara sista ordet ❌
```

**Test 3: Verifiera user message i UI**
```
Säg något → Kolla chattfönster
Förväntat: Både din text OCH AI-svar
Nuläge: Bara AI-svar ❌
```

---

## 💡 REKOMMENDERAD APPROACH NÄSTA SESSION

**ENKEL lösning (snabb att implementera):**

1. **stopMicrophone: Stäng AudioContext** (tvinga ny varje turn)
2. **800ms delay efter EndOfStream** (WhatsApp-stil)
3. **Använd callback för accumulated** (refactor state-hantering)
4. **Lägg till user message i UI**
5. **Fixa TTS markdown: `.replace(/\*\*(.+?)\*\*/g, '$1')`**

**Testbar inom 30 min!**

---

**ELLER robust lösning (tar längre tid):**

1. Gå tillbaka till "en WebSocket per turn"
2. EndOfTranscript kommer garanterat
3. Enklare state-hantering
4. +200ms latens men funkar 100%

**Rekommendation: ENKEL först, om den inte funkar → robust**
