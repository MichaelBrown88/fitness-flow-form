import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, Loader2, CheckCircle } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { submitLifestyleCheckin, type LifestyleCheckinPayload } from '@/services/publicReports';
import { ASSESSMENT_OPTIONS, ASSESSMENT_LABELS } from '@/constants/assessment';
import { logger } from '@/lib/utils/logger';

const P1 = ASSESSMENT_LABELS.P1;

export default function PublicLifestyleCheckin() {
  const { token } = useParams<{ token: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activityLevel, setActivityLevel] = useState<string>('');
  const [sleepArchetype, setSleepArchetype] = useState<string>('');
  const [stressLevel, setStressLevel] = useState<string>('');
  const [nutritionHabits, setNutritionHabits] = useState<string>('');
  const [hydrationHabits, setHydrationHabits] = useState<string>('');
  const [stepsPerDay, setStepsPerDay] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      const payload: LifestyleCheckinPayload = {};
      if (activityLevel) payload.activityLevel = activityLevel;
      if (sleepArchetype) payload.sleepArchetype = sleepArchetype;
      if (stressLevel) payload.stressLevel = stressLevel;
      if (nutritionHabits) payload.nutritionHabits = nutritionHabits;
      if (hydrationHabits) payload.hydrationHabits = hydrationHabits;
      if (stepsPerDay.trim()) payload.stepsPerDay = stepsPerDay.trim();
      await submitLifestyleCheckin(token, payload);
      setSubmitted(true);
    } catch (err) {
      logger.error('[PublicLifestyleCheckin] Submit failed:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AppShell title="Lifestyle Check-in" mode="public">
        <div className="max-w-md mx-auto px-4 py-8 text-center text-muted-foreground text-sm">
          Invalid link. Use the link from your coach to open the check-in.
        </div>
      </AppShell>
    );
  }

  if (submitted) {
    return (
      <AppShell
        title="Lifestyle Check-in"
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
          <h2 className="text-lg font-semibold text-foreground">Thanks for checking in</h2>
          <p className="text-sm text-muted-foreground">
            Your coach will see your update. You can submit another check-in anytime.
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
      title="Lifestyle Check-in"
      mode="public"
      showClientNav
      shareToken={token}
      clientName="Client"
    >
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-2 text-foreground">
          <Heart className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Quick lifestyle check-in</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Share a quick update with your coach. All fields are optional.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activityLevel" className="text-foreground">
              {P1.activityLevel}
            </Label>
            <Select value={activityLevel} onValueChange={setActivityLevel}>
              <SelectTrigger id="activityLevel" className="rounded-lg border-border">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {(ASSESSMENT_OPTIONS.activityLevel ?? []).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sleepArchetype" className="text-foreground">
              {P1.sleepArchetype}
            </Label>
            <Select value={sleepArchetype} onValueChange={setSleepArchetype}>
              <SelectTrigger id="sleepArchetype" className="rounded-lg border-border">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {(ASSESSMENT_OPTIONS.sleepArchetype ?? []).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stressLevel" className="text-foreground">
              {P1.stressLevel}
            </Label>
            <Select value={stressLevel} onValueChange={setStressLevel}>
              <SelectTrigger id="stressLevel" className="rounded-lg border-border">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {(ASSESSMENT_OPTIONS.stressLevel ?? []).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nutritionHabits" className="text-foreground">
              {P1.nutritionHabits}
            </Label>
            <Select value={nutritionHabits} onValueChange={setNutritionHabits}>
              <SelectTrigger id="nutritionHabits" className="rounded-lg border-border">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {(ASSESSMENT_OPTIONS.nutritionHabits ?? []).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hydrationHabits" className="text-foreground">
              {P1.hydrationHabits}
            </Label>
            <Select value={hydrationHabits} onValueChange={setHydrationHabits}>
              <SelectTrigger id="hydrationHabits" className="rounded-lg border-border">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {(ASSESSMENT_OPTIONS.hydrationHabits ?? []).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stepsPerDay" className="text-foreground">
              {P1.stepsPerDay}
            </Label>
            <Input
              id="stepsPerDay"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 8000"
              value={stepsPerDay}
              onChange={(e) => setStepsPerDay(e.target.value)}
              className="rounded-lg border-border"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" disabled={submitting} className="w-full rounded-lg">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit check-in'
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
