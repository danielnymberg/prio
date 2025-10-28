export class AssemblyAISTT {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private onTranscriptCallback?: (text: string, isFinal: boolean) => void;
  private onEndOfUtteranceCallback?: () => void;
  private accumulatedTranscript: string = '';
  private isStreaming: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;

  constructor() {}

  async startListening(onTranscript: (text: string, isFinal: boolean) => void) {
    this.onTranscriptCallback = onTranscript;
    this.accumulatedTranscript = '';
    this.isStreaming = true;

    try {
      // Återanvänd stream om den finns
      if (!this.stream) {
        console.log('🎤 Requesting microphone access');
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
          }
        });
      }

      // Koppla WebSocket till AssemblyAI
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        await this.connectWebSocket();
      } else {
        console.log('🔄 Reusing existing WebSocket connection');
        this.startAudioStream(this.stream!);
      }

    } catch (error) {
      console.error('Failed to start listening:', error);
      throw error;
    }
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      console.log('🔌 Connecting to AssemblyAI...');

      try {
        // 1. Hämta temporary token från backend
        const { supabase } = await import('@/lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          reject(new Error('Not authenticated'));
          return;
        }

        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://prio-backend.onrender.com';

        console.log('🔑 Fetching temporary AssemblyAI token...');
        const tokenResponse = await fetch(`${BACKEND_URL}/api/assemblyai/token`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (!tokenResponse.ok) {
          throw new Error(`Failed to get AssemblyAI token: ${tokenResponse.status}`);
        }

        const { token, expires_in } = await tokenResponse.json();
        console.log(`✅ Got temporary token, expires in ${expires_in}s`);

        // 2. Använd temporary token i WebSocket
        const wsUrl = `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`;
        this.ws = new WebSocket(wsUrl);
      } catch (error) {
        console.error('Failed to get AssemblyAI token:', error);
        reject(error);
        return;
      }

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected to AssemblyAI');
        this.reconnectAttempts = 0;
        this.startAudioStream(this.stream!);
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.message_type === 'PartialTranscript') {
            // Partial transcript - visa live med grå text
            const partialText = data.text || '';
            console.log('📝 Partial:', partialText);

            // Skicka combined: previous finals + current partial
            const combined = this.accumulatedTranscript + partialText;
            this.onTranscriptCallback?.(combined, false);

          } else if (data.message_type === 'FinalTranscript') {
            // Final transcript - permanent text
            const finalText = data.text || '';
            console.log('✅ Final:', finalText);

            if (finalText) {
              // Lägg till space mellan meningar
              if (this.accumulatedTranscript && !this.accumulatedTranscript.endsWith(' ')) {
                this.accumulatedTranscript += ' ';
              }
              this.accumulatedTranscript += finalText;

              // Skicka som final
              this.onTranscriptCallback?.(this.accumulatedTranscript.trim(), true);

              // Trigga EndOfUtterance callback (händer efter varje final transcript)
              this.onEndOfUtteranceCallback?.();
            }

          } else if (data.message_type === 'SessionBegins') {
            console.log('🎬 AssemblyAI session started:', data.session_id);

          } else if (data.error) {
            console.error('❌ AssemblyAI error:', data.error);

            // Handle specific errors
            if (data.error.includes('insufficient funds')) {
              throw new Error('AssemblyAI: Insufficient API credits');
            } else if (data.error.includes('authentication')) {
              throw new Error('AssemblyAI: Invalid API key');
            } else {
              throw new Error(`AssemblyAI: ${data.error}`);
            }
          }
        } catch (err) {
          console.error('Error parsing AssemblyAI message:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        reject(new Error('Kunde inte ansluta till AssemblyAI'));
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);

        // Auto-reconnect om inte explicit stängd
        if (this.isStreaming && this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
          this.reconnectAttempts++;
          console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);
          setTimeout(() => {
            this.connectWebSocket().catch(console.error);
          }, 1000 * this.reconnectAttempts); // Exponential backoff
        }
      };
    });
  }

  private startAudioStream(stream: MediaStream) {
    // Återanvänd AudioContext om den finns
    if (!this.audioContext || this.audioContext.state === 'closed') {
      console.log('🎵 Creating new AudioContext');
      this.audioContext = new AudioContext({ sampleRate: 16000 });
    }

    // Resume om suspended (iOS fix)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Skapa nya nodes
    this.source = this.audioContext.createMediaStreamSource(stream);
    // AssemblyAI rekommenderar 100ms chunks = 1600 samples @ 16kHz
    // Men createScriptProcessor kräver power of 2, så använd 2048 (128ms @ 16kHz)
    this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (this.isStreaming && this.ws?.readyState === WebSocket.OPEN) {
        const float32Audio = e.inputBuffer.getChannelData(0);
        const int16Audio = this.convertFloat32ToInt16(float32Audio);

        // AssemblyAI förväntar sig base64-encoded PCM16
        const base64Audio = this.arrayBufferToBase64(int16Audio.buffer);
        this.ws.send(JSON.stringify({ audio_data: base64Audio }));
      }
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    console.log('🎵 Audio streaming started (100ms chunks)');
  }

  private convertFloat32ToInt16(buffer: Float32Array): Int16Array {
    const int16 = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
  }

  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async stopListening(): Promise<void> {
    console.log('🛑 stopListening called - pausing microphone');
    this.stopMicrophone();
    console.log('🔌 WebSocket kept open for next turn');
  }

  private closeTimer?: NodeJS.Timeout;

  private stopMicrophone() {
    if (!this.processor && !this.source) {
      console.log('⚠️ Microphone already stopped');
      return;
    }

    console.log('🎤 Pausing microphone');

    // Stoppa audio processing
    if (this.processor) {
      this.processor.onaudioprocess = null;
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    this.isStreaming = false;

    // Suspend AudioContext
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
      console.log('🔇 AudioContext suspended');
    }

    // Frigör mikrofon efter 10s inaktivitet
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      if (this.stream) {
        console.log('🎤 Releasing microphone after 10s inactivity');
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
    }, 10000);
  }

  async disconnect(): Promise<void> {
    if (!this.ws && !this.stream && !this.audioContext) {
      return;
    }

    console.log('🔌 Disconnecting AssemblyAI session');

    if (this.isStreaming) {
      this.stopMicrophone();
      this.isStreaming = false;
    }

    // Skicka terminate message till AssemblyAI
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('📤 Sending terminate signal');
      this.ws.send(JSON.stringify({ terminate_session: true }));

      // Vänta kort på graceful close
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 500);
        if (this.ws) {
          this.ws.onclose = () => {
            clearTimeout(timeout);
            resolve();
          };
        }
      });
    }

    this.cleanup();
  }

  private cleanup() {
    // Close WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Release microphone
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Clear callbacks
    this.onTranscriptCallback = undefined;
    this.onEndOfUtteranceCallback = undefined;
  }

  /**
   * Set callback for EndOfUtterance (compatibility med Speechmatics API)
   * AssemblyAI triggrar detta efter varje final transcript
   */
  setOnEndOfUtterance(callback: () => void) {
    this.onEndOfUtteranceCallback = callback;
  }
}
