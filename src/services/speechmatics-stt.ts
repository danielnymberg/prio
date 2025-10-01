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
  private onTranscriptCallback?: (text: string, isFinal: boolean) => void;

  constructor(private config: SpeechmaticsConfig) {}

  async startListening(onTranscript: (text: string, isFinal: boolean) => void) {
    this.onTranscriptCallback = onTranscript;

    try {
      // 1. Få mikrofon access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        }
      });

      // 2. Koppla till Speechmatics WebSocket
      this.ws = new WebSocket('wss://eu2.rt.speechmatics.com/v2');

      this.ws.onopen = () => {
        // Skicka auth + config
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
          auth_token: this.config.apiKey,
        }));

        // Starta audio streaming
        this.startAudioStream(stream);
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.message === 'AddPartialTranscript') {
          // Partial (live transcription)
          this.onTranscriptCallback?.(data.metadata.transcript, false);
        } else if (data.message === 'AddTranscript') {
          // Final transcription
          this.onTranscriptCallback?.(data.metadata.transcript, true);
        } else if (data.message === 'Error') {
          console.error('Speechmatics error:', data);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
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
    if (this.ws) {
      this.ws.send(JSON.stringify({ message: 'EndOfStream' }));
      this.ws.close();
      this.ws = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }
  }
}