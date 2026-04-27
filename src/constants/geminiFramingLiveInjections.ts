/**
 * Text injected into Gemini Live so the model follows app state (not the reverse).
 * Keep tags stable — referenced by GEMINI_FRAMING_SYSTEM_PROMPT.
 *
 * Two-phase arming, by design:
 *   1. CAPTURE_VIEW_ARMED → read the instruction + coach distance, do NOT count down.
 *   2. READY_TO_COUNTDOWN → app says framing is locked; only now count down + capture_now.
 * The app owns timing because the model is unreliable at "wait for a later event mid-turn".
 */

export function geminiInjectionSessionConnected(): string {
  return '[SYSTEM_EVENT: SESSION_CONNECTED] The companion app just opened the live session; the client has not started capturing yet. Deliver the OPENING_BRIEFING block from your system prompt IN FULL now — all seven beats, in order: (1) warm greeting, (2) WHY this scan matters (so their coach can see how their body is loading right now and prescribe corrective work that is genuinely targeted to them), (3) WHAT we will do (four full-body photos: front, left side, back, right side), (4) clothing (underwear or tight-fitting), (5) steady even lighting and remembering the room next time so scans compare like-for-like, (6) HOW the photos become useful (a body-mapping system places dots and lines on the joints so the coach can see exactly where the body is shifting), (7) close with the "phone upright, waist height, one view at a time, I will count you down" line. Do NOT skip any beat. Do NOT claim the scan or a capture has started. End your turn cleanly after the close.';
}

export function geminiInjectionPhoneStablePortrait(): string {
  return '[SYSTEM_EVENT: PHONE_STABLE_PORTRAIT] The app sees the phone held steady in portrait. Give ONE short framing sentence: step into the guide box so the body fills it head to toe — not tiny, not cropped. Then end your turn. Do not repeat the OPENING_BRIEFING.';
}

export function geminiInjectionPhoneNotLevel(): string {
  return '[SYSTEM_EVENT: PHONE_NOT_LEVEL] The app sees the phone is not upright in portrait. Say one short phrase only: hold it straight up like taking a photo, then stop.';
}

/**
 * Phase 1 of arming: read the instruction, mention the green-guide-box gate,
 * then go silent. The app fires distance events ONLY when the client has
 * stopped moving — so any further coaching from you is event-driven, not
 * filler. The countdown is gated by a separate READY_TO_COUNTDOWN event the
 * app emits once framing is locked.
 */
export function geminiInjectionArmView(label: string, instr: string): string {
  return `[SYSTEM_EVENT: CAPTURE_VIEW_ARMED] View=${label}. In your own warm words, do exactly two things and then STOP:
1) Read this positioning instruction, leading with the dominant cue (the turn or facing direction) and confirming the side as a check afterwards: "${instr}".
2) Add one short sentence telling the client the guide box will turn green when they're framed correctly, and that you'll count them down when it does.

Then STAY SILENT. Do NOT count down. Do NOT call capture_now. Do NOT keep narrating while they reposition. The app is watching the client move and will only ping you with a USER_NOT_VISIBLE / USER_TOO_CLOSE / USER_TOO_FAR event if they STOP and they are still not framed — those are the only times you should speak again before READY_TO_COUNTDOWN. When you do receive [SYSTEM_EVENT: READY_TO_COUNTDOWN] for this view, count down and call capture_now.`;
}

/**
 * Phase 2 of arming. Sent exactly once per arm cycle, when the app's pose
 * pipeline confirms the client is in zone='perfect' continuously for the
 * stability window AND the phone is level. This is the only signal that
 * authorises the countdown.
 */
export function geminiInjectionReadyToCountdown(label: string): string {
  return `[SYSTEM_EVENT: READY_TO_COUNTDOWN] View=${label}. The client is now in the green guide box and steady. Count down out loud — "Hold still — three, two, one." — and call the capture_now function on or just before "one". Do not say anything else first. Do not re-coach distance.`;
}

export function geminiInjectionCaptureRejected(label: string, regions: readonly string[]): string {
  const regionText = regions.length > 0 ? regions.join(', ') : 'full body';
  return `[SYSTEM_EVENT: CAPTURE_REJECTED] View=${label}. The app rejected the last photo because these landmarks were not clear enough: ${regionText}. Give one calm correction, then STOP. Wait for the next [SYSTEM_EVENT: READY_TO_COUNTDOWN] before counting down or calling capture_now again.`;
}

/**
 * Sent when the model called `capture_now` but the deterministic pose gate
 * said the user was not in the perfect distance band yet (or framing was unstable).
 * Tell the model to coach distance and try again — don't apologise repeatedly.
 */
export function geminiInjectionCapturePremature(reason: 'too_close' | 'too_far' | 'absent' | 'unstable'): string {
  const detail =
    reason === 'too_close' ? 'the client is filling more than the target frame height — they need to step back a bit'
    : reason === 'too_far'  ? 'the client is filling less than the target frame height — they need to step a little closer'
    : reason === 'absent'   ? 'the client is not fully detected in frame — ask them to step into view, head to toe'
    :                          'framing was not stable long enough — ask them to hold still for a moment';
  return `[SYSTEM_EVENT: CAPTURE_PREMATURE reason=${reason}] You called capture_now too early — ${detail}. Give one calm correction, then STOP. Wait for the next [SYSTEM_EVENT: READY_TO_COUNTDOWN] before counting down or calling capture_now again.`;
}

/**
 * Sent after the final view is captured successfully. Triggers the closing handoff.
 */
export function geminiInjectionAllViewsComplete(): string {
  return '[SYSTEM_EVENT: ALL_VIEWS_COMPLETE] All four photos are captured. Deliver the CLOSING_HANDOFF from your system prompt now (one short, warm summary: their coach is reviewing the landmarks and will queue corrective exercises; they can put the phone down). Then end your turn.';
}

/**
 * The app only fires these distance events when the client has been still
 * (no zone change, no userScale delta) for the stillness window — which means
 * the client has stopped moving and is still in the wrong spot. Treat each
 * one as "they paused; nudge once and stop." Do NOT speak unprompted while
 * they reposition — the next event is the only signal something needs saying.
 */

/** Client has stopped moving but is not visible in frame (zone='absent'). */
export function geminiInjectionUserNotVisible(): string {
  return '[SYSTEM_EVENT: USER_NOT_VISIBLE] The client has stopped and the app still cannot see them in frame. ONE short phrase only — ask them to step into the guide box so the full body shows head to toe — then stop. Do NOT count down. Do NOT keep talking while they move.';
}

/** Deterministic distance from MediaPipe (avg ankle Y − nose Y); do not override with visual guesswork. */
export function geminiInjectionUserTooClose(): string {
  return '[SYSTEM_EVENT: USER_TOO_CLOSE] The client has stopped but they are filling more than the guide box — they are too close. ONE short phrase only — ask for a small step back so the full body fits inside the guide box. Then stop. Do NOT count down. Do NOT keep talking while they move.';
}

export function geminiInjectionUserTooFar(): string {
  return '[SYSTEM_EVENT: USER_TOO_FAR] The client has stopped but they are filling less than the guide box — they are too far. ONE short phrase only — ask for a small step forward so the body fills the guide box from head to toe. Then stop. Do NOT count down. Do NOT keep talking while they move.';
}
