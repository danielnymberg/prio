/**
 * SimpleTTS - Browser-baserad Text-to-Speech
 *
 * Använder Web Speech API (SpeechSynthesis) för gratis, offline TTS.
 * Fungerar i alla moderna browsers, svensk kvalitet varierar.
 *
 * PRO:
 * - Gratis, ingen API-kostnad
 * - Fungerar offline (PWA!)
 * - Noll latens
 * - Fungerar överallt
 *
 * CON:
 * - Robotisk röst (Chrome har bäst svensk)
 * - Varierar mellan browsers
 * - Ingen kontroll över prosodi
 */

export class SimpleTTS {
  private isSpeaking = false;
  private queue: string[] = [];
  private isProcessingQueue = false;

  /**
   * Hämta användarens TTS-hastighet från localStorage
   */
  private getTTSRate(): number {
    const pref = localStorage.getItem('prio-tts-speed');
    switch(pref) {
      case 'slow': return 1.0;
      case 'fast': return 1.5;
      case 'normal':
      default: return 1.2;  // Default: Normal (20% snabbare än 1.0)
    }
  }

  /**
   * Speak with queuing - för streaming responses
   * Lägger till text i kö och spelar upp i ordning
   */
  async speakQueued(text: string, rate?: number): Promise<void> {
    this.queue.push(text);

    // Starta queue-processing om inte redan igång
    if (!this.isProcessingQueue) {
      this.processQueue(rate || this.getTTSRate());
    }
  }

  /**
   * Process queue - spelar upp en mening i taget
   */
  private async processQueue(rate?: number): Promise<void> {
    this.isProcessingQueue = true;
    const selectedRate = rate || this.getTTSRate();

    while (this.queue.length > 0) {
      const text = this.queue.shift();
      if (text) {
        try {
          await this.speak(text, selectedRate);
        } catch (error) {
          console.warn('Queue TTS error:', error);
          // Fortsätt med nästa i kön
        }
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Speak text med svensk röst
   * @param text Text att läsa upp
   * @param rate Hastighet (0.5-2.0, default 0.9 för tydligare svenska)
   */
  async speak(text: string, rate?: number): Promise<void> {
    const selectedRate = rate || this.getTTSRate();
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        console.warn('SpeechSynthesis not supported');
        reject(new Error('TTS inte tillgänglig i denna browser'));
        return;
      }

      if (!text.trim()) {
        console.warn('Tom text, inget att läsa upp');
        resolve();
        return;
      }

      // Cancel previous if playing
      if (this.isSpeaking) {
        this.stop();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'sv-SE';
      utterance.rate = selectedRate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Försök hitta bästa svenska rösten
      const voices = speechSynthesis.getVoices();
      const swedishVoice = this.findBestSwedishVoice(voices);

      if (swedishVoice) {
        utterance.voice = swedishVoice;
        console.log('🔊 Using voice:', swedishVoice.name);
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('TTS error:', event);
        this.isSpeaking = false;

        // Fail gracefully - visa bara text istället
        reject(new Error(`TTS error: ${event.error}`));
      };

      // iOS fix: Load voices först
      if (voices.length === 0) {
        speechSynthesis.onvoiceschanged = () => {
          const newVoices = speechSynthesis.getVoices();
          const voice = this.findBestSwedishVoice(newVoices);
          if (voice) utterance.voice = voice;

          speechSynthesis.speak(utterance);
          speechSynthesis.onvoiceschanged = null;
        };
      } else {
        speechSynthesis.speak(utterance);
      }
    });
  }

  /**
   * Hitta bästa svenska rösten - MANLIG variant
   * macOS: Oskar (manlig), Alva (kvinnlig)
   * Prioritet: Oskar > Manliga röster > Default svensk
   */
  private findBestSwedishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (voices.length === 0) return null;

    // Filter svenska röster
    const swedishVoices = voices.filter(v => v.lang.startsWith('sv'));

    if (swedishVoices.length === 0) {
      console.warn('No Swedish voices found, using default');
      return null;
    }

    // Prioritera Oskar (macOS manlig svensk röst)
    const oskar = swedishVoices.find(v => v.name.toLowerCase().includes('oskar'));
    if (oskar) return oskar;

    // Andra manliga röster (om de finns)
    const maleVoice = swedishVoices.find(v =>
      v.name.toLowerCase().includes('male') ||
      v.name.toLowerCase().includes('mattias') ||
      v.name.toLowerCase().includes('erik')
    );
    if (maleVoice) return maleVoice;

    // Annars första svenska rösten (fallback)
    return swedishVoices[0];
  }

  /**
   * Speak multiple sentences med köhantering
   * Läser en mening i taget för bättre flow
   */
  async speakSentences(text: string): Promise<void> {
    // Split på meningar
    const sentences = text
      .split(/([.!?]+)/)
      .reduce((acc: string[], curr, i, arr) => {
        if (i % 2 === 0 && curr.trim()) {
          const sentence = curr.trim() + (arr[i + 1] || '');
          acc.push(sentence);
        }
        return acc;
      }, []);

    // Spela varje mening i ordning
    for (const sentence of sentences) {
      if (sentence.trim()) {
        try {
          await this.speak(sentence);
        } catch (error) {
          console.error('Failed to speak sentence:', sentence, error);
          // Fortsätt med nästa mening även om en failar
        }
      }
    }
  }

  /**
   * Stoppa pågående uppspelning OCH rensa kö
   */
  stop(): void {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      this.isSpeaking = false;
    }

    // Rensa kön
    this.queue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Check om TTS är tillgänglig
   */
  isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  /**
   * Check om röst spelar nu ELLER har meningar i kö
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking || this.isProcessingQueue || this.queue.length > 0;
  }
}
