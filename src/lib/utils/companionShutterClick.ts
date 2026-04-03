/**
 * Short shutter-like click via Web Audio (no external URL — satisfies CSP default-src 'self').
 */

let sharedCtx: AudioContext | null = null;

export function playCompanionShutterClick(): void {
  try {
    type W = Window & { webkitAudioContext?: typeof AudioContext };
    const Ctor = window.AudioContext || (window as W).webkitAudioContext;
    if (!Ctor) return;
    if (!sharedCtx || sharedCtx.state === 'closed') {
      sharedCtx = new Ctor();
    }
    const ctx = sharedCtx;
    void ctx.resume();
    const t0 = ctx.currentTime;
    const dur = 0.055;
    const n = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const t = i / ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 95) * 0.32;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.45, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(g);
    g.connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.01);
  } catch {
    /* non-fatal */
  }
}
