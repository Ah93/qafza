/**
 * Sound effects, synthesized in the browser (Web Audio): no files to download, nothing to license.
 * Every sound is a few soft notes with a quick attack and a gentle fade; they start only after a tap or click
 * (browsers do not allow sound before that) and can be switched off, which is remembered on this device.
 */

const KEY = "qafza:sound";
const listeners = new Set<() => void>();

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

/** in a live class on a shared room, sound starts off (a whole class buzzing at once is noise); the student can switch it on */
let live = false;
export const setSoundContext = (isLive: boolean) => {
  live = isLive;
  listeners.forEach((l) => l());
};

export const soundOn = (): boolean => {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? !live : v === "1";
  } catch {
    return !live;
  }
};

/* ---------- calm motion and small vibrations (phones), remembered on this device ---------- */
const CALM = "qafza:calm";
const HAPTIC = "qafza:haptics";
const flag = (k: string, dflt: boolean) => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? dflt : v === "1";
  } catch {
    return dflt;
  }
};
export const calmOn = () => flag(CALM, false);
export const hapticsOn = () => flag(HAPTIC, true) && !calmOn();
export function applyCalm() {
  if (typeof document !== "undefined") document.documentElement.dataset.calm = calmOn() ? "1" : "0";
}
export function setCalm(on: boolean) {
  try {
    localStorage.setItem(CALM, on ? "1" : "0");
  } catch {}
  applyCalm();
  listeners.forEach((l) => l());
}
const buzz = (pattern: number | number[]) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator && hapticsOn()) navigator.vibrate(pattern);
};

export function setSound(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l());
}

export function subscribeSound(l: () => void) {
  listeners.add(l);
  window.addEventListener("storage", l);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", l);
  };
}

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === "undefined" || !soundOn()) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      // a soft low-pass takes the edge off the synthesized tones
      const soft = ctx.createBiquadFilter();
      soft.type = "lowpass";
      soft.frequency.value = 5200;
      master.connect(soft).connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return { ctx, out: master! };
  } catch {
    return null;
  }
}

type Note = { f: number; at: number; dur?: number; type?: OscillatorType; gain?: number };

function play(notes: Note[]) {
  const a = audio();
  if (!a) return;
  const t0 = a.ctx.currentTime + 0.02;
  for (const n of notes) {
    const o = a.ctx.createOscillator();
    const g = a.ctx.createGain();
    const start = t0 + n.at;
    const dur = n.dur ?? 0.28;
    o.type = n.type ?? "triangle";
    o.frequency.setValueAtTime(n.f, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(n.gain ?? 0.28, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(a.out);
    o.start(start);
    o.stop(start + dur + 0.05);
  }
}

// note frequencies (Hz)
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880, B5 = 987.77, C6 = 1046.5, E6 = 1318.5;
const G4 = 392, D4 = 293.66, A4 = 440, F4 = 349.23;

export const sfx = {
  /** a light tap on a choice or button */
  tap: () => play([{ f: 880, at: 0, dur: 0.06, type: "sine", gain: 0.12 }]),
  /** a right answer: two bright notes and a sparkle */
  right: () => {
    buzz(18);
    play([
      { f: E5, at: 0, dur: 0.22 },
      { f: A5, at: 0.09, dur: 0.34 },
      { f: E6, at: 0.2, dur: 0.3, type: "sine", gain: 0.1 },
    ]);
  },
  /** a wrong answer: soft and low, never harsh */
  wrong: () => {
    buzz([30, 50, 30]);
    play([
      { f: G4, at: 0, dur: 0.24, type: "sine", gain: 0.22 },
      { f: D4, at: 0.14, dur: 0.38, type: "sine", gain: 0.2 },
    ]);
  },
  /** three right in a row */
  streak: () =>
    play([
      { f: C5, at: 0, dur: 0.2 },
      { f: E5, at: 0.08, dur: 0.2 },
      { f: G5, at: 0.16, dur: 0.2 },
      { f: C6, at: 0.24, dur: 0.45 },
      { f: E6, at: 0.3, dur: 0.4, type: "sine", gain: 0.09 },
    ]),
  /** the boss is beaten */
  boss: () =>
    play([
      { f: C5, at: 0, dur: 0.22 },
      { f: G5, at: 0.12, dur: 0.22 },
      { f: C6, at: 0.24, dur: 0.22 },
      { f: E6, at: 0.4, dur: 0.7, gain: 0.22 },
      { f: G5, at: 0.4, dur: 0.7, type: "sine", gain: 0.14 },
      { f: C6, at: 0.4, dur: 0.7, type: "sine", gain: 0.12 },
    ]),
  /** a new rank */
  rankUp: () =>
    play([...[C5, D5, E5, G5, A5, C6].map((f, i): Note => ({ f, at: i * 0.09, dur: 0.26 })), { f: E6, at: 0.6, dur: 0.6, gain: 0.18 }]),
  /** the teacher shows the answer */
  reveal: () =>
    play([
      { f: A4, at: 0, dur: 0.18, type: "sine", gain: 0.16 },
      { f: B5, at: 0.1, dur: 0.4, type: "sine", gain: 0.14 },
    ]),
  /** a quiet "you are back" note */
  back: () => play([{ f: F4, at: 0, dur: 0.2, type: "sine", gain: 0.14 }, { f: A4, at: 0.1, dur: 0.3, type: "sine", gain: 0.14 }]),
};
