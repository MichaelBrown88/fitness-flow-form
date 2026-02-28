import { useRef, useEffect, useCallback } from "react";

interface ScrollRevealOptions {
  /** IntersectionObserver threshold (0-1). Default: 0.12 */
  threshold?: number;
  /** Stagger delay in ms between grouped elements. Default: 0 */
  staggerDelay?: number;
  /** Index of this element in a staggered group. Default: 0 */
  staggerIndex?: number;
  /** Animate only once (true) or every time element enters viewport (false). Default: true */
  once?: boolean;
  /** Initial translateY distance in px. Default: 60 (Apple-style dramatic rise) */
  distance?: number;
  /** Animation duration in ms. Default: 1000 */
  duration?: number;
}

/**
 * Apple-style scroll-triggered animation hook.
 * Dramatic 60px rise + fade with a smooth deceleration curve.
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
}: ScrollRevealOptions = {}) {
  const ref = useRef<T>(null);
  const hasAnimated = useRef(false);

  const delay = staggerIndex * staggerDelay;

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
      el.style.transform = `translateY(${distance}px)`;
      // Apple's signature easing: slow deceleration
      el.style.transition = `opacity ${duration}ms cubic-bezier(0, 0, 0.2, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0, 0, 0.2, 1) ${delay}ms`;
    },
    [delay, distance, duration]
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
            el.style.transform = "translateY(0)";

            if (once) observer.unobserve(el);
          } else if (!once) {
            el.style.opacity = "0";
            el.style.transform = `translateY(${distance}px)`;
          }
        });
      },
      { threshold }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [threshold, once, applyInitialStyles, distance]);

  return ref;
}
