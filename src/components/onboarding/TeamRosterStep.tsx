import { useState } from 'react';
import { Users } from 'lucide-react';

interface TeamRosterStepProps {
  initialValue?: string;
  onNext: (coachRosterNotes: string) => void;
  onBack: () => void;
}

/**
 * Gym / studio: capture coach names before plan selection (MVP — free text).
 */
export function TeamRosterStep({ initialValue = '', onNext, onBack }: TeamRosterStepProps) {
  const [notes, setNotes] = useState(initialValue);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Your coaching team</h2>
        <p className="text-sm text-foreground-secondary">
          Add coach names (one per line). You can invite them properly from the dashboard later.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-foreground-secondary">
          <Users className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <label htmlFor="team-roster" className="text-xs font-bold text-foreground-secondary uppercase tracking-wider">
            Coach names
          </label>
          <textarea
            id="team-roster"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            placeholder="e.g. Alex Smith&#10;Jordan Lee"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="button"
          onClick={() => onNext(notes.trim())}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-apple"
        >
          Continue
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full text-center text-xs font-medium text-foreground-tertiary hover:text-foreground-secondary transition-apple"
        >
          Go back
        </button>
      </div>
    </div>
  );
}
