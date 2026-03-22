import { Children, type ReactNode } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

/** Delay between staggered reveals (fixed-duration; not tied to scroll speed). */
const STAGGER_MS = 100;
const REVEAL_DURATION_MS = 900;
const REVEAL_THRESHOLD = 0.08;

type Variant = "slide-up" | "crossfade-scale" | "card-stack" | "crossfade";

interface StickyCardStackProps {
  children: ReactNode;
  header?: ReactNode;
  /**
   * Previously selected scroll-scrubbed transitions on small screens.
   * Ignored — layout is always a responsive grid with intersection-triggered reveals.
   */
  variant: Variant;
  desktopCols?: 2 | 3;
  desktopGap?: string;
  /** When multi-column grid starts: `md` or `lg` */
  breakpoint?: "md" | "lg";
}

function ScrollRevealHeader({
  children,
  staggerDelay,
}: {
  children: ReactNode;
  staggerDelay: number;
}) {
  const ref = useScrollReveal({
    staggerIndex: 0,
    staggerDelay,
    distance: 36,
    duration: REVEAL_DURATION_MS,
    threshold: REVEAL_THRESHOLD,
  });
  return <div ref={ref}>{children}</div>;
}

function ScrollRevealGridCell({
  index,
  staggerIndexOffset,
  staggerDelay,
  children,
}: {
  index: number;
  staggerIndexOffset: number;
  staggerDelay: number;
  children: ReactNode;
}) {
  const horizontal = index % 2 === 1;
  const ref = useScrollReveal({
    staggerIndex: index + staggerIndexOffset,
    staggerDelay,
    axis: horizontal ? "x" : "y",
    direction: horizontal ? -1 : 1,
    distance: horizontal ? 28 : 40,
    duration: REVEAL_DURATION_MS,
    threshold: REVEAL_THRESHOLD,
  });
  return (
    <div ref={ref} className="min-h-0 h-full">
      {children}
    </div>
  );
}

function buildGridClass(
  cols: 2 | 3,
  breakpoint: "md" | "lg",
  desktopGap: string,
): string {
  const bp = breakpoint === "md" ? "md" : "lg";
  const multi = cols === 2 ? "grid-cols-2" : "grid-cols-3";
  return `grid grid-cols-1 ${desktopGap} ${bp}:${multi} items-stretch`;
}

/**
 * Responsive section grid with optional header.
 * Each cell reveals with a fixed-duration fade + motion when it enters the viewport
 * (IntersectionObserver — scroll speed does not change animation pace).
 */
export default function StickyCardStack({
  children,
  header,
  variant: _variant,
  desktopCols,
  desktopGap = "gap-8",
  breakpoint = "lg",
}: StickyCardStackProps) {
  void _variant;
  const items = Children.toArray(children);
  const count = items.length;
  const cols = desktopCols ?? (count <= 2 ? 2 : 3);
  const gridClass = buildGridClass(cols, breakpoint, desktopGap);
  const staggerOffset = header ? 1 : 0;

  return (
    <div>
      {header ? (
        <ScrollRevealHeader staggerDelay={STAGGER_MS}>{header}</ScrollRevealHeader>
      ) : null}
      <div className={gridClass}>
        {items.map((child, i) => (
          <ScrollRevealGridCell
            key={i}
            index={i}
            staggerIndexOffset={staggerOffset}
            staggerDelay={STAGGER_MS}
          >
            {child}
          </ScrollRevealGridCell>
        ))}
      </div>
    </div>
  );
}
