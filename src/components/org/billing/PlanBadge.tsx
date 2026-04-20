export function PlanBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, ' ');
  const colorMap: Record<string, string> = {
    active:
      'border-score-green-muted bg-score-green-light text-score-green-bold dark:bg-score-green-muted/20 dark:text-score-green-fg',
    trial: 'border-primary/35 bg-primary/10 text-primary',
    past_due:
      'border-score-amber-muted bg-score-amber-light text-score-amber-bold dark:bg-score-amber-muted/20 dark:text-score-amber-fg',
    cancelled:
      'border-score-red-muted bg-score-red-light text-score-red-bold dark:bg-score-red-muted/20 dark:text-score-red-fg',
  };
  const classes = colorMap[status] ?? 'bg-muted/50 text-foreground-secondary border-border';
  return (
    <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${classes}`}>
      {label}
    </span>
  );
}
