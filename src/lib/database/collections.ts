/**
 * Firestore Collection Reference Helpers — v2
 *
 * Type-safe wrappers around the path constants.
 * Import these instead of constructing paths manually anywhere in the codebase.
 */

import {
  collection,
  doc,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import {
  PLATFORM,
  ANALYTICS,
  ORGANIZATION,
  USER_PROFILES,
  PUBLIC,
  NOTIFICATIONS,
  SYSTEM_STATS,
} from './paths';

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export const getOrganizationsCollection = (): CollectionReference =>
  collection(getDb(), ORGANIZATION.collection());

export const getOrganizationDoc = (orgId: string): DocumentReference =>
  doc(getDb(), ORGANIZATION.doc(orgId));

// ---------------------------------------------------------------------------
// Coaches
// ---------------------------------------------------------------------------

export const getOrgCoachesCollection = (orgId: string): CollectionReference =>
  collection(getDb(), ORGANIZATION.coaches.collection(orgId));

export const getOrgCoachDoc = (orgId: string, coachId: string): DocumentReference =>
  doc(getDb(), ORGANIZATION.coaches.doc(orgId, coachId));

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export const getOrgClientsCollection = (orgId: string): CollectionReference =>
  collection(getDb(), ORGANIZATION.clients.collection(orgId));

export const getOrgClientDoc = (orgId: string, clientSlug: string): DocumentReference =>
  doc(getDb(), ORGANIZATION.clients.doc(orgId, clientSlug));

// ---------------------------------------------------------------------------
// Current Assessment State  (live composite, one per client)
// ---------------------------------------------------------------------------

export const getClientCurrentStateDoc = (
  orgId: string,
  clientSlug: string,
): DocumentReference => doc(getDb(), ORGANIZATION.clients.current(orgId, clientSlug));

// ---------------------------------------------------------------------------
// Sessions  (assessment event log, append-only)
// ---------------------------------------------------------------------------

export const getClientSessionsCollection = (
  orgId: string,
  clientSlug: string,
): CollectionReference =>
  collection(getDb(), ORGANIZATION.clients.sessions.collection(orgId, clientSlug));

export const getClientSessionDoc = (
  orgId: string,
  clientSlug: string,
  sessionId: string,
): DocumentReference =>
  doc(getDb(), ORGANIZATION.clients.sessions.doc(orgId, clientSlug, sessionId));

// ---------------------------------------------------------------------------
// Roadmap  (one per client)
// ---------------------------------------------------------------------------

export const getClientRoadmapDoc = (
  orgId: string,
  clientSlug: string,
): DocumentReference => doc(getDb(), ORGANIZATION.clients.roadmap(orgId, clientSlug));

// ---------------------------------------------------------------------------
// Achievements  (one per client)
// ---------------------------------------------------------------------------

export const getClientAchievementsDoc = (
  orgId: string,
  clientSlug: string,
): DocumentReference =>
  doc(getDb(), ORGANIZATION.clients.achievements(orgId, clientSlug));

// ---------------------------------------------------------------------------
// Assessment Draft  (save-for-later, one per client)
// ---------------------------------------------------------------------------

export const getClientDraftDoc = (
  orgId: string,
  clientSlug: string,
): DocumentReference => doc(getDb(), ORGANIZATION.clients.draft(orgId, clientSlug));

// ---------------------------------------------------------------------------
// GDPR Erasure Requests
// ---------------------------------------------------------------------------

export const getErasureRequestsCollection = (orgId: string): CollectionReference =>
  collection(getDb(), ORGANIZATION.erasureRequests.collection(orgId));

export const getErasureRequestDoc = (
  orgId: string,
  requestId: string,
): DocumentReference =>
  doc(getDb(), ORGANIZATION.erasureRequests.doc(orgId, requestId));

// ---------------------------------------------------------------------------
// User Profiles
// ---------------------------------------------------------------------------

export const getUserProfilesCollection = (): CollectionReference =>
  collection(getDb(), USER_PROFILES.collection());

export const getUserProfileDoc = (uid: string): DocumentReference =>
  doc(getDb(), USER_PROFILES.doc(uid));

// ---------------------------------------------------------------------------
// Public Reports  (client PWA credential)
// ---------------------------------------------------------------------------

export const getPublicReportsCollection = (): CollectionReference =>
  collection(getDb(), PUBLIC.reports.collection());

export const getPublicReportDoc = (token: string): DocumentReference =>
  doc(getDb(), PUBLIC.reports.doc(token));

// ---------------------------------------------------------------------------
// Live Sessions  (real-time camera, posture capture)
// ---------------------------------------------------------------------------

export const getLiveSessionsCollection = (): CollectionReference =>
  collection(getDb(), PUBLIC.liveSessions.collection());

export const getLiveSessionDoc = (sessionId: string): DocumentReference =>
  doc(getDb(), PUBLIC.liveSessions.doc(sessionId));

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const getNotificationsCollection = (uid: string): CollectionReference =>
  collection(getDb(), NOTIFICATIONS.collection(uid));

export const getNotificationDoc = (uid: string, notificationId: string): DocumentReference =>
  doc(getDb(), NOTIFICATIONS.doc(uid, notificationId));

// ---------------------------------------------------------------------------
// Platform Analytics  (read by platform admin, written by Cloud Functions)
// ---------------------------------------------------------------------------

export const getAnalyticsPopulationDoc = (): DocumentReference =>
  doc(getDb(), ANALYTICS.population());

export const getAnalyticsMilestonesDoc = (): DocumentReference =>
  doc(getDb(), ANALYTICS.milestones());

// ---------------------------------------------------------------------------
// Platform Admin
// ---------------------------------------------------------------------------

export const getPlatformAdminsCollection = (): CollectionReference =>
  collection(getDb(), PLATFORM.admins.collection());

export const getPlatformAdminDoc = (uid: string): DocumentReference =>
  doc(getDb(), PLATFORM.admins.doc(uid));

export const getPlatformAdminLookupDoc = (email: string): DocumentReference =>
  doc(
    getDb(),
    PLATFORM.admins.lookupCollection(),
    PLATFORM.admins.lookupKey(email),
  );

export const getPlatformConfigDoc = (): DocumentReference =>
  doc(getDb(), PLATFORM.config());

export const getPlatformAuditLogsCollection = (): CollectionReference =>
  collection(getDb(), PLATFORM.auditLogs.collection());

export const getImpersonationAuditLogsCollection = (): CollectionReference =>
  collection(getDb(), PLATFORM.auditLogs.impersonation.collection());

// ---------------------------------------------------------------------------
// System Stats
// ---------------------------------------------------------------------------

export const getSystemStatsDoc = (): DocumentReference =>
  doc(getDb(), SYSTEM_STATS.globalMetrics());

// ---------------------------------------------------------------------------
// Legacy collection helpers (old v1 schema — used only by migration/export tooling)
// These paths still exist in Firestore during the cutover window.
// ---------------------------------------------------------------------------

/** organizations/{orgId}/assessments — flat current-state docs (slug or UUID keyed) */
export const getOrgAssessmentsCollection = (orgId: string): CollectionReference =>
  collection(getDb(), `organizations/${orgId}/assessments`);

export const getOrgAssessmentDoc = (orgId: string, assessmentId: string): DocumentReference =>
  doc(getDb(), `organizations/${orgId}/assessments/${assessmentId}`);

/** organizations/{orgId}/assessmentHistory — per-client history root */
export const getOrgAssessmentHistoryCollection = (orgId: string): CollectionReference =>
  collection(getDb(), `organizations/${orgId}/assessmentHistory`);

/** ai_usage_logs — root-level AI cost tracking */
export const getAIUsageLogsCollection = (): CollectionReference =>
  collection(getDb(), 'ai_usage_logs');
