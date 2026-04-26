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
  geminiInjectionArmView,
  geminiInjectionCaptureRejected,
  geminiInjectionPhoneNotLevel,
  geminiInjectionPhoneStablePortrait,
  geminiInjectionSessionConnected,
  geminiInjectionUserDistancePerfect,
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

  /** Re-allow waiting_pose nudge after user tilts back to waiting_level (lost vertical). */
  useEffect(() => {
    const prev = prevFlowStateForNudgeRef.current;
    prevFlowStateForNudgeRef.current = flowState;
    if (prev === 'waiting_pose' && flowState === 'waiting_level') {
      waitingPoseNudgeSentRef.current = false;
    }
  }, [flowState]);

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
              for (const fc of calls) {
                if (fc.name === CAPTURE_FN_NAME) {
                  logger.warn('[GEMINI_LIVE] capture_now tool call received', 'GEMINI_LIVE', {
                    armedView: armedViewRef.current,
                  });
                  fireCaptureTrigger();
                  responses.push({ id: fc.id, name: CAPTURE_FN_NAME, response: { captured: true } });
                }
              }
              if (responses.length > 0) {
                /* 3.1 synchronous function calling: model blocks until we respond. */
                try {
                  await session.sendFunctionResponses(responses);
                } catch (e) {
                  logger.warn('[GEMINI_LIVE] sendFunctionResponses failed', 'GEMINI_LIVE', e);
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
        if (liveRef && allowDistance) {
          const { zone } = liveRef.current;
          if (zone === 'absent') {
            lastUserScaleInjectedZoneRef.current = 'absent';
          } else {
            const lastZ = lastUserScaleInjectedZoneRef.current;
            const now = Date.now();
            if (zone !== lastZ && now - lastUserScaleInjectAtRef.current >= 1200) {
              lastUserScaleInjectedZoneRef.current = zone;
              lastUserScaleInjectAtRef.current = now;
              const payload =
                zone === 'too_close'
                  ? geminiInjectionUserTooClose()
                  : zone === 'too_far'
                    ? geminiInjectionUserTooFar()
                    : geminiInjectionUserDistancePerfect();
              void session.sendTextRealtime(payload).catch((err) => {
                logger.warn('[GEMINI_LIVE] user scale injection failed', 'GEMINI_LIVE', err);
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
        const ai = getAI(getFirebaseApp(), { backend: new GoogleAIBackend() });
        const liveModel = getLiveGenerativeModel(ai, {
          model: CONFIG.AI.GEMINI.LIVE_MODEL_NAME,
          systemInstruction: GEMINI_FRAMING_SYSTEM_PROMPT,
          tools: [CAPTURE_TOOL],
          toolConfig: {
            functionCallingConfig: {
              mode: FunctionCallingMode.AUTO,
              allowedFunctionNames: [CAPTURE_FN_NAME],
            },
          },
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
        logger.warn('[COMPANION_PERM] Gemini Live connected (session open)');
        void receiveLoop(session);
        startJpegInterval(session);
        const fs = flowStateRef.current;
        if (fs === 'waiting_level' || fs === 'permissions') {
          void session.sendTextRealtime(geminiInjectionSessionConnected()).catch((err) => {
            logger.warn('[GEMINI_LIVE] opening prompt failed', 'GEMINI_LIVE', err);
          });
        } else if (fs === 'waiting_pose') {
          waitingPoseNudgeSentRef.current = true;
          void session.sendTextRealtime(geminiInjectionPhoneStablePortrait()).catch((err) => {
            logger.warn('[GEMINI_LIVE] waiting_pose opening prompt failed', 'GEMINI_LIVE', err);
          });
        }
      } catch (e) {
        logger.error('[GEMINI_LIVE] Connection failed', 'GEMINI_LIVE', e);
        logger.warn('[COMPANION_PERM] Gemini Live connect failed (see GEMINI_LIVE error)', {
          message: e instanceof Error ? e.message : String(e),
        });
        setIsSessionOpen(false);
        setConnectionStatus('error');
        setConnectionError(e instanceof Error ? e.message : 'Could not connect to voice guide');
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
    } catch (e) {
      logger.warn('[GEMINI_LIVE] unlockWebAudioOnUserGesture', 'GEMINI_LIVE', e);
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
