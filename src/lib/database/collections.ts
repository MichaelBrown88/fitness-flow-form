/**
 * Firestore Collection Reference Helpers
 * 
 * Provides type-safe collection and document references
 * using the centralized path configuration.
 */

import { collection, doc, CollectionReference, DocumentReference } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { PLATFORM, ORGANIZATION, LEGACY, PUBLIC, AI_USAGE, SYSTEM_STATS } from './paths';

// ============================================================================
// PLATFORM COLLECTIONS
// ============================================================================

/** Get platform admins collection reference */
export function getPlatformAdminsCollection(): CollectionReference {
  return collection(getDb(), PLATFORM.admins.collection());
}

/** Get platform admin document reference */
export function getPlatformAdminDoc(uid: string): DocumentReference {
  return doc(getDb(), PLATFORM.admins.doc(uid));
}

/** Get platform admin lookup document reference */
export function getPlatformAdminLookupDoc(email: string): DocumentReference {
  return doc(getDb(), PLATFORM.admins.lookupCollection(), PLATFORM.admins.lookupKey(email));
}

/** Get platform config document reference (feature flags, maintenance settings) */
export function getPlatformConfigDoc(): DocumentReference {
  return doc(getDb(), PLATFORM.config());
}

// ============================================================================
// ORGANIZATION COLLECTIONS
// ============================================================================

/** Get organizations collection reference */
export function getOrganizationsCollection(): CollectionReference {
  return collection(getDb(), ORGANIZATION.collection());
}

/** Get organization document reference */
export function getOrganizationDoc(orgId: string): DocumentReference {
  return doc(getDb(), ORGANIZATION.doc(orgId));
}

/** Get coaches collection within an organization */
export function getOrgCoachesCollection(orgId: string): CollectionReference {
  return collection(getDb(), ORGANIZATION.coaches.collection(orgId));
}

/** Get specific coach document within an organization */
export function getOrgCoachDoc(orgId: string, coachId: string): DocumentReference {
  return doc(getDb(), ORGANIZATION.coaches.doc(orgId, coachId));
}

/** Get clients collection within an organization */
export function getOrgClientsCollection(orgId: string): CollectionReference {
  return collection(getDb(), ORGANIZATION.clients.collection(orgId));
}

/** Get specific client document within an organization */
export function getOrgClientDoc(orgId: string, clientId: string): DocumentReference {
  return doc(getDb(), ORGANIZATION.clients.doc(orgId, clientId));
}

/** Get client document by name (generates ID from name) */
export function getOrgClientDocByName(orgId: string, clientName: string): DocumentReference {
  const clientId = ORGANIZATION.clients.generateId(clientName);
  return doc(getDb(), ORGANIZATION.clients.doc(orgId, clientId));
}

/** Get assessments collection within an organization */
export function getOrgAssessmentsCollection(orgId: string): CollectionReference {
  return collection(getDb(), ORGANIZATION.assessments.collection(orgId));
}

/** Get specific assessment document within an organization */
export function getOrgAssessmentDoc(orgId: string, assessmentId: string): DocumentReference {
  return doc(getDb(), ORGANIZATION.assessments.doc(orgId, assessmentId));
}

/** Get usage collection within an organization */
export function getOrgUsageCollection(orgId: string): CollectionReference {
  return collection(getDb(), ORGANIZATION.usage.collection(orgId));
}

/** Get current month's usage document */
export function getOrgCurrentUsageDoc(orgId: string): DocumentReference {
  return doc(getDb(), ORGANIZATION.usage.month(orgId, ORGANIZATION.usage.currentMonth()));
}

/** Get assessment history collection within an organization */
export function getOrgAssessmentHistoryCollection(orgId: string): CollectionReference {
  return collection(getDb(), ORGANIZATION.assessmentHistory.collection(orgId));
}

/** Get current assessment document for a client (deep history structure) */
export function getOrgCurrentAssessmentDoc(orgId: string, clientSlug: string): DocumentReference {
  return doc(getDb(), ORGANIZATION.assessmentHistory.current(orgId, clientSlug));
}

/** Get history collection for a client's assessments */
export function getOrgAssessmentHistoryChangesCollection(orgId: string, clientSlug: string): CollectionReference {
  return collection(getDb(), ORGANIZATION.assessmentHistory.history(orgId, clientSlug));
}

/** Get snapshots collection for a client's assessments */
export function getOrgAssessmentSnapshotsCollection(orgId: string, clientSlug: string): CollectionReference {
  return collection(getDb(), ORGANIZATION.assessmentHistory.snapshots(orgId, clientSlug));
}

// ============================================================================
// LEGACY COLLECTIONS (for backward compatibility)
// ============================================================================

/** Get legacy coaches collection */
export function getLegacyCoachesCollection(): CollectionReference {
  return collection(getDb(), LEGACY.coaches.collection());
}

/** Get legacy coach document */
export function getLegacyCoachDoc(uid: string): DocumentReference {
  return doc(getDb(), LEGACY.coaches.doc(uid));
}

/** Get legacy clients collection under a coach */
export function getLegacyClientsCollection(coachUid: string): CollectionReference {
  return collection(getDb(), LEGACY.coaches.clients(coachUid));
}

/** Get legacy client document under a coach */
export function getLegacyClientDoc(coachUid: string, clientId: string): DocumentReference {
  return doc(getDb(), LEGACY.coaches.clientDoc(coachUid, clientId));
}

/** Get legacy assessments collection under a coach */
export function getLegacyAssessmentsCollection(coachUid: string): CollectionReference {
  return collection(getDb(), LEGACY.coaches.assessments(coachUid));
}

/** Get legacy userProfiles collection */
export function getLegacyUserProfilesCollection(): CollectionReference {
  return collection(getDb(), LEGACY.userProfiles.collection());
}

/** Get legacy userProfile document */
export function getLegacyUserProfileDoc(uid: string): DocumentReference {
  return doc(getDb(), LEGACY.userProfiles.doc(uid));
}

/** Get legacy root-level assessments collection */
export function getLegacyRootAssessmentsCollection(): CollectionReference {
  return collection(getDb(), LEGACY.assessments.collection());
}

// ============================================================================
// PUBLIC COLLECTIONS
// ============================================================================

/** Get public reports collection */
export function getPublicReportsCollection(): CollectionReference {
  return collection(getDb(), PUBLIC.reports.collection());
}

/** Get public report document */
export function getPublicReportDoc(token: string): DocumentReference {
  return doc(getDb(), PUBLIC.reports.doc(token));
}

/** Get live sessions collection */
export function getLiveSessionsCollection(): CollectionReference {
  return collection(getDb(), PUBLIC.sessions.collection());
}

/** Get live session document */
export function getLiveSessionDoc(sessionId: string): DocumentReference {
  return doc(getDb(), PUBLIC.sessions.doc(sessionId));
}

// ============================================================================
// AI USAGE COLLECTIONS
// ============================================================================

/** Get AI usage logs collection */
export function getAIUsageLogsCollection(): CollectionReference {
  return collection(getDb(), AI_USAGE.logs.collection());
}

/** Get AI usage log document */
export function getAIUsageLogDoc(logId: string): DocumentReference {
  return doc(getDb(), AI_USAGE.logs.doc(logId));
}

// ============================================================================
// PLATFORM METRICS (aggregated data)
// ============================================================================

/** Get platform metrics document */
export function getPlatformMetricsDoc(): DocumentReference {
  return doc(getDb(), PLATFORM.metrics.current());
}

// ============================================================================
// SYSTEM STATS (Aggregated Counters)
// ============================================================================

/** Get system stats global metrics document */
export function getSystemStatsDoc(): DocumentReference {
  return doc(getDb(), SYSTEM_STATS.globalMetrics());
}

// ============================================================================
// AUDIT LOGS (Compliance & Security)
// ============================================================================

/** Get platform audit logs collection */
export function getPlatformAuditLogsCollection(): CollectionReference {
  return collection(getDb(), PLATFORM.auditLogs.collection());
}

/** Get impersonation audit logs collection */
export function getImpersonationAuditLogsCollection(): CollectionReference {
  return collection(getDb(), PLATFORM.auditLogs.impersonation.collection());
}
