import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-apple focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        /* Neutral — structural grey. Default for tags/filters/labels. */
        default:
          "bg-muted text-foreground-secondary",
        secondary:
          "bg-muted text-muted-foreground border border-border",
        outline:
          "border border-border text-foreground-secondary",
        /* Semantic — score/status indicators */
        success:
          "bg-[hsl(var(--score-green-light))] text-[hsl(var(--score-green-fg))]",
        warning:
          "bg-[hsl(var(--score-amber-light))] text-[hsl(var(--score-amber-fg))]",
        danger:
          "bg-[hsl(var(--score-red-light))] text-[hsl(var(--score-red-fg))]",
        destructive:
          "bg-[hsl(var(--score-red-light))] text-[hsl(var(--score-red-fg))]",
        /* Achievement */
        gold:
          "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/* shadcn/ui: `badgeVariants` is consumed by other modules (same pattern as upstream). */
// eslint-disable-next-line react-refresh/only-export-components -- variant helper co-located with Badge
export { Badge, badgeVariants };
