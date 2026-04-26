/**
 * Hook for audio feedback and speech synthesis
 * Extracted from Companion.tsx to improve maintainability
 */

import { useState, useEffect, useRef, type MutableRefObject } from 'react';
import { CONFIG } from '@/config';
import { logger } from '@/lib/utils/logger';
import { playCompanionShutterClick } from '@/lib/utils/companionShutterClick';

/** Aligns with `GeminiLiveConnectionStatus` from `useGeminiFramingGuide` (avoid circular imports). */
export type LegacyTtsGeminiConnectionStatus = 'idle' | 'connecting' | 'open' | 'error';

export interface LegacyTtsGateRefValue {
  geminiEnabled: boolean;
  geminiConnectionStatus: LegacyTtsGeminiConnectionStatus;
  /**
   * Posture + Gemini Live: suppress all `speechSynthesis` (countdown, cues) so only Live speaks.
   * Permission unlock line may still run with `speak(..., true)`.
   */
  postureGeminiHandoff?: boolean;
}

export interface UseAudioFeedbackOptions {
  /**
   * Parent keeps this ref in sync (e.g. via `useLayoutEffect`). When Gemini Live is enabled and
   * connecting/open, `speak` becomes a no-op so `speechSynthesis` cannot fight PCM playback.
   */
  legacyTtsGateRef?: MutableRefObject<LegacyTtsGateRefValue>;
}

interface UseAudioFeedbackResult {
  /** Pass `bypassSuppression: true` only for the permission-unlock phrase (mobile Safari). */
  speak: (text: string, bypassSuppression?: boolean) => void;
  requestPermission: (options?: { speakUnlockPhrase?: boolean }) => Promise<void>;
  hasPermission: boolean;
}

export function shouldSuppressLegacyTts(gate: LegacyTtsGateRefValue | undefined): boolean {
  if (!gate?.geminiEnabled) return false;
  if (gate.postureGeminiHandoff) return true;
  return gate.geminiConnectionStatus === 'connecting' || gate.geminiConnectionStatus === 'open';
}

export function useAudioFeedback(options?: UseAudioFeedbackOptions): UseAudioFeedbackResult {
  /**
   * Gated by the user tapping “Enable camera & motion” (or equivalent). Starts false on all platforms so
   * Companion always runs the same gesture stack — including `startLiveSessionFromUserGesture()` — and we
   * never confuse motion permission with speech/audio readiness.
   */
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  useEffect(() => {
    const warmVoices = () => {
      try {
        void window.speechSynthesis.getVoices();
      } catch {
        /* ignore */
      }
    };
    warmVoices();
    window.speechSynthesis.addEventListener('voiceschanged', warmVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', warmVoices);
  }, []);

  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const voiceLoggedRef = useRef(false);

  const pickBestVoice = (): SpeechSynthesisVoice | null => {
    if (selectedVoiceRef.current) return selectedVoiceRef.current;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;
    const enVoices = voices.filter((v) => v.lang.startsWith('en'));
    if (enVoices.length === 0) return null;

    const pick =
      enVoices.find((v) => /premium/i.test(v.name) && /Zoe|Samantha|Karen/i.test(v.name)) ||
      enVoices.find((v) => /premium/i.test(v.name)) ||
      enVoices.find((v) => /enhanced/i.test(v.name) && /Samantha|Karen|Daniel/i.test(v.name)) ||
      enVoices.find((v) => /enhanced/i.test(v.name)) ||
      enVoices.find((v) => /Samantha|Karen|Moira|Daniel/i.test(v.name)) ||
      enVoices.find((v) => /Google US English/i.test(v.name)) ||
      enVoices.find((v) => !v.localService) ||
      enVoices.find((v) => v.default) ||
      enVoices[0];

    if (pick) {
      selectedVoiceRef.current = pick;
      if (!voiceLoggedRef.current) {
        logger.warn('[AUDIO] Selected voice:', pick.name, pick.lang, pick.localService ? 'local' : 'network');
        voiceLoggedRef.current = true;
      }
    }
    return pick ?? null;
  };

  const speak = (text: string, bypassSuppression = false) => {
    const gate = options?.legacyTtsGateRef?.current;
    const geminiEnabled = gate?.geminiEnabled ?? false;
    const geminiConnectionStatus = gate?.geminiConnectionStatus ?? 'idle';
    const suppressLegacyTts = !bypassSuppression && shouldSuppressLegacyTts(gate);
    logger.debug('[TTS] speak() called', {
      text,
      geminiEnabled,
      geminiConnectionStatus,
      suppressLegacyTts,
      bypassSuppression,
    });
    if (suppressLegacyTts) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = CONFIG.COMPANION.AUDIO.SPEECH_RATE;
      utterance.pitch = 0.95;
      utterance.volume = 1.0;
      const voice = pickBestVoice();
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      logger.warn('[AUDIO] Speech failed:', e);
    }
  };

  const requestPermission = async (options?: { speakUnlockPhrase?: boolean }) => {
    logger.warn('[COMPANION_PERM] useAudioFeedback.requestPermission: enter');
    try {
      playCompanionShutterClick();
      if (options?.speakUnlockPhrase !== false) {
        speak("Great, I can hear you. Let's get started.", true);
      }
    } catch (e) {
      logger.warn('[COMPANION_PERM] useAudioFeedback chime/speak failed', e);
    }
    // SpeechSynthesis is unlocked by this user-initiated call. Do NOT use DeviceOrientationEvent here —
    // that belongs in `useOrientationDetection` only; mixing the two broke some mobile Safari flows (wrong prompt, never
    // reaching `hasAudioPermission && hasOrientationPermission`).
    setHasPermission(true);
    logger.warn('[COMPANION_PERM] useAudioFeedback.requestPermission: hasAudioPermission -> true');
  };

  return {
    speak,
    requestPermission,
    hasPermission,
  };
}

