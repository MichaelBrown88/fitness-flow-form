import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

interface SeatUtilisationBarProps {
  coachCount: number;
  seatBlock?: number;
}

function utilisationColor(ratio: number): string {
  if (ratio >= 1) return 'bg-red-500';
  if (ratio >= 0.8) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export function SeatUtilisationBar({ coachCount, seatBlock }: SeatUtilisationBarProps) {
  if (!seatBlock) {
    return (
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-muted-foreground" />
            Team Seats
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <p className="text-sm text-muted-foreground">{coachCount} {coachCount === 1 ? 'coach' : 'coaches'} — unlimited seats</p>
        </CardContent>
      </Card>
    );
  }

  const ratio = Math.min(coachCount / seatBlock, 1);
  const pct = Math.round(ratio * 100);

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4 text-muted-foreground" />
          Team Seats
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">{coachCount} of {seatBlock} seats used</span>
          <span className={`font-semibold ${ratio >= 1 ? 'text-red-600' : ratio >= 0.8 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {pct}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${utilisationColor(ratio)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {ratio >= 1 && (
          <p className="text-xs text-red-600 font-medium">All seats occupied. Upgrade your plan to add more coaches.</p>
        )}
        {ratio >= 0.8 && ratio < 1 && (
          <p className="text-xs text-amber-600">Nearly full — {seatBlock - coachCount} seat{seatBlock - coachCount !== 1 ? 's' : ''} remaining.</p>
        )}
      </CardContent>
    </Card>
  );
}
