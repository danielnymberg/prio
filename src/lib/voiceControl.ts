// TODO: Voice control integration
// This file will integrate with Anmärkt-beta's voice control functionality

// Speech-to-Text (STT) for task input
export function startSpeechRecognition(
  onResult: (text: string) => void,
  onError?: (error: string) => void
): () => void {
  // TODO: Integrate Deepgram or Web Speech API from Anmärkt-beta
  // Use existing voice recording infrastructure

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onError?.('Speech recognition stöds inte i denna webbläsare. Använd Chrome eller Edge.');
    return () => {};
  }

  const recognition = new SpeechRecognition();

  // Try Swedish first, fallback to English
  recognition.lang = 'sv-SE';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };

  recognition.onerror = (event: any) => {
    if (event.error === 'language-not-supported') {
      // Fallback to English
      recognition.lang = 'en-US';
      recognition.start();
      onError?.('Svenska stöds inte, använder engelska istället');
    } else {
      onError?.(event.error === 'no-speech'
        ? 'Inget ljud hördes. Försök igen.'
        : `Fel: ${event.error}`);
    }
  };

  try {
    recognition.start();
  } catch (error) {
    onError?.('Kunde inte starta röstinspelning. Kontrollera mikrofon-behörigheter.');
    return () => {};
  }

  return () => {
    try {
      recognition.stop();
    } catch (e) {
      // Already stopped
    }
  };
}

// Text-to-Speech (TTS) for notifications
export function speak(text: string, options?: {
  rate?: number;
  pitch?: number;
  voice?: SpeechSynthesisVoice;
}): void {
  // TODO: Consider Azure TTS for higher quality
  // Web Speech API works well for short notifications

  if (!('speechSynthesis' in window)) {
    console.warn('Text-to-speech not supported');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'sv-SE';
  utterance.rate = options?.rate || 1.0;
  utterance.pitch = options?.pitch || 1.0;

  if (options?.voice) {
    utterance.voice = options.voice;
  } else {
    // Try to find Swedish voice
    const voices = speechSynthesis.getVoices();
    const swedishVoice = voices.find(v => v.lang.startsWith('sv'));
    if (swedishVoice) utterance.voice = swedishVoice;
  }

  speechSynthesis.speak(utterance);
}

// Voice command parser
export function parseVoiceCommand(transcript: string): {
  action: 'create' | 'update' | 'complete' | 'navigate' | 'set_importance' | 'set_urgency' | 'unknown';
  params?: any;
} {
  const lower = transcript.toLowerCase().trim();

  // Create task commands
  if (lower.startsWith('skapa') || lower.startsWith('ny task') || lower.startsWith('lägg till')) {
    const title = lower.replace(/^(skapa|ny task|lägg till)(\s+task)?\s+/, '');
    return { action: 'create', params: { title } };
  }

  // Complete task commands
  if (lower.includes('markera som klar') || lower.includes('färdig') || lower.includes('klar')) {
    return { action: 'complete' };
  }

  // Importance commands
  const importanceMatch = lower.match(/viktighet\s+(\d+)/);
  if (importanceMatch) {
    const value = Math.min(10, Math.max(1, parseInt(importanceMatch[1])));
    return { action: 'set_importance', params: { importance: value } };
  }

  // Urgency commands
  const urgencyMatch = lower.match(/(brådskande|brådska)\s+(\d+)/);
  if (urgencyMatch) {
    const value = Math.min(10, Math.max(1, parseInt(urgencyMatch[2])));
    return { action: 'set_urgency', params: { urgency: value } };
  }

  // Navigate commands
  if (lower.includes('visa') || lower.includes('gå till')) {
    const quadrantMatch = lower.match(/q[1-4]/i);
    if (quadrantMatch) {
      return { action: 'navigate', params: { quadrant: quadrantMatch[0].toUpperCase() } };
    }
  }

  // Update task title
  if (lower.startsWith('ändra till') || lower.startsWith('byt namn till')) {
    const newTitle = lower.replace(/^(ändra till|byt namn till)\s+/, '');
    return { action: 'update', params: { title: newTitle } };
  }

  // Duration commands
  const durationPatterns = [
    { pattern: /(\d+)\s*minut/, unit: 1 },
    { pattern: /(\d+)\s*min/, unit: 1 },
    { pattern: /(\d+)\s*timm/, unit: 60 },
    { pattern: /(\d+)\s*h/, unit: 60 },
    { pattern: /kvart/, duration: 15 },
    { pattern: /halvtimme/, duration: 30 },
    { pattern: /en timme/, duration: 60 },
    { pattern: /två timmar/, duration: 120 },
    { pattern: /tre timmar/, duration: 180 },
    { pattern: /fyra timmar/, duration: 240 },
    { pattern: /halv dag/, duration: 240 },
    { pattern: /hel dag/, duration: 480 },
    { pattern: /snabb/, duration: 5 },
    { pattern: /kort/, duration: 30 },
    { pattern: /lång/, duration: 240 },
  ];

  for (const pattern of durationPatterns) {
    if ('duration' in pattern && pattern.pattern.test(lower)) {
      return { action: 'set_duration', params: { duration: pattern.duration } };
    }
    if ('unit' in pattern) {
      const match = lower.match(pattern.pattern);
      if (match) {
        const value = parseInt(match[1]) * pattern.unit;
        return { action: 'set_duration', params: { duration: value } };
      }
    }
  }

  return { action: 'unknown' };
}

// Notification with optional TTS
export function notifyWithVoice(message: string, enableVoice = false): void {
  // Show toast notification
  console.log('[Notification]', message);

  // TODO: Integrate with react-hot-toast

  // Optional voice output
  if (enableVoice) {
    speak(message);
  }
}
