/**
 * Coach Notes tab — coach-only diagnostic + prescriptive surface.
 *
 * Lives separately from the ARC™ (which is the journey). Generated
 * automatically from the latest assessment; coaches can override
 * any field, free-form notes survive regeneration.
 */

import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Dumbbell,
  Eye,
  Heart,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
  Scale,
  Sparkles,
  Sun,
  Target,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { computeScores } from '@/lib/scoring';
import { getCoachNotes, regenerateCoachNotes, updateCoachFinding } from '@/services/coachNotes';
import type {
  CoachFinding,
  CoachNotesDoc,
  PillarId,
  FindingStatus,
} from '@/lib/coachNotes/types';
import type { FindingSeverity, Intervention } from '@/lib/coachNotes/interventionLibrary';
import type { ClientDetailOutletContext } from './ClientDetailLayout';
import { cn } from '@/lib/utils';

// ─── Pillar metadata ─────────────────────────────────────────────────

const PILLAR_META: Record<
  PillarId,
  { label: string; icon: typeof Scale; tint: string }
> = {
  bodyComp: {
    label: 'Body Composition',
    icon: Scale,
    tint: 'bg-[hsl(188_72%_45%_/_0.10)] text-[hsl(188_72%_32%)]',
  },
  strength: {
    label: 'Functional Strength',
    icon: Dumbbell,
    tint: 'bg-[hsl(350_72%_45%_/_0.10)] text-[hsl(350_72%_38%)]',
  },
  cardio: {
    label: 'Metabolic Fitness',
    icon: Heart,
    tint: 'bg-[hsl(28_72%_45%_/_0.12)] text-[hsl(28_72%_36%)]',
  },
  movementQuality: {
    label: 'Movement Quality',
    icon: Zap,
    tint: 'bg-[hsl(262_72%_45%_/_0.10)] text-[hsl(262_72%_50%)]',
  },
  lifestyle: {
    label: 'Lifestyle Factors',
    icon: Sun,
    tint: 'bg-[hsl(152_72%_45%_/_0.10)] text-[hsl(152_72%_32%)]',
  },
};

const PILLAR_ORDER: PillarId[] = [
  'movementQuality',
  'bodyComp',
  'strength',
  'cardio',
  'lifestyle',
];

// ─── Page ────────────────────────────────────────────────────────────

export default function ClientCoachNotesTab() {
  const { effectiveOrgId } = useAuth();
  const { toast } = useToast();
  const { clientName, displayClientName, currentAssessment } =
    useOutletContext<ClientDetailOutletContext>();
  const slug = clientName ?? '';

  const [notes, setNotes] = useState<CoachNotesDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  // Initial load
  useEffect(() => {
    if (!effectiveOrgId || !slug) return;
    let cancelled = false;
    setLoading(true);
    getCoachNotes(effectiveOrgId, slug)
      .then((doc) => {
        if (!cancelled) setNotes(doc);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveOrgId, slug]);

  const stats = useMemo(() => {
    if (!notes) return { total: 0, active: 0, monitoring: 0, resolved: 0 };
    let active = 0;
    let monitoring = 0;
    let resolved = 0;
    for (const pillar of Object.values(notes.pillars)) {
      for (const f of pillar?.findings ?? []) {
        if (f.status === 'active') active++;
        else if (f.status === 'monitoring') monitoring++;
        else if (f.status === 'resolved') resolved++;
      }
    }
    return { total: active + monitoring + resolved, active, monitoring, resolved };
  }, [notes]);

  const onRegenerate = async () => {
    if (!effectiveOrgId || !slug || !currentAssessment?.formData) {
      toast({
        title: 'Cannot regenerate',
        description: 'A latest assessment is required to generate coach notes.',
        variant: 'destructive',
      });
      return;
    }
    setRegenerating(true);
    try {
      const scores = computeScores(currentAssessment.formData);
      const next = await regenerateCoachNotes({
        orgId: effectiveOrgId,
        clientSlug: slug,
        formData: currentAssessment.formData,
        scores,
      });
      setNotes(next);
      toast({ title: 'Coach notes updated', description: 'Regenerated from the latest assessment.' });
    } catch (err) {
      toast({
        title: 'Regeneration failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Loading coach notes…</p>
      </div>
    );
  }

  // No notes yet — offer first-generation CTA.
  if (!notes) {
    return (
      <EmptyState
        title="No coach notes yet"
        body="Coach notes are auto-generated from the latest assessment + the intervention library. Each finding carries a prescription, expected timeline, and reassessment cadence — coach-only, never seen by the client."
        cta={
          currentAssessment?.formData ? (
            <Button onClick={onRegenerate} disabled={regenerating} className="gap-1.5 rounded-full">
              {regenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" /> Generate from latest assessment
                </>
              )}
            </Button>
          ) : null
        }
      />
    );
  }

  const populatedPillars = PILLAR_ORDER.filter((p) => (notes.pillars[p]?.findings.length ?? 0) > 0);

  return (
    <div className="space-y-5">
      <CoachNotesHero
        clientName={displayClientName || slug}
        stats={stats}
        regenerating={regenerating}
        onRegenerate={onRegenerate}
      />

      {populatedPillars.length === 0 ? (
        <EmptyState
          title="No findings active"
          body="The latest regeneration didn't surface any active findings. This client looks well-served by the current plan — re-run after the next assessment."
          cta={null}
        />
      ) : (
        populatedPillars.map((pillar) => (
          <PillarSection
            key={pillar}
            pillar={pillar}
            findings={notes.pillars[pillar]?.findings ?? []}
            onPatch={async (findingId, patch) => {
              if (!effectiveOrgId || !slug) return;
              const next = await updateCoachFinding({
                orgId: effectiveOrgId,
                clientSlug: slug,
                pillar,
                findingId,
                patch,
              });
              if (next) setNotes(next);
            }}
          />
        ))
      )}
    </div>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────

function CoachNotesHero({
  clientName,
  stats,
  regenerating,
  onRegenerate,
}: {
  clientName: string;
  stats: { total: number; active: number; monitoring: number; resolved: number };
  regenerating: boolean;
  onRegenerate: () => void;
}) {
  return (
    <section className="rounded-[28px] border border-border bg-card p-7 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)] sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <Eye className="h-3.5 w-3.5" /> Coach Notes — coach only
          </p>
          <h2 className="text-3xl font-bold tracking-[-0.020em] text-foreground sm:text-4xl">
            {clientName.split(' ')[0]}'s diagnostic + prescription
          </h2>
          <p className="max-w-[68ch] text-sm leading-relaxed text-foreground-secondary">
            Auto-generated findings from the latest assessment, each with a prescription,
            expected timeline, and reassessment cadence. The client never sees this — it's
            your reference for designing their program.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatPill tone="amber" label="active" count={stats.active} />
            <StatPill tone="muted" label="monitoring" count={stats.monitoring} />
            <StatPill tone="green" label="resolved" count={stats.resolved} />
          </div>
          <Button onClick={onRegenerate} disabled={regenerating} variant="outline" size="sm" className="h-9 gap-1.5 rounded-full">
            {regenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Regenerating…
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" /> Regenerate from latest
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}

function StatPill({ tone, label, count }: { tone: 'amber' | 'green' | 'muted'; label: string; count: number }) {
  const cls =
    tone === 'amber'
      ? 'bg-score-amber-light text-score-amber-fg'
      : tone === 'green'
        ? 'bg-score-green-light text-score-green-fg'
        : 'bg-muted text-muted-foreground';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums', cls)}>
      {count}
      <span className="font-medium opacity-80">{label}</span>
    </span>
  );
}

// ─── Pillar section ─────────────────────────────────────────────────

function PillarSection({
  pillar,
  findings,
  onPatch,
}: {
  pillar: PillarId;
  findings: CoachFinding[];
  onPatch: (findingId: string, patch: Partial<CoachFinding>) => Promise<void>;
}) {
  const meta = PILLAR_META[pillar];
  const Icon = meta.icon;
  const active = findings.filter((f) => f.status !== 'resolved');
  const resolved = findings.filter((f) => f.status === 'resolved');
  void pillar;

  return (
    <section className="rounded-[24px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(15,15,15,0.04),0_4px_14px_rgba(15,15,15,0.04)] sm:p-7">
      <header className="mb-5 flex items-center gap-3 border-b border-border pb-4">
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', meta.tint)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Pillar
          </p>
          <h3 className="text-lg font-bold tracking-[-0.014em] text-foreground sm:text-xl">
            {meta.label}
          </h3>
        </div>
        <span className="text-[12px] text-muted-foreground">
          {active.length} active{resolved.length > 0 ? ` · ${resolved.length} resolved` : ''}
        </span>
      </header>

      <div className="flex flex-col gap-4">
        {active.map((f) => (
          <FindingCard key={f.id} finding={f} onPatch={(patch) => onPatch(f.id, patch)} />
        ))}
        {resolved.length > 0 ? (
          <details className="group rounded-2xl border border-border bg-card-elevated p-4">
            <summary className="cursor-pointer text-[12px] font-semibold text-muted-foreground hover:text-foreground">
              Resolved findings ({resolved.length})
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              {resolved.map((f) => (
                <FindingCard
                  key={f.id}
                  finding={f}
                  dimmed
                  onPatch={(patch) => onPatch(f.id, patch)}
                />
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}

// ─── Finding card ───────────────────────────────────────────────────

const SEVERITY_TONE: Record<FindingSeverity, string> = {
  mild:     'bg-score-green-light text-score-green-fg',
  moderate: 'bg-score-amber-light text-score-amber-fg',
  severe:   'bg-score-red-light text-score-red-fg',
};

const STATUS_TONE: Record<FindingStatus, string> = {
  active:     'bg-score-amber-light text-score-amber-fg',
  monitoring: 'bg-muted text-muted-foreground',
  resolved:   'bg-score-green-light text-score-green-fg',
};

function FindingCard({
  finding,
  dimmed = false,
  onPatch,
}: {
  finding: CoachFinding;
  dimmed?: boolean;
  onPatch: (patch: Partial<CoachFinding>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(finding.coachNote ?? '');
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const saveNote = async () => {
    setSaving(true);
    try {
      await onPatch({ coachNote: draft.trim() || undefined });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const transitionStatus = async (next: FindingStatus) => {
    setTransitioning(true);
    try {
      await onPatch({
        status: next,
        ...(next === 'resolved' ? { resolvedAt: undefined } : {}),
      });
    } finally {
      setTransitioning(false);
    }
  };

  return (
    <article
      className={cn(
        'rounded-2xl border bg-card p-5',
        dimmed ? 'border-border/60 opacity-70' : 'border-border',
      )}
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[15px] font-bold tracking-[-0.005em] text-foreground">
              {finding.finding}
            </h4>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] capitalize',
                SEVERITY_TONE[finding.severity],
              )}
            >
              {finding.severity}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] capitalize',
                STATUS_TONE[finding.status],
              )}
            >
              {finding.status === 'resolved' ? <CheckCircle2 className="h-3 w-3" /> : null}
              {finding.status}
            </span>
          </div>
          <p className="mt-1.5 max-w-[72ch] text-[13px] leading-relaxed text-foreground-secondary">
            {finding.diagnosis}
          </p>
          {finding.measurements && finding.measurements.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
              {finding.measurements.map((m) => (
                <span key={m.label}>
                  <span className="font-semibold text-foreground-secondary">{m.label}:</span> {m.value}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      {/* Prescription */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.10em] text-muted-foreground">
            Prescription
          </p>
          <ul className="flex flex-col gap-1.5">
            {finding.prescription.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-foreground">
                <ArrowRight className="mt-1 h-3 w-3 shrink-0 text-muted-foreground" />
                <span>
                  <span className="font-semibold">{p.name}</span>
                  {formatDose(p)}
                  {p.notes ? <span className="text-muted-foreground"> · {p.notes}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <DetailLine label="Minimum dose" value={finding.minimumDose} icon={Target} />
          <DetailLine label="Expected outcome" value={finding.expectedOutcome} icon={Sparkles} />
          {finding.reassessmentCadence.length > 0 ? (
            <DetailLine
              label="Reassess at week"
              value={finding.reassessmentCadence.join(', ')}
              icon={RefreshCw}
            />
          ) : null}
        </div>
      </div>

      {finding.contraindications.length > 0 ? (
        <div className="mt-4 rounded-xl border border-score-red-light bg-score-red-light/30 p-3">
          <p className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.10em] text-score-red-fg">
            <AlertTriangle className="h-3.5 w-3.5" /> Contraindications
          </p>
          <ul className="flex flex-col gap-1">
            {finding.contraindications.map((c, i) => (
              <li key={i} className="text-[13px] text-foreground-secondary">
                — {c}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {finding.references && finding.references.length > 0 ? (
        <p className="mt-3 text-[11px] text-muted-foreground/80">
          {finding.references.join(' · ')}
        </p>
      ) : null}

      {/* ─── Coach note + status actions ─────────────────────────── */}
      <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.10em] text-muted-foreground">
            <Pencil className="h-3 w-3" /> Coach note
          </p>
          <div className="flex items-center gap-2">
            {finding.status === 'active' ? (
              <button
                type="button"
                onClick={() => transitionStatus('monitoring')}
                disabled={transitioning}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground transition hover:bg-foreground/10"
              >
                <Eye className="h-3 w-3" /> Monitor
              </button>
            ) : null}
            {finding.status !== 'resolved' ? (
              <button
                type="button"
                onClick={() => transitionStatus('resolved')}
                disabled={transitioning}
                className="inline-flex items-center gap-1 rounded-full bg-score-green-light px-2.5 py-0.5 text-[11px] font-bold text-score-green-fg transition hover:bg-score-green-light/80"
              >
                <Check className="h-3 w-3" /> Mark resolved
              </button>
            ) : (
              <button
                type="button"
                onClick={() => transitionStatus('active')}
                disabled={transitioning}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-foreground-secondary transition hover:bg-foreground/10"
              >
                <RotateCcw className="h-3 w-3" /> Reopen
              </button>
            )}
          </div>
        </div>
        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a personal note for this finding — context, observations, adjustments…"
              className="min-h-[72px] w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => {
                  setDraft(finding.coachNote ?? '');
                  setEditing(false);
                }}
                variant="outline"
                size="sm"
                className="h-8 rounded-full"
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={saveNote}
                size="sm"
                className="h-8 gap-1.5 rounded-full"
                disabled={saving}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save note
              </Button>
            </div>
          </div>
        ) : finding.coachNote ? (
          <button
            type="button"
            onClick={() => {
              setDraft(finding.coachNote ?? '');
              setEditing(true);
            }}
            className="rounded-xl bg-card-elevated px-3 py-2 text-left text-[13px] leading-relaxed text-foreground-secondary transition hover:bg-foreground/[0.02]"
          >
            {finding.coachNote}
            <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Pencil className="h-3 w-3" /> Edit
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="self-start rounded-full border border-dashed border-border bg-transparent px-3 py-1 text-[12px] font-semibold text-foreground-secondary transition hover:border-foreground/20 hover:text-foreground"
          >
            + Add coach note
          </button>
        )}
      </div>
    </article>
  );
}

function DetailLine({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Target;
}) {
  return (
    <div>
      <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.10em] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="mt-0.5 text-[13px] leading-relaxed text-foreground">{value}</p>
    </div>
  );
}

function formatDose(p: Intervention): string {
  const parts: string[] = [];
  if (p.sets && p.reps) parts.push(`${p.sets}×${p.reps}`);
  else if (p.duration) parts.push(p.duration);
  parts.push(p.frequency);
  return parts.length > 0 ? ` · ${parts.join(' · ')}` : '';
}

// ─── Empty state ────────────────────────────────────────────────────

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-dashed border-border bg-card p-10 text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-card-elevated">
        <Eye className="h-5 w-5 text-foreground-secondary" />
      </span>
      <h2 className="text-lg font-bold tracking-[-0.014em] text-foreground sm:text-xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-[44ch] text-sm leading-relaxed text-foreground-secondary">
        {body}
      </p>
      {cta ? <div className="mt-5 inline-flex">{cta}</div> : null}
    </section>
  );
}
