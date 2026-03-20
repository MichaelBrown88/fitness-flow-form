import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Zap, Loader2, CheckCircle } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { submitPreSessionCheckin, type PreSessionCheckinPayload } from '@/services/publicReports';
import { logger } from '@/lib/utils/logger';

const ENERGY_LABELS = ['Very low', 'Low', 'Moderate', 'Good', 'Great'];

export default function PublicPreSessionCheckin() {
  const { token } = useParams<{ token: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [hasPain, setHasPain] = useState<boolean | null>(null);
  const [painDetails, setPainDetails] = useState('');
  const [focusArea, setFocusArea] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      const payload: PreSessionCheckinPayload = {};
      if (energyLevel !== null) payload.energyLevel = energyLevel;
      if (hasPain !== null) payload.hasPain = hasPain;
      if (hasPain && painDetails.trim()) payload.painDetails = painDetails.trim();
      if (focusArea.trim()) payload.focusArea = focusArea.trim();
      await submitPreSessionCheckin(token, payload);
      setSubmitted(true);
    } catch (err) {
      logger.error('[PublicPreSessionCheckin] Submit failed:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AppShell title="Pre-session check-in" mode="public">
        <div className="max-w-md mx-auto px-4 py-8 text-center text-muted-foreground text-sm">
          Invalid link. Use the link from your coach to open the check-in.
        </div>
      </AppShell>
    );
  }

  if (submitted) {
    return (
      <AppShell
        title="Pre-session check-in"
        mode="public"
        showClientNav
        shareToken={token}
        clientName="Client"
      >
        <div className="max-w-md mx-auto px-4 py-8 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-emerald-100 p-4">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-foreground">You&apos;re ready</h2>
          <p className="text-sm text-muted-foreground">
            Your coach will see this before your session starts.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/r/${token}`}>Back to report</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Pre-session check-in"
      mode="public"
      showClientNav
      shareToken={token}
      clientName="Client"
    >
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-2 text-foreground">
          <Zap className="h-5 w-5 text-amber-500" />
          <h1 className="text-lg font-semibold">Before your session</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Quick check-in for your coach. Takes less than a minute. All fields are optional.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Energy level */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">How&apos;s your energy today?</p>
            <div className="flex gap-2">
              {ENERGY_LABELS.map((label, i) => {
                const value = i + 1;
                const isSelected = energyLevel === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setEnergyLevel(isSelected ? null : value)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                    title={label}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
            {energyLevel !== null && (
              <p className="text-xs text-slate-500 text-center">{ENERGY_LABELS[energyLevel - 1]}</p>
            )}
          </div>

          {/* Pain / discomfort */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Any pain or discomfort since last session?</p>
            <div className="flex gap-2">
              {(['Yes', 'No'] as const).map((option) => {
                const value = option === 'Yes';
                const isSelected = hasPain === value;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setHasPain(isSelected ? null : value)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                      isSelected
                        ? option === 'Yes'
                          ? 'bg-red-50 text-red-700 border-red-300'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {hasPain && (
              <Textarea
                placeholder="Where and what kind of pain? (optional)"
                value={painDetails}
                onChange={(e) => setPainDetails(e.target.value)}
                rows={2}
                className="rounded-xl resize-none text-sm"
              />
            )}
          </div>

          {/* Focus area */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Anything you want to focus on today? <span className="text-slate-400 font-normal">(optional)</span></p>
            <Textarea
              placeholder="e.g. upper body, mobility work, cardio..."
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
              rows={2}
              className="rounded-xl resize-none text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" disabled={submitting} className="w-full rounded-xl">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Send to coach'
            )}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center">
          <Link to={`/r/${token}`} className="underline hover:text-foreground">
            Back to report
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
