import { Synth } from './Synth';

// Major pentatonic so any sequence of taps sounds pleasant.
const PENTA = [0, 2, 4, 7, 9];
export function pentaFreq(step: number, base = 392): number {
  const oct = Math.floor(step / 5);
  const n = PENTA[((step % 5) + 5) % 5] + oct * 12;
  return base * 2 ** (n / 12);
}

const vary = (v: number, amt = 0.06) => v * (1 + (Math.random() * 2 - 1) * amt);

export class Sfx {
  constructor(public s: Synth) {}

  pluck(step: number, gain = 0.16): void {
    const f = pentaFreq(step);
    this.s.tone({ freq: f, dur: 0.45, type: 'triangle', gain });
    this.s.tone({ freq: f * 2, dur: 0.18, type: 'sine', gain: gain * 0.3 });
  }

  tick(): void {
    this.s.tone({ freq: vary(1400), dur: 0.06, type: 'sine', gain: 0.05 });
  }

  /**
   * Car horn: two notes at once (about F4 + A4, like a real dual-tone horn), buzzy and held,
   * then cut off: "HONK-honk". `pitch` is per-vehicle flavor (bigger cars honk lower).
   */
  honk(pitch = 1): void {
    const blast = (delay: number, dur: number) => {
      for (const [f, gain] of [[349, 0.06], [440, 0.05]]) {
        this.s.tone({ freq: f * pitch, dur, hold: dur - 0.05, type: 'sawtooth', gain, delay, attack: 0.012, filter: 1500, q: 2.5 });
        this.s.tone({ freq: f * 2 * pitch, dur, hold: dur - 0.05, type: 'square', gain: gain * 0.25, delay, attack: 0.012, filter: 2400 });
      }
    };
    blast(0, 0.2);
    blast(0.26, 0.34);
  }

  beepBeep(): void {
    for (const d of [0, 0.13]) this.s.tone({ freq: 880, dur: 0.09, type: 'square', gain: 0.045, delay: d, filter: 3000 });
  }

  boing(pitch = 1): void {
    this.s.tone({ freq: 180 * pitch, to: 520 * pitch, dur: 0.18, type: 'sine', gain: 0.22, vibrato: 30, vibratoRate: 18 });
    this.s.tone({ freq: 520 * pitch, to: 260 * pitch, dur: 0.3, type: 'sine', gain: 0.12, delay: 0.12, vibrato: 25, vibratoRate: 14 });
  }

  whoosh(): void {
    this.s.noise({ dur: 0.6, gain: 0.18, type: 'bandpass', freq: 400, to: 2400, q: 1.2, attack: 0.15 });
  }

  thump(intensity = 1): void {
    const g = Math.min(0.35, 0.12 + intensity * 0.2);
    this.s.tone({ freq: 110, to: 45, dur: 0.22, type: 'sine', gain: g });
    this.s.noise({ dur: 0.12, gain: g * 0.4, type: 'lowpass', freq: 600 });
  }

  squeak(): void {
    this.s.tone({ freq: vary(950), to: 1500, dur: 0.12, type: 'sine', gain: 0.12 });
  }

  crunch(): void {
    this.s.noise({ dur: 0.28, gain: 0.32, type: 'bandpass', freq: 1300, to: 500, q: 0.8 });
    this.s.noise({ dur: 0.12, gain: 0.2, type: 'highpass', freq: 3000, delay: 0.04 });
    this.s.tone({ freq: 140, to: 60, dur: 0.15, type: 'sine', gain: 0.2 });
  }

  bonk(): void {
    this.s.tone({ freq: vary(300), to: 180, dur: 0.16, type: 'triangle', gain: 0.25 });
    this.s.noise({ dur: 0.06, gain: 0.12, type: 'bandpass', freq: 900 });
  }

  splash(big = 1): void {
    this.s.noise({ dur: 0.55 * big, gain: 0.26, type: 'highpass', freq: 3500, to: 900, attack: 0.01 });
    for (let i = 0; i < 4; i++) {
      this.s.tone({ freq: vary(900 + i * 220, 0.2), to: vary(1800), dur: 0.07, type: 'sine', gain: 0.06, delay: 0.05 + i * 0.06 * big });
    }
  }

  plip(): void {
    this.s.tone({ freq: vary(700), to: 1400, dur: 0.1, type: 'sine', gain: 0.16 });
  }

  squelch(): void {
    this.s.noise({ dur: 0.35, gain: 0.25, type: 'lowpass', freq: 500, to: 200, q: 4 });
    this.s.tone({ freq: 120, to: 220, dur: 0.18, type: 'sine', gain: 0.15, delay: 0.05 });
  }

  moo(): void {
    const f = vary(120, 0.1);
    this.s.tone({ freq: f, to: f * 0.8, dur: 1.1, type: 'sawtooth', gain: 0.16, attack: 0.15, filter: 650, q: 3, vibrato: 3, vibratoRate: 5, curve: 'lin' });
    this.s.tone({ freq: f * 2, to: f * 1.6, dur: 1.0, type: 'sine', gain: 0.05, attack: 0.15, curve: 'lin' });
  }

  quack(): void {
    for (const d of [0, 0.2]) {
      this.s.tone({ freq: vary(560), to: 340, dur: 0.16, type: 'sawtooth', gain: 0.14, delay: d, filter: 1400, q: 6 });
    }
  }

  tweet(): void {
    const f = vary(2600, 0.15);
    this.s.tone({ freq: f, to: f * 1.3, dur: 0.07, type: 'sine', gain: 0.07 });
    this.s.tone({ freq: f * 1.1, to: f * 0.9, dur: 0.08, type: 'sine', gain: 0.06, delay: 0.09 });
  }

  glugDing(): void {
    for (let i = 0; i < 3; i++) this.s.tone({ freq: 300 - i * 40, to: 500 - i * 50, dur: 0.12, type: 'sine', gain: 0.18, delay: i * 0.16 });
    this.ding(0.55);
  }

  ding(delay = 0): void {
    this.s.tone({ freq: 1318, dur: 1.0, type: 'sine', gain: 0.14, delay });
    this.s.tone({ freq: 1976, dur: 0.7, type: 'sine', gain: 0.06, delay });
  }

  bell(): void {
    for (const [d, f] of [[0, 659], [0.55, 523]] as const) {
      this.s.tone({ freq: f, dur: 1.6, type: 'sine', gain: 0.16, delay: d });
      this.s.tone({ freq: f * 2.76, dur: 0.6, type: 'sine', gain: 0.04, delay: d });
    }
  }

  chime(): void {
    [0, 2, 4, 7].forEach((s, i) => this.s.tone({ freq: pentaFreq(s + 5, 523), dur: 0.5, type: 'sine', gain: 0.1, delay: i * 0.07 }));
  }

  giggle(): void {
    [7, 9, 7, 9, 12].forEach((s, i) => this.s.tone({ freq: pentaFreq(s, 523) * vary(1, 0.02), dur: 0.12, type: 'triangle', gain: 0.09, delay: i * 0.075 }));
  }

  boof(): void {
    for (const d of [0, 0.22]) this.s.tone({ freq: 220, to: 150, dur: 0.12, type: 'square', gain: 0.1, delay: d, filter: 900 });
  }

  rustle(): void {
    this.s.noise({ dur: 0.4, gain: 0.12, type: 'highpass', freq: 2500, attack: 0.08 });
  }

  door(): void {
    this.s.tone({ freq: 180, to: 120, dur: 0.12, type: 'triangle', gain: 0.2 });
    this.s.noise({ dur: 0.08, gain: 0.15, type: 'lowpass', freq: 800 });
  }

  knock(): void {
    for (const d of [0, 0.15]) this.s.tone({ freq: 240, to: 160, dur: 0.08, type: 'triangle', gain: 0.22, delay: d });
  }

  engineStart(): void {
    this.s.tone({ freq: 50, to: 90, dur: 0.6, type: 'sawtooth', gain: 0.12, filter: 400, curve: 'lin' });
    this.s.tone({ freq: 90, to: 60, dur: 0.4, type: 'sawtooth', gain: 0.08, filter: 400, delay: 0.5 });
  }

  pop(): void {
    this.s.tone({ freq: vary(500), to: 1100, dur: 0.08, type: 'sine', gain: 0.18 });
  }

  whistleUp(): void {
    this.s.tone({ freq: 700, to: 1700, dur: 0.6, type: 'sine', gain: 0.05, curve: 'lin' });
  }

  firework(): void {
    this.s.noise({ dur: 0.5, gain: 0.3, type: 'lowpass', freq: 900, to: 200 });
    this.s.tone({ freq: 90, to: 40, dur: 0.4, type: 'sine', gain: 0.22 });
    for (let i = 0; i < 9; i++) this.s.noise({ dur: 0.04, gain: 0.08, type: 'highpass', freq: 4000, delay: 0.15 + Math.random() * 0.6 });
  }

  sparkle(): void {
    for (let i = 0; i < 4; i++) this.s.tone({ freq: pentaFreq(10 + Math.floor(Math.random() * 6)), dur: 0.25, type: 'sine', gain: 0.05, delay: i * 0.05 });
  }

  irisClose(): void {
    [12, 9, 7, 4, 2, 0].forEach((s, i) => this.s.tone({ freq: pentaFreq(s, 392), dur: 0.3, type: 'triangle', gain: 0.08, delay: i * 0.08 }));
  }

  irisOpen(): void {
    [0, 2, 4, 7, 9, 12].forEach((s, i) => this.s.tone({ freq: pentaFreq(s, 392), dur: 0.3, type: 'triangle', gain: 0.08, delay: i * 0.08 }));
  }

  // ---------- Phase 3: cities, rivers, airports ----------

  /** A quick rising harp run (Talmadge cables). */
  harp(): void {
    for (let i = 0; i < 8; i++) this.s.tone({ freq: pentaFreq(i + 3, 392), dur: 0.7, type: 'triangle', gain: 0.07, delay: i * 0.045 });
  }

  /** A little clock-tower chime (Westminster-ish first phrase). */
  clockChime(): void {
    [659, 523, 587, 392].forEach((f, i) => {
      this.s.tone({ freq: f, dur: 1.1, type: 'sine', gain: 0.12, delay: i * 0.32 });
      this.s.tone({ freq: f * 2.76, dur: 0.4, type: 'sine', gain: 0.025, delay: i * 0.32 });
    });
  }

  /** Church bells pealing down a scale. */
  peal(): void {
    [784, 659, 587, 523, 440].forEach((f, i) => {
      this.s.tone({ freq: f, dur: 1.4, type: 'sine', gain: 0.1, delay: i * 0.2 });
      this.s.tone({ freq: f * 2.4, dur: 0.5, type: 'sine', gain: 0.03, delay: i * 0.2 });
    });
  }

  /** One ding of a railroad/bridge crossing bell. */
  crossingBell(): void {
    this.s.tone({ freq: 1180, dur: 0.22, type: 'triangle', gain: 0.08 });
    this.s.tone({ freq: 2360, dur: 0.12, type: 'sine', gain: 0.03 });
  }

  /** Riverboat steam whistle: breathy chord, slides up then holds. */
  steamWhistle(): void {
    for (const f of [440, 554, 659]) this.s.tone({ freq: f * 0.92, to: f, dur: 1.1, hold: 0.8, type: 'sine', gain: 0.05, attack: 0.08, vibrato: 4, vibratoRate: 6 });
    this.s.noise({ dur: 1.1, gain: 0.05, type: 'bandpass', freq: 1600, q: 2, attack: 0.08 });
  }

  /** Deep, soft ship horn. */
  shipHorn(): void {
    for (const f of [98, 147]) this.s.tone({ freq: f, dur: 1.5, hold: 1.2, type: 'sawtooth', gain: 0.07, attack: 0.1, filter: 500, q: 2 });
  }

  /** A pelican gulping a fish. */
  gulp(): void {
    this.s.tone({ freq: 300, to: 120, dur: 0.18, type: 'sine', gain: 0.18 });
    this.s.tone({ freq: 180, to: 90, dur: 0.14, type: 'sine', gain: 0.12, delay: 0.16 });
  }

  /** A swan's trumpet-y honk (friendly, not a car). */
  swanHonk(): void {
    for (const d of [0, 0.24]) this.s.tone({ freq: vary(520), to: 470, dur: 0.18, type: 'sawtooth', gain: 0.07, delay: d, filter: 1200, q: 5 });
  }

  /** A friendly gator chomp: two soft clacks. */
  chomp(): void {
    for (const d of [0, 0.18]) {
      this.s.tone({ freq: 260, to: 140, dur: 0.07, type: 'triangle', gain: 0.22, delay: d });
      this.s.noise({ dur: 0.04, gain: 0.1, type: 'bandpass', freq: 1600, delay: d });
    }
  }

  /** A music-box melody (observation wheel, swan boats). */
  musicBox(): void {
    [0, 4, 7, 9, 7, 4, 2, 4].forEach((st, i) => this.s.tone({ freq: pentaFreq(st + 5, 523), dur: 0.5, type: 'sine', gain: 0.07, delay: i * 0.16 }));
  }

  /** A short brass fanfare (bandshell). */
  fanfare(): void {
    [[392, 0], [523, 0.16], [659, 0.32], [784, 0.48], [784, 0.78]].forEach(([f, d], i) => {
      const dur = i === 4 ? 0.6 : 0.2;
      this.s.tone({ freq: f, dur, hold: dur - 0.06, type: 'sawtooth', gain: 0.06, delay: d, filter: 1800, q: 1.5, attack: 0.02 });
    });
  }

  /** Airport PA "ding-dong". */
  paChime(): void {
    for (const [f, d] of [[880, 0], [698, 0.35]]) {
      this.s.tone({ freq: f, dur: 1.0, type: 'sine', gain: 0.1, delay: d });
      this.s.tone({ freq: f * 2, dur: 0.4, type: 'sine', gain: 0.02, delay: d });
    }
  }

  /** Jet engines spooling up (soft whine). */
  jetSpool(): void {
    this.s.tone({ freq: 300, to: 1400, dur: 2.0, type: 'sine', gain: 0.035, attack: 0.4, curve: 'lin' });
    this.s.noise({ dur: 2.0, gain: 0.06, type: 'bandpass', freq: 500, to: 1500, q: 0.8, attack: 0.6 });
  }

  /** Takeoff roar, soft and rumbly, fading away. */
  jetRoar(): void {
    this.s.noise({ dur: 3.2, gain: 0.12, type: 'lowpass', freq: 700, to: 300, attack: 0.3 });
    this.s.tone({ freq: 70, to: 50, dur: 2.4, type: 'sine', gain: 0.08, attack: 0.3 });
  }

  /** A soft "fwoomp" (plane wheels touching down, hangar doors). */
  fwoomp(): void {
    this.s.noise({ dur: 0.35, gain: 0.15, type: 'lowpass', freq: 900, to: 250, attack: 0.02 });
    this.s.tone({ freq: 130, to: 70, dur: 0.25, type: 'sine', gain: 0.14 });
  }
}
