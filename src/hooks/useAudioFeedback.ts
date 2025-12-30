/**
 * Hook for audio feedback and speech synthesis
 * Extracted from Companion.tsx to improve maintainability
 */

import { useState, useRef, useEffect } from 'react';
import { CONFIG } from '@/config';

interface UseAudioFeedbackResult {
  speak: (text: string) => void;
  requestPermission: () => Promise<void>;
  hasPermission: boolean;
}

export function useAudioFeedback(): UseAudioFeedbackResult {
  const shutterAudio = useRef<HTMLAudioElement | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(() => {
    const DeviceOrientationEventAny = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    return typeof DeviceOrientationEventAny.requestPermission !== 'function';
  });

  useEffect(() => {
    try {
      shutterAudio.current = new Audio(CONFIG.COMPANION.AUDIO.SHUTTER_URL);
    } catch (e) {
      console.warn('[COMPANION] Audio initialization failed:', e);
    }
  }, []);

  const speak = (text: string) => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = CONFIG.COMPANION.AUDIO.SPEECH_RATE;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[AUDIO] Speech failed:', e);
    }
  };

  const requestPermission = async () => {
    try {
      if (shutterAudio.current) {
        await shutterAudio.current.play().catch(() => {});
        shutterAudio.current.pause();
        shutterAudio.current.currentTime = 0;
      }
      speak('Audio enabled.');
    } catch (e) {
      // Ignore errors
    }

    const DeviceOrientationEventAny = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof DeviceOrientationEventAny.requestPermission === 'function') {
      const state = await DeviceOrientationEventAny.requestPermission();
      if (state === 'granted') setHasPermission(true);
    } else {
      setHasPermission(true);
    }
  };

  return {
    speak,
    requestPermission,
    hasPermission,
  };
}

