import { useRef, useEffect, useCallback, useMemo } from "react";

interface ScrollRevealOptions {
  /** IntersectionObserver threshold (0-1). Default: 0.12 */
  threshold?: number;
  /** Stagger delay in ms between grouped elements. Default: 0 */
  staggerDelay?: number;
  /** Index of this element in a staggered group. Default: 0 */
  staggerIndex?: number;
  /** Animate only once (true) or every time element enters viewport (false). Default: true */
  once?: boolean;
  /** Initial offset in px before reveal. Default: 60 (vertical) */
  distance?: number;
  /** Animation duration in ms. Default: 1000 */
  duration?: number;
  /** Motion axis. Horizontal reveals are fixed-duration (not scroll-scrubbed). Default: 'y' */
  axis?: "x" | "y";
  /** Used with axis 'x': -1 = enter from left, 1 = enter from right */
  direction?: -1 | 1;
}

/**
 * Apple-style scroll-triggered animation hook.
 * Dramatic rise (or horizontal slide) + fade with a smooth deceleration curve.
 *
 * Respects `prefers-reduced-motion` — content shows immediately without animation.
 *
 * Usage:
 * ```tsx
 * const ref = useScrollReveal({ staggerIndex: 0 });
 * return <div ref={ref}>Fades in on scroll</div>;
 * ```
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.12,
  staggerDelay = 0,
  staggerIndex = 0,
  once = true,
  distance = 60,
  duration = 1000,
  axis = "y",
  direction = 1,
}: ScrollRevealOptions = {}) {
  const ref = useRef<T>(null);
  const hasAnimated = useRef(false);

  const delay = staggerIndex * staggerDelay;

  const hiddenTransform = useMemo(
    () =>
      axis === "x"
        ? `translate3d(${direction * distance}px, 0, 0)`
        : `translate3d(0, ${distance}px, 0)`,
    [axis, direction, distance],
  );

  const applyInitialStyles = useCallback(
    (el: T) => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (prefersReducedMotion) {
        el.style.opacity = "1";
        el.style.transform = "none";
        return;
      }

      el.style.opacity = "0";
      el.style.transform = hiddenTransform;
      // Apple's signature easing: slow deceleration
      el.style.transition = `opacity ${duration}ms cubic-bezier(0, 0, 0.2, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0, 0, 0.2, 1) ${delay}ms`;
    },
    [delay, duration, hiddenTransform]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      el.style.opacity = "1";
      el.style.transform = "none";
      return;
    }

    applyInitialStyles(el);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (once && hasAnimated.current) return;
            hasAnimated.current = true;

            el.style.opacity = "1";
            el.style.transform = "translate3d(0, 0, 0)";

            if (once) observer.unobserve(el);
          } else if (!once) {
            el.style.opacity = "0";
            el.style.transform = hiddenTransform;
          }
        });
      },
      { threshold }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [threshold, once, applyInitialStyles, hiddenTransform]);

  return ref;
}
