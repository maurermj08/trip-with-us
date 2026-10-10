import type { Synth } from './Synth';

/** Continuous engine hum + wind, driven every frame by speed and air time. */
export class EngineSound {
  private oscA?: OscillatorNode;
  private oscB?: OscillatorNode;
  private filter?: BiquadFilterNode;
  private gain?: GainNode;
  private windGain?: GainNode;
  private windFilter?: BiquadFilterNode;
  private on = false;
  /** Idle pitch (Hz); per-vehicle flavor only. */
  base = 42;

  constructor(private s: Synth) {}

  private build(): void {
    const ctx = this.s.ctx;
    if (!ctx || this.oscA) return;
    this.oscA = ctx.createOscillator();
    this.oscA.type = 'sawtooth';
    this.oscB = ctx.createOscillator();
    this.oscB.type = 'triangle';
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 300;
    this.filter.Q.value = 2;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.oscA.connect(this.filter);
    this.oscB.connect(this.filter);
    this.filter.connect(this.gain).connect(this.s.master);
    this.oscA.start();
    this.oscB.start();

    const wind = ctx.createBufferSource();
    wind.buffer = this.s.noiseBuf;
    wind.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 600;
    this.windFilter.Q.value = 0.6;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    wind.connect(this.windFilter).connect(this.windGain).connect(this.s.master);
    wind.start();
  }

  setRunning(on: boolean): void {
    this.on = on;
  }

  update(speed01: number, throttle: boolean, airborne: boolean, height01: number): void {
    if (!this.s.ready) return;
    this.build();
    const ctx = this.s.ctx!;
    const t = ctx.currentTime;
    const k = 0.08;
    const base = this.base + speed01 * 70 + (throttle ? 8 : 0) + (airborne ? 14 : 0);
    this.oscA!.frequency.setTargetAtTime(base, t, k);
    this.oscB!.frequency.setTargetAtTime(base * 1.505, t, k);
    this.filter!.frequency.setTargetAtTime(220 + speed01 * 700 + (throttle ? 200 : 0), t, k);
    const g = this.on ? 0.05 + speed01 * 0.05 + (throttle ? 0.02 : 0) : 0;
    this.gain!.gain.setTargetAtTime(g, t, 0.12);
    const w = Math.min(0.12, speed01 * 0.035 + (airborne ? 0.03 + height01 * 0.07 : 0));
    this.windGain!.gain.setTargetAtTime(w, t, 0.2);
    this.windFilter!.frequency.setTargetAtTime(400 + speed01 * 900 + height01 * 600, t, 0.2);
  }

  silence(): void {
    if (!this.gain || !this.s.ctx) return;
    this.gain.gain.setTargetAtTime(0, this.s.ctx.currentTime, 0.1);
    this.windGain!.gain.setTargetAtTime(0, this.s.ctx.currentTime, 0.1);
  }
}
