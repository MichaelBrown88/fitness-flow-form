/**
 * Gemini Live session for Companion posture framing (audio out + ~1 FPS JPEG in).
 *
 * Capture is triggered via function calling: the model calls `capture_now` when
 * framing is correct. Transcription-based regex matching is kept only as a
 * fallback for older models (2.5) that don't support tool use in Live.
 */

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { getFirebaseApp } from '@/services/firebase';
import {
  getAI,
  GoogleAIBackend,
  VertexAIBackend,
  getLiveGenerativeModel,
  ResponseModality,
  FunctionCallingMode,
  SchemaType,
  type LiveSession,
  type FunctionDeclarationsTool,
  type FunctionResponse,
} from 'firebase/ai';
import { CONFIG } from '@/config';
import { GEMINI_FRAMING_SYSTEM_PROMPT } from '@/constants/geminiFramingPrompt';
import {
  geminiInjectionAllViewsComplete,
  geminiInjectionArmView,
  geminiInjectionCapturePremature,
  geminiInjectionCaptureRejected,
  geminiInjectionPhoneNotLevel,
  geminiInjectionPhoneStablePortrait,
  geminiInjectionReadyToCountdown,
  geminiInjectionSessionConnected,
  geminiInjectionUserNotVisible,
  geminiInjectionUserTooClose,
  geminiInjectionUserTooFar,
} from '@/constants/geminiFramingLiveInjections';
import { logger } from '@/lib/utils/logger';
import {
  getOrCreatePrimedAudioContext,
  type AudioContextRef,
} from '@/lib/utils/primeWebAudioContextOnUserGesture';
import type { PoseLiveMetricsRef, PoseUserScaleZone } from '@/hooks/usePoseDetection';

const OUTPUT_PCM_SAMPLE_RATE_HZ = 24000;
const CAPTURE_FN_NAME = 'capture_now';
/**
 * Required continuous time in zone='perfect' before `capture_now` is honored.
 * "Balanced" gating per product call: tight enough that captures are repeatable
 * (no drive-by perfects), loose enough that the user doesn't feel re-coached.
 */
const PERFECT_STABILITY_MS = 300;
/**
 * Minimum time after CAPTURE_VIEW_ARMED before READY_TO_COUNTDOWN can be sent.
 * Without this, if the user is already in the perfect band when we arm
 * (e.g. they didn't turn between views), READY would fire ~300ms after arm
 * and Aoede would interrupt her own instruction with the countdown. This buys
 * her time to finish narrating the turn cue before the count starts.
 */
const ARM_INSTRUCTION_GRACE_MS = 2500;
/**
 * How long the client must be physically still (no zone change, no meaningful
 * userScale delta) before we let Aoede coach distance again. This is what
 * stops her talking over the client while they're actively walking into
 * position — she only opens her mouth when they've stopped and they're still
 * not in the right spot.
 */
const STILLNESS_MS = 800;
/**
 * Threshold for "the body actually moved": userScale = avgAnkleY − noseY in
 * normalized 0–1 frame coords, so 0.015 ≈ 1.5% of frame height. Tight enough
 * to detect a deliberate step, loose enough to ignore breathing / micro-sway.
 */
const SCALE_MOTION_EPSILON = 0.015;
/**
 * If the client is stuck still in the same wrong zone (didn't move enough to
 * fix it), re-coach them after this long. Without this, a user who freezes
 * after one nudge would get no further help.
 */
const STILL_NUDGE_REPEAT_MS = 4000;

const CAPTURE_TOOL: FunctionDeclarationsTool = {
  functionDeclarations: [
    {
      name: CAPTURE_FN_NAME,
      description:
        'Trigger the camera to capture the current posture view. Call this when the client is in frame, at the right distance, and facing the correct direction for the armed view.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          confidence: {
            type: SchemaType.STRING,
            description: 'Optional: your confidence that framing is correct (high, medium, low).',
          },
        },
      },
    },
  ],
};

function decodePcm16LeBase64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const view = new DataView(bytes.buffer);
  const sampleCount = bytes.byteLength / 2;
  const out = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    out[i] = view.getInt16(i * 2, true) / 32768;
  }
  return out;
}

function normalizeTranscriptionForTrigger(buffer: string): string {
  return buffer
    .replace(/\s+/g, ' ')
    .replace(/[\u2013\u2014-]/g, '\u2014')
    .trim()
    .toLowerCase();
}

/** Fallback for older models (2.5) that don't support tool calling in Live. */
function transcriptionContainsCaptureTrigger(buffer: string): boolean {
  const n = normalizeTranscriptionForTrigger(buffer);
  if (n.length < 8) return false;
  if (n.includes('perfect \u2014 capturing now')) return true;
  const perfectIdx = n.lastIndexOf('perfect');
  if (perfectIdx >= 0) {
    const after = n.slice(perfectIdx);
    if (/\bcaptur(ing)?\b/.test(after) && /\bnow\b/.test(after)) return true;
  }
  if (/\bcapturing\s+now\b/.test(n) || /\bcapture\s+now\b/.test(n)) return true;
  return false;
}

export type CompanionFlowState =
  | 'permissions'
  | 'waiting_level'
  | 'waiting_pose'
  | 'ready'
  | 'capturing'
  | 'processing'
  | 'complete';

export interface UseGeminiFramingGuideOptions {
  /**
   * Camera + motion + flow allow Live (session is cleaned up when false).
   * When this becomes true, Live connects from an effect; still call `startLiveSessionFromUserGesture` on the
   * permission tap (or Retry) so Safari unlocks Web Audio before any await in that handler.
   */
  mayUseLiveSession: boolean;
  flowState: CompanionFlowState;
  views: ReadonlyArray<{ readonly id: string; readonly label: string; readonly instr: string }>;
  getVideoElement: () => HTMLVideoElement | null;
  mirrored: boolean;
  onWarmupComplete: () => void;
  /** Run landmark confidence on stills before persisting; see `evaluateCompanionStillCaptureLandmarks`. */
  onShotTrigger: (viewIndex: number) => void | Promise<void>;
  /** Fired once when the first Gemini TTS audio chunk is queued (for UI that fades pre-voice hints). */
  onVoiceGuideAudioStarted?: () => void;
  /**
   * Optional ref for the AudioContext used to play Live PCM. When set, the parent should assign it
   * synchronously from the permission tap via `primeWebAudioContextRef` before any await so Safari keeps
   * output unblocked; the hook uses this same context for all playback.
   */
  playbackAudioContextRef?: AudioContextRef;
  /**
   * Filled by `usePoseDetection` each frame. When set, distance [SYSTEM_EVENT: …] lines are sent on zone
   * transitions (avg ankle Y − nose Y vs CONFIG USER_SCALE_*).
   */
  poseLiveMetricsRef?: MutableRefObject<PoseLiveMetricsRef>;
  /** When false, skip USER_TOO_* / PERFECT injections (e.g. after first front capture). */
  allowDistanceInjectionsRef?: MutableRefObject<boolean>;
  onConnectionDiagnostics?: (message: string, level: 'info' | 'warn' | 'error') => void;
}

export type GeminiLiveConnectionStatus = 'idle' | 'connecting' | 'open' | 'error';

export interface UseGeminiFramingGuideResult {
  /** Call synchronously from a button tap before any await (Safari Web Audio). */
  unlockWebAudioOnUserGesture: () => void;
  /** Unlock audio + connect Gemini Live — must run from a direct user tap (not useEffect). */
  startLiveSessionFromUserGesture: () => void;
  primeAudioOutput: () => Promise<void>;
  armShot: (viewIndex: number) => Promise<boolean>;
  rejectShot: (viewIndex: number, failingRegions: readonly string[]) => Promise<boolean>;
  shutdown: () => Promise<void>;
  /** Same as starting Live again after an error. */
  retry: () => void;
  /** Throttled prompt so Gemini asks the client to level the phone again. */
  nudgeLevelPhone: () => void;
  isSessionOpen: boolean;
  connectionStatus: GeminiLiveConnectionStatus;
  connectionError: string | null;
}

export function useGeminiFramingGuide({
  mayUseLiveSession,
  flowState,
  views,
  getVideoElement,
  mirrored,
  onWarmupComplete,
  onShotTrigger,
  onVoiceGuideAudioStarted,
  playbackAudioContextRef,
  poseLiveMetricsRef,
  allowDistanceInjectionsRef,
  onConnectionDiagnostics,
}: UseGeminiFramingGuideOptions): UseGeminiFramingGuideResult {
  const internalPlaybackCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = playbackAudioContextRef ?? internalPlaybackCtxRef;
  const sessionRef = useRef<LiveSession | null>(null);
  const framesPausedRef = useRef(false);
  const warmupDoneRef = useRef(false);
  const armedViewRef = useRef<number | null>(null);
  const transcriptionBufferRef = useRef('');
  const frameIntervalRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const flowStateRef = useRef(flowState);
  const mirroredRef = useRef(mirrored);
  const getVideoRef = useRef(getVideoElement);
  const viewsRef = useRef(views);
  const onWarmupCompleteRef = useRef(onWarmupComplete);
  const onShotTriggerRef = useRef(onShotTrigger);
  const onVoiceGuideAudioStartedRef = useRef(onVoiceGuideAudioStarted);
  const onConnectionDiagnosticsRef = useRef(onConnectionDiagnostics);
  const voiceGuideAudioStartedRef = useRef(false);
  const nextPlayTimeRef = useRef(0);
  const wasLiveActiveWhenHiddenRef = useRef(false);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waitingPoseNudgeSentRef = useRef(false);
  const prevFlowStateForNudgeRef = useRef(flowState);
  const lastLevelVoiceNudgeAtRef = useRef(0);
  const mayUseLiveSessionRef = useRef(mayUseLiveSession);
  const prevMayUseLiveSessionRef = useRef(mayUseLiveSession);
  const liveSessionStartInFlightRef = useRef(false);
  /** When armShot() armed a view; used for transcription-timeout fallback capture. */
  const armedAtMsRef = useRef(0);
  type UserScaleInjectCursor = PoseUserScaleZone | 'uninitialized';
  const lastUserScaleInjectedZoneRef = useRef<UserScaleInjectCursor>('uninitialized');
  const lastUserScaleInjectAtRef = useRef(0);
  /**
   * Last time the live pose pipeline observed a NON-perfect zone. Used by the
   * deterministic capture gate: we require the zone to have been 'perfect'
   * continuously for at least PERFECT_STABILITY_MS before honoring `capture_now`.
   * This stops the model from triggering capture during a brief drift through
   * the perfect band, which is the main source of "she still captured even
   * though I was further back" repeatability bugs.
   */
  const lastNonPerfectAtMsRef = useRef(Date.now());
  /**
   * Whether we've already injected READY_TO_COUNTDOWN for the current armed view.
   * Reset on every arm/reject and on capture fire. The READY event is the only
   * signal authorising the model to count down, so emitting it more than once
   * per arm cycle would let Aoede restart the count mid-capture.
   */
  const readyToCountdownSentForArmRef = useRef(false);
  /** Last time we injected USER_NOT_VISIBLE while armed (rate-limit it like other zone events). */
  const lastNotVisibleInjectAtRef = useRef(0);
  /**
   * Last observed pose zone — used to detect zone-change as a motion signal.
   * `null` means "no observation yet this arm cycle"; we deliberately treat
   * the first frame after arming as motion so the stillness clock only starts
   * once the client has actually settled, not the moment we arm.
   */
  const lastObservedZoneRef = useRef<PoseUserScaleZone | null>(null);
  /**
   * Last `userScale` value pinned as the stillness anchor. Updated only on
   * detected motion so small drifts within `SCALE_MOTION_EPSILON` don't
   * accumulate frame-by-frame and silently shift the baseline.
   */
  const lastObservedScaleRef = useRef<number | null>(null);
  /** Last frame timestamp where motion was detected (zone change OR scale delta > epsilon). */
  const lastMotionAtMsRef = useRef(Date.now());
  const poseLiveMetricsRefHolder = useRef(poseLiveMetricsRef);
  useEffect(() => {
    poseLiveMetricsRefHolder.current = poseLiveMetricsRef;
  }, [poseLiveMetricsRef]);
  const allowDistanceInjectionsHolderRef = useRef(allowDistanceInjectionsRef);
  useEffect(() => {
    allowDistanceInjectionsHolderRef.current = allowDistanceInjectionsRef;
  }, [allowDistanceInjectionsRef]);
  useEffect(() => {
    mayUseLiveSessionRef.current = mayUseLiveSession;
  }, [mayUseLiveSession]);

  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<GeminiLiveConnectionStatus>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    flowStateRef.current = flowState;
  }, [flowState]);
  useEffect(() => {
    mirroredRef.current = mirrored;
  }, [mirrored]);
  useEffect(() => {
    getVideoRef.current = getVideoElement;
  }, [getVideoElement]);
  useEffect(() => {
    viewsRef.current = views;
  }, [views]);
  useEffect(() => {
    onWarmupCompleteRef.current = onWarmupComplete;
  }, [onWarmupComplete]);
  useEffect(() => {
    onShotTriggerRef.current = onShotTrigger;
  }, [onShotTrigger]);
  useEffect(() => {
    onVoiceGuideAudioStartedRef.current = onVoiceGuideAudioStarted;
  }, [onVoiceGuideAudioStarted]);
  useEffect(() => {
    onConnectionDiagnosticsRef.current = onConnectionDiagnostics;
  }, [onConnectionDiagnostics]);

  /** Re-allow waiting_pose nudge after user tilts back to waiting_level (lost vertical). */
  useEffect(() => {
    const prev = prevFlowStateForNudgeRef.current;
    prevFlowStateForNudgeRef.current = flowState;
    if (prev === 'waiting_pose' && flowState === 'waiting_level') {
      waitingPoseNudgeSentRef.current = false;
    }
  }, [flowState]);

  /**
   * On transition into the 'complete' flow state (all 4 views captured),
   * inject ALL_VIEWS_COMPLETE so Aoede delivers her closing handoff narration
   * before the session winds down. Without this, the model just stops talking
   * and the user is left wondering whether anything saved.
   */
  const allViewsCompleteSentRef = useRef(false);
  useEffect(() => {
    if (flowState !== 'complete') {
      allViewsCompleteSentRef.current = false;
      return;
    }
    if (allViewsCompleteSentRef.current) return;
    if (connectionStatus !== 'open') return;
    const session = sessionRef.current;
    if (!session || session.isClosed) return;
    allViewsCompleteSentRef.current = true;
    void session.sendTextRealtime(geminiInjectionAllViewsComplete()).catch((err) => {
      logger.warn('[GEMINI_LIVE] ALL_VIEWS_COMPLETE injection failed', 'GEMINI_LIVE', err);
    });
  }, [flowState, connectionStatus]);

  /**
   * After the phone is vertical: opening line was usually already given in waiting_level.
   * Ask for framing only + end turn so we get turnComplete and can show Start Capture.
   */
  useEffect(() => {
    if (!mayUseLiveSession || flowState !== 'waiting_pose' || connectionStatus !== 'open') return;
    const session = sessionRef.current;
    if (!session || session.isClosed || waitingPoseNudgeSentRef.current) return;
    waitingPoseNudgeSentRef.current = true;
    void session.sendTextRealtime(geminiInjectionPhoneStablePortrait())
      .catch((err) => {
        logger.warn('[GEMINI_LIVE] waiting_pose nudge failed', 'GEMINI_LIVE', err);
      });
  }, [mayUseLiveSession, flowState, connectionStatus]);

  /** If the model never sends turnComplete, still allow Start Capture (mobile WebKit / network edge cases). */
  useEffect(() => {
    if (!mayUseLiveSession || flowState !== 'waiting_pose') return;
    const t = window.setTimeout(() => {
      if (warmupDoneRef.current) return;
      if (flowStateRef.current !== 'waiting_pose') return;
      warmupDoneRef.current = true;
      framesPausedRef.current = true;
      onWarmupCompleteRef.current();
      logger.warn('[GEMINI_LIVE] Warmup fallback (timeout) — ready / auto-start', 'GEMINI_LIVE');
    }, 3000);
    return () => window.clearTimeout(t);
  }, [mayUseLiveSession, flowState]);

  const clearFrameInterval = useCallback(() => {
    if (frameIntervalRef.current != null) {
      window.clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  }, []);

  const queuePcmAudio = useCallback((base64: string) => {
    const ctx = playbackCtxRef.current;
    if (!ctx || ctx.state === 'closed') return;
    logger.debug('[GEMINI_LIVE] queuePcmAudio state:', ctx.state);
    if (!voiceGuideAudioStartedRef.current) {
      voiceGuideAudioStartedRef.current = true;
      onVoiceGuideAudioStartedRef.current?.();
    }
    const floats = decodePcm16LeBase64ToFloat32(base64);
    const buffer = ctx.createBuffer(1, floats.length, OUTPUT_PCM_SAMPLE_RATE_HZ);
    buffer.getChannelData(0).set(floats);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    const now = ctx.currentTime;
    let startAt = nextPlayTimeRef.current;
    if (startAt < now) startAt = now;
    src.start(startAt);
    nextPlayTimeRef.current = startAt + buffer.duration;
  }, [playbackCtxRef]);

  const fireCaptureTrigger = useCallback(() => {
    const idx = armedViewRef.current;
    if (idx === null) return;
    armedViewRef.current = null;
    armedAtMsRef.current = 0;
    readyToCountdownSentForArmRef.current = false;
    lastNotVisibleInjectAtRef.current = 0;
    lastObservedZoneRef.current = null;
    lastObservedScaleRef.current = null;
    lastMotionAtMsRef.current = Date.now();
    transcriptionBufferRef.current = '';
    framesPausedRef.current = true;
    void Promise.resolve(onShotTriggerRef.current(idx)).catch((e) => {
      logger.error('[GEMINI_LIVE] onShotTrigger failed', 'GEMINI_LIVE', e);
    });
  }, []);

  const receiveLoop = useCallback(
    async (session: LiveSession) => {
      try {
        for await (const msg of session.receive()) {
          if (cancelledRef.current || session.isClosed) break;
          if (!msg || typeof msg !== 'object') continue;
          const raw = msg as unknown as Record<string, unknown>;

          /* ── Server going away (new in @firebase/ai 2.8.0) ── */
          if (raw.type === 'goingAwayNotice') {
            const timeLeft = typeof raw.timeLeft === 'number' ? raw.timeLeft : 0;
            logger.warn('[GEMINI_LIVE] Server going away notice', 'GEMINI_LIVE', { timeLeft });
            setConnectionStatus('error');
            setConnectionError(`Voice guide session ending (${timeLeft}s remaining)`);
            continue;
          }

          /* ── Tool call cancellation ── */
          if (raw.type === 'toolCallCancellation') {
            logger.warn('[GEMINI_LIVE] Tool call cancelled by server', 'GEMINI_LIVE', raw);
            continue;
          }

          /* ── Tool calls (capture_now) ── */
          if (raw.type === 'toolCall') {
            const calls = (raw as { functionCalls?: Array<{ id?: string; name: string; args: object }> }).functionCalls;
            if (calls) {
              const responses: FunctionResponse[] = [];
              let rejectionReason: 'too_close' | 'too_far' | 'absent' | 'unstable' | null = null;
              for (const fc of calls) {
                if (fc.name === CAPTURE_FN_NAME) {
                  /* Deterministic capture gate: only honor `capture_now` when the
                   * client is plausibly ready. This prevents drive-by perfects
                   * (e.g. brief drift through the perfect band) from triggering
                   * captures, which is the main source of "she fired even though
                   * I was further back" repeatability bugs. */
                  const liveRef = poseLiveMetricsRefHolder.current;
                  const zone = liveRef?.current.zone ?? null;
                  const fs = flowStateRef.current;
                  const armedIdx = armedViewRef.current;
                  const stableMs = Date.now() - lastNonPerfectAtMsRef.current;
                  const phoneLevel = fs !== 'waiting_level' && fs !== 'permissions';

                  let gateOk = true;
                  if (armedIdx === null) {
                    gateOk = false;
                    rejectionReason = 'unstable';
                  } else if (!phoneLevel) {
                    gateOk = false;
                    rejectionReason = 'unstable';
                  } else if (zone === 'absent') {
                    gateOk = false;
                    rejectionReason = 'absent';
                  } else if (zone === 'too_close') {
                    gateOk = false;
                    rejectionReason = 'too_close';
                  } else if (zone === 'too_far') {
                    gateOk = false;
                    rejectionReason = 'too_far';
                  } else if (zone !== 'perfect' || stableMs < PERFECT_STABILITY_MS) {
                    gateOk = false;
                    rejectionReason = 'unstable';
                  }

                  logger.warn('[GEMINI_LIVE] capture_now tool call received', 'GEMINI_LIVE', {
                    armedView: armedIdx,
                    zone,
                    flowState: fs,
                    stableMs,
                    gateOk,
                    rejectionReason,
                  });

                  if (gateOk) {
                    fireCaptureTrigger();
                    responses.push({ id: fc.id, name: CAPTURE_FN_NAME, response: { captured: true } });
                  } else {
                    /* Allow a fresh READY_TO_COUNTDOWN after the next stability
                     * window. Without this, the model is told to "wait for the
                     * next READY" but we'd never send one because the per-arm
                     * latch was stuck true from the previous attempt. */
                    readyToCountdownSentForArmRef.current = false;
                    lastNonPerfectAtMsRef.current = Date.now();
                    lastObservedZoneRef.current = null;
                    lastObservedScaleRef.current = null;
                    lastMotionAtMsRef.current = Date.now();
                    responses.push({
                      id: fc.id,
                      name: CAPTURE_FN_NAME,
                      response: { captured: false, reason: rejectionReason ?? 'unstable' },
                    });
                  }
                }
              }
              if (responses.length > 0) {
                /* 3.1 synchronous function calling: model blocks until we respond. */
                try {
                  await session.sendFunctionResponses(responses);
                } catch (e) {
                  logger.warn('[GEMINI_LIVE] sendFunctionResponses failed', 'GEMINI_LIVE', e);
                }
                /* Coach the model on what to say next when we rejected. The
                 * function-response itself doesn't tell the model how to recover;
                 * an explicit SYSTEM_EVENT injection gives it a concrete next move
                 * (one calm correction → re-arm → countdown → retry). */
                if (rejectionReason) {
                  try {
                    await session.sendTextRealtime(
                      geminiInjectionCapturePremature(rejectionReason)
                    );
                  } catch (e) {
                    logger.warn(
                      '[GEMINI_LIVE] CAPTURE_PREMATURE injection failed',
                      'GEMINI_LIVE',
                      e
                    );
                  }
                }
              }
            }
            continue;
          }

          if (raw.type !== 'serverContent') continue;

          /* ── Server content (audio + transcript can arrive in one event on 3.1) ── */
          const sc = {
            turnComplete: raw.turnComplete === true,
            outputTranscription: raw.outputTranscription as { text?: string } | undefined,
            modelTurn: raw.modelTurn as
              | { parts?: Array<{ inlineData?: { mimeType?: string; data?: string }; text?: string }> }
              | undefined,
          };

          const previewParts = sc.modelTurn?.parts;
          let hasAudio = false;
          if (previewParts) {
            for (const p of previewParts) {
              const mime = p.inlineData?.mimeType ?? '';
              const data = p.inlineData?.data;
              if (mime.startsWith('audio/pcm') && data) {
                hasAudio = true;
                break;
              }
            }
          }
          logger.debug('[GEMINI_LIVE] Received chunk from model', { hasAudio });

          if (
            sc.turnComplete &&
            flowStateRef.current === 'waiting_pose' &&
            !warmupDoneRef.current
          ) {
            warmupDoneRef.current = true;
            framesPausedRef.current = true;
            onWarmupCompleteRef.current();
          }

          /* Audio — process first so user hears audio even in the same message as transcript */
          const parts = sc.modelTurn?.parts;
          if (parts) {
            for (const part of parts) {
              const mime = part.inlineData?.mimeType ?? '';
              const data = part.inlineData?.data;
              if (mime.startsWith('audio/pcm') && data) {
                queuePcmAudio(data);
              }
            }
          }

          /* Transcription fallback: if model speaks trigger phrase instead of calling tool (2.5 compat) */
          const textDelta = sc.outputTranscription?.text ?? '';
          if (textDelta) {
            transcriptionBufferRef.current += textDelta;
            if (transcriptionBufferRef.current.length > 6000) {
              transcriptionBufferRef.current = transcriptionBufferRef.current.slice(-3000);
            }
            if (
              armedViewRef.current !== null &&
              transcriptionContainsCaptureTrigger(transcriptionBufferRef.current)
            ) {
              logger.warn('[GEMINI_LIVE] Capture triggered via transcription fallback', 'GEMINI_LIVE');
              fireCaptureTrigger();
            }
          }
        }
      } catch (e) {
        if (!cancelledRef.current) {
          logger.error('[GEMINI_LIVE] receive loop error', 'GEMINI_LIVE', e);
          setIsSessionOpen(false);
          setConnectionStatus('error');
          setConnectionError(e instanceof Error ? e.message : 'Live session error');
        }
      }
    },
    [queuePcmAudio, fireCaptureTrigger]
  );

  const startJpegInterval = useCallback(
    (session: LiveSession) => {
      clearFrameInterval();
      frameIntervalRef.current = window.setInterval(() => {
        if (cancelledRef.current || session.isClosed || framesPausedRef.current) return;
        const video = getVideoRef.current();
        if (!video || video.readyState < 2) return;

        let canvas = offscreenCanvasRef.current;
        if (!canvas) {
          canvas = document.createElement('canvas');
          offscreenCanvasRef.current = canvas;
        }
        const maxW = 720;
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh) return;
        const scale = Math.min(1, maxW / vw);
        canvas.width = Math.round(vw * scale);
        canvas.height = Math.round(vh * scale);
        const cx = canvas.getContext('2d');
        if (!cx) return;
        if (mirroredRef.current) {
          cx.translate(canvas.width, 0);
          cx.scale(-1, 1);
        }
        cx.drawImage(video, 0, 0, canvas.width, canvas.height);
        cx.setTransform(1, 0, 0, 1, 0, 0);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        const base64 = dataUrl.split(',')[1];
        if (!base64) return;
        void session.sendVideoRealtime({ mimeType: 'image/jpeg', data: base64 }).catch((err) => {
          logger.warn('[GEMINI_LIVE] sendVideoRealtime failed', 'GEMINI_LIVE', err);
        });

        const liveRef = poseLiveMetricsRefHolder.current;
        const allowDistance =
          allowDistanceInjectionsHolderRef.current?.current !== false;
        if (liveRef) {
          const { zone, userScale } = liveRef.current;
          const now = Date.now();
          // Track perfect-zone stability for the deterministic capture gate
          // regardless of `allowDistance` so the gate keeps working even when
          // distance voice nudges are temporarily suppressed (e.g. mid-arm).
          if (zone !== 'perfect') {
            lastNonPerfectAtMsRef.current = now;
          }

          /* ── Motion detection ───────────────────────────────────────────
           * The user explicitly asked for natural pacing: Aoede should stay
           * silent while the client is actively moving into position, and
           * only re-coach if they stop and they're still not in the right
           * spot. We treat ANY of the following as motion:
           *   - first frame after an arm (so the stillness clock starts
           *     once the client has actually settled, not the moment we arm)
           *   - the pose zone changed since last frame
           *   - userScale (avgAnkleY − noseY in normalized 0–1 coords)
           *     moved by more than SCALE_MOTION_EPSILON
           * `lastObservedScaleRef` is only updated on detected motion so
           * micro-drift within tolerance can't slowly walk the baseline. */
          const prevZone = lastObservedZoneRef.current;
          const prevScale = lastObservedScaleRef.current;
          let movedThisFrame = false;
          if (prevZone === null) {
            // First observation this arm cycle — count it as motion so the
            // stillness clock begins from now.
            movedThisFrame = true;
          } else {
            if (zone !== prevZone) movedThisFrame = true;
            if (
              !movedThisFrame &&
              userScale !== null &&
              prevScale !== null &&
              Math.abs(userScale - prevScale) > SCALE_MOTION_EPSILON
            ) {
              movedThisFrame = true;
            }
          }
          if (movedThisFrame) {
            lastMotionAtMsRef.current = now;
            lastObservedScaleRef.current = userScale;
          }
          lastObservedZoneRef.current = zone;
          const stillnessMs = now - lastMotionAtMsRef.current;
          const isStill = stillnessMs >= STILLNESS_MS;

          if (allowDistance) {
            const armedIdx = armedViewRef.current;
            const fs = flowStateRef.current;
            const phoneLevel = fs !== 'waiting_level' && fs !== 'permissions';

            /* Distance coaching only when the user has stopped. While they're
             * walking into position (motion detected within the last
             * STILLNESS_MS), Aoede stays quiet. */
            if (armedIdx !== null && phoneLevel && isStill && zone !== 'perfect') {
              const lastZ = lastUserScaleInjectedZoneRef.current;
              const sinceLastInject = now - lastUserScaleInjectAtRef.current;
              const isNewSituation = zone !== lastZ;
              const isStuckTooLong = sinceLastInject >= STILL_NUDGE_REPEAT_MS;
              if (isNewSituation || isStuckTooLong) {
                lastUserScaleInjectedZoneRef.current = zone;
                lastUserScaleInjectAtRef.current = now;
                const payload =
                  zone === 'absent'
                    ? geminiInjectionUserNotVisible()
                    : zone === 'too_close'
                      ? geminiInjectionUserTooClose()
                      : geminiInjectionUserTooFar();
                if (zone === 'absent') {
                  lastNotVisibleInjectAtRef.current = now;
                }
                logger.warn('[GEMINI_LIVE] Distance coach', 'GEMINI_LIVE', {
                  zone,
                  stillnessMs,
                  reason: isNewSituation ? 'new-zone-after-stop' : 'stuck-still',
                });
                void session.sendTextRealtime(payload).catch((err) => {
                  logger.warn('[GEMINI_LIVE] distance injection failed', 'GEMINI_LIVE', err);
                });
              }
            } else if (zone === 'perfect' && lastUserScaleInjectedZoneRef.current !== 'perfect') {
              // Track that we observed perfect, but DON'T inject
              // USER_DISTANCE_PERFECT — READY_TO_COUNTDOWN below is the
              // single signal that "you're framed; here comes the count."
              // Sending both made Aoede say "perfect" then immediately
              // count, which read as rushing.
              lastUserScaleInjectedZoneRef.current = 'perfect';
            }

            /* The countdown gate. READY_TO_COUNTDOWN is the only event that
             * authorises Aoede to count down + call capture_now. We send it
             * exactly once per arm cycle, when ALL of the following are true:
             *   - a view is armed and the phone is level
             *   - zone has been 'perfect' continuously for PERFECT_STABILITY_MS
             *   - the client has been physically still (no motion) for STILLNESS_MS
             *   - enough time has passed since arm for Aoede's instruction
             *     to actually be heard (ARM_INSTRUCTION_GRACE_MS)
             * The stillness gate is what keeps her from counting down while
             * the client is still mid-step. */
            const armedAt = armedAtMsRef.current;
            const sinceArm = armedAt > 0 ? now - armedAt : 0;
            if (
              armedIdx !== null &&
              phoneLevel &&
              zone === 'perfect' &&
              isStill &&
              !readyToCountdownSentForArmRef.current &&
              now - lastNonPerfectAtMsRef.current >= PERFECT_STABILITY_MS &&
              sinceArm >= ARM_INSTRUCTION_GRACE_MS
            ) {
              readyToCountdownSentForArmRef.current = true;
              const armedView = viewsRef.current[armedIdx];
              const label = armedView?.label ?? `view-${armedIdx}`;
              logger.warn('[GEMINI_LIVE] Sending READY_TO_COUNTDOWN', 'GEMINI_LIVE', {
                armedView: armedIdx,
                label,
                stableMs: now - lastNonPerfectAtMsRef.current,
                stillnessMs,
                sinceArmMs: sinceArm,
              });
              void session.sendTextRealtime(geminiInjectionReadyToCountdown(label)).catch((err) => {
                logger.warn('[GEMINI_LIVE] READY_TO_COUNTDOWN injection failed', 'GEMINI_LIVE', err);
              });
            }
          }
        }
      }, CONFIG.AI.GEMINI.LIVE_FRAME_INTERVAL_MS);
    },
    [clearFrameInterval]
  );

  const shutdown = useCallback(async () => {
    framesPausedRef.current = true;
    armedAtMsRef.current = 0;
    armedViewRef.current = null;
    lastUserScaleInjectedZoneRef.current = 'uninitialized';
    readyToCountdownSentForArmRef.current = false;
    lastNotVisibleInjectAtRef.current = 0;
    lastObservedZoneRef.current = null;
    lastObservedScaleRef.current = null;
    lastMotionAtMsRef.current = Date.now();
    clearFrameInterval();
    const s = sessionRef.current;
    sessionRef.current = null;
    setIsSessionOpen(false);
    if (s && !s.isClosed) {
      await s.close().catch(() => {});
    }
    setConnectionStatus('idle');
    setConnectionError(null);
  }, [clearFrameInterval]);

  /**
   * Connect to Vertex Live.
   * @param fromUserGesture - When true (Enable camera / Retry tap), bypass `mayUseLiveSessionRef` gates so
   *   connect runs on the same intent as Web Audio unlock, before React commits permission state.
   */
  const beginLiveSession = useCallback(async (fromUserGesture = false) => {
    if (!mayUseLiveSessionRef.current && !fromUserGesture) {
      logger.warn('[COMPANION_PERM] beginLiveSession skip: mayUseLiveSession false, not user gesture');
      return;
    }
    if (liveSessionStartInFlightRef.current) {
      logger.warn('[COMPANION_PERM] beginLiveSession skip: start already in flight');
      return;
    }
    liveSessionStartInFlightRef.current = true;
    logger.warn('[COMPANION_PERM] beginLiveSession start', {
      fromUserGesture,
      mayUseLiveSession: mayUseLiveSessionRef.current,
    });
    try {
      cancelledRef.current = false;
      if (sessionRef.current) {
        await shutdown();
      }
      if (!mayUseLiveSessionRef.current && !fromUserGesture) return;
      warmupDoneRef.current = false;
      voiceGuideAudioStartedRef.current = false;
      waitingPoseNudgeSentRef.current = false;
      armedViewRef.current = null;
      transcriptionBufferRef.current = '';
      framesPausedRef.current = false;
      setConnectionStatus('connecting');
      setConnectionError(null);

      try {
        // Backend selection: see CONFIG.AI.GEMINI.LIVE_BACKEND for rationale.
        // Default 'vertex' matches the backend used elsewhere in the app
        // (postureAnalysis, BodyCompCompanionModal, ocrEngine, narratives).
        // Using GoogleAIBackend on a Vertex-only project causes the Live
        // WebSocket handshake to fail with "did not respond with a setupComplete
        // message" because the Gemini Developer API key is not provisioned.
        const liveBackend = CONFIG.AI.GEMINI.LIVE_BACKEND === 'google'
          ? new GoogleAIBackend()
          : new VertexAIBackend(CONFIG.AI.GEMINI.LIVE_LOCATION);
        const ai = getAI(getFirebaseApp(), { backend: liveBackend });
        const liveModel = getLiveGenerativeModel(ai, {
          model: CONFIG.AI.GEMINI.LIVE_MODEL_NAME,
          systemInstruction: GEMINI_FRAMING_SYSTEM_PROMPT,
          ...(CONFIG.AI.GEMINI.LIVE_ENABLE_TOOLS
            ? {
                tools: [CAPTURE_TOOL],
                toolConfig: {
                  functionCallingConfig: {
                    mode: FunctionCallingMode.AUTO,
                    allowedFunctionNames: [CAPTURE_FN_NAME],
                  },
                },
              }
            : {}),
          generationConfig: {
            responseModalities: [ResponseModality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: CONFIG.AI.GEMINI.LIVE_VOICE_NAME },
              },
            },
            outputAudioTranscription: {},
          },
        });
        const session = await liveModel.connect();
        if (cancelledRef.current) {
          await session.close().catch(() => {});
          setIsSessionOpen(false);
          setConnectionStatus('idle');
          return;
        }
        if (!mayUseLiveSessionRef.current && !fromUserGesture) {
          await session.close().catch(() => {});
          setIsSessionOpen(false);
          setConnectionStatus('idle');
          return;
        }
        sessionRef.current = session;
        setIsSessionOpen(true);
        setConnectionStatus('open');
        logger.warn('[COMPANION_PERM] Gemini Live connected (session open)', {
          backend: CONFIG.AI.GEMINI.LIVE_BACKEND,
          location: CONFIG.AI.GEMINI.LIVE_BACKEND === 'vertex'
            ? CONFIG.AI.GEMINI.LIVE_LOCATION
            : 'n/a',
          model: CONFIG.AI.GEMINI.LIVE_MODEL_NAME,
          voice: CONFIG.AI.GEMINI.LIVE_VOICE_NAME,
          toolsEnabled: CONFIG.AI.GEMINI.LIVE_ENABLE_TOOLS,
        });
        void receiveLoop(session);
        startJpegInterval(session);
        const fs = flowStateRef.current;
        if (fs === 'waiting_level' || fs === 'permissions') {
          // The OPENING_BRIEFING already ends with "hold the phone upright at about waist
          // height" and the first armed view tells them to stand in the guide box, so the
          // separate PHONE_STABLE_PORTRAIT nudge is redundant — and worse, it interrupts
          // the briefing the moment the user tilts their phone vertical mid-monologue
          // (which is the most common timing). Suppress it for the rest of this session.
          waitingPoseNudgeSentRef.current = true;
          void session.sendTextRealtime(geminiInjectionSessionConnected()).catch((err) => {
            logger.warn('[GEMINI_LIVE] opening prompt failed', 'GEMINI_LIVE', err);
          });
        } else if (fs === 'waiting_pose') {
          // Already past the briefing window (e.g. reconnect after backgrounding). Send the
          // shorter framing nudge so the client still gets a cue.
          waitingPoseNudgeSentRef.current = true;
          void session.sendTextRealtime(geminiInjectionPhoneStablePortrait()).catch((err) => {
            logger.warn('[GEMINI_LIVE] waiting_pose opening prompt failed', 'GEMINI_LIVE', err);
          });
        }
      } catch (e) {
        logger.error('[GEMINI_LIVE] Connection failed', 'GEMINI_LIVE', e);
        logger.warn('[COMPANION_PERM] Gemini Live connect failed (see GEMINI_LIVE error)', {
          backend: CONFIG.AI.GEMINI.LIVE_BACKEND,
          location: CONFIG.AI.GEMINI.LIVE_BACKEND === 'vertex'
            ? CONFIG.AI.GEMINI.LIVE_LOCATION
            : 'n/a',
          model: CONFIG.AI.GEMINI.LIVE_MODEL_NAME,
          toolsEnabled: CONFIG.AI.GEMINI.LIVE_ENABLE_TOOLS,
          message: e instanceof Error ? e.message : String(e),
        });
        setIsSessionOpen(false);
        setConnectionStatus('error');
        setConnectionError(e instanceof Error ? e.message : 'Could not connect to voice guide');
        onConnectionDiagnosticsRef.current?.(
          `Gemini Live connection failed [${CONFIG.AI.GEMINI.LIVE_BACKEND}/${CONFIG.AI.GEMINI.LIVE_MODEL_NAME}]: ${e instanceof Error ? e.message : String(e)}`,
          'error'
        );
      }
    } finally {
      liveSessionStartInFlightRef.current = false;
    }
  }, [receiveLoop, startJpegInterval, shutdown]);

  /**
   * Start Live when `mayUseLiveSession` becomes true while idle (e.g. effect ordering). Tap path uses
   * `beginLiveSession(true)` so connect is not blocked on ref lag. Do not auto-run while `error` — avoids
   * retry loops on persistent Vertex failures; user uses Retry (gesture) instead.
   */
  useEffect(() => {
    if (!mayUseLiveSession) return;
    if (connectionStatus !== 'idle') return;
    void beginLiveSession();
  }, [mayUseLiveSession, connectionStatus, beginLiveSession]);

  /**
   * Tear down Live only when we lose the right to use it (true → false). Avoid cleanup when flipping
   * false → true: the previous effect’s cleanup would otherwise run shutdown() and kill a session started
   * via beginLiveSession(true) before permissions committed.
   */
  useEffect(() => {
    const lostPermission = prevMayUseLiveSessionRef.current && !mayUseLiveSession;
    prevMayUseLiveSessionRef.current = mayUseLiveSession;

    if (lostPermission) {
      cancelledRef.current = true;
      setConnectionStatus('idle');
      setConnectionError(null);
      setIsSessionOpen(false);
      void shutdown();
    }
  }, [mayUseLiveSession, shutdown]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      void shutdown();
    };
  }, [shutdown]);

  /**
   * Backgrounding (e.g. iOS notification shade) often kills the Live WebSocket. When the user returns,
   * surface a clear error so they can Retry (which re-runs the audio primer on tap).
   */
  useEffect(() => {
    if (!mayUseLiveSession) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        const s = sessionRef.current;
        wasLiveActiveWhenHiddenRef.current = Boolean(s && !s.isClosed);
        framesPausedRef.current = true;
        return;
      }
      if (document.visibilityState !== 'visible') return;
      framesPausedRef.current = false;
      if (!wasLiveActiveWhenHiddenRef.current) return;
      wasLiveActiveWhenHiddenRef.current = false;
      const s = sessionRef.current;
      if (s && !s.isClosed) return;
      clearFrameInterval();
      sessionRef.current = null;
      setIsSessionOpen(false);
      setConnectionStatus('error');
      setConnectionError(
        'Voice guide disconnected when the app was in the background. Tap Retry to reconnect.',
      );
      onConnectionDiagnosticsRef.current?.(
        'Gemini Live disconnected after the app went to the background',
        'warn'
      );
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [mayUseLiveSession, clearFrameInterval]);

  /**
   * Safari (incl. mobile): create/resume AudioContext and run a silent primer synchronously in the user-gesture
   * turn. Call as the first line inside onClick before any await (Enable camera, Retry, etc.).
   */
  const unlockWebAudioOnUserGesture = useCallback(() => {
    try {
      playbackCtxRef.current = getOrCreatePrimedAudioContext(playbackCtxRef.current);
      nextPlayTimeRef.current = playbackCtxRef.current.currentTime;
      onConnectionDiagnosticsRef.current?.('Gemini Live audio output unlocked', 'info');
    } catch (e) {
      logger.warn('[GEMINI_LIVE] unlockWebAudioOnUserGesture', 'GEMINI_LIVE', e);
      onConnectionDiagnosticsRef.current?.(
        `Gemini Live audio unlock failed: ${e instanceof Error ? e.message : String(e)}`,
        'warn'
      );
    }
  }, [playbackCtxRef]);

  const startLiveSessionFromUserGesture = useCallback(() => {
    unlockWebAudioOnUserGesture();
    void beginLiveSession(true);
  }, [unlockWebAudioOnUserGesture, beginLiveSession]);

  const primeAudioOutput = useCallback(async () => {
    try {
      playbackCtxRef.current = getOrCreatePrimedAudioContext(playbackCtxRef.current);
      await playbackCtxRef.current.resume();
      nextPlayTimeRef.current = playbackCtxRef.current.currentTime;
    } catch (e) {
      logger.warn('[GEMINI_LIVE] primeAudioOutput', 'GEMINI_LIVE', e);
    }
  }, [playbackCtxRef]);

  const armShot = useCallback(async (viewIndex: number): Promise<boolean> => {
    const session = sessionRef.current;
    if (!session || session.isClosed) {
      logger.warn('[GEMINI_LIVE] armShot: no session', 'GEMINI_LIVE');
      return false;
    }
    const v = viewsRef.current[viewIndex];
    if (!v) {
      logger.warn('[GEMINI_LIVE] armShot: invalid view index', 'GEMINI_LIVE');
      return false;
    }
    transcriptionBufferRef.current = '';
    armedViewRef.current = viewIndex;
    armedAtMsRef.current = Date.now();
    framesPausedRef.current = false;
    lastUserScaleInjectedZoneRef.current = 'uninitialized';
    readyToCountdownSentForArmRef.current = false;
    lastNotVisibleInjectAtRef.current = 0;
    // Reset stability cursor so READY_TO_COUNTDOWN can't fire on a stale
    // 'perfect' streak from before arming (e.g. user was perfect during the
    // previous view, then walked over to look at the screen).
    lastNonPerfectAtMsRef.current = Date.now();
    // Reset motion observers — first frame after arming starts a fresh
    // stillness clock so we don't immediately blurt out a coaching line.
    lastObservedZoneRef.current = null;
    lastObservedScaleRef.current = null;
    lastMotionAtMsRef.current = Date.now();
    try {
      await session.sendTextRealtime(geminiInjectionArmView(v.label, v.instr));
      return true;
    } catch (e) {
      logger.warn('[GEMINI_LIVE] armShot send failed', 'GEMINI_LIVE', e);
      armedViewRef.current = null;
      armedAtMsRef.current = 0;
      return false;
    }
  }, []);

  const rejectShot = useCallback(async (
    viewIndex: number,
    failingRegions: readonly string[]
  ): Promise<boolean> => {
    const session = sessionRef.current;
    if (!session || session.isClosed) {
      logger.warn('[GEMINI_LIVE] rejectShot: no session', 'GEMINI_LIVE');
      return false;
    }
    const v = viewsRef.current[viewIndex];
    if (!v) {
      logger.warn('[GEMINI_LIVE] rejectShot: invalid view index', 'GEMINI_LIVE');
      return false;
    }
    transcriptionBufferRef.current = '';
    armedViewRef.current = viewIndex;
    armedAtMsRef.current = Date.now();
    framesPausedRef.current = false;
    lastUserScaleInjectedZoneRef.current = 'uninitialized';
    readyToCountdownSentForArmRef.current = false;
    lastNotVisibleInjectAtRef.current = 0;
    lastNonPerfectAtMsRef.current = Date.now();
    lastObservedZoneRef.current = null;
    lastObservedScaleRef.current = null;
    lastMotionAtMsRef.current = Date.now();
    try {
      await session.sendTextRealtime(geminiInjectionCaptureRejected(v.label, failingRegions));
      return true;
    } catch (e) {
      logger.warn('[GEMINI_LIVE] rejectShot send failed', 'GEMINI_LIVE', e);
      armedViewRef.current = null;
      armedAtMsRef.current = 0;
      return false;
    }
  }, []);

  const retry = useCallback(() => {
    startLiveSessionFromUserGesture();
  }, [startLiveSessionFromUserGesture]);

  /** When the phone tilts — one short Gemini reminder (throttled). */
  const captureFallbackMs = CONFIG.AI.GEMINI.LIVE_CAPTURE_FALLBACK_MS;

  useEffect(() => {
    if (captureFallbackMs <= 0) return;
    if (connectionStatus !== 'open') return;
    const id = window.setInterval(() => {
      const idx = armedViewRef.current;
      if (idx === null) return;
      const started = armedAtMsRef.current;
      if (!started) return;
      if (Date.now() - started < captureFallbackMs) return;
      logger.warn('[GEMINI_LIVE] Capture fallback: no phrase detected, firing shot', {
        viewIndex: idx,
        waitedMs: Date.now() - started,
      });
      armedAtMsRef.current = 0;
      armedViewRef.current = null;
      transcriptionBufferRef.current = '';
      framesPausedRef.current = true;
      void Promise.resolve(onShotTriggerRef.current(idx)).catch((e) => {
        logger.error('[GEMINI_LIVE] onShotTrigger (fallback) failed', 'GEMINI_LIVE', e);
      });
    }, 2000);
    return () => window.clearInterval(id);
  }, [connectionStatus, captureFallbackMs]);

  const nudgeLevelPhone = useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.isClosed) return;
    const now = Date.now();
    if (now - lastLevelVoiceNudgeAtRef.current < 4500) return;
    lastLevelVoiceNudgeAtRef.current = now;
    void session.sendTextRealtime(geminiInjectionPhoneNotLevel())
      .catch((err) => {
        logger.warn('[GEMINI_LIVE] nudgeLevelPhone failed', 'GEMINI_LIVE', err);
      });
  }, []);

  return {
    unlockWebAudioOnUserGesture,
    startLiveSessionFromUserGesture,
    primeAudioOutput,
    armShot,
    rejectShot,
    shutdown,
    retry,
    nudgeLevelPhone,
    isSessionOpen,
    connectionStatus,
    connectionError,
  };
}
