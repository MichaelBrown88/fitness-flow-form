import { CONFIG } from '@/config';

export function coachShareableHost(): string {
  return CONFIG.APP.HOST.replace(/\/$/, '');
}

/**
 * Public URLs coaches copy for socials / clients (same token family as `publicReports` / `publicRoadmaps`).
 */
export function coachShareablePublicUrl(
  kind: 'report' | 'roadmap' | 'achievements',
  token: string,
): string {
  const base = coachShareableHost();
  const t = encodeURIComponent(token);
  if (kind === 'report') return `${base}/r/${t}`;
  if (kind === 'roadmap') return `${base}/r/${t}/roadmap`;
  return `${base}/r/${t}/achievements`;
}
