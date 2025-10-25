/**
 * AudioFeedback - Spelar ljud-cues för push-to-talk röstinspelning
 *
 * Använder Web Audio API för att generera beeps.
 * Fail-safe: Om Web Audio inte stöds, loggas bara varning.
 */

export class AudioFeedback {
  private audioContext: AudioContext | null = null;

  /**
   * Hämta eller skapa AudioContext (lazy initialization)
   */
  private getContext(): AudioContext {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web Audio API not supported');
      }
      this.audioContext = new AudioContextClass();
    }
    return this.audioContext;
  }

  /**
   * Spela en enkel beep-ton
   * @param frequency Hz (800 = hög ton, 200 = låg ton)
   * @param duration Millisekunder
   */
  private playBeep(frequency: number, duration: number): void {
    try {
      const ctx = this.getContext();

      // Resume context om suspended (iOS fix)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      // Fade ut för att undvika "click" i slutet
      const now = ctx.currentTime;
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration / 1000);

      oscillator.start(now);
      oscillator.stop(now + duration / 1000);

    } catch (error) {
      // Fail silently - audio feedback inte kritiskt
      console.warn('Audio feedback failed:', error);
    }
  }

  /**
   * Spela "start recording" beep - hög ton, kort
   */
  playStart(): void {
    this.playBeep(800, 100);
  }

  /**
   * Spela "stop recording" beep - dubbel lägre ton
   */
  playStop(): void {
    this.playBeep(600, 100);
    setTimeout(() => this.playBeep(600, 100), 150);
  }

  /**
   * Spela error beep - låg ton, lång
   */
  playError(): void {
    this.playBeep(200, 300);
  }

  /**
   * Spela processing beep - medel ton, mellan
   */
  playProcessing(): void {
    this.playBeep(500, 150);
  }

  /**
   * Stäng AudioContext (cleanup)
   */
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
