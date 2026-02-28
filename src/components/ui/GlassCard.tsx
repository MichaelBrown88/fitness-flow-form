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
      className={`backdrop-blur-2xl bg-white/60 border border-white/50 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:bg-white/80 transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  )
);

GlassCard.displayName = "GlassCard";

export default GlassCard;
