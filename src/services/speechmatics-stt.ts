export class SpeechmaticsSTT {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private onTranscriptCallback?: (text: string, isFinal: boolean) => void;
  private accumulatedTranscript: string = ''; // Accumulate final transcript parts
  private onEndOfTranscriptCallback?: () => void;  // Callback för EndOfTranscript (SM's ACK på EndOfStream vid session-slut)
  private lastSeqNo: number = 0;
  private isStreaming: boolean = false;
  private lastAddTranscriptTime: number = 0; // Timestamp för sista AddTranscript (för smart wait)

  constructor() {}

  async startListening(onTranscript: (text: string, isFinal: boolean) => void) {
    this.onTranscriptCallback = onTranscript;
    this.accumulatedTranscript = ''; // Reset för ny utterance
    this.lastAddTranscriptTime = 0; // Reset för ny turn
    this.isStreaming = true;

    try {
      // Återanvänd stream om den finns
      if (!this.stream) {
        // 1. Få mikrofon access första gången
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
          }
        });
      }

      // Återanvänd WebSocket om den finns och är öppen
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.log('🔌 Opening new WebSocket connection');
        // 2. Koppla till vår backend som proxar till Speechmatics
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'wss://prio-backend.onrender.com';
        this.ws = new WebSocket(backendUrl);

      this.ws.onopen = () => {
        console.log('🔌 WebSocket opened to backend');
        // Backend hanterar StartRecognition automatiskt med rätt auth
        // Vi bara startar audio streaming
        this.startAudioStream(this.stream!);
      };

      this.ws.onmessage = (event) => {
        // Ignorera binära meddelanden (audio echoes från Speechmatics)
        if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
          console.log('🔇 Ignored binary message');
          return;
        }

        try {
          const data = JSON.parse(event.data);

          // OMFATTANDE LOGGING - se ALLT från Speechmatics
          if (data.message === 'EndOfStream' || data.message === 'EndOfUtterance' || data.message === 'EndOfTranscript') {
            console.log('🔴 KRITISKT MESSAGE:', data.message, JSON.stringify(data));
          } else if (data.message === 'AddTranscript') {
            console.log('📨 AddTranscript:', data.metadata?.transcript);
          } else if (data.message !== 'AudioAdded' && data.message !== 'AddPartialTranscript') {
            console.log('📨 SM:', data.message, data);
          }

          // Track sequence numbers från AudioAdded
          if (data.message === 'AudioAdded' && data.seq_no) {
            this.lastSeqNo = data.seq_no;
          }

          if (data.message === 'AddPartialTranscript') {
            // Partial (live transcription) - använd metadata.transcript
            console.log('📝 Partial transcript:', data.metadata.transcript);
            this.onTranscriptCallback?.(data.metadata.transcript, false);
          } else if (data.message === 'AddTranscript') {
            // Final transcription - Speechmatics skickar ett AddTranscript för varje ord/fras
            // KRITISKT: Använd metadata.transcript (har redan korrekt spacing + svenska sammansättningar!)
            const newText = data.metadata?.transcript || '';

            if (newText) {
              // metadata.transcript har redan korrekt spacing och trailing space
              this.accumulatedTranscript += newText;
              this.lastAddTranscriptTime = Date.now(); // Track timing för smart wait
              console.log('✅ Accumulated:', this.accumulatedTranscript);
            }

            // EndOfUtterance används ej (disabled för push-to-talk)
          } else if (data.message === 'EndOfTranscript') {
            // SM's ACK på EndOfStream - session-slut (används bara vid disconnect)
            console.log('✅ EndOfTranscript received - session klar');

            // Trigga callback för session-slut
            this.onEndOfTranscriptCallback?.();
          } else if (data.message === 'Error') {
            console.error('Speechmatics error:', data);
            const errorMsg = data.reason || 'Okänt fel från Speechmatics';

            // Trigga callback för att avbryta väntan
            if (this.onEndOfTranscriptCallback) {
              this.onEndOfTranscriptCallback();
            }

            throw new Error(`Speechmatics: ${errorMsg}`);
          } else if (data.message === 'Warning') {
            console.warn('Speechmatics warning:', data);
          }
        } catch (err) {
          // Ignorera parse-fel för icke-JSON meddelanden
          console.debug('Non-JSON message from server:', event.data);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        throw new Error('Kunde inte ansluta till röstigenkänning');
      };

        this.ws.onclose = (event) => {
          // När WebSocket stängs helt (endast vid app unmount)
          if (this.accumulatedTranscript.trim()) {
            console.log('🏁 WebSocket closing - sending accumulated:', this.accumulatedTranscript);
            this.onTranscriptCallback?.(this.accumulatedTranscript.trim(), true);
            this.accumulatedTranscript = '';
          }

          if (!event.wasClean) {
            console.error('WebSocket closed unexpectedly:', event);
          }
        };
      } else {
        // WebSocket redan öppen - återanvänd för ny turn!
        console.log('🔄 Reusing existing WebSocket connection');
        this.startAudioStream(this.stream!);
      }

    } catch (error) {
      console.error('Failed to start listening:', error);
      throw error;
    }
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

    // Skapa nya nodes (måste göras varje gång efter disconnect)
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (this.isStreaming && this.ws?.readyState === WebSocket.OPEN) {
        const float32Audio = e.inputBuffer.getChannelData(0);
        const int16Audio = this.convertFloat32ToInt16(float32Audio);
        this.ws.send(int16Audio);
      }
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    console.log('🎵 Audio streaming started');
  }

  private convertFloat32ToInt16(buffer: Float32Array): Int16Array {
    const int16 = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
  }

  async stopListening(sendAccumulated: boolean = true): Promise<void> {
    console.log('🛑 stopListening called');

    // STEG 1: Stoppa mikrofon OMEDELBART
    this.stopMicrophone();
    const micStoppedAt = Date.now(); // Referenspunkt för all timing!

    // STEG 2: Smart wait från mic-stop
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Initial wait för in-flight audio (500ms)
      console.log('⏳ Waiting 500ms for in-flight audio...');
      await new Promise(r => setTimeout(r, 500));

      // Smart wait: Vänta tills 300ms sen sista AddTranscript
      console.log('⏳ Smart wait: Waiting until 300ms since last AddTranscript...');
      while (true) {
        const timeSinceLastAdd = Date.now() - this.lastAddTranscriptTime;

        if (timeSinceLastAdd > 300) {
          // 300ms utan ny AddTranscript - SM är klar!
          console.log('✅ No AddTranscript for 300ms - stream complete!');
          break;
        }

        if (Date.now() - micStoppedAt > 2000) {
          // Max 2s totalt från mic-stop - säkerhetsnät
          console.warn('⏱️ Max wait time (2000ms from mic stop) reached - using accumulated');
          break;
        }

        await new Promise(r => setTimeout(r, 100)); // Checka var 100ms
      }

      const totalWaitTime = Date.now() - micStoppedAt;
      console.log(`⏱️ Smart wait completed in ${totalWaitTime}ms from mic stop`);

      // Skicka accumulated transcript
      if (sendAccumulated && this.accumulatedTranscript.trim()) {
        this.onTranscriptCallback?.(this.accumulatedTranscript.trim(), true);
        this.accumulatedTranscript = '';
      }
    }

    // WebSocket FÖRBLIR ÖPPEN för nästa turn! ✅
    console.log('🔌 WebSocket kept open for next turn');
  }

  private closeTimer?: NodeJS.Timeout;

  private stopMicrophone() {
    // GUARD: Förhindra dubbla anrop (mouse up + key up + touch end)
    if (!this.processor && !this.source) {
      console.log('⚠️ Microphone already stopped');
      return;
    }

    console.log('🎤 Pausing microphone');

    // INSTANT: Blockera processing (0ms)
    if (this.processor) {
      this.processor.onaudioprocess = null;  // Stoppa callback
      this.processor.disconnect();            // Disconnect node från audio graph
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    // KRITISKT: Flagga som inte-streaming
    this.isStreaming = false;

    // Suspend för snabb restart (inte close!)
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
      console.log('🔇 AudioContext suspended');
    }

    // Optional: Close efter 30s inaktivitet (frigör resurser)
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      if (this.audioContext && this.audioContext.state !== 'closed') {
        console.log('🗑️ Closing AudioContext after 30s inactivity');
        this.audioContext.close();
        this.audioContext = null;
      }
    }, 30000);
  }

  /**
   * Disconnect - stäng WebSocket och release alla resurser
   * Anropas endast vid app unmount
   */
  async disconnect(): Promise<void> {
    // Guard: Om inget att disconnecta, return direkt
    if (!this.ws && !this.stream && !this.audioContext) {
      return;
    }

    console.log('🔌 Disconnecting STT session completely');

    // Stoppa mic om den stremar
    if (this.isStreaming) {
      this.stopMicrophone();
      this.isStreaming = false;
    }

    // Skicka EndOfStream till Speechmatics
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('📤 Sending EndOfStream (session ending)');
      this.ws.send(JSON.stringify({
        message: 'EndOfStream',
        last_seq_no: this.lastSeqNo
      }));

      // Vänta på EndOfTranscript (eller timeout)
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('⏱️ Timeout waiting for EndOfTranscript (2500ms)');
          resolve();
        }, 2500);

        this.onEndOfTranscriptCallback = () => {
          console.log('✅ EndOfTranscript - session closed');
          clearTimeout(timeout);
          resolve();
        };
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
    this.onEndOfTranscriptCallback = undefined;
  }
}