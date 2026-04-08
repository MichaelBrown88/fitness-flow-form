/**
 * Map model-returned action intents to in-app routes.
 * The model must not emit URLs — only intents + ids (client names match roster).
 */

import { ROUTES, dashboardWorkPath } from '@/constants/routes';

export type AssistantActionIntent =
  | 'start_assessment'
  | 'view_client'
  | 'view_report'
  | 'view_roadmap'
  | 'view_schedule'
  | 'view_artifacts'
  | 'view_billing'
  | 'fetch_client_data';

export type AssistantActionIds = {
  clientId: string | null;
  assessmentId: string | null;
};

export function resolveAssistantActionPath(
  intent: string,
  ids: AssistantActionIds,
): string | null {
  const clientSeg = ids.clientId?.trim()
    ? encodeURIComponent(ids.clientId.trim())
    : null;

  switch (intent as AssistantActionIntent) {
    case 'start_assessment':
      return ROUTES.ASSESSMENT;
    case 'view_client':
      return clientSeg ? `/client/${clientSeg}` : null;
    case 'view_report':
      return clientSeg ? `/client/${clientSeg}/report` : null;
    case 'view_roadmap':
      return clientSeg ? `/client/${clientSeg}/roadmap` : null;
    case 'view_schedule':
      return dashboardWorkPath('work');
    case 'view_artifacts':
      return ROUTES.DASHBOARD_ARTIFACTS;
    case 'view_billing':
      return ROUTES.SETTINGS_BILLING;
    case 'fetch_client_data':
      return null;
    default:
      return null;
  }
}
