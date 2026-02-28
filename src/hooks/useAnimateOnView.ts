import { useRef, useState, useEffect, useCallback } from 'react';

type Direction = 'up' | 'down' | 'neutral';

interface UseAnimateOnViewOptions {
  /** The target value to animate toward */
  value: number;
  /** The starting value for the animation (defaults to value — no animation) */
  from?: number;
  /** Number of decimal places in the display string */
  decimals?: number;
  /** Explicit delta (positive = improvement). If omitted, computed as value - from */
  delta?: number;
  /** Animation duration in ms */
  duration?: number;
}

interface UseAnimateOnViewReturn {
  /** Ref to attach to the DOM element being observed */
  ref: React.RefCallback<Element>;
  /** The current formatted display value during/after animation */
  displayValue: string;
  /** Direction of change */
  direction: Direction;
  /** Tailwind class string for direction-aware colouring */
  directionClassName: string;
  /** Whether the element is currently visible */
  isInView: boolean;
}

/**
 * Scroll-triggered animated value hook.
 *
 * - Uses IntersectionObserver to detect when the element enters the viewport.
 * - Animates from `from` to `value` using requestAnimationFrame with ease-out cubic.
 * - **Re-triggers** every time the element scrolls into view (exits then re-enters).
 * - Returns formatted display string with optional decimal places.
 */
export function useAnimateOnView(opts: UseAnimateOnViewOptions): UseAnimateOnViewReturn {
  const {
    value,
    from = value,
    decimals = 0,
    delta,
    duration = 900,
  } = opts;

  const [displayValue, setDisplayValue] = useState(formatNum(from, decimals));
  const [isInView, setIsInView] = useState(false);

  const rafRef = useRef<number>(0);
  const nodeRef = useRef<Element | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Compute direction
  const numericDelta = delta ?? value - from;
  const direction: Direction =
    numericDelta > 0 ? 'up' : numericDelta < 0 ? 'down' : 'neutral';

  const directionClassName =
    direction === 'up'
      ? 'text-emerald-600'
      : direction === 'down'
        ? 'text-red-500'
        : '';

  // Animation runner
  const runAnimation = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const startTime = performance.now();
    const diff = value - from;

    if (diff === 0) {
      setDisplayValue(formatNum(value, decimals));
      return;
    }

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + diff * eased;
      setDisplayValue(formatNum(current, decimals));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    // Reset to start value then animate
    setDisplayValue(formatNum(from, decimals));
    rafRef.current = requestAnimationFrame(tick);
  }, [value, from, decimals, duration]);

  // Ref callback: wire up IntersectionObserver
  const setRef = useCallback(
    (node: Element | null) => {
      // Cleanup previous observer
      if (observerRef.current && nodeRef.current) {
        observerRef.current.unobserve(nodeRef.current);
      }

      nodeRef.current = node;

      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setIsInView(true);
              runAnimation();
            } else {
              setIsInView(false);
            }
          }
        },
        { threshold: 0.3 },
      );

      observerRef.current.observe(node);
    },
    [runAnimation],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  return { ref: setRef, displayValue, direction, directionClassName, isInView };
}

function formatNum(n: number, decimals: number): string {
  return decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
}
