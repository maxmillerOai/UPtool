/**
 * Lightweight WebAudio synthesizer for UI feedback. No assets required — tones
 * are generated procedurally so the bundle stays lean and the "spacecraft"
 * bleeps feel cohesive.
 */
let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

type Tone = { freq: number; dur: number; type?: OscillatorType; gain?: number; delay?: number };

function play(tones: Tone[]) {
  const ac = audioContext();
  if (!ac) return;
  if (ac.state === 'suspended') void ac.resume();
  const now = ac.currentTime;
  for (const t of tones) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const start = now + (t.delay ?? 0);
    const peak = t.gain ?? 0.05;
    osc.type = t.type ?? 'sine';
    osc.frequency.setValueAtTime(t.freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + t.dur + 0.02);
  }
}

export const sfx = {
  click: () => play([{ freq: 660, dur: 0.06, type: 'triangle', gain: 0.04 }]),
  hover: () => play([{ freq: 880, dur: 0.04, type: 'sine', gain: 0.02 }]),
  start: () =>
    play([
      { freq: 440, dur: 0.1, type: 'sawtooth', gain: 0.04 },
      { freq: 660, dur: 0.12, type: 'sawtooth', gain: 0.04, delay: 0.06 },
    ]),
  success: () =>
    play([
      { freq: 523, dur: 0.1, type: 'sine', gain: 0.05 },
      { freq: 784, dur: 0.16, type: 'sine', gain: 0.05, delay: 0.08 },
      { freq: 1046, dur: 0.2, type: 'sine', gain: 0.04, delay: 0.16 },
    ]),
  error: () =>
    play([
      { freq: 220, dur: 0.18, type: 'square', gain: 0.05 },
      { freq: 160, dur: 0.22, type: 'square', gain: 0.05, delay: 0.1 },
    ]),
  notify: () =>
    play([
      { freq: 740, dur: 0.08, type: 'triangle', gain: 0.04 },
      { freq: 988, dur: 0.1, type: 'triangle', gain: 0.04, delay: 0.05 },
    ]),
};
