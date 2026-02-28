import { useState, useEffect, useRef } from 'react';

/**
 * Animate a number from its previous value to a new target.
 * Uses requestAnimationFrame for smooth 60fps animation.
 * Returns the current display value (rounded to nearest integer).
 *
 * @param target - The number to animate toward
 * @param duration - Animation duration in milliseconds (default 800ms)
 * @param initialFrom - Optional starting value for the first render animation
 */
export function useCountUp(target: number, duration = 800, initialFrom?: number): number {
  const startValue = initialFrom ?? target;
  const [display, setDisplay] = useState(startValue);
  const prevRef = useRef(startValue);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    prevRef.current = target;

    // Skip animation if values are the same or first render
    if (from === to) {
      setDisplay(to);
      return;
    }

    const startTime = performance.now();
    const diff = to - from;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for a decelerating feel
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + diff * eased);
      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return display;
}
