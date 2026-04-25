import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

// Matches the One Assess UI Kit empty-state recipe: dashed-border card,
// muted icon tile, 15px title, 13px helper. Use anywhere a list or panel
// has nothing to show — first-run, post-filter zero results, etc.
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2.5 rounded-[20px] border border-dashed border-border-medium bg-card px-5 py-10 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      ) : null}
      <h4 className="text-[15px] font-semibold leading-tight text-foreground">{title}</h4>
      {description ? (
        <p className="max-w-[360px] text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
