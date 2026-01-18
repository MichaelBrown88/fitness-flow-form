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
  sessionId?: string; // For logging
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
  sessionId,
}: UseSequenceManagerOptions): UseSequenceManagerResult {
  const setViewIdx = externalSetViewIdx;

  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSequenceActive, setIsSequenceActive] = useState(false);

  const onCaptureRef = useRef(onCapture);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLockedRef = useRef(false); // Prevent multiple sequences from starting
  const sessionIdRef = useRef<string | undefined>(sessionId); // For logging

  // Keep refs updated
  useEffect(() => {
    onCaptureRef.current = onCapture;
    sessionIdRef.current = sessionId;
  }, [onCapture, sessionId]);

  const resetSequence = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setIsSequenceActive(false);
    setCountdown(null);
    isLockedRef.current = false;
  }, []);

  const startSequence = useCallback(
    async (idx: number) => {
      // CRITICAL: Check lock SYNCHRONOUSLY before any async operations
      if (isLockedRef.current || isSequenceActive) {
        // Log synchronously to avoid async delay
        console.log(`[SEQUENCE ${idx}] Sequence already active/locked - ignoring (active: ${isSequenceActive}, locked: ${isLockedRef.current})`);
        if (sessionIdRef.current) {
          // Fire and forget async log
          import('@/services/liveSessions').then(({ logCompanionMessage }) => {
            logCompanionMessage(sessionIdRef.current!, `Sequence already active/locked - ignoring startSequence call (idx: ${idx}, active: ${isSequenceActive}, locked: ${isLockedRef.current})`, 'warn');
          }).catch(() => {});
        }
        return;
      }

      // LOCK the sequence immediately (synchronously)
      isLockedRef.current = true;

      // Log to Firestore for desktop visibility
      const logMessage = async (msg: string, level: 'info' | 'warn' | 'error' = 'info') => {
        if (sessionIdRef.current) {
          try {
            const { logCompanionMessage } = await import('@/services/liveSessions');
            await logCompanionMessage(sessionIdRef.current, msg, level);
          } catch (err) {
            console.error('[SEQUENCE] Failed to log:', err);
          }
        }
        console.log(`[SEQUENCE ${idx}] ${msg}`);
      };

      await logMessage(`startSequence called for view ${idx}`, 'info');
      await logMessage(`Sequence LOCKED for view ${idx}`, 'info');

      if (mode === 'inbody') {
        await logMessage('InBody mode - capturing immediately', 'info');
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
      const viewName = viewNames[idx] || views[idx]?.label || 'Next view';
      await logMessage(`Starting sequence for: ${viewName}`, 'info');
      onAudioFeedback?.(viewName);

      // Start countdown immediately (5 seconds) - using config value
      const countdownSeconds = 5; // CONFIG.COMPANION.CAPTURE.COUNTDOWN_SEC
      const countRef = { current: countdownSeconds };
      setCountdown(countdownSeconds);
      await logMessage(`Countdown started: ${countdownSeconds} seconds`, 'info');
      // Only speak last 3 seconds like the old version
      if (countdownSeconds <= 3) {
        onAudioFeedback?.(countdownSeconds.toString());
      }

      countdownIntervalRef.current = setInterval(() => {
        countRef.current -= 1;
        const currentCount = countRef.current;
        
        if (currentCount > 0) {
          setCountdown(currentCount);
          // Only speak last 3 seconds (like old version)
          if (currentCount <= 3) {
            onAudioFeedback?.(currentCount.toString());
          }
        } else {
          // Countdown finished - capture!
          const logMessage = async (msg: string, level: 'info' | 'warn' | 'error' = 'info') => {
            if (sessionIdRef.current) {
              try {
                const { logCompanionMessage } = await import('@/services/liveSessions');
                await logCompanionMessage(sessionIdRef.current, msg, level);
              } catch (err) {
                console.error('[SEQUENCE] Failed to log:', err);
              }
            }
            console.log(`[SEQUENCE ${idx}] ${msg}`);
          };
          
          logMessage(`Countdown finished - capturing now`, 'info');
          setCountdown(null);
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
        
          // Capture the image
          onCaptureRef.current(idx)
            .then(async () => {
              await logMessage(`Capture completed successfully for view ${idx}`, 'info');
              
              // If not the last view, prompt to turn and continue sequence
              if (idx < views.length - 1) {
                // Keep lock during turn prompt and next sequence start
                const nextIdx = idx + 1;
                logMessage(`Prompting for next view: ${nextIdx}`, 'info');
                onAudioFeedback?.('Turn to your right');
                
                // After turn prompt, automatically start next sequence (3 seconds like old version)
                setTimeout(() => {
                  // Reset current sequence state but keep lock
                  setIsSequenceActive(false);
                  setCountdown(null);
                  logMessage(`Starting next sequence for view ${nextIdx}`, 'info');
                  // Start next sequence (lock will be checked and maintained)
                  startSequenceRef.current(nextIdx);
                }, 3000);
              } else {
                // Last view - unlock and complete
                setIsSequenceActive(false);
                isLockedRef.current = false;
                logMessage('All views captured - sequence complete', 'info');
              }
            })
            .catch(async (err) => {
              await logMessage(`Capture failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
              console.error('[POSTURE] Capture failed', err);
              setIsSequenceActive(false);
              isLockedRef.current = false; // UNLOCK on error
            });
        }
      }, 1000);
    },
    [mode, views, onAudioFeedback, resetSequence, setViewIdx]
  );

  // Store startSequence in ref to avoid dependency issues
  const startSequenceRef = useRef(startSequence);
  useEffect(() => {
    startSequenceRef.current = startSequence;
  }, [startSequence]);

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
