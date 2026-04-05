/**
 * Token-scoped social share images (Storage path prefix + layout version).
 * Server must use the same STORAGE_PREFIX and TEMPLATE_VERSION.
 */

import type { Timestamp } from 'firebase/firestore';

export const SOCIAL_SHARE_STORAGE_PREFIX = 'publicReportShare' as const;

/** Bump when SVG layout changes so Storage paths invalidate cleanly. */
export const SOCIAL_SHARE_TEMPLATE_VERSION = '1' as const;

/** Firestore field on publicReports docs (camelCase). */
export const SOCIAL_SHARE_FIRESTORE_FIELD = 'socialShareArtifacts' as const;

export type SocialShareArtifacts = {
  og1200x630Url: string;
  square1080Url: string;
  story1080x1920Url: string;
  contentHash: string;
  generatedAt: Timestamp;
};
