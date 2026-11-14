import { DATE_SLOTS, DAY_SLOTS, DAYS } from '../core/textures';

/**
 * Simplified but mechanically coherent model of the 6309 going train.
 *
 * Verified figures (widely documented for the 6309): 21,600 vph = 6 vibrations/s = 3 Hz balance;
 * bidirectional automatic winding (magic lever); no hand-winding, no hacking.
 * Simplifications (labelled in the UI): ~40 h reserve used linearly, winding rate per rotor turn,
 * amplitude vs. reserve curve, wheel tooth counts / barrel ratio, rotor pendulum physics.
 */

export const VPH = 21600;
export const BEATS_PER_SEC = VPH / 3600; // 6
export const BALANCE_HZ = BEATS_PER_SEC / 2; // 3
export const RESERVE_HOURS = 40; // approximate
const D2R = Math.PI / 180;
const ESCAPE_TEETH = 15;
/** Escape wheel advances half a tooth per vibration: 360/15/2 = 12°. */
const ESCAPE_STEP = 360 / ESCAPE_TEETH / 2;
/** Visual winding rate: one rotor revolution adds this many hours (simplified). */
const HOURS_PER_ROTOR_TURN = 0.5;
const MIN_AMPLITUDE = 60;

export interface Kinematics {
  balance: number; fork: number; escape: number; fourth: number; third: number; center: number; barrel: number;
  hourWheel: number; minuteWheel: number; dateDriver: number;
  rotor: number; firstRed: number; secondRed: number; ratchet: number;
  secHand: number; minHand: number; hourHand: number;
  dateDial: number; dayDisc: number;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export class MovementSim {
  running = true;
  speed = 1;
  reserve = 0.8;
  beat = 0;
  amplitude = 270;
  clock0 = 0;
  date0 = 1;
  weekday0 = 0;
  dateOffset = 0;
  dayOffset = 0;

  rotor = 0;
  rotorVel = 0;
  firstRed = 0;
  secondRed = 0;
  windActivity = 0;
  swing = false;
  autoWrist = false;
  private dragging = false;
  private dragTarget = 0;
  private wristT = 0;

  private dateShown = 0;
  private dayShown = 0;

  constructor() {
    this.setToNow();
    this.dateShown = this.dateCounter;
    this.dayShown = this.dayCounter;
  }

  setToNow(): void {
    const n = new Date();
    this.clock0 = n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds() + n.getMilliseconds() / 1000;
    this.date0 = n.getDate();
    this.weekday0 = n.getDay();
    this.beat = 0;
    this.dateOffset = 0;
    this.dayOffset = 0;
  }

  reset(): void {
    this.setToNow();
    this.reserve = 0.8;
    this.amplitude = 270;
    this.rotor = 0;
    this.rotorVel = 0;
    this.firstRed = 0;
    this.secondRed = 0;
    this.speed = 1;
    this.running = true;
    this.swing = false;
    this.autoWrist = false;
  }

  get ticking(): boolean {
    return this.running && this.amplitude >= MIN_AMPLITUDE;
  }

  /** Stepped vibration count: escape wheel/hands jump once per vibration. */
  get steps(): number {
    const n = Math.floor(this.beat);
    return n + smoothstep(0, 0.14, this.beat - n);
  }

  get displaySeconds(): number {
    return this.clock0 + this.steps / BEATS_PER_SEC;
  }

  get daysElapsed(): number {
    return Math.floor(this.displaySeconds / 86400);
  }

  get dateCounter(): number {
    return this.date0 - 1 + this.daysElapsed + this.dateOffset;
  }

  get dayCounter(): number {
    return this.weekday0 + this.daysElapsed + this.dayOffset;
  }

  get dateLabel(): number {
    return (((this.dateCounter % DATE_SLOTS) + DATE_SLOTS) % DATE_SLOTS) + 1;
  }

  get dayLabel(): string {
    return DAYS[((this.dayCounter % 7) + 7) % 7];
  }

  get reserveHours(): number {
    return this.reserve * RESERVE_HOURS;
  }

  beginDrag(): void {
    this.dragging = true;
    this.dragTarget = this.rotor;
  }

  dragBy(delta: number): void {
    this.dragTarget += delta;
  }

  endDrag(): void {
    this.dragging = false;
  }

  update(dtReal: number): void {
    dtReal = Math.min(dtReal, 0.1);
    const dt = this.running ? dtReal * this.speed : 0;

    // --- Rotor: pendulum under gravity on a virtual wrist (always real-time, never time-lapsed) ---
    const prevRotor = this.rotor;
    const dtR = this.running ? dtReal * Math.min(1, this.speed) : 0;
    if (dtR > 0) {
      if (this.dragging) {
        const next = this.rotor + (this.dragTarget - this.rotor) * Math.min(1, dtR * 18);
        this.rotorVel = (next - this.rotor) / dtR;
        this.rotor = next;
      } else {
        const sub = 4;
        const h = dtR / sub;
        for (let i = 0; i < sub; i++) {
          this.wristT += h;
          let drive = 0;
          if (this.swing) drive = 95 * Math.sin(this.wristT * Math.PI * 2 * 1.15);
          else if (this.autoWrist) drive = 34 * Math.sin(this.wristT * Math.PI * 2 * 0.8) * (0.7 + 0.3 * Math.sin(this.wristT * 0.9));
          const acc = -30 * Math.sin(this.rotor) - 0.9 * this.rotorVel + drive;
          this.rotorVel += acc * h;
          this.rotor += this.rotorVel * h;
        }
      }
    }
    const dRotor = this.rotor - prevRotor;

    // --- Winding: magic lever rectifies both directions into one ---
    const dFirst = -dRotor / 3.4;
    this.firstRed += dFirst;
    this.secondRed -= Math.abs(dFirst) * 1.25;
    const wound = (Math.abs(dRotor) / (Math.PI * 2)) * HOURS_PER_ROTOR_TURN / RESERVE_HOURS;
    if (this.reserve < 1) this.reserve = Math.min(1, this.reserve + wound);
    const rate = dtR > 0 ? Math.abs(dRotor) / dtR : 0;
    this.windActivity += (Math.min(1, rate / 5) - this.windActivity) * Math.min(1, dtReal * 6);

    // --- Amplitude follows mainspring torque (simplified curve) ---
    const target = this.reserve > 0 ? 210 + 70 * Math.min(1, this.reserve / 0.5) : 0;
    if (dt > 0) this.amplitude += (target - this.amplitude) * Math.min(1, dt * (target > this.amplitude ? 3 : 1.2));

    // --- Escapement: 6 vibrations per second of simulated time ---
    if (this.amplitude >= MIN_AMPLITUDE && dt > 0) {
      this.beat += dt * BEATS_PER_SEC;
      this.reserve = Math.max(0, this.reserve - dt / (RESERVE_HOURS * 3600));
    }

    // --- Calendar discs ease toward their new position (jump at midnight) ---
    const k = Math.min(1, dtReal * 5);
    this.dateShown += (this.dateCounter - this.dateShown) * k;
    this.dayShown += (this.dayCounter - this.dayShown) * k;
  }

  kinematics(): Kinematics {
    const steps = this.steps;
    const n = Math.floor(this.beat);
    const s = smoothstep(0, 0.14, this.beat - n);
    const side = ((n % 2) + 2) % 2 === 0 ? 1 : -1;
    const amp = this.ticking ? this.amplitude : this.amplitude * 0.6;
    // Dial-side view: positive = counter-clockwise. Each mesh reverses direction.
    const escape = steps * ESCAPE_STEP * D2R; // CCW, one turn per 5 s
    const fourth = -steps * D2R; // CW, one turn per minute
    const third = (steps / 8) * D2R; // CCW
    const center = -(steps / 60) * D2R; // CW, one turn per hour
    const barrel = (steps / 60 / 7) * D2R; // CCW, ~one turn per 7 h (simplified ratio)
    const hourWheel = center / 12;
    const sec = this.displaySeconds;
    return {
      balance: amp * D2R * Math.sin(Math.PI * this.beat),
      fork: 9 * D2R * (-side + 2 * side * s),
      escape, fourth, third, center, barrel,
      hourWheel,
      minuteWheel: -center * (0.9 / 2.2),
      dateDriver: -hourWheel / 2,
      rotor: this.rotor,
      firstRed: this.firstRed,
      secondRed: this.secondRed,
      ratchet: -this.secondRed * (0.5 / 3.6),
      secHand: -((sec % 60) / 60) * Math.PI * 2,
      minHand: -((sec % 3600) / 3600) * Math.PI * 2,
      hourHand: -((sec % 43200) / 43200) * Math.PI * 2,
      dateDial: -(this.dateShown / DATE_SLOTS) * Math.PI * 2,
      dayDisc: -(this.dayShown / DAY_SLOTS) * Math.PI * 2,
    };
  }
}
