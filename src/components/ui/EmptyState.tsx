/**
 * EmptyState
 *
 * Reusable empty-state pattern: icon + title + description + optional CTA.
 * Use in tables, lists, and data views when there is no data to display.
 */

import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, actionIcon: ActionIcon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center max-w-sm mx-auto">
      <Icon className="h-10 w-10 text-muted-foreground/60" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button type="button" className="rounded-lg font-bold mt-1" onClick={onAction}>
          {ActionIcon && <ActionIcon className="h-4 w-4 mr-1.5" />}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
