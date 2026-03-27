/**
 * Gemini Live session for Companion posture framing (audio out + ~1 FPS JPEG in).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getApp } from 'firebase/app';
import {
  getAI,
  VertexAIBackend,
  getLiveGenerativeModel,
  ResponseModality,
  type LiveSession,
} from 'firebase/ai';
import { CONFIG } from '@/config';
import { GEMINI_FRAMING_SYSTEM_PROMPT } from '@/constants/geminiFramingPrompt';
import { logger } from '@/lib/utils/logger';

const OUTPUT_PCM_SAMPLE_RATE_HZ = 24000;

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

function transcriptionContainsCaptureTrigger(buffer: string): boolean {
  return normalizeTranscriptionForTrigger(buffer).includes('perfect \u2014 capturing now');
}

export type CompanionFlowState =
  | 'permissions'
  | 'waiting_level'
  | 'waiting_pose'
  | 'ready'
  | 'capturing'
  | 'complete';

export interface UseGeminiFramingGuideOptions {
  enabled: boolean;
  flowState: CompanionFlowState;
  views: ReadonlyArray<{ readonly id: string; readonly label: string; readonly instr: string }>;
  getVideoElement: () => HTMLVideoElement | null;
  mirrored: boolean;
  onWarmupComplete: () => void;
  onShotTrigger: (viewIndex: number) => void | Promise<void>;
}

export type GeminiLiveConnectionStatus = 'idle' | 'connecting' | 'open' | 'error';

export interface UseGeminiFramingGuideResult {
  primeAudioOutput: () => Promise<void>;
  armShot: (viewIndex: number) => Promise<void>;
  shutdown: () => Promise<void>;
  retry: () => void;
  isSessionOpen: boolean;
  connectionStatus: GeminiLiveConnectionStatus;
  connectionError: string | null;
}

export function useGeminiFramingGuide({
  enabled,
  flowState,
  views,
  getVideoElement,
  mirrored,
  onWarmupComplete,
  onShotTrigger,
}: UseGeminiFramingGuideOptions): UseGeminiFramingGuideResult {
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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef(0);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [connectNonce, setConnectNonce] = useState(0);
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

  const clearFrameInterval = useCallback(() => {
    if (frameIntervalRef.current != null) {
      window.clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  }, []);

  const queuePcmAudio = useCallback((base64: string) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
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
  }, []);

  const receiveLoop = useCallback(
    async (session: LiveSession) => {
      try {
        for await (const msg of session.receive()) {
          if (cancelledRef.current || session.isClosed) break;
          if (!msg || typeof msg !== 'object') continue;
          const m = msg as { type?: string };
          if (m.type !== 'serverContent') continue;

          const sc = msg as {
            turnComplete?: boolean;
            outputTranscription?: { text?: string };
            modelTurn?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
          };

          if (
            sc.turnComplete &&
            flowStateRef.current === 'waiting_pose' &&
            !warmupDoneRef.current
          ) {
            warmupDoneRef.current = true;
            framesPausedRef.current = true;
            onWarmupCompleteRef.current();
          }

          if (sc.outputTranscription?.text) {
            transcriptionBufferRef.current += sc.outputTranscription.text;
            if (
              armedViewRef.current !== null &&
              transcriptionContainsCaptureTrigger(transcriptionBufferRef.current)
            ) {
              const idx = armedViewRef.current;
              armedViewRef.current = null;
              transcriptionBufferRef.current = '';
              framesPausedRef.current = true;
              void Promise.resolve(onShotTriggerRef.current(idx)).catch((e) => {
                logger.error('[GEMINI_LIVE] onShotTrigger failed', 'GEMINI_LIVE', e);
              });
            }
          }

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
    [queuePcmAudio]
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
      }, CONFIG.AI.GEMINI.LIVE_FRAME_INTERVAL_MS);
    },
    [clearFrameInterval]
  );

  const shutdown = useCallback(async () => {
    framesPausedRef.current = true;
    clearFrameInterval();
    const s = sessionRef.current;
    sessionRef.current = null;
    setIsSessionOpen(false);
    if (s && !s.isClosed) {
      await s.close().catch(() => {});
    }
  }, [clearFrameInterval]);

  useEffect(() => {
    if (!enabled) {
      cancelledRef.current = true;
      setConnectionStatus('idle');
      setConnectionError(null);
      void shutdown();
      return;
    }

    cancelledRef.current = false;
    warmupDoneRef.current = false;
    armedViewRef.current = null;
    transcriptionBufferRef.current = '';
    framesPausedRef.current = false;
    setConnectionStatus('connecting');
    setConnectionError(null);

    const run = async () => {
      try {
        const ai = getAI(getApp(), { backend: new VertexAIBackend() });
        const liveModel = getLiveGenerativeModel(ai, {
          model: CONFIG.AI.GEMINI.LIVE_MODEL_NAME,
          systemInstruction: GEMINI_FRAMING_SYSTEM_PROMPT,
          generationConfig: {
            responseModalities: [ResponseModality.AUDIO],
            outputAudioTranscription: {},
          },
        });
        const session = await liveModel.connect();
        if (cancelledRef.current) {
          await session.close().catch(() => {});
          return;
        }
        sessionRef.current = session;
        setIsSessionOpen(true);
        setConnectionStatus('open');
        void receiveLoop(session);
        startJpegInterval(session);
      } catch (e) {
        logger.error('[GEMINI_LIVE] connect failed', 'GEMINI_LIVE', e);
        setIsSessionOpen(false);
        setConnectionStatus('error');
        setConnectionError(e instanceof Error ? e.message : 'Could not connect to voice guide');
      }
    };

    void run();

    return () => {
      cancelledRef.current = true;
      void shutdown();
    };
  }, [enabled, connectNonce, receiveLoop, startJpegInterval, shutdown]);

  const primeAudioOutput = useCallback(async () => {
    type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };
    const Ctx = window.AudioContext || (window as WindowWithWebkit).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new Ctx();
    }
    await audioCtxRef.current.resume();
    nextPlayTimeRef.current = audioCtxRef.current.currentTime;
  }, []);

  const armShot = useCallback(async (viewIndex: number) => {
    const session = sessionRef.current;
    if (!session || session.isClosed) {
      logger.warn('[GEMINI_LIVE] armShot: no session', 'GEMINI_LIVE');
      return;
    }
    transcriptionBufferRef.current = '';
    armedViewRef.current = viewIndex;
    framesPausedRef.current = false;
    const v = viewsRef.current[viewIndex];
    if (!v) return;
    const line = `We are capturing view: ${v.label}. Instruction for the client: ${v.instr}. When framing is correct, say the capture phrase exactly.`;
    await session.sendTextRealtime(line);
  }, []);

  const retry = useCallback(() => {
    setConnectNonce((n) => n + 1);
  }, []);

  return {
    primeAudioOutput,
    armShot,
    shutdown,
    retry,
    isSessionOpen,
    connectionStatus,
    connectionError,
  };
}
