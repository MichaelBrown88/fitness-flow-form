/**
 * Hook for managing capture sequence and countdown
 * 
 * Zero-Button Flow:
 * 1. User taps "Start Capture" once
 * 2. System automatically progresses through all 4 views
 * 3. Each view: countdown -> capture -> "Turn right" -> next view
 * 4. User can cancel at any time with cancelSequence()
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSequenceManagerOptions {
  mode: 'posture' | 'inbody';
  views: ReadonlyArray<{ readonly id: string; readonly label: string }>;
  onAudioFeedback?: (text: string, force?: boolean) => void;
  onCapture: (viewIdx: number) => Promise<void>;
  // External state management (shared with parent component)
  externalViewIdx: number;
  externalSetViewIdx: React.Dispatch<React.SetStateAction<number>>;
  sessionId?: string; // For logging
  onSequenceComplete?: () => void; // Called when all views captured
  onSequenceCancelled?: () => void; // Called when sequence is cancelled
}

interface UseSequenceManagerResult {
  countdown: number | null;
  isSequenceActive: boolean;
  startSequence: (idx: number) => void;
  resetSequence: () => void;
  cancelSequence: () => void; // New: allows user to abort sequence
  currentViewIdx: number; // Current view being captured
}

export function useSequenceManager({
  mode,
  views,
  onAudioFeedback,
  onCapture,
  externalViewIdx,
  externalSetViewIdx,
  sessionId,
  onSequenceComplete,
  onSequenceCancelled,
}: UseSequenceManagerOptions): UseSequenceManagerResult {
  const setViewIdx = externalSetViewIdx;

  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSequenceActive, setIsSequenceActive] = useState(false);
  const [currentViewIdx, setCurrentViewIdx] = useState(0);

  const onCaptureRef = useRef(onCapture);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const turnDelayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLockedRef = useRef(false); // Prevent multiple sequences from starting
  const isCancelledRef = useRef(false); // Track if sequence was cancelled
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
    if (turnDelayTimeoutRef.current) {
      clearTimeout(turnDelayTimeoutRef.current);
      turnDelayTimeoutRef.current = null;
    }
    setIsSequenceActive(false);
    setCountdown(null);
    isLockedRef.current = false;
    isCancelledRef.current = false;
  }, []);

  // Cancel sequence - user can abort at any time
  const cancelSequence = useCallback(() => {
    console.log('[SEQUENCE] User cancelled sequence');
    isCancelledRef.current = true;
    
    // Log cancellation
    if (sessionIdRef.current) {
      import('@/services/liveSessions').then(({ logCompanionMessage }) => {
        logCompanionMessage(sessionIdRef.current!, 'Sequence cancelled by user', 'warn');
      }).catch(() => {});
    }
    
    resetSequence();
    onSequenceCancelled?.();
    onAudioFeedback?.('Sequence cancelled', true);
  }, [resetSequence, onSequenceCancelled, onAudioFeedback]);

  const startSequence = useCallback(
    async (idx: number) => {
      // Check if cancelled
      if (isCancelledRef.current) {
        console.log(`[SEQUENCE ${idx}] Sequence was cancelled - ignoring`);
        return;
      }

      // CRITICAL: Check lock SYNCHRONOUSLY before any async operations
      // Allow continuing the sequence for subsequent views (idx > 0 when lock is held)
      if (isLockedRef.current && idx === 0) {
        console.log(`[SEQUENCE ${idx}] Sequence already active/locked - ignoring initial start`);
        if (sessionIdRef.current) {
          import('@/services/liveSessions').then(({ logCompanionMessage }) => {
            logCompanionMessage(sessionIdRef.current!, `Sequence already active/locked - ignoring startSequence call (idx: ${idx})`, 'warn');
          }).catch(() => {});
        }
        return;
      }

      // LOCK the sequence immediately (synchronously)
      isLockedRef.current = true;
      isCancelledRef.current = false;

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

      if (mode === 'inbody') {
        await logMessage('InBody mode - capturing immediately', 'info');
        onCaptureRef.current(idx);
        return;
      }

      // Set the view indices
      setViewIdx(idx);
      setCurrentViewIdx(idx);
      setIsSequenceActive(true);

      // Audio feedback for the view
      const viewNames = ['Front', 'Right Side', 'Back', 'Left Side'];
      const viewName = viewNames[idx] || views[idx]?.label || 'Next view';
      await logMessage(`Starting sequence for: ${viewName}`, 'info');
      onAudioFeedback?.(`Capturing ${viewName} in 5 seconds`, true);

      // Start countdown (5 seconds)
      const countdownSeconds = 5;
      const countRef = { current: countdownSeconds };
      setCountdown(countdownSeconds);
      await logMessage(`Countdown started: ${countdownSeconds} seconds`, 'info');

      countdownIntervalRef.current = setInterval(() => {
        // Check if cancelled during countdown
        if (isCancelledRef.current) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return;
        }

        countRef.current -= 1;
        const currentCount = countRef.current;
        
        if (currentCount > 0) {
          setCountdown(currentCount);
          // Only speak last 3 seconds
          if (currentCount <= 3) {
            onAudioFeedback?.(currentCount.toString(), true);
          }
        } else {
          // Countdown finished - capture!
          logMessage(`Countdown finished - capturing now`, 'info');
          setCountdown(null);
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
        
          // Capture the image
          onCaptureRef.current(idx)
            .then(async () => {
              // Check if cancelled after capture
              if (isCancelledRef.current) {
                return;
              }

              await logMessage(`Capture completed successfully for view ${idx}`, 'info');
              
              // If not the last view, prompt to turn and continue sequence
              if (idx < views.length - 1) {
                const nextIdx = idx + 1;
                logMessage(`Prompting for next view: ${nextIdx}`, 'info');
                onAudioFeedback?.('Turn to your right', true);
                
                // After turn prompt, automatically start next sequence (3 seconds)
                turnDelayTimeoutRef.current = setTimeout(() => {
                  if (isCancelledRef.current) return;
                  
                  logMessage(`Starting next sequence for view ${nextIdx}`, 'info');
                  startSequenceRef.current(nextIdx);
                }, 3000);
              } else {
                // Last view - unlock and complete
                setIsSequenceActive(false);
                isLockedRef.current = false;
                logMessage('All views captured - sequence complete', 'info');
                onAudioFeedback?.('All images captured. Returning to app.', true);
                onSequenceComplete?.();
              }
            })
            .catch(async (err) => {
              await logMessage(`Capture failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
              console.error('[POSTURE] Capture failed', err);
              setIsSequenceActive(false);
              isLockedRef.current = false;
            });
        }
      }, 1000);
    },
    [mode, views, onAudioFeedback, setViewIdx, onSequenceComplete]
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
      if (turnDelayTimeoutRef.current) {
        clearTimeout(turnDelayTimeoutRef.current);
        turnDelayTimeoutRef.current = null;
      }
    };
  }, [resetSequence]);

  return {
    countdown,
    isSequenceActive,
    startSequence,
    resetSequence,
    cancelSequence,
    currentViewIdx,
  };
}
