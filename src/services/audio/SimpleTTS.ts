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

  /**
   * Strippa emojis och special chars som TTS inte kan läsa
   */
  private stripEmojis(text: string): string {
    return text
      // Ta bort emojis (alla Unicode emoji ranges)
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      // Ta bort "Generated with Claude Code" footer
      .replace(/🤖.*Generated with.*$/s, '')
      // Ta bort markdown formatting
      .replace(/\*\*/g, '')  // Bold
      .replace(/\*/g, '')     // Italic
      // Ta bort extra whitespace
      .replace(/\n{2,}/g, '\n')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  /**
   * Speak text med svensk röst
   * @param text Text att läsa upp
   * @param rate Hastighet (0.5-2.0, default 0.9 för tydligare svenska)
   */
  async speak(text: string, rate: number = 0.9): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        console.warn('SpeechSynthesis not supported');
        reject(new Error('TTS inte tillgänglig i denna browser'));
        return;
      }

      // Strippa emojis och special chars
      const cleanText = this.stripEmojis(text);

      if (!cleanText.trim()) {
        console.warn('Text blev tom efter emoji-stripping');
        resolve(); // Inget att läsa upp
        return;
      }

      // Cancel previous if playing
      if (this.isSpeaking) {
        this.stop();
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'sv-SE';
      utterance.rate = rate;
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
   * Hitta bästa svenska rösten
   * Prioritet: Google > Microsoft > Apple > Default
   */
  private findBestSwedishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (voices.length === 0) return null;

    // Filter svenska röster
    const swedishVoices = voices.filter(v => v.lang.startsWith('sv'));

    if (swedishVoices.length === 0) {
      console.warn('No Swedish voices found, using default');
      return null;
    }

    // Prioritera Google (bäst på svenska)
    const google = swedishVoices.find(v => v.name.toLowerCase().includes('google'));
    if (google) return google;

    // Sedan Microsoft
    const microsoft = swedishVoices.find(v => v.name.toLowerCase().includes('microsoft'));
    if (microsoft) return microsoft;

    // Sedan Apple
    const apple = swedishVoices.find(v => v.name.toLowerCase().includes('apple'));
    if (apple) return apple;

    // Annars första svenska rösten
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
   * Stoppa pågående uppspelning
   */
  stop(): void {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  /**
   * Check om TTS är tillgänglig
   */
  isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  /**
   * Check om röst spelar nu
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}
