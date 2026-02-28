import {
  useRef,
  useState,
  useEffect,
  Children,
  type ReactNode,
  type CSSProperties,
} from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Variant = "slide-up" | "crossfade-scale" | "card-stack" | "crossfade";

interface StickyCardStackProps {
  children: ReactNode;
  /** Section header — stays pinned while cards transition */
  header?: ReactNode;
  /** Transition style between cards */
  variant: Variant;
  /** Grid columns on desktop. Default: children count */
  desktopCols?: 2 | 3;
  /** Gap class for desktop grid. Default: "gap-8" */
  desktopGap?: string;
  /** Breakpoint where sticky becomes grid. Default: "lg" */
  breakpoint?: "md" | "lg";
}

/* ------------------------------------------------------------------ */
/*  Scroll-through-container progress (0 → 1)                         */
/* ------------------------------------------------------------------ */

function useStickyProgress<T extends HTMLElement = HTMLDivElement>() {
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
        // 0 = top of container at top of viewport
        // 1 = bottom of container at bottom of viewport
        const scrollable = rect.height - window.innerHeight;
        if (scrollable <= 0) {
          setProgress(1);
          ticking = false;
          return;
        }
        const raw = -rect.top / scrollable;
        setProgress(Math.min(1, Math.max(0, raw)));
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return { ref, progress };
}

/* ------------------------------------------------------------------ */
/*  Per-card transform calculators by variant                          */
/* ------------------------------------------------------------------ */

/** Returns opacity + transform style for a card at `cardProgress` (-1→0→1).
 *  -1 = waiting to enter, 0 = active center, 1 = exited */
function getCardStyle(
  variant: Variant,
  cardProgress: number, // -1 (before) → 0 (active) → 1 (after)
  _index: number,
  _total: number
): CSSProperties {
  const abs = Math.abs(cardProgress);
  const clamp01 = Math.min(1, Math.max(0, abs));

  switch (variant) {
    /* ── slide-up: pages turning ── */
    case "slide-up": {
      const y = cardProgress * 50; // -50 (above) → 0 → 50 (below)
      return {
        opacity: 1 - clamp01,
        transform: `translateY(${y}px)`,
      };
    }

    /* ── crossfade-scale: upgrade feel ── */
    case "crossfade-scale": {
      const scale = 1 - clamp01 * 0.08; // 1.0 → 0.92
      return {
        opacity: 1 - clamp01,
        transform: `scale(${scale})`,
      };
    }

    /* ── card-stack: deck peel ── */
    case "card-stack": {
      if (cardProgress <= 0) {
        // Active or waiting — stack offset
        const offsetY = Math.max(0, -cardProgress) * 8;
        const rotate = Math.max(0, -cardProgress) * 1.5;
        return {
          opacity: 1,
          transform: `translateY(${offsetY}px) rotate(${rotate}deg)`,
        };
      }
      // Exiting — slide up and out
      return {
        opacity: 1 - clamp01,
        transform: `translateY(${-cardProgress * 60}px) rotate(${-cardProgress * 2}deg)`,
      };
    }

    /* ── crossfade: simple opacity ── */
    case "crossfade":
    default: {
      return {
        opacity: 1 - clamp01,
        transform: "none",
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function StickyCardStack({
  children,
  header,
  variant,
  desktopCols,
  desktopGap = "gap-8",
  breakpoint = "lg",
}: StickyCardStackProps) {
  const items = Children.toArray(children);
  const count = items.length;
  const { ref, progress } = useStickyProgress<HTMLDivElement>();

  // Breakpoint-based media query for SSR-safe hydration
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(
      breakpoint === "md" ? "(min-width: 768px)" : "(min-width: 1024px)"
    );
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);

  // Reduced motion: fall back to stacked layout
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  /* ── Desktop: normal grid ── */
  if (isDesktop) {
    const cols = desktopCols ?? (count <= 2 ? 2 : 3);
    const gridClass =
      cols === 2
        ? `grid grid-cols-2 ${desktopGap}`
        : `grid grid-cols-3 ${desktopGap}`;
    return (
      <div>
        {header}
        <div className={gridClass}>{children}</div>
      </div>
    );
  }

  /* ── Mobile reduced motion: stacked ── */
  if (reducedMotion) {
    return (
      <div>
        {header}
        <div className="space-y-6">{children}</div>
      </div>
    );
  }

  /* ── Mobile: sticky scrollytelling ── */
  const containerHeight = `${count * 100}vh`;

  // Which card is "active"?
  const activeIndex = Math.min(
    count - 1,
    Math.floor(progress * count)
  );

  return (
    <div ref={ref} style={{ height: containerHeight }} className="relative">
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Pinned header */}
        {header && (
          <div className="w-full px-5 pt-6 pb-2 shrink-0">{header}</div>
        )}

        {/* Card area */}
        <div className="relative flex-1 w-[90vw] max-w-md flex items-center justify-center">
          {items.map((child, i) => {
            // cardProgress: 0 = fully active, negative = hasn't arrived, positive = has left
            const segmentSize = 1 / count;
            const segmentCenter = segmentSize * i + segmentSize / 2;
            const cardProgress = (progress - segmentCenter) / (segmentSize / 2);

            const style = getCardStyle(variant, cardProgress, i, count);
            const isActive = i === activeIndex;
            const isVisible = Math.abs(cardProgress) < 1.5;

            return (
              <div
                key={i}
                className="absolute inset-0 flex items-center justify-center will-change-transform"
                style={{
                  ...style,
                  zIndex: isActive ? 10 : count - i,
                  pointerEvents: isActive ? "auto" : "none",
                  visibility: isVisible ? "visible" : "hidden",
                }}
              >
                <div className="w-full">{child}</div>
              </div>
            );
          })}
        </div>

        {/* Progress dots */}
        <div className="flex gap-2 pb-6 pt-3 shrink-0">
          {items.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-6 bg-slate-900"
                  : "w-1.5 bg-slate-300"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
