import { SonioxClient } from '@soniox/speech-to-text-web';

export class SonioxSTT {
  private client: SonioxClient | null = null;
  private onTranscriptCallback?: (text: string, isFinal: boolean) => void;
  private onEndOfUtteranceCallback?: () => void;
  private accumulatedTranscript: string = '';
  private isActive: boolean = false; // Flag to prevent callbacks after stop

  constructor() {}

  async startListening(onTranscript: (text: string, isFinal: boolean) => void) {
    this.onTranscriptCallback = onTranscript;
    this.accumulatedTranscript = '';
    this.isActive = true; // Enable callbacks

    // KRITISKT: Avbryt gammal session om den finns
    if (this.client) {
      console.log('🔄 Cancelling old Soniox session');
      this.client.cancel();
      this.client = null;
    }

    try {
      // Hämta API key från backend
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://prio-backend.onrender.com';

      // Skapa Soniox client med async API key fetcher
      this.client = new SonioxClient({
        apiKey: async () => {
          console.log('🔑 Fetching Soniox config...');
          const response = await fetch(`${BACKEND_URL}/api/soniox/config`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });

          if (!response.ok) {
            throw new Error(`Failed to get Soniox config: ${response.status}`);
          }

          const { api_key } = await response.json();
          console.log('✅ Got Soniox API key');
          return api_key;
        },

        onStarted: () => {
          console.log('✅ Soniox transcription started');
        },

        onPartialResult: (result) => {
          // IGNORE callbacks if stopped
          if (!this.isActive) {
            console.log('🚫 Ignoring Soniox callback (stopped)');
            return;
          }

          // Build transcript from tokens
          let currentText = '';
          let hasFinal = false;

          for (const token of result.tokens) {
            currentText += token.text;

            if (token.is_final) {
              hasFinal = true;
            }
          }

          if (hasFinal) {
            // Final transcript
            console.log('✅ Final:', currentText);

            if (currentText.trim()) {
              // Soniox skickar flera finals med växande text - använd senaste direkt
              this.accumulatedTranscript = currentText.trim();

              // Check for end of utterance BEFORE sending to callback
              if (currentText.includes('<end>')) {
                // Strip <end> token from transcript
                const cleanText = this.accumulatedTranscript.replace('<end>', '').trim();

                // Send clean text
                this.onTranscriptCallback?.(cleanText, true);

                // Trigger end of utterance callback
                this.onEndOfUtteranceCallback?.();

                // Stop listening after utterance complete
                this.stopListening();
              } else {
                // Regular final (not end of utterance yet)
                this.onTranscriptCallback?.(this.accumulatedTranscript, true);
              }
            }
          } else if (currentText.trim()) {
            // Partial transcript - IGNORERA tomma
            console.log('📝 Partial:', currentText);

            // Send combined: previous finals + current partial
            const combined = this.accumulatedTranscript + currentText;
            this.onTranscriptCallback?.(combined, false);
          }
        },

        onFinished: () => {
          console.log('🏁 Soniox transcription finished');
        },

        onError: (status, message, errorCode) => {
          console.error('❌ Soniox error:', status, message, errorCode);
        }
      });

      // Start transcription with Swedish
      await this.client.start({
        model: 'stt-rt-preview',
        languageHints: ['sv'],
        enableEndpointDetection: true,  // Auto-detect when user stops talking
        audioConstraints: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        }
      });

      console.log('🎤 Soniox listening started');

    } catch (error) {
      console.error('Failed to start listening:', error);
      throw error;
    }
  }

  stopListening() {
    console.log('🛑 Stopping Soniox (immediate)');
    this.isActive = false; // DISABLE callbacks immediately
    if (this.client) {
      this.client.cancel();  // Immediate termination
    }
  }

  async resumeListening() {
    console.log('▶️ Resuming Soniox');
    // SDK doesn't support pause/resume - need to start new session
    if (this.onTranscriptCallback) {
      await this.startListening(this.onTranscriptCallback);
    }
  }

  resetTranscript() {
    this.accumulatedTranscript = '';
  }

  destroy() {
    console.log('🗑️ Destroying Soniox client');
    if (this.client) {
      this.client.cancel();  // Immediate termination
      this.client = null;
    }
  }

  setOnEndOfUtteranceCallback(callback: () => void) {
    this.onEndOfUtteranceCallback = callback;
  }
}
