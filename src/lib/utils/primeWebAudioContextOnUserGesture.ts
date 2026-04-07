/**
 * iOS Safari / WebKit: AudioContext output is blocked unless the context is
 * created and “used” synchronously inside a user gesture. Call this from the
 * first line of an onClick handler before any await (camera, WebSocket, etc.).
 */

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };

/** Same shape as React.MutableRefObject — avoids a React import in this util. */
export type AudioContextRef = { current: AudioContext | null };

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  return window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext ?? null;
}

function playSilentOscillatorPrimer(ctx: AudioContext): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(0);
  osc.stop(0.001);
}

/**
 * Returns a running (or resuming) AudioContext after a silent inaudible tick.
 * Reuses `existing` if it is non-null and not closed.
 */
export function getOrCreatePrimedAudioContext(existing: AudioContext | null): AudioContext {
  const Ctx = getAudioContextConstructor();
  if (!Ctx) {
    throw new Error('Web Audio API not supported');
  }
  const ctx = existing && existing.state !== 'closed' ? existing : new Ctx();
  void ctx.resume();
  playSilentOscillatorPrimer(ctx);
  return ctx;
}

/** Assign ref.current to a primed context — call synchronously from a tap. */
export function primeWebAudioContextRef(ref: AudioContextRef): void {
  ref.current = getOrCreatePrimedAudioContext(ref.current);
}
