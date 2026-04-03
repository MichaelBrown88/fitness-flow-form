/**
 * Text injected into Gemini Live so the model follows app state (not the reverse).
 * Keep tags stable — referenced by GEMINI_FRAMING_SYSTEM_PROMPT.
 */

export function geminiInjectionSessionConnected(): string {
  return '[SYSTEM_EVENT: SESSION_CONNECTED] The companion app connected the live session; video may still be starting. Follow system instructions: give only the opening line about holding the phone upright in portrait. Do not claim the scan or capture has started.';
}

export function geminiInjectionPhoneStablePortrait(): string {
  return '[SYSTEM_EVENT: PHONE_STABLE_PORTRAIT] The app registered the phone held steady in portrait long enough. Give one short framing sentence (full body in frame, step back if needed, stay relaxed), then end your turn. Do not repeat the hold-the-phone opening.';
}

export function geminiInjectionPhoneNotLevel(): string {
  return '[SYSTEM_EVENT: PHONE_NOT_LEVEL] The app sees the phone is not upright in portrait. Say one short phrase only: hold it straight up like taking a photo, then stop.';
}

export function geminiInjectionArmView(label: string, instr: string): string {
  return `[SYSTEM_EVENT: CAPTURE_VIEW_ARMED] View=${label}. Instruction for the client: ${instr}. When framing is correct, call the capture_now function.`;
}
