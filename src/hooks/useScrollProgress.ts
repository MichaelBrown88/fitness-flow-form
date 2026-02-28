import { useRef, useState, useEffect } from "react";

/**
 * Tracks scroll progress through a tall container.
 * Returns a value from 0 to 1 representing how far the user
 * has scrolled through the element's height.
 *
 * Used for scroll-driven animations (Apple-style) where the
 * animation is tied to scroll position, not time.
 *
 * Respects `prefers-reduced-motion` — returns 1 immediately.
 *
 * Usage:
 * ```tsx
 * const { ref, progress } = useScrollProgress();
 * return (
 *   <div ref={ref} style={{ height: '200vh' }}>
 *     <div style={{ opacity: progress, transform: `scale(${0.8 + progress * 0.2})` }}>
 *       Content animates as you scroll
 *     </div>
 *   </div>
 * );
 * ```
 */
export function useScrollProgress<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setProgress(1);
      return;
    }

    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // Element top enters bottom of viewport = 0
        // Element top reaches top of viewport = 1
        const start = windowHeight; // when top of el is at bottom of viewport
        const end = 0; // when top of el is at top of viewport

        const raw = 1 - (rect.top - end) / (start - end);
        const clamped = Math.min(1, Math.max(0, raw));
        setProgress(clamped);
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // initial check

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return { ref, progress };
}
