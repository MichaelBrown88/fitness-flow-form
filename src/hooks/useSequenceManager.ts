/**
 * Hook for managing capture sequence and countdown
 * SIMPLIFIED: Start countdown immediately on tap
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSequenceManagerOptions {
  mode: 'posture' | 'inbody';
  views: ReadonlyArray<{ readonly id: string; readonly label: string }>;
  onAudioFeedback?: (text: string) => void;
  onCapture: (viewIdx: number) => Promise<void>;
  // External state management (shared with parent component)
  externalViewIdx: number;
  externalSetViewIdx: React.Dispatch<React.SetStateAction<number>>;
}

interface UseSequenceManagerResult {
  countdown: number | null;
  isSequenceActive: boolean;
  startSequence: (idx: number) => void;
  resetSequence: () => void;
}

export function useSequenceManager({
  mode,
  views,
  onAudioFeedback,
  onCapture,
  externalViewIdx,
  externalSetViewIdx,
}: UseSequenceManagerOptions): UseSequenceManagerResult {
  const setViewIdx = externalSetViewIdx;

  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSequenceActive, setIsSequenceActive] = useState(false);

  const onCaptureRef = useRef(onCapture);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep onCapture ref updated to avoid stale closures in timers
  useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

  const resetSequence = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setIsSequenceActive(false);
    setCountdown(null);
  }, []);

  const startSequence = useCallback(
    (idx: number) => {
      if (mode === 'inbody') {
        onCaptureRef.current(idx);
        return;
      }

      // Clear any existing sequence
      resetSequence();

      // Set the view index
      setViewIdx(idx);
      setIsSequenceActive(true);

      // Audio feedback for the view
      const viewNames = ['Front', 'Right Side', 'Back', 'Left Side'];
      onAudioFeedback?.(viewNames[idx] || views[idx]?.label || 'Next view');

      // Start countdown immediately (3 seconds)
      setCountdown(3);
      onAudioFeedback?.('3');

      let count = 3;
      countdownIntervalRef.current = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdown(count);
          onAudioFeedback?.(count.toString());
        } else {
          // Countdown finished - capture!
          setCountdown(null);
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          
          // Capture the image
          onCaptureRef.current(idx);
          
          // Reset after capture
          setTimeout(() => {
            setIsSequenceActive(false);
          }, 500);
        }
      }, 1000);
    },
    [mode, views, onAudioFeedback, resetSequence, setViewIdx]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetSequence();
    };
  }, [resetSequence]);

  return {
    countdown,
    isSequenceActive,
    startSequence,
    resetSequence,
  };
}
