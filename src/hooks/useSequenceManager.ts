/**
 * Hook for managing capture sequence and countdown
 * Extracted from Companion.tsx to improve maintainability
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { CONFIG } from '@/config';

interface UseSequenceManagerOptions {
  mode: 'posture' | 'inbody';
  views: ReadonlyArray<{ readonly id: string; readonly label: string }>;
  onAudioFeedback?: (text: string) => void;
  onCapture: (viewIdx: number) => Promise<void>;
  isVertical: boolean;
  isPoseReady: boolean;
  // External state management (shared with parent component)
  externalViewIdx: number;
  externalSetViewIdx: React.Dispatch<React.SetStateAction<number>>;
  externalIsWaitingForPosition: boolean;
  externalSetIsWaitingForPosition: React.Dispatch<React.SetStateAction<boolean>>;
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
  isVertical,
  isPoseReady,
  externalViewIdx,
  externalSetViewIdx,
  externalIsWaitingForPosition,
  externalSetIsWaitingForPosition,
}: UseSequenceManagerOptions): UseSequenceManagerResult {
  // Use external state instead of internal
  const viewIdx = externalViewIdx;
  const setViewIdx = externalSetViewIdx;
  const isWaitingForPosition = externalIsWaitingForPosition;
  const setIsWaitingForPosition = externalSetIsWaitingForPosition;

  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSequenceActive, setIsSequenceActive] = useState(false);

  const isSequenceActiveRef = useRef(false);
  const viewIdxRef = useRef(0);
  const isPoseReadyRef = useRef(isPoseReady);
  const checkPositionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const nextSequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isPoseReadyRef.current = isPoseReady;
  }, [isPoseReady]);

  useEffect(() => {
    viewIdxRef.current = viewIdx;
  }, [viewIdx]);

  const resetSequence = useCallback(() => {
    if (checkPositionIntervalRef.current) {
      clearInterval(checkPositionIntervalRef.current);
      checkPositionIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (nextSequenceTimeoutRef.current) {
      clearTimeout(nextSequenceTimeoutRef.current);
      nextSequenceTimeoutRef.current = null;
    }
    setIsSequenceActive(false);
    setIsWaitingForPosition(false);
    setCountdown(null);
    isSequenceActiveRef.current = false;
  }, []);

  const startSequence = useCallback(
    (idx: number) => {
      if (mode === 'inbody') {
        onCapture(idx);
        return;
      }

      // Defensive cleanup: clear ALL existing timers
      resetSequence();

      // Ensure state is updated to the current index immediately
      setViewIdx(idx);

      // Allow capture even if phone isn't perfectly vertical - just warn
      if (!isVertical) {
        onAudioFeedback?.('Try to keep phone level.');
      }

      setIsWaitingForPosition(true);
      setIsSequenceActive(true);
      isSequenceActiveRef.current = true;

      const captureInstructions = [
        'Face the camera',
        'Turn a quarter turn to your right',
        'Turn a quarter turn more to your right',
        'Turn a quarter turn more to your right',
      ];
      onAudioFeedback?.(`Prepare for ${views[idx].label}. ${captureInstructions[idx]}.`);

      const startCountdownAndCapture = () => {
        setIsWaitingForPosition(false);
        setCountdown(3);

        let count = 3;
        countdownIntervalRef.current = setInterval(() => {
          count -= 1;
          if (count > 0) {
            setCountdown(count);
            onAudioFeedback?.(count.toString());
          } else {
            setCountdown(null);
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            onCapture(idx);
          }
        }, 1000);
      };

      // Wait for pose to be ready before starting countdown
      if (isPoseReady) {
        startCountdownAndCapture();
      } else {
        // Check every 500ms if pose is ready
        checkPositionIntervalRef.current = setInterval(() => {
          if (isPoseReadyRef.current) {
            if (checkPositionIntervalRef.current) {
              clearInterval(checkPositionIntervalRef.current);
              checkPositionIntervalRef.current = null;
            }
            startCountdownAndCapture();
          }
        }, 500);

        // Timeout after 30 seconds
        setTimeout(() => {
          if (checkPositionIntervalRef.current) {
            clearInterval(checkPositionIntervalRef.current);
            checkPositionIntervalRef.current = null;
          }
          if (isSequenceActiveRef.current) {
            onAudioFeedback?.('Position timeout. Please try again.');
            resetSequence();
          }
        }, 30000);
      }
    },
    [mode, views, onAudioFeedback, onCapture, isVertical, isPoseReady, resetSequence]
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

