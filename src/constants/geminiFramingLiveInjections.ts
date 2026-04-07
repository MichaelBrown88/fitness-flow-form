/**
 * Text injected into Gemini Live so the model follows app state (not the reverse).
 * Keep tags stable — referenced by GEMINI_FRAMING_SYSTEM_PROMPT.
 */

export function geminiInjectionSessionConnected(): string {
  return '[SYSTEM_EVENT: SESSION_CONNECTED] The companion app connected the live session; video may still be starting. Give exactly one short opening sentence: ask them to place the camera at waist height and hold it perfectly vertical in portrait (this reduces parallax distortion for posture scans). Do not claim the scan or capture has started.';
}

export function geminiInjectionPhoneStablePortrait(): string {
  return '[SYSTEM_EVENT: PHONE_STABLE_PORTRAIT] The app registered the phone held steady in portrait long enough. Give one short framing sentence: position so their body fills the on-screen guide box head to toe (not tiny, not cropped); stay relaxed, then end your turn. Do not repeat the hold-the-phone opening.';
}

export function geminiInjectionPhoneNotLevel(): string {
  return '[SYSTEM_EVENT: PHONE_NOT_LEVEL] The app sees the phone is not upright in portrait. Say one short phrase only: hold it straight up like taking a photo, then stop.';
}

export function geminiInjectionArmView(label: string, instr: string): string {
  return `[SYSTEM_EVENT: CAPTURE_VIEW_ARMED] View=${label}. Instruction for the client: ${instr}. When framing is correct, call the capture_now function.`;
}

/** Deterministic distance from MediaPipe (avg ankle Y − nose Y); do not override with visual guesswork. */
export function geminiInjectionUserTooClose(): string {
  return '[SYSTEM_EVENT: USER_TOO_CLOSE] The app measured the client filling more than the target vertical frame. Say one short phrase only: take a small step back so more of the room shows above their head and below their feet, then stop.';
}

export function geminiInjectionUserTooFar(): string {
  return '[SYSTEM_EVENT: USER_TOO_FAR] The app measured the client filling less than the target vertical frame. Say one short phrase only: take a small step closer so their body fills more of the guide box height, then stop.';
}

export function geminiInjectionUserDistancePerfect(): string {
  return '[SYSTEM_EVENT: USER_DISTANCE_PERFECT] The app measured the client in the target distance band for this scan. Acknowledge briefly (e.g. distance looks good) if helpful; do not ask them to change distance unless a later event says otherwise.';
}
