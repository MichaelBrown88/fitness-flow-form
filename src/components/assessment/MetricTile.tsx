import RingProgress from '@/components/assessment/RingProgress';

export default function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass p-4 flex flex-col items-center justify-center text-center gap-2">
      <RingProgress value={value} />
      <div className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
    </div>
  );
}


