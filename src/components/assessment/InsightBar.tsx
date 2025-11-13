export default function InsightBar({
  label,
  leftHint,
  rightHint,
  value, // 0-100
}: {
  label: string;
  leftHint?: string;
  rightHint?: string;
  value: number;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{clamped}%</span>
      </div>
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <div className="absolute left-0 top-0 h-2 rounded-full bg-primary" style={{ width: `${clamped}%` }} />
      </div>
      {(leftHint || rightHint) && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{leftHint || ''}</span>
          <span>{rightHint || ''}</span>
        </div>
      )}
    </div>
  );
}


