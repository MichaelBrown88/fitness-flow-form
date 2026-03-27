import {
  ROUTES,
  coachAssessmentReportPath,
  COACH_ASSESSMENT_QUERY,
} from '@/constants/routes';

/** Resolves a concrete route for the “share report” onboarding step (no dead ends). */
export function gettingStartedShareReportHref(
  hasSharedReport: boolean,
  hasAssessments: boolean,
  primaryAssessmentId: string | null | undefined,
  primaryClientName: string | null | undefined,
): string | undefined {
  if (hasSharedReport) return undefined;
  if (primaryAssessmentId?.trim()) {
    return coachAssessmentReportPath(primaryAssessmentId.trim(), {
      [COACH_ASSESSMENT_QUERY.OPEN_SHARE_MODAL]: COACH_ASSESSMENT_QUERY.OPEN_SHARE_VALUE,
    });
  }
  if (primaryClientName?.trim()) {
    return `/client/${encodeURIComponent(primaryClientName.trim())}/report`;
  }
  if (hasAssessments) return ROUTES.DASHBOARD;
  return ROUTES.ASSESSMENT;
}
