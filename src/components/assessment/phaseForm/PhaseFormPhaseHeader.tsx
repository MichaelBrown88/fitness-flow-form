import { ArrowLeft, Info } from 'lucide-react';
import { PHASE_FORM_COPY } from '@/constants/phaseFormCopy';
import { ASSESSMENT_COPY } from '@/constants/assessmentCopy';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface PhaseFormPhaseHeaderProps {
  isPartialAssessment: boolean;
  partialCategory: string | null;
  showSaveAndExit: boolean;
  onSaveAndExit: () => void;
  phaseTitle: string;
  phaseSummary: string;
  activePhaseId: string;
  coachGuidanceOn: boolean;
}

export function PhaseFormPhaseHeader({
  isPartialAssessment,
  partialCategory,
  showSaveAndExit,
  onSaveAndExit,
  phaseTitle,
  phaseSummary,
  activePhaseId,
  coachGuidanceOn,
}: PhaseFormPhaseHeaderProps) {
  const showGuidanceTooltip =
    coachGuidanceOn && !isPartialAssessment && activePhaseId !== 'P7';

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {isPartialAssessment ? (
            <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-[0.15em]">
              {PHASE_FORM_COPY.PARTIAL_BADGE_PREFIX} {partialCategory ?? ''}
            </Badge>
          ) : null}
          {showGuidanceTooltip ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    aria-label={ASSESSMENT_COPY.COACH_GUIDANCE_TOGGLE}
                  >
                    <Info className="h-4 w-4" aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {ASSESSMENT_COPY.COACH_GUIDANCE_TOGGLE}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
        {showSaveAndExit ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={onSaveAndExit}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {PHASE_FORM_COPY.SAVE_AND_EXIT}
          </Button>
        ) : null}
      </div>
      <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl">{phaseTitle}</h2>
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base md:text-lg">{phaseSummary}</p>
    </section>
  );
}
