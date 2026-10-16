/**
 * Sound effects via the Web Audio API — no asset files, no dependencies.
 * Subtle, non-intrusive blips. All effects remain understandable without audio.
 */

export type SoundEffect = 'correct' | 'incorrect' | 'topicComplete' | 'levelComplete';

export class AudioFx {
  private ctx: AudioContext | null = null;
  private enabled = true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private ensureContext(): AudioContext | null {
    if (!this.enabled) return null;
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private blip(freq: number, start: number, duration: number, volume = 0.08, type: OscillatorType = 'sine') {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    gain.gain.setValueAtTime(0, ctx.currentTime + start);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + duration + 0.05);
  }

  play(effect: SoundEffect) {
    if (!this.enabled) return;
    switch (effect) {
      case 'correct':
        this.blip(523.25, 0, 0.12);
        this.blip(783.99, 0.09, 0.14);
        break;
      case 'incorrect':
        this.blip(196, 0, 0.18, 0.07, 'triangle');
        this.blip(155.56, 0.12, 0.2, 0.06, 'triangle');
        break;
      case 'topicComplete':
        this.blip(523.25, 0, 0.1);
        this.blip(659.25, 0.08, 0.1);
        this.blip(783.99, 0.16, 0.16);
        break;
      case 'levelComplete':
        this.blip(523.25, 0, 0.12);
        this.blip(659.25, 0.1, 0.12);
        this.blip(783.99, 0.2, 0.12);
        this.blip(1046.5, 0.3, 0.25, 0.09);
        break;
    }
  }
}
