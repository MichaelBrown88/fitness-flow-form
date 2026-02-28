import React from 'react';
import { useAnimateOnView } from '@/hooks/useAnimateOnView';

interface AnimatedValueProps {
  /** Current numeric value */
  value: number;
  /** Previous value to animate from (if undefined, no animation) */
  from?: number;
  /** Number of decimal places */
  decimals?: number;
  /** Explicit delta (positive = improvement). If omitted, derived from value - from */
  delta?: number;
  /** Suffix to append (e.g., " kg", " bpm") */
  suffix?: string;
  /** Animation duration in ms */
  duration?: number;
}

/**
 * Inline component that animates a numeric value from its previous to current value
 * using IntersectionObserver. Re-triggers every time the element scrolls into view.
 *
 * Direction-aware: shows green for improvement, red for regression.
 */
export const AnimatedValue: React.FC<AnimatedValueProps> = ({
  value,
  from,
  decimals = 1,
  delta,
  suffix = '',
  duration = 900,
}) => {
  const hasAnimation = from !== undefined && from !== value;

  const { ref, displayValue, directionClassName } = useAnimateOnView({
    value,
    from: from ?? value,
    decimals,
    delta,
    duration,
  });

  if (!hasAnimation) {
    return <span>{value.toFixed(decimals)}{suffix}</span>;
  }

  return (
    <span ref={ref} className={directionClassName}>
      {displayValue}{suffix}
    </span>
  );
};
