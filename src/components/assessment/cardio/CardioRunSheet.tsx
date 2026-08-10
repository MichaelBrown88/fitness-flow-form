import { useEffect, useMemo, useState } from 'react';
import { useFormContext, type FormData } from '@/contexts/FormContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Play, Square, Timer } from 'lucide-react';
import { ASSESSMENT_OPTIONS } from '@/constants/assessment';
import { CARDIO_RUN_SHEET_COPY as COPY } from '@/constants/phaseFormCopy';
import { useCountdown, useStopwatch, formatCountdown } from './useCountdown';
import { CardioTimerBlock } from './CardioTimerBlock';

const RECOVERY_SECONDS = 60;

interface CardioRunSheetProps {
  sectionTitle: string;
  onComplete: () => void;
  onBack?: () => void;
}

function HrInput({
  id,
  value,
  onChange,
  onCommit,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="number"
        inputMode="numeric"
        placeholder="—"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        className="h-12 w-28 rounded-lg border border-border bg-background px-4 text-xl font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
      <span className="text-sm font-semibold text-muted-foreground">{COPY.BPM_UNIT}</span>
    </div>
  );
}

/**
 * P3 as one continuous run sheet: resting HR → protocol → start/stop test
 * (stopping auto-starts the 1:00 recovery countdown) → peak HR →
 * recovery HR → section complete.
 */
export function CardioRunSheet({ sectionTitle, onComplete, onBack }: CardioRunSheetProps) {
  const { formData, updateFormData } = useFormContext();
  const { orgSettings } = useAuth();

  const [restingHr, setRestingHr] = useState(String(formData.cardioRestingHr ?? ''));
  const [peakHr, setPeakHr] = useState(String(formData.cardioPeakHr ?? ''));
  const [recoveryHr, setRecoveryHr] = useState(String(formData.cardioPost1MinHr ?? ''));
  const [testCompleted, setTestCompleted] = useState(false);

  const testTimer = useStopwatch();
  const recoveryTimer = useCountdown(RECOVERY_SECONDS);

  const hasCardioEquipment = orgSettings?.equipmentConfig?.cardioEquipment?.enabled === true;
  const protocol = formData.cardioTestSelected;

  // Equipment-based protocols aren't offered when the studio has none configured.
  const protocolOptions = useMemo(
    () =>
      hasCardioEquipment
        ? ASSESSMENT_OPTIONS.cardioTestSelected
        : ASSESSMENT_OPTIONS.cardioTestSelected.filter((opt) => opt.value === 'ymca-step'),
    [hasCardioEquipment],
  );

  // No cardio equipment configured → the step test is the only viable protocol,
  // so pre-select it instead of asking (external default sync, guarded to once-empty).
  useEffect(() => {
    if (!protocol && !hasCardioEquipment) {
      updateFormData({ cardioTestSelected: 'ymca-step' });
    }
  }, [protocol, hasCardioEquipment, updateFormData]);

  const commit = (patch: Partial<FormData>) => updateFormData(patch);
  const isNum = (v: string) => v.trim() !== '' && !Number.isNaN(Number(v));
  const canComplete = Boolean(protocol) && isNum(restingHr) && isNum(peakHr) && isNum(recoveryHr);

  const handleStartTest = () => {
    setTestCompleted(false);
    recoveryTimer.reset();
    testTimer.start();
  };

  const handleStopTest = () => {
    testTimer.stop();
    setTestCompleted(true);
    // The recovery minute begins the moment the test ends — chain it
    // automatically so the coach can focus on the client.
    recoveryTimer.start();
  };

  const handleComplete = () => {
    if (!canComplete) return;
    updateFormData({
      cardioRestingHr: restingHr.trim(),
      cardioPeakHr: peakHr.trim(),
      cardioPost1MinHr: recoveryHr.trim(),
    });
    onComplete();
  };

  const step = (n: number, label: string) => (
    <div className="flex items-center gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-black text-foreground-secondary">
        {n}
      </span>
      <p className="text-sm font-bold text-foreground">{label}</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="bg-background rounded-3xl border border-primary/5 p-8 shadow-xl shadow-primary/10 lg:p-10">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">{COPY.KICKER}</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{sectionTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{COPY.INTRO}</p>

        <div className="mt-8 space-y-8">
          <section className="space-y-3">
            {step(1, COPY.RESTING_LABEL)}
            <p className="pl-9 text-xs text-muted-foreground">{COPY.RESTING_HINT}</p>
            <div className="pl-9">
              <HrInput
                id="cardioRestingHr"
                value={restingHr}
                onChange={setRestingHr}
                onCommit={() => commit({ cardioRestingHr: restingHr.trim() })}
              />
            </div>
          </section>

          <section className="space-y-3">
            {step(2, COPY.PROTOCOL_LABEL)}
            <div className="flex flex-wrap gap-2 pl-9">
              {protocolOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => commit({ cardioTestSelected: opt.value })}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    protocol === opt.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-muted/40 text-foreground-secondary hover:bg-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {!hasCardioEquipment ? (
              <p className="pl-9 text-xs text-muted-foreground">{COPY.PROTOCOL_AUTO_HINT}</p>
            ) : null}
          </section>

          <section className="space-y-3">
            {step(3, COPY.TEST_LABEL)}
            <p className="pl-9 text-xs text-muted-foreground">{COPY.TEST_HINT}</p>
            <div className="pl-9">
              <div className="flex flex-wrap items-center gap-4">
                <div
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-3xl font-bold tabular-nums ${
                    testTimer.running
                      ? 'border-primary/40 bg-primary/5 text-foreground'
                      : testCompleted
                        ? 'border-score-green-muted bg-score-green-light text-score-green-fg'
                        : 'border-border bg-muted/40 text-foreground-secondary'
                  }`}
                  role="timer"
                  aria-live="polite"
                >
                  <Timer className="h-5 w-5 opacity-60" aria-hidden />
                  {formatCountdown(testTimer.elapsedSeconds)}
                </div>
                {!testTimer.running ? (
                  <Button
                    type="button"
                    onClick={handleStartTest}
                    className="h-11 gap-2 rounded-lg px-5 font-bold"
                  >
                    <Play className="h-4 w-4" />
                    {COPY.TEST_START}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleStopTest}
                    className="h-11 gap-2 rounded-lg px-5 font-bold"
                  >
                    <Square className="h-4 w-4" />
                    {COPY.TEST_STOP}
                  </Button>
                )}
                {testTimer.running ? (
                  <p className="text-sm font-medium text-muted-foreground">{COPY.TEST_RUNNING}</p>
                ) : testCompleted ? (
                  <p className="text-sm font-semibold text-score-green-fg">{COPY.TEST_DONE}</p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            {step(4, COPY.PEAK_LABEL)}
            <div className="pl-9">
              <HrInput
                id="cardioPeakHr"
                value={peakHr}
                onChange={setPeakHr}
                onCommit={() => commit({ cardioPeakHr: peakHr.trim() })}
              />
            </div>
          </section>

          <section className="space-y-3">
            {step(5, COPY.RECOVERY_TIMER_LABEL)}
            <p className="pl-9 text-xs text-muted-foreground">{COPY.RECOVERY_HINT}</p>
            <div className="space-y-4 pl-9">
              <CardioTimerBlock
                countdown={recoveryTimer}
                startLabel={COPY.RECOVERY_START}
                runningHint={COPY.RECOVERY_RUNNING}
                doneHint={COPY.RECOVERY_DONE}
              />
              <div className="space-y-2">
                <p className="text-sm font-bold text-foreground">{COPY.RECOVERY_LABEL}</p>
                <HrInput
                  id="cardioPost1MinHr"
                  value={recoveryHr}
                  onChange={setRecoveryHr}
                  onCommit={() => commit({ cardioPost1MinHr: recoveryHr.trim() })}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-border/60 pt-8">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={!onBack}
            className="h-12 rounded-lg px-6 font-bold text-muted-foreground"
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            {COPY.BACK}
          </Button>
          <div className="flex items-center gap-3">
            {!protocol ? (
              <p className="text-xs font-medium text-muted-foreground">{COPY.COMPLETE_HINT_PROTOCOL}</p>
            ) : null}
            <Button
              type="button"
              onClick={handleComplete}
              disabled={!canComplete}
              className="h-12 rounded-lg px-8 font-bold"
            >
              {COPY.COMPLETE}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
