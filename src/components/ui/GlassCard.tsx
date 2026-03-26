import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children?: ReactNode;
  className?: string;
}

/**
 * Glass-morphism card for landing page use only.
 * Uses `.glass-card` from `index.css` so dark mode follows `--card` (not `--foreground`).
 * Import from here; never define locally in a component file.
 */
const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className = "" }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl glass-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-md",
        className,
      )}
    >
      {children}
    </div>
  ),
);

GlassCard.displayName = "GlassCard";

export default GlassCard;
