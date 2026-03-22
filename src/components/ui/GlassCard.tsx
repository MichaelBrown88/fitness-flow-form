import { forwardRef, type ReactNode } from "react";

interface GlassCardProps {
  children?: ReactNode;
  className?: string;
}

/**
 * Glass-morphism card for landing page use only.
 * Do NOT use on white/slate-50 backgrounds — it will be invisible.
 * Import from here; never define locally in a component file.
 */
const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className = "" }, ref) => (
    <div
      ref={ref}
      className={`rounded-2xl border border-slate-200/70 bg-white/85 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-slate-200 hover:bg-white/92 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900/75 dark:hover:border-slate-600 ${className}`}
    >
      {children}
    </div>
  )
);

GlassCard.displayName = "GlassCard";

export default GlassCard;
