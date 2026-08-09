import { useEffect, useState, useCallback } from 'react';

export interface CountdownState {
  secondsLeft: number;
  running: boolean;
  finished: boolean;
  start: () => void;
  reset: () => void;
}

/**
 * Wall-clock countdown (survives tab throttling better than tick counting).
 * `finished` stays true after the countdown hits zero until `reset`/`start`.
 */
export function useCountdown(totalSeconds: number): CountdownState {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setEndsAt(null);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [endsAt]);

  const start = useCallback(() => {
    setSecondsLeft(totalSeconds);
    setEndsAt(Date.now() + totalSeconds * 1000);
  }, [totalSeconds]);

  const reset = useCallback(() => {
    setEndsAt(null);
    setSecondsLeft(totalSeconds);
  }, [totalSeconds]);

  return {
    secondsLeft,
    running: endsAt !== null && secondsLeft > 0,
    finished: secondsLeft === 0,
    start,
    reset,
  };
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
