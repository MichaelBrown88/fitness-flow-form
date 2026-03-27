import { UserPlus, ClipboardList, Share2, Sparkles, Building2, Wrench, Palette } from 'lucide-react';
import { ROUTES, SETTINGS_URL } from '@/constants/routes';
import { GETTING_STARTED } from '@/constants/gettingStartedCopy';
import { gettingStartedShareReportHref } from './gettingStartedShareHref';
import type { ChecklistStepItem } from './gettingStartedChecklistTypes';

export interface BuildChecklistStepsParams {
  hasClients: boolean;
  hasAssessments: boolean;
  hasSharedReport: boolean;
  /** Latest assessment id for the primary client (opens coach report + share UI). */
  primaryAssessmentIdForShare: string | null;
  primaryClientNameForShare: string | null;
  businessProfileComplete: boolean;
  equipmentDetailsDone: boolean;
  /** Organization-only optional steps (business, equipment, billing nudges). */
  isOrgAdmin: boolean;
  showTrialSubscribeNudge: boolean;
  showBrandingNudge: boolean;
}

export function buildGettingStartedSteps(
  p: BuildChecklistStepsParams,
): { coreSteps: ChecklistStepItem[]; optionalSteps: ChecklistStepItem[] } {
  const shareHref = gettingStartedShareReportHref(
    p.hasSharedReport,
    p.hasAssessments,
    p.primaryAssessmentIdForShare,
    p.primaryClientNameForShare,
  );

  const coreSteps: ChecklistStepItem[] = [
    {
      done: p.hasClients,
      icon: UserPlus,
      label: GETTING_STARTED.STEP_ADD_CLIENT,
      description: GETTING_STARTED.STEP_ADD_CLIENT_DESC,
      href: ROUTES.ASSESSMENT,
    },
    {
      done: p.hasAssessments,
      icon: ClipboardList,
      label: GETTING_STARTED.STEP_RUN_ASSESSMENT,
      description: GETTING_STARTED.STEP_RUN_ASSESSMENT_DESC,
      href: ROUTES.ASSESSMENT,
    },
    {
      done: p.hasSharedReport,
      icon: Share2,
      label: GETTING_STARTED.STEP_SHARE_REPORT,
      description: GETTING_STARTED.STEP_SHARE_REPORT_DESC,
      href: shareHref,
    },
  ];

  const optionalSteps: ChecklistStepItem[] = p.isOrgAdmin
    ? [
        {
          done: p.businessProfileComplete,
          icon: Building2,
          label: GETTING_STARTED.STEP_BUSINESS,
          description: GETTING_STARTED.STEP_BUSINESS_DESC,
          href: SETTINGS_URL.ORG_BRANDING,
        },
        {
          done: p.equipmentDetailsDone,
          icon: Wrench,
          label: GETTING_STARTED.STEP_EQUIPMENT,
          description: GETTING_STARTED.STEP_EQUIPMENT_DESC,
          href: SETTINGS_URL.ORG_EQUIPMENT,
        },
        ...(p.showTrialSubscribeNudge
          ? [
              {
                done: false,
                icon: Sparkles,
                label: GETTING_STARTED.STEP_TRIAL,
                description: GETTING_STARTED.STEP_TRIAL_DESC,
                href: ROUTES.BILLING,
              } satisfies ChecklistStepItem,
            ]
          : []),
        ...(p.showBrandingNudge
          ? [
              {
                done: false,
                icon: Palette,
                label: GETTING_STARTED.STEP_BRANDING,
                description: GETTING_STARTED.STEP_BRANDING_DESC,
                href: `${ROUTES.CONTACT}?interest=custom-branding`,
              } satisfies ChecklistStepItem,
            ]
          : []),
      ]
    : [];

  return { coreSteps, optionalSteps };
}
