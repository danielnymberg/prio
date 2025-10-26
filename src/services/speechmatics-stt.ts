export class SpeechmaticsSTT {
  private ws: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private onTranscriptCallback?: (text: string, isFinal: boolean) => void;
  private accumulatedTranscript: string = ''; // Accumulate final transcript parts
  private onEndOfTranscriptCallback?: () => void;
  private lastSeqNo: number = 0;

  constructor() {}

  async startListening(onTranscript: (text: string, isFinal: boolean) => void) {
    this.onTranscriptCallback = onTranscript;

    try {
      // 1. Få mikrofon access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        }
      });

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
          console.log('📨 Received message:', data.message, data);

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
              console.log('✅ Accumulated:', this.accumulatedTranscript);
            }

            // Skicka INTE final transcript ännu - vänta på EndOfTranscript
          } else if (data.message === 'EndOfTranscript') {
            // När hela transcripten är klar från Speechmatics
            console.log('🏁 EndOfTranscript received, accumulated:', this.accumulatedTranscript);

            // Trigga callback för att signalera att vi är klara
            this.onEndOfTranscriptCallback?.();
          } else if (data.message === 'Error') {
            console.error('Speechmatics error:', data);
            const errorMsg = data.reason || 'Okänt fel från Speechmatics';
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
        // När WebSocket stängs, skicka eventuellt ackumulerad transcript
        if (this.accumulatedTranscript.trim()) {
          console.log('🏁 WebSocket closing - sending accumulated:', this.accumulatedTranscript);
          this.onTranscriptCallback?.(this.accumulatedTranscript.trim(), true);
          this.accumulatedTranscript = '';
        }

        if (!event.wasClean) {
          console.error('WebSocket closed unexpectedly:', event);
        }
      };

    } catch (error) {
      console.error('Failed to start listening:', error);
      throw error;
    }
  }

  private startAudioStream(stream: MediaStream) {
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const float32Audio = e.inputBuffer.getChannelData(0);
        const int16Audio = this.convertFloat32ToInt16(float32Audio);
        this.ws.send(int16Audio);
      }
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
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

    // 1. Stoppa mikrofon OMEDELBART (ingen NY audio spelas in)
    this.stopMicrophone();

    // 2. Skicka EndOfStream till Speechmatics OMEDELBART
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('📤 Sending EndOfStream to Speechmatics');
      this.ws.send(JSON.stringify({
        message: 'EndOfStream',
        last_seq_no: this.lastSeqNo
      }));

      // 3. VÄNTA på EndOfTranscript (Speechmatics processar sista ljuden)
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('⏱️ Timeout waiting for EndOfTranscript (2s)');
          resolve();
        }, 2000);

        this.onEndOfTranscriptCallback = () => {
          console.log('✅ EndOfTranscript received - all audio processed!');
          clearTimeout(timeout);
          resolve();
        };
      });
    }

    // 4. Nu har vi HELA transcriptet - skicka om önskat
    if (sendAccumulated && this.accumulatedTranscript.trim()) {
      console.log('📨 Sending complete transcript:', this.accumulatedTranscript);
      this.onTranscriptCallback?.(this.accumulatedTranscript.trim(), true);
    } else if (!sendAccumulated) {
      console.log('🚫 Discarding transcript (sendAccumulated: false)');
    }

    // 5. Cleanup
    this.accumulatedTranscript = '';
    this.cleanup();
  }

  private stopMicrophone() {
    // Disconnect audio nodes (stoppar mikrofon-streaming)
    if (this.processor) {
      this.processor.onaudioprocess = null;
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Stop media recorder
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    // Stop all media stream tracks (release microphone)
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
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

    // Clear callbacks
    this.onTranscriptCallback = undefined;
    this.onEndOfTranscriptCallback = undefined;
  }
}