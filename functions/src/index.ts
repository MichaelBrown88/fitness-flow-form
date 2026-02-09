import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, onRequest } from 'firebase-functions/v2/https';
import { requestShareLinks, sendReportEmail } from './share';
import { handleCreateCheckoutSession, handleStripeWebhook } from './stripe';
import {
  handleOrganizationChange,
  handleUserProfileChange,
  handleAssessmentChange,
  handleAIUsageChange,
} from './aggregation';

admin.initializeApp();

export const requestReportShare = onCall({
  enforceAppCheck: false,
}, requestShareLinks);

export const emailReport = onCall({
  enforceAppCheck: false,
}, sendReportEmail);

// Stripe payment functions
export const createCheckoutSession = onCall({
  enforceAppCheck: false,
}, handleCreateCheckoutSession);

export const stripeWebhook = onRequest(
  { cors: false },
  handleStripeWebhook,
);

// Aggregation functions (write-time counters)
export const aggregateOrganizationChanges = onDocumentWritten(
  {
    document: 'organizations/{orgId}',
  },
  async (event) => {
    if (event.data) {
      await handleOrganizationChange(event.data);
    }
  },
);

export const aggregateUserProfileChanges = onDocumentWritten(
  {
    document: 'userProfiles/{userId}',
  },
  async (event) => {
    if (event.data) {
      await handleUserProfileChange(event.data);
    }
  },
);

// Handle assessments from both old and new paths
export const aggregateAssessmentChanges = onDocumentWritten(
  {
    document: 'assessments/{assessmentId}',
  },
  async (event) => {
    if (event.data) {
      await handleAssessmentChange(event.data);
    }
  },
);

// Also handle legacy path
export const aggregateLegacyAssessmentChanges = onDocumentWritten(
  {
    document: 'coaches/{coachUid}/assessments/{assessmentId}',
  },
  async (event) => {
    if (event.data) {
      await handleAssessmentChange(event.data);
    }
  },
);

export const aggregateAIUsageChanges = onDocumentWritten(
  {
    document: 'ai_usage_logs/{logId}',
  },
  async (event) => {
    if (event.data) {
      await handleAIUsageChange(event.data);
    }
  },
);

/**
 * Audit Log TTL Cleanup
 * 
 * Runs daily at 3:00 AM UTC. Deletes impersonation audit logs older than 90 days
 * to keep Firestore costs down and prevent unbounded collection growth.
 */
export const cleanupAuditLogs = onSchedule(
  {
    schedule: 'every day 03:00',
    timeZone: 'UTC',
  },
  async () => {
    const db = admin.firestore();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const staleLogsQuery = db
      .collection('platform_audit_logs')
      .doc('impersonation')
      .collection('logs')
      .where('timestamp', '<', admin.firestore.Timestamp.fromDate(ninetyDaysAgo))
      .limit(500); // Process in batches to avoid timeout

    const snapshot = await staleLogsQuery.get();
    
    if (snapshot.empty) {
      console.log('[AuditCleanup] No stale audit logs to delete');
      return;
    }

    // Batch delete for efficiency
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    console.log(`[AuditCleanup] Deleted ${snapshot.size} audit logs older than 90 days`);

    // Also clean up expired impersonation markers
    const expiredMarkersQuery = db
      .collection('platform')
      .doc('active_impersonations')
      .collection('sessions')
      .where('expiresAt', '<', new Date().toISOString())
      .limit(100);

    const markerSnapshot = await expiredMarkersQuery.get();
    if (!markerSnapshot.empty) {
      const markerBatch = db.batch();
      markerSnapshot.docs.forEach((doc) => {
        markerBatch.delete(doc.ref);
      });
      await markerBatch.commit();
      console.log(`[AuditCleanup] Cleaned up ${markerSnapshot.size} expired impersonation markers`);
    }
  },
);
