import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormData } from '@/contexts/FormContext';
import { useAuth } from '@/hooks/useAuth';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CONSULTATION_COPY, CONSULTATION_QUESTIONS } from '@/constants/consultation';
import { ASSESSMENT_OPTIONS } from '@/constants/assessment';
import { clientSlugFromName } from '@/lib/database/paths';
import { getLatestConsultation, saveConsultation } from '@/services/consultation';
import type { ConsultationAnswers, ConsultationDoc } from '@/lib/consultation/types';
import type { ConsultationQuestionId } from '@/constants/consultation';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/utils/logger';

export interface ConsultationPanelProps {
  clientName: string;
  formData: FormData;
  updateFormData: (patch: Partial<FormData>) => void;
  showPrepNotes?: boolean;
  onSaved?: (doc: ConsultationDoc) => void;
  footerAction?: React.ReactNode;
}

export function ConsultationPanel({
  clientName,
  formData,
  updateFormData,
  showPrepNotes = true,
  onSaved,
  footerAction,
}: ConsultationPanelProps) {
  const { profile, user } = useAuth();
  const orgId = profile?.organizationId ?? '';
  const clientSlug = clientSlugFromName(clientName);
  const coachUid = user?.uid ?? '';

  const [consultationId, setConsultationId] = useState<string | undefined>();
  const [prepNotes, setPrepNotes] = useState('');
  const [answers, setAnswers] = useState<ConsultationAnswers>({});
  const [clientGoals, setClientGoals] = useState<string[]>([]);
  const [trainingFrequency, setTrainingFrequency] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!orgId || !clientSlug) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void getLatestConsultation(orgId, clientSlug).then((doc) => {
      if (cancelled) return;
      if (doc) {
        setConsultationId(doc.id);
        setPrepNotes(doc.prepNotes);
        setAnswers(doc.answers);
        setClientGoals(doc.clientGoals);
        setTrainingFrequency(doc.trainingFrequency ?? '');
        setGoalDeadline(doc.goalDeadline ?? '');
        if (doc.clientGoals.length > 0) {
          updateFormData({ clientGoals: doc.clientGoals });
        }
        if (doc.trainingFrequency) {
          updateFormData({ trainingFrequency: doc.trainingFrequency });
        }
        if (doc.goalDeadline) {
          updateFormData({ goalDeadline: doc.goalDeadline });
        }
      } else {
        const existingGoals = Array.isArray(formData.clientGoals) ? formData.clientGoals : [];
        setClientGoals(existingGoals);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per client
  }, [orgId, clientSlug]);

  const persist = useCallback(
    async (patch: {
      prepNotes?: string;
      answers?: ConsultationAnswers;
      clientGoals?: string[];
      trainingFrequency?: string;
      goalDeadline?: string;
    }) => {
      if (!orgId || !clientSlug || !coachUid) return;
      setSaving(true);
      try {
        const doc = await saveConsultation({
          organizationId: orgId,
          clientSlug,
          coachUid,
          consultationId,
          prepNotes: patch.prepNotes ?? prepNotes,
          answers: patch.answers ?? answers,
          clientGoals: patch.clientGoals ?? clientGoals,
          trainingFrequency:
            formData.recentActivity === 'currently-training'
              ? patch.trainingFrequency ?? trainingFrequency
              : undefined,
          goalDeadline: patch.goalDeadline ?? goalDeadline,
        });
        setConsultationId(doc.id);
        onSaved?.(doc);
      } catch (err) {
        logger.error('Consultation save failed', 'CONSULTATION', err);
      } finally {
        setSaving(false);
      }
    },
    [
      orgId,
      clientSlug,
      coachUid,
      consultationId,
      prepNotes,
      answers,
      clientGoals,
      trainingFrequency,
      goalDeadline,
      formData.recentActivity,
      onSaved,
    ],
  );

  const scheduleSave = useCallback(
    (patch: Parameters<typeof persist>[0]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persist(patch);
      }, 500);
    },
    [persist],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const toggleGoal = (value: string) => {
    setClientGoals((prev) => {
      let next: string[];
      if (prev.includes(value)) {
        next = prev.filter((g) => g !== value);
      } else if (prev.length >= 2) {
        next = [prev[0], value];
      } else {
        next = [...prev, value];
      }
      updateFormData({ clientGoals: next });
      scheduleSave({ clientGoals: next });
      return next;
    });
  };

  const setAnswer = (id: ConsultationQuestionId, text: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [id]: text };
      scheduleSave({ answers: next });
      return next;
    });
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading consultation…</p>;
  }

  const showFrequency = formData.recentActivity === 'currently-training';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{CONSULTATION_COPY.sectionTitle}</h2>
        <p className="text-sm text-muted-foreground mt-1">{CONSULTATION_COPY.sectionSummary}</p>
        {saving ? (
          <p className="text-xs text-muted-foreground mt-2">Saving…</p>
        ) : null}
      </div>

      {showPrepNotes ? (
        <div className="space-y-2">
          <Label htmlFor="consultation-prep">{CONSULTATION_COPY.prepNotesLabel}</Label>
          <Textarea
            id="consultation-prep"
            value={prepNotes}
            onChange={(e) => {
              const v = e.target.value;
              setPrepNotes(v);
              scheduleSave({ prepNotes: v });
            }}
            placeholder={CONSULTATION_COPY.prepNotesPlaceholder}
            rows={3}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>{CONSULTATION_COPY.goalsLabel}</Label>
        <p className="text-xs text-muted-foreground">{CONSULTATION_COPY.goalsPlaceholder}</p>
        <div className="flex flex-wrap gap-2">
          {ASSESSMENT_OPTIONS.clientGoals.map((opt) => {
            const selected = clientGoals.includes(opt.value);
            const isPrimary = clientGoals[0] === opt.value;
            return (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={selected ? 'default' : 'outline'}
                className={cn('rounded-full', isPrimary && selected && 'ring-2 ring-primary/40')}
                onClick={() => toggleGoal(opt.value)}
              >
                {opt.label}
                {isPrimary && selected ? ' · Primary' : ''}
              </Button>
            );
          })}
        </div>
      </div>

      {showFrequency ? (
        <div className="space-y-2 max-w-xs">
          <Label>{CONSULTATION_COPY.trainingFrequencyLabel}</Label>
          <Select
            value={trainingFrequency || undefined}
            onValueChange={(v) => {
              setTrainingFrequency(v);
              updateFormData({ trainingFrequency: v });
              scheduleSave({ trainingFrequency: v });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {ASSESSMENT_OPTIONS.trainingFrequency.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="space-y-2 max-w-xs">
        <Label htmlFor="goal-deadline">{CONSULTATION_COPY.goalDeadlineLabel}</Label>
        <Input
          id="goal-deadline"
          type="date"
          value={goalDeadline}
          onChange={(e) => {
            const v = e.target.value;
            setGoalDeadline(v);
            updateFormData({ goalDeadline: v });
            scheduleSave({ goalDeadline: v });
          }}
        />
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        {CONSULTATION_QUESTIONS.map((q) => (
          <div key={q.id} className="space-y-2">
            <Label htmlFor={`consultation-${q.id}`}>{q.label}</Label>
            <Textarea
              id={`consultation-${q.id}`}
              value={answers[q.id] ?? ''}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              placeholder={q.placeholder}
              rows={2}
            />
          </div>
        ))}
      </div>

      {footerAction ? <div className="pt-2">{footerAction}</div> : null}
    </div>
  );
}
