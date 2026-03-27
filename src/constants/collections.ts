/**
 * Firestore collection name constants — v2
 * Used for collectionGroup queries and anywhere a raw collection name string is needed.
 * For full paths use ORGANIZATION / PLATFORM / PUBLIC from @/lib/database/paths.
 */
export const COLLECTIONS = {
  ORGANIZATIONS: 'organizations',
  COACHES: 'coaches',
  CLIENTS: 'clients',
  USER_PROFILES: 'userProfiles',

  // Client subcollections
  /** Live composite state — one doc per client, ID always 'state' */
  CURRENT: 'current',
  /** Immutable assessment event log — one doc per session */
  SESSIONS: 'sessions',
  /** Roadmap phases + metrics — one doc per client, ID always 'plan' */
  ROADMAP: 'roadmap',
  /** Achievements — one doc per client, ID always 'record' */
  ACHIEVEMENTS: 'achievements',
  /** Save-for-later draft — one doc per client, ID always 'draft' */
  ASSESSMENT_DRAFTS: 'assessmentDrafts',

  // Public / shared
  PUBLIC_REPORTS: 'publicReports',
  /** Token-keyed mirror of roadmap fields for anonymous /r/:token/roadmap (see roadmaps.ts) */
  PUBLIC_ROADMAPS: 'publicRoadmaps',
  LIVE_SESSIONS: 'live_sessions',

  // Public report subcollections
  NOTIFICATIONS: 'notifications',
  /** Historical snapshots: publicReports/{token}/snapshots/{snapshotId} */
  PUBLIC_REPORT_SNAPSHOTS: 'snapshots',
  LIFESTYLE_CHECKINS: 'lifestyleCheckins',
  /** Submitted before a returning client's session — coach sees latest on ClientOverview */
  PRE_SESSION_CHECKINS: 'preSessionCheckins',

  // Platform
  PLATFORM_ADMINS: 'platform_admins',
  SYSTEM_STATS: 'system_stats',

  // Misc
  LEARNED_OCR_PATTERNS: 'learned_ocr_patterns',
} as const;
