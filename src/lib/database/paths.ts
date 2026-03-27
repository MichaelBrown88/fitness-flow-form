/**
 * Firestore Collection Paths — v2
 *
 * Single source of truth for all database paths.
 *
 * HIERARCHY:
 *   organizations/{orgId}
 *     coaches/{coachId}               ← coachId = Firebase Auth UID
 *     clients/{clientSlug}            ← clientSlug = stable slug from name
 *       current/state                 ← live composite assessment state (one per client)
 *       sessions/{sessionId}          ← immutable assessment events (append-only)
 *       roadmap/plan                  ← phases + metrics
 *       achievements/record           ← milestones, status badges, streaks
 *       assessmentDrafts/draft        ← save-for-later partial draft
 *
 *   publicReports/{shareToken}        ← client PWA credential + current report snapshot
 *   userProfiles/{uid}               ← Firebase Auth user profile (coaches)
 *   notifications/{uid}/items/{id}   ← per-user notification feed
 *   platform_analytics/{doc}         ← pre-computed (Cloud Functions write only)
 *   platform_admins/{uid}            ← platform admin registry
 *   platform/{doc}                   ← config, feature flags, maintenance
 *   platform_audit_logs/{doc}        ← security / compliance events
 *   live_sessions/{sessionId}        ← real-time camera sessions (posture capture)
 *
 * COLLECTION GROUP QUERIES (analytics):
 *   collectionGroup('current')   → all clients' live state across platform
 *   collectionGroup('sessions')  → all assessment events across platform
 */

// ---------------------------------------------------------------------------
// Platform
// ---------------------------------------------------------------------------
export const PLATFORM = {
  config: () => 'platform/config' as const,
  onboardingFunnel: () => 'platform/onboarding_funnel' as const,

  admins: {
    collection: () => 'platform_admins' as const,
    doc: (uid: string) => `platform_admins/${uid}` as const,
    lookupCollection: () => 'platform_admin_lookup' as const,
    /** Canonical lookup doc id — must match `request.auth.token.email` in Firestore rules. */
    lookupKey: (email: string) => email.trim().toLowerCase(),
    /** Legacy id (dots/@ → underscores). Kept for existing data and dual-write during migration. */
    legacyLookupKey: (email: string) =>
      email.trim().toLowerCase().replace(/[.@]/g, '_'),
  },

  auditLogs: {
    collection: () => 'platform_audit_logs' as const,
    doc: (logId: string) => `platform_audit_logs/${logId}` as const,
    impersonation: {
      collection: () => 'platform_audit_logs/impersonation/logs' as const,
      doc: (logId: string) => `platform_audit_logs/impersonation/logs/${logId}` as const,
    },
  },

  impersonations: {
    session: (adminUid: string) =>
      `platform/active_impersonations/sessions/${adminUid}` as const,
  },
} as const;

// ---------------------------------------------------------------------------
// Platform Analytics (written by Cloud Functions, read by platform admin)
// ---------------------------------------------------------------------------
export const ANALYTICS = {
  population: () => 'platform_analytics/population' as const,
  milestones: () => 'platform_analytics/milestones' as const,
} as const;

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------
export const ORGANIZATION = {
  collection: () => 'organizations' as const,
  doc: (orgId: string) => `organizations/${orgId}` as const,

  /** Coaches: coachId = Firebase Auth UID */
  coaches: {
    collection: (orgId: string) => `organizations/${orgId}/coaches` as const,
    doc: (orgId: string, coachId: string) =>
      `organizations/${orgId}/coaches/${coachId}` as const,
  },

  /** Clients: clientSlug = slug derived from name, permanent identifier */
  clients: {
    collection: (orgId: string) => `organizations/${orgId}/clients` as const,
    doc: (orgId: string, clientSlug: string) =>
      `organizations/${orgId}/clients/${clientSlug}` as const,

    /**
     * Live composite assessment state.
     * One document per client, always ID = 'state'.
     * Updated (never replaced) on every assessment save.
     * Source of truth for population analytics via collectionGroup('current').
     */
    current: (orgId: string, clientSlug: string) =>
      `organizations/${orgId}/clients/${clientSlug}/current/state` as const,

    /**
     * Assessment event log. One document per assessment (full or partial).
     * Append-only — never modified after write.
     * sessionId format: ISO timestamp (e.g. 2026-03-16T14-30-22-000Z)
     * Sorted chronologically by ID with no orderBy needed.
     */
    sessions: {
      collection: (orgId: string, clientSlug: string) =>
        `organizations/${orgId}/clients/${clientSlug}/sessions` as const,
      doc: (orgId: string, clientSlug: string, sessionId: string) =>
        `organizations/${orgId}/clients/${clientSlug}/sessions/${sessionId}` as const,
    },

    /**
     * Client roadmap. One document per client, always ID = 'plan'.
     * Contains three phases with metric thresholds.
     * Auto-updated on assessment save (only metrics matching the assessed pillar).
     */
    roadmap: (orgId: string, clientSlug: string) =>
      `organizations/${orgId}/clients/${clientSlug}/roadmap/plan` as const,

    /**
     * @deprecated Use ORGANIZATION.clientAchievements instead.
     */
    achievements: (orgId: string, clientSlug: string) =>
      `organizations/${orgId}/clients/${clientSlug}/achievements/record` as const,

    /**
     * Assessment draft (Save for Later). One document per client, always ID = 'draft'.
     * Cleared when assessment is fully saved.
     */
    draft: (orgId: string, clientSlug: string) =>
      `organizations/${orgId}/clients/${clientSlug}/assessmentDrafts/draft` as const,
  },

  /** Slug-to-UUID lookup for clients: organizations/{orgId}/clientLookup/{slug} */
  clientLookup: {
    collection: (orgId: string) => `organizations/${orgId}/clientLookup` as const,
    doc: (orgId: string, clientSlug: string) =>
      `organizations/${orgId}/clientLookup/${clientSlug}` as const,
  },

  /**
   * Client achievements — each achievement is a separate document.
   * Path: organizations/{orgId}/clients/{clientSlug}/achievements/{achievementId}
   */
  clientAchievements: {
    collection: (orgId: string, clientSlug: string) =>
      `organizations/${orgId}/clients/${clientSlug}/achievements` as const,
    doc: (orgId: string, clientSlug: string, achievementId: string) =>
      `organizations/${orgId}/clients/${clientSlug}/achievements/${achievementId}` as const,
  },

  /** GDPR Article 17 erasure requests */
  erasureRequests: {
    collection: (orgId: string) => `organizations/${orgId}/erasureRequests` as const,
    doc: (orgId: string, requestId: string) =>
      `organizations/${orgId}/erasureRequests/${requestId}` as const,
  },

  /** Client self-service submissions: organizations/{orgId}/clientSubmissions/{clientUid}/items/{id} */
  clientSubmissions: {
    itemsCollection: (orgId: string, clientUid: string) =>
      `organizations/${orgId}/clientSubmissions/${clientUid}/items` as const,
  },
} as const;

// ---------------------------------------------------------------------------
// User Profiles (one per Firebase Auth user — coaches and platform admins)
// ---------------------------------------------------------------------------
export const USER_PROFILES = {
  collection: () => 'userProfiles' as const,
  doc: (uid: string) => `userProfiles/${uid}` as const,
} as const;

// ---------------------------------------------------------------------------
// Public Reports (client PWA credential)
// shareToken = the document ID = the client's credential
// Contains orgId + clientSlug + current report snapshot for unauthenticated access
// ---------------------------------------------------------------------------
export const PUBLIC = {
  reports: {
    collection: () => 'publicReports' as const,
    doc: (token: string) => `publicReports/${token}` as const,
  },

  /** Token-keyed roadmap mirror for anonymous client viewer (see roadmaps.ts). */
  roadmaps: {
    doc: (token: string) => `publicRoadmaps/${token}` as const,
  },

  liveSessions: {
    collection: () => 'live_sessions' as const,
    doc: (sessionId: string) => `live_sessions/${sessionId}` as const,
  },
} as const;

// ---------------------------------------------------------------------------
// Notifications (per-user feed, keyed by Firebase Auth UID for coaches)
// ---------------------------------------------------------------------------
export const NOTIFICATIONS = {
  collection: (uid: string) => `notifications/${uid}/items` as const,
  doc: (uid: string, notificationId: string) =>
    `notifications/${uid}/items/${notificationId}` as const,
} as const;

// ---------------------------------------------------------------------------
// System Stats (aggregated platform counters, written by Cloud Functions)
// ---------------------------------------------------------------------------
export const SYSTEM_STATS = {
  collection: () => 'system_stats' as const,
  globalMetrics: () => 'system_stats/global_metrics' as const,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a stable client slug from a name.
 * e.g. "Michael James Brown" → "michael-james-brown"
 * This is the permanent document ID for a client within an org.
 */
export function clientSlugFromName(name: string): string {
  return (name || 'unnamed-client')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-._]/g, '');
}

/**
 * Generate a session ID from the current timestamp.
 * ISO format with colons replaced — sorts chronologically as a string.
 * e.g. "2026-03-16T14-30-22-000Z"
 */
export function sessionIdFromDate(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}
