import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

interface AzureTTSConfig {
  subscriptionKey: string;
  region: string; // 'westeurope' eller 'northeurope'
  voice: string; // 'sv-SE-SofieNeural' (kvinna) eller 'sv-SE-MattiasNeural' (man)
}

export class AzureTTS {
  private synthesizer: sdk.SpeechSynthesizer;
  private audioConfig: sdk.AudioConfig;
  private speechConfig: sdk.SpeechConfig;

  constructor(config: AzureTTSConfig) {
    this.speechConfig = sdk.SpeechConfig.fromSubscription(
      config.subscriptionKey,
      config.region
    );

    this.speechConfig.speechSynthesisVoiceName = config.voice;
    this.speechConfig.speechSynthesisOutputFormat =
      sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    this.audioConfig = sdk.AudioConfig.fromDefaultSpeakerOutput();
    this.synthesizer = new sdk.SpeechSynthesizer(this.speechConfig, this.audioConfig);
  }

  async speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.synthesizer.speakTextAsync(
        text,
        result => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve();
          } else {
            reject(new Error(`TTS failed: ${result.errorDetails}`));
          }
        },
        error => reject(error)
      );
    });
  }

  async speakSSML(ssml: string): Promise<void> {
    // För mer naturlig prosodi
    return new Promise((resolve, reject) => {
      this.synthesizer.speakSsmlAsync(
        ssml,
        result => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve();
          } else {
            reject(new Error(`TTS failed: ${result.errorDetails}`));
          }
        },
        error => reject(error)
      );
    });
  }

  stop() {
    // Properly cleanup all resources
    if (this.synthesizer) {
      this.synthesizer.close();
    }
    if (this.audioConfig) {
      this.audioConfig.close();
    }
    if (this.speechConfig) {
      this.speechConfig.close();
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