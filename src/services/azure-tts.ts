import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

interface AzureTTSConfig {
  subscriptionKey: string;
  region: string; // 'westeurope' eller 'northeurope'
  voice: string; // 'sv-SE-SofieNeural' (kvinna) eller 'sv-SE-MattiasNeural' (man)
}

export class AzureTTS {
  private synthesizer: sdk.SpeechSynthesizer;
  private audioConfig: sdk.AudioConfig;

  constructor(config: AzureTTSConfig) {
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      config.subscriptionKey,
      config.region
    );

    speechConfig.speechSynthesisVoiceName = config.voice;
    speechConfig.speechSynthesisOutputFormat =
      sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    this.audioConfig = sdk.AudioConfig.fromDefaultSpeakerOutput();
    this.synthesizer = new sdk.SpeechSynthesizer(speechConfig, this.audioConfig);
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
    this.synthesizer.close();
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