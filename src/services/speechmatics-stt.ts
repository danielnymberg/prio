interface SpeechmaticsConfig {
  apiKey: string;
  language: 'sv'; // Svenska
}

export class SpeechmaticsSTT {
  private ws: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private onTranscriptCallback?: (text: string, isFinal: boolean) => void;

  constructor(private config: SpeechmaticsConfig) {}

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
        // Skicka config - backend injicerar auth_token
        this.ws?.send(JSON.stringify({
          message: 'StartRecognition',
          audio_format: {
            type: 'raw',
            encoding: 'pcm_s16le',
            sample_rate: 16000
          },
          transcription_config: {
            language: this.config.language,
            enable_partials: true,
            max_delay: 2,
            diarization: 'none',
          },
          // auth_token injiceras av backend-servern
        }));

        // Starta audio streaming
        this.startAudioStream(this.stream!);
      };

      this.ws.onmessage = (event) => {
        // Ignorera binära meddelanden (audio echoes från Speechmatics)
        if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
          return;
        }

        try {
          const data = JSON.parse(event.data);

          if (data.message === 'AddPartialTranscript') {
            // Partial (live transcription)
            this.onTranscriptCallback?.(data.metadata.transcript, false);
          } else if (data.message === 'AddTranscript') {
            // Final transcription
            this.onTranscriptCallback?.(data.metadata.transcript, true);
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

  stopListening() {
    // Stop and clean up WebSocket
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ message: 'EndOfStream' }));
      }
      this.ws.close();
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws = null;
    }

    // Disconnect audio nodes
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

    // Stop all media stream tracks (important for releasing microphone)
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Clear callback
    this.onTranscriptCallback = undefined;
  }
}