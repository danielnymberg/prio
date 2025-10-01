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
    onError?.('Speech recognition not supported in this browser');
    return () => {};
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'sv-SE';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };

  recognition.onerror = (event: any) => {
    onError?.(event.error);
  };

  recognition.start();

  return () => recognition.stop();
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
  action: 'create' | 'update' | 'complete' | 'navigate' | 'unknown';
  params?: any;
} {
  // TODO: Implement NLP for Swedish voice commands
  // Examples:
  // - "skapa task fixa buggen" -> { action: 'create', params: { title: 'fixa buggen' } }
  // - "markera som klar" -> { action: 'complete' }
  // - "visa Q1" -> { action: 'navigate', params: { view: 'Q1' } }

  const lower = transcript.toLowerCase().trim();

  if (lower.startsWith('skapa') || lower.startsWith('ny task')) {
    const title = lower.replace(/^(skapa|ny task)\s+/, '');
    return { action: 'create', params: { title } };
  }

  if (lower.includes('markera som klar') || lower.includes('klar')) {
    return { action: 'complete' };
  }

  if (lower.includes('visa')) {
    const quadrantMatch = lower.match(/q[1-4]/i);
    if (quadrantMatch) {
      return { action: 'navigate', params: { quadrant: quadrantMatch[0].toUpperCase() } };
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
