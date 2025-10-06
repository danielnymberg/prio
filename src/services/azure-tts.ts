const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://prio-backend.onrender.com';

interface AzureTTSConfig {
  voice?: string; // 'sv-SE-SofieNeural' (kvinna) eller 'sv-SE-MattiasNeural' (man)
  format?: string; // 'audio-16khz-32kbitrate-mono-mp3', etc.
}

export class AzureTTS {
  private voice: string;
  private format: string;
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;

  constructor(config: AzureTTSConfig = {}) {
    this.voice = config.voice || 'sv-SE-SofieNeural';
    this.format = config.format || 'audio-16khz-32kbitrate-mono-mp3';
  }

  async speak(text: string): Promise<void> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/azure-tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: this.voice,
          format: this.format,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const data = await response.json();

      // Decode base64 audio data
      const audioData = Uint8Array.from(atob(data.audioData), c => c.charCodeAt(0));

      // Play audio using Web Audio API
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioBuffer = await this.audioContext.decodeAudioData(audioData.buffer);

      // Stop any currently playing audio
      if (this.currentSource) {
        this.currentSource.stop();
      }

      this.currentSource = this.audioContext.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.audioContext.destination);

      return new Promise<void>((resolve, reject) => {
        if (!this.currentSource) {
          reject(new Error('Audio source not initialized'));
          return;
        }

        this.currentSource.onended = () => resolve();

        // Add error handling
        const handleError = () => reject(new Error('Audio playback failed'));
        this.currentSource.addEventListener('error', handleError);

        try {
          this.currentSource.start();
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error('Azure TTS error:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to synthesize speech'
      );
    }
  }

  async speakSSML(ssml: string): Promise<void> {
    // For now, extract text from SSML and use speak()
    // In the future, we can add SSML support to backend endpoint
    const textContent = ssml.replace(/<[^>]*>/g, '');
    return this.speak(textContent);
  }

  stop() {
    // Stop currently playing audio
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Utility för SSML med prosodi
export function createSSML(text: string, options?: {
  rate?: string; // '0.9' = lite långsammare
  pitch?: string; // 'medium' | 'high' | 'low'
  emphasis?: 'strong' | 'moderate' | 'none';
}): string {
  const rate = options?.rate || '1.0';
  const pitch = options?.pitch || 'medium';

  return `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="sv-SE">
      <voice name="sv-SE-SofieNeural">
        <prosody rate="${rate}" pitch="${pitch}">
          ${text}
        </prosody>
      </voice>
    </speak>
  `;
}