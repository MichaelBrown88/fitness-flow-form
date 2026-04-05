/**
 * Pre-capture setup: client confirmation, mode badges, and draft resolution via Dialog (not capture banners).
 */

import { useCallback, useMemo, useState } from 'react';
import { useFormContext } from '@/contexts/FormContext';
import { useAuth } from '@/hooks/useAuth';
import { usePhaseFormDraftRecovery } from '@/hooks/usePhaseFormDraftRecovery';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ASSESSMENT_SETUP_COPY } from '@/constants/assessmentSetupCopy';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { UI_DRAFT } from '@/constants/ui';
import {
  getPartialCategoryFromEditType,
  hasEditAssessmentInSession,
  hasPartialAssessmentInSession,
  parseEditAssessmentPayload,
  readActiveClientNameHintsForSetup,
  readPartialCategoryString,
  writeAssessmentPhaseIndex,
} from '@/lib/assessment/assessmentSessionStorage';
import { shouldSkipSessionPlanWizard } from '@/lib/assessment/assessmentGateUtils';

export type AssessmentSetupStepProps = {
  /** True while ?client= URL is still resolving into formData.fullName */
  isResolvingClient: boolean;
  onComplete: () => void;
  onChangeClient: () => void;
};

export function AssessmentSetupStep({
  isResolvingClient,
  onComplete,
  onChangeClient,
}: AssessmentSetupStepProps) {
  const { formData, updateFormData } = useFormContext();
  const { user, profile } = useAuth();
  const [discardAlertOpen, setDiscardAlertOpen] = useState(false);

  const activeClientName = useMemo(() => readActiveClientNameHintsForSetup(), []);

  const isPartialAssessment = useMemo(
    () =>
      hasPartialAssessmentInSession() ||
      Boolean(getPartialCategoryFromEditType(parseEditAssessmentPayload()?.editType)),
    [],
  );

  const parsedEdit = parseEditAssessmentPayload();
  const partialCategory =
    readPartialCategoryString() ?? getPartialCategoryFromEditType(parsedEdit?.editType);
  const hasEditAssessment = hasEditAssessmentInSession();

  const draftRecoveryActive = !hasEditAssessment && !isPartialAssessment;

  const persistPhaseOnly = useCallback((value: number | ((prev: number) => number)) => {
    if (typeof value === 'function') return;
    writeAssessmentPhaseIndex(value);
  }, []);

  const {
    draftBanner,
    cloudDraftOffer,
    handleResumeCloudDraft,
    handleDismissCloudDraft,
    handleResumeDraft,
    handleDiscardDraft,
  } = usePhaseFormDraftRecovery({
    user,
    organizationId: profile?.organizationId,
    formDataFullName: formData.fullName,
    activeClientName,
    isPartialAssessment,
    updateFormData,
    setActivePhaseIdx: persistPhaseOnly,
    draftRecoveryActive,
  });

  const displayName = (formData.fullName ?? '').trim() || ASSESSMENT_SETUP_COPY.NEW_CLIENT_PLACEHOLDER;

  const modeBadge = useMemo(() => {
    if (isPartialAssessment && partialCategory) {
      return { label: ASSESSMENT_SETUP_COPY.MODE_PARTIAL(partialCategory), variant: 'secondary' as const };
    }
    if (hasEditAssessment) {
      return { label: ASSESSMENT_SETUP_COPY.MODE_EDITING, variant: 'outline' as const };
    }
    return { label: ASSESSMENT_SETUP_COPY.MODE_FULL, variant: 'default' as const };
  }, [hasEditAssessment, isPartialAssessment, partialCategory]);

  const finishSetup = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEYS.ASSESSMENT_SETUP_CONFIRMED, '1');
    } catch {
      /* non-fatal */
    }
    onComplete();
  }, [onComplete]);

  const planHintVisible = !shouldSkipSessionPlanWizard() && formData.assessmentPlan == null;

  if (isResolvingClient) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">{ASSESSMENT_SETUP_COPY.RESOLVING_CLIENT}</p>
      </div>
    );
  }

  return (
    <>
      <Dialog open={Boolean(cloudDraftOffer)} onOpenChange={() => { /* blocking: actions only */ }}>
        <DialogContent
          className="[&>button]:hidden sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{UI_DRAFT.CLOUD_NEWER_TITLE}</DialogTitle>
            <DialogDescription>
              {UI_DRAFT.CLOUD_NEWER_DESC}{' '}
              {cloudDraftOffer ? (
                <span className="text-foreground">
                  {cloudDraftOffer.clientName} ·{' '}
                  {new Date(cloudDraftOffer.updatedAtMs).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleDismissCloudDraft()}>
              {UI_DRAFT.CLOUD_KEEP_LOCAL}
            </Button>
            <Button type="button" onClick={() => handleResumeCloudDraft()}>
              {UI_DRAFT.CLOUD_RESUME}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(draftBanner && !cloudDraftOffer && draftRecoveryActive)}
        onOpenChange={() => { /* blocking */ }}
      >
        <DialogContent
          className="[&>button]:hidden sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{UI_DRAFT.TITLE}</DialogTitle>
            <DialogDescription>
              {draftBanner ? (
                <>
                  Saved on this device ·{' '}
                  {draftBanner.clientName} ·{' '}
                  {new Date(draftBanner.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDiscardAlertOpen(true)}>
              {UI_DRAFT.START_FRESH}
            </Button>
            <Button type="button" onClick={() => handleResumeDraft()}>
              {UI_DRAFT.RESUME}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardAlertOpen} onOpenChange={setDiscardAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ASSESSMENT_SETUP_COPY.DISCARD_DRAFT_TITLE}</AlertDialogTitle>
            <AlertDialogDescription>{ASSESSMENT_SETUP_COPY.DISCARD_DRAFT_DESC}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ASSESSMENT_SETUP_COPY.DISCARD_DRAFT_CANCEL}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDiscardDraft();
                setDiscardAlertOpen(false);
              }}
            >
              {ASSESSMENT_SETUP_COPY.DISCARD_DRAFT_CONFIRM}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mx-auto max-w-lg px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">{ASSESSMENT_SETUP_COPY.TITLE}</CardTitle>
            <CardDescription>{ASSESSMENT_SETUP_COPY.SUBTITLE}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {ASSESSMENT_SETUP_COPY.ASSESSING_LABEL}
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">{displayName}</p>
              <div className="mt-3">
                <Badge variant={modeBadge.variant}>{modeBadge.label}</Badge>
              </div>
            </div>
            {planHintVisible ? (
              <p className="text-sm text-muted-foreground">{ASSESSMENT_SETUP_COPY.PLAN_NEXT_HINT}</p>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onChangeClient}>
              {ASSESSMENT_SETUP_COPY.CHANGE_CLIENT}
            </Button>
            <Button
              type="button"
              onClick={finishSetup}
              disabled={Boolean(cloudDraftOffer) || Boolean(draftBanner && draftRecoveryActive)}
            >
              {ASSESSMENT_SETUP_COPY.CONTINUE}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
