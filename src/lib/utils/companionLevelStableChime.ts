/**
 * Short local feedback when the app considers the phone “level” (not Gemini TTS).
 */

let sharedCtx: AudioContext | null = null;

export function playCompanionLevelStableChime(): void {
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
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.12);
  } catch {
    /* non-fatal */
  }
}
