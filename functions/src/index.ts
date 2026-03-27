import './init-env';
import { randomUUID } from 'node:crypto';
import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { requestShareLinks, sendReportEmail } from './share';
import {
  handleCreateCheckoutSession,
  handleCreateLandingGuestCheckoutSession,
  handleStripeWebhook,
  handleCreateCustomerPortalSession,
  handleCreateBrandingCheckoutSession,
  handleCreateCreditTopupSession,
} from './stripe';
import { handleAssessmentCompletedTrigger } from './webhooks';
import { handleSendCoachInvite } from './invites';
import { handleAcceptCoachInvite } from './acceptCoachInvite';
import {
  handleOrganizationChange,
  handleUserProfileChange,
  handleClientChange,
  handleAIUsageChange,
} from './aggregation';
import { snapshotPlatformMetrics, resetAssessmentsThisMonth } from './metricsHistory';
import { checkPlatformHealth } from './platformHealth';
import { runPopulationAnalytics } from './populationAnalytics';
import {
  getAssessmentChartDataCallable,
  getAssessmentsThisMonthCallable,
  getMetricsHistoryCallable,
  getAICostsMTDCallable,
  rebuildPlatformMetricsHistoryCallable,
  rebuildSystemStatsCallable,
  reconcileSystemStats,
  deleteLegacyCollectionsCallable,
  seedAIConfigCallable,
} from './metricsApi';
import { handleSyncPublicRoadmapMirror } from './syncPublicRoadmapMirrorCallable';
import { handleDeleteOrganization } from './deleteOrganization';
import { handleLogOnboardingStep } from './onboardingAnalytics';
import { computeTeamMetrics } from './teamMetrics';
import { assertRateLimit, buildRateLimitKey } from './rateLimit';
import {
  handleCreateRemoteAssessmentToken,
  handleGetRemoteAssessmentSession,
  handleGetRemotePostureUploadUrl,
  handleSubmitRemoteAssessmentFields,
  REMOTE_ASSESSMENT_MVP,
} from './remoteAssessment';
import {
  handleLifestyleCheckinCreated,
  handleClientSubmissionCreated,
  handleInviteAccepted,
  sendReassessmentReminders,
  sendDraftRecoveryNudges,
} from './notifications';
import { handleOnboardingCompleted } from './transactionalEmails';

admin.initializeApp();

export const requestReportShare = onCall({
  enforceAppCheck: false,
}, async (request) => {
  const db = admin.firestore();
  const key = buildRateLimitKey('share', request.auth?.uid, request.rawRequest?.ip);
  await assertRateLimit(db, key, { maxRequests: 20, windowSeconds: 60 });
  return requestShareLinks(request);
});

export const emailReport = onCall({
  enforceAppCheck: false,
}, async (request) => {
  const db = admin.firestore();
  const key = buildRateLimitKey('email', request.auth?.uid, request.rawRequest?.ip);
  await assertRateLimit(db, key, { maxRequests: 5, windowSeconds: 60 });
  return sendReportEmail(request);
});

// Stripe payment functions
export const createCheckoutSession = onCall({
  enforceAppCheck: false,
}, async (request) => {
  const db = admin.firestore();
  const key = buildRateLimitKey('checkout', request.auth?.uid, request.rawRequest?.ip);
  await assertRateLimit(db, key, { maxRequests: 10, windowSeconds: 60 });
  return handleCreateCheckoutSession(request);
});

/** Unauthenticated: landing-page “Get started” → Stripe Checkout (STRIPE_MODE=test + ENABLE_LANDING_GUEST_CHECKOUT only). */
export const createLandingGuestCheckoutSession = onCall(
  {
    enforceAppCheck: false,
    invoker: 'public',
  },
  async (request) => {
    return handleCreateLandingGuestCheckoutSession(request);
  },
);

export const stripeWebhook = onRequest(
  { cors: false },
  handleStripeWebhook,
);

export const createCustomerPortalSession = onCall({
  enforceAppCheck: false,
}, handleCreateCustomerPortalSession);

export const createBrandingCheckoutSession = onCall({
  enforceAppCheck: false,
}, handleCreateBrandingCheckoutSession);

export const createCreditTopupSession = onCall({
  enforceAppCheck: false,
}, handleCreateCreditTopupSession);

// ---------------------------------------------------------------------------
// Webhook fan-out: fires when a session (assessment) doc is created
// ---------------------------------------------------------------------------
export const onAssessmentCompleted = onDocumentWritten(
  {
    document: 'organizations/{orgId}/clients/{clientSlug}/sessions/{sessionId}',
  },
  async (event) => {
    // Only fire on document creation (not updates)
    if (event.data?.before.exists) return;
    const afterData = event.data?.after.data();
    if (!afterData) return;

    const { orgId, clientSlug } = event.params;
    await handleAssessmentCompletedTrigger(orgId, clientSlug, afterData as Record<string, unknown>);
  }
);

export const sendCoachInvite = onCall({
  enforceAppCheck: false,
}, async (request) => {
  const db = admin.firestore();
  const key = buildRateLimitKey('invite', request.auth?.uid, request.rawRequest?.ip);
  await assertRateLimit(db, key, { maxRequests: 10, windowSeconds: 300 });
  return handleSendCoachInvite(request);
});

export const acceptCoachInvite = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const db = admin.firestore();
    const key = buildRateLimitKey('accept_invite', request.auth?.uid, request.rawRequest?.ip);
    await assertRateLimit(db, key, { maxRequests: 20, windowSeconds: 300 });
    return handleAcceptCoachInvite(request);
  },
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

/**
 * When a user completes onboarding (onboardingCompleted -> true), send welcome email.
 */
export const onUserProfileWritten = onDocumentWritten(
  {
    document: 'userProfiles/{userId}',
  },
  async (event) => {
    if (!event.data?.before?.exists || !event.data?.after?.exists) return;
    const params = event.params as { userId: string };
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();
    await handleOnboardingCompleted(beforeData, afterData, params.userId);
  },
);

// Handle org-scoped clients
export const aggregateOrgClientChanges = onDocumentWritten(
  {
    document: 'organizations/{orgId}/clients/{clientId}',
  },
  async (event) => {
    if (event.data) {
      const params = event.params as { orgId: string; clientId: string };
      await handleClientChange(event.data, params.orgId);
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
/**
 * Daily platform metrics snapshot
 *
 * Runs daily at 1:00 AM UTC. Writes metrics to platform/metrics/history/{date}
 * for historical charts in the admin dashboard.
 */
export const snapshotMetricsHistory = onSchedule(
  { schedule: 'every day 01:00', timeZone: 'UTC' },
  snapshotPlatformMetrics,
);

/**
 * Weekly reconciliation — runs every Sunday at 02:00 UTC.
 * Re-computes system_stats/global_metrics from canonical sources as a
 * safety net against trigger drift.
 */
export const weeklyReconcileStats = onSchedule(
  { schedule: 'every sunday 02:00', timeZone: 'UTC', timeoutSeconds: 540 },
  async () => { await reconcileSystemStats(); },
);

/**
 * Monthly counter reset — runs on the 1st of each month at 00:01 UTC.
 * Zeroes assessments_this_month so it doesn't carry over from previous months.
 */
export const monthlyResetAssessmentsThisMonth = onSchedule(
  { schedule: '1 of month 00:01', timeZone: 'UTC' },
  resetAssessmentsThisMonth,
);

// Platform metrics callables (use pre-aggregated data)
export const getAssessmentChartData = onCall(
  { enforceAppCheck: false },
  getAssessmentChartDataCallable,
);

export const getAssessmentsThisMonth = onCall(
  { enforceAppCheck: false },
  async () => getAssessmentsThisMonthCallable(),
);

export const getMetricsHistory = onCall(
  { enforceAppCheck: false },
  getMetricsHistoryCallable,
);

export const rebuildPlatformMetricsHistory = onCall(
  { enforceAppCheck: false },
  rebuildPlatformMetricsHistoryCallable,
);

export const rebuildSystemStats = onCall(
  { enforceAppCheck: false },
  rebuildSystemStatsCallable,
);

export const getAICostsMTD = onCall(
  { enforceAppCheck: false, cors: true },
  getAICostsMTDCallable,
);

// Explicit localhost origins for CORS (Cloud Run can block preflight without them)
const CORS_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:5173',
];

export const deleteLegacyCollections = onCall(
  { enforceAppCheck: false, cors: CORS_ORIGINS, timeoutSeconds: 300 },
  deleteLegacyCollectionsCallable,
);

export const seedAIConfig = onCall(
  { enforceAppCheck: false, cors: CORS_ORIGINS },
  seedAIConfigCallable,
);

export const deleteOrganizationCallable = onCall(
  { enforceAppCheck: false },
  handleDeleteOrganization,
);

export const logOnboardingStep = onCall({ enforceAppCheck: false }, async (request) => {
  const db = admin.firestore();
  const key = buildRateLimitKey(
    'onboarding_step',
    request.auth?.uid,
    request.rawRequest?.ip,
  );
  await assertRateLimit(db, key, { maxRequests: 60, windowSeconds: 60 });
  return handleLogOnboardingStep(request);
});

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

export const weeklyCheckPlatformHealth = onSchedule(
  { schedule: 'every monday 03:00', timeZone: 'UTC', timeoutSeconds: 60 },
  async () => { await checkPlatformHealth(); },
);

export const runPlatformHealthCheck = onCall(
  { enforceAppCheck: false, cors: CORS_ORIGINS },
  async (request) => {
    if (!request.auth?.uid) throw new Error('Authentication required.');
    const db = admin.firestore();
    const adminDoc = await db.doc(`platform_admins/${request.auth.uid}`).get();
    if (!adminDoc.exists) throw new Error('Platform admin access required.');
    await checkPlatformHealth();
    return { success: true };
  },
);

/**
 * Nightly population analytics computation — runs daily at 02:00 UTC.
 * Writes pre-computed stats to platform/analytics/population and
 * platform/analytics/milestones for the Data Intelligence admin tab.
 */
export const computePopulationAnalyticsScheduled = onSchedule(
  { schedule: '0 2 * * *', timeZone: 'UTC', timeoutSeconds: 300 },
  async () => { await runPopulationAnalytics(); },
);

/**
 * On-demand callable version for the "Compute Now" button in the
 * Data Intelligence tab — restricted to platform admins only.
 */
export const computePopulationAnalyticsNow = onCall(
  { enforceAppCheck: false, cors: CORS_ORIGINS, timeoutSeconds: 300 },
  async (request) => {
    if (!request.auth?.uid) throw new Error('Authentication required.');
    const db = admin.firestore();
    const adminDoc = await db.doc(`platform_admins/${request.auth.uid}`).get();
    if (!adminDoc.exists) throw new Error('Platform admin access required.');
    await runPopulationAnalytics();
    return { success: true };
  },
);

/**
 * One-time migration: generate stable UUIDs for existing clients that use name-based slugs,
 * create lookup docs, and update associated roadmaps with the clientId.
 * Idempotent — skips clients that already have a clientId field.
 * Restricted to platform admins.
 */
export const backfillClientIds = onCall(
  { enforceAppCheck: false, cors: CORS_ORIGINS, timeoutSeconds: 540 },
  async (request) => {
    if (!request.auth?.uid) throw new Error('Authentication required.');
    const db = admin.firestore();
    const adminDoc = await db.doc(`platform_admins/${request.auth.uid}`).get();
    if (!adminDoc.exists) throw new Error('Platform admin access required.');

    const orgsSnap = await db.collection('organizations').get();
    let migrated = 0;
    let skipped = 0;

    for (const orgDoc of orgsSnap.docs) {
      const orgId = orgDoc.id;
      const clientsSnap = await db.collection(`organizations/${orgId}/clients`).get();

      for (const clientDoc of clientsSnap.docs) {
        const data = clientDoc.data();

        // Skip if already migrated
        if (data.clientId) { skipped++; continue; }

        const clientName: string = data.clientName || clientDoc.id;
        const slug = clientDoc.id; // Legacy docs use slug as doc ID
        const newClientId: string = randomUUID();

        // Write UUID field to existing doc (keep slug as doc ID for legacy compat)
        await clientDoc.ref.update({
          clientId: newClientId,
          legacySlug: slug,
        });

        // Write lookup doc
        await db.doc(`organizations/${orgId}/clientLookup/${slug}`).set(
          { clientId: newClientId, clientName },
          { merge: true },
        );

        // Backfill associated roadmaps
        const roadmapsSnap = await db
          .collection(`organizations/${orgId}/roadmaps`)
          .where('clientName', '==', clientName)
          .get();
        for (const roadmapDoc of roadmapsSnap.docs) {
          if (!roadmapDoc.data().clientId) {
            await roadmapDoc.ref.update({ clientId: newClientId });
          }
        }

        migrated++;
      }
    }

    return { success: true, migrated, skipped };
  },
);

/**
 * Public callable: fetch achievements for a client identified by their share token.
 * Resolves the share token -> organizationId + assessmentId, then reads from the
 * org-scoped achievements path so the public report page can display them without
 * exposing internal collection structure to the browser.
 */
export const getClientAchievements = onCall(
  { enforceAppCheck: false, cors: CORS_ORIGINS },
  async (request) => {
    const { shareToken } = (request.data ?? {}) as { shareToken?: string };
    if (!shareToken) throw new Error('shareToken is required.');

    const db = admin.firestore();

    // Step 1: resolve org + client from the public report
    const reportSnap = await db.doc(`publicReports/${shareToken}`).get();
    if (!reportSnap.exists) throw new Error('Report not found.');

    const reportData = reportSnap.data()!;
    const organizationId: string = reportData.organizationId;
    const assessmentId: string = reportData.assessmentId;

    if (!organizationId || !assessmentId) throw new Error('Report is missing organization or assessment reference.');

    // Step 2: resolve clientId — in v2 assessmentId is the clientSlug
    const clientId: string = assessmentId;

    // Step 3: fetch achievements from the org-scoped path
    const achSnap = await db
      .collection(`organizations/${organizationId}/clients/${clientId}/achievements`)
      .orderBy('progress', 'desc')
      .limit(50)
      .get();

    const achievements = achSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { achievements };
  },
);

/**
 * Anonymous / first-hit: ensure publicRoadmaps/{token} exists for legacy roadmap share links.
 * Rate-limited. Accepts roadmap hex token (24 chars) or public report UUID (`/r/{reportId}/roadmap`).
 * cors: true so Firebase Hosting / custom domains work (CORS_ORIGINS is localhost-only).
 */
export const syncPublicRoadmapMirror = onCall(
  { enforceAppCheck: false, cors: true, invoker: 'public', timeoutSeconds: 30 },
  async (request) => {
    const db = admin.firestore();
    const key = buildRateLimitKey(
      'pubRoadmapSync',
      request.auth?.uid,
      request.rawRequest?.ip,
    );
    try {
      await assertRateLimit(db, key, { maxRequests: 30, windowSeconds: 60 });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'RATE_LIMITED') {
        throw new HttpsError(
          'resource-exhausted',
          'Too many roadmap sync requests. Try again shortly.',
        );
      }
      throw e;
    }
    return handleSyncPublicRoadmapMirror(request);
  },
);

/**
 * GDPR Article 20 — Data portability.
 * Returns all data we hold for a client identified by their public share token.
 * No authentication required — the share token itself is the secret.
 * Returns a JSON-serialisable payload the browser can download.
 */
export const exportClientData = onCall(
  { enforceAppCheck: false, cors: CORS_ORIGINS, timeoutSeconds: 60 },
  async (request) => {
    const { shareToken } = (request.data ?? {}) as { shareToken?: string };
    if (!shareToken) throw new Error('shareToken is required.');

    const db = admin.firestore();

    const reportSnap = await db.doc(`publicReports/${shareToken}`).get();
    if (!reportSnap.exists) throw new Error('Report not found.');

    const reportData = reportSnap.data()!;
    const organizationId: string = reportData.organizationId;
    const assessmentId: string = reportData.assessmentId;

    if (!organizationId || !assessmentId) throw new Error('Report is missing required references.');

    // In v2 the assessmentId field in the public report doc is the clientSlug
    const clientId: string = assessmentId;

    const exportPayload: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      schemaVersion: 2,
    };

    // Public report (form data + scores)
    exportPayload.report = {
      formData: reportData.formData ?? null,
      scores: reportData.scores ?? null,
      createdAt: reportData.createdAt ?? null,
    };

    // All assessment sessions (immutable, append-only)
    const sessionsSnap = await db
      .collection(`organizations/${organizationId}/clients/${clientId}/sessions`)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    exportPayload.assessmentHistory = sessionsSnap.docs.map((d) => {
      const { formData, scores, timestamp, assessmentType, pillar } = d.data();
      return { formData, scores, timestamp, assessmentType, pillar };
    });

    // Achievements
    const achSnap = await db
      .collection(`organizations/${organizationId}/clients/${clientId}/achievements`)
      .get();
    exportPayload.achievements = achSnap.docs.map((d) => {
      const { title, description, unlockedAt, progress } = d.data();
      return { id: d.id, title, description, unlockedAt, progress };
    });

    return exportPayload;
  },
);

/**
 * Team metrics: server-side aggregation of per-coach KPIs for the admin dashboard.
 * Replaces the client-side scan in src/services/teamMetrics.ts.
 */
export const getTeamMetrics = onCall(
  { enforceAppCheck: false, cors: CORS_ORIGINS, timeoutSeconds: 60 },
  async (request) => {
    const db = admin.firestore();
    const key = buildRateLimitKey('team_metrics', request.auth?.uid, request.rawRequest?.ip);
    try {
      await assertRateLimit(db, key, { maxRequests: 40, windowSeconds: 60 });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'RATE_LIMITED') {
        throw new HttpsError('resource-exhausted', 'Too many requests. Try again shortly.');
      }
      throw e;
    }
    const { orgId } = (request.data ?? {}) as { orgId?: string };
    if (!orgId) throw new HttpsError('invalid-argument', 'orgId is required.');
    try {
      return await computeTeamMetrics(request, { orgId });
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      console.error('[getTeamMetrics] computeTeamMetrics failed:', err);
      throw new HttpsError(
        'internal',
        err instanceof Error ? err.message : 'Team metrics could not be computed.',
      );
    }
  },
);

/**
 * One-time migration: move root-level clientSubmissions/{uid}/items docs
 * to organizations/{orgId}/clientSubmissions/{uid}/items.
 * Idempotent — skips docs whose organizationId already matches the new path.
 * Restricted to platform admins.
 */
export const migrateClientSubmissions = onCall(
  { enforceAppCheck: false, cors: CORS_ORIGINS, timeoutSeconds: 540 },
  async (request) => {
    if (!request.auth?.uid) throw new Error('Authentication required.');
    const db = admin.firestore();
    const adminDoc = await db.doc(`platform_admins/${request.auth.uid}`).get();
    if (!adminDoc.exists) throw new Error('Platform admin access required.');

    const rootRef = db.collection('clientSubmissions');
    const clientSnap = await rootRef.get();
    let migrated = 0;
    let skipped = 0;

    for (const clientDoc of clientSnap.docs) {
      const itemsSnap = await clientDoc.ref.collection('items').get();
      for (const item of itemsSnap.docs) {
        const data = item.data();
        const orgId: string = data.organizationId;
        if (!orgId) { skipped++; continue; }
        const destRef = db
          .collection('organizations').doc(orgId)
          .collection('clientSubmissions').doc(clientDoc.id)
          .collection('items').doc(item.id);
        const destSnap = await destRef.get();
        if (destSnap.exists) { skipped++; continue; }
        await destRef.set(data);
        await item.ref.delete();
        migrated++;
      }
    }

    return { success: true, migrated, skipped };
  },
);

/**
 * One-time migration: copy achievements from legacy publicReports/{token}/achievements
 * to the new org-scoped path organizations/{orgId}/clients/{clientId}/achievements.
 *
 * Resolution order for clientId:
 *   1. assessment doc clientId field (populated by Phase 5 backfill)
 *   2. fall back to assessmentId stored on the public report
 *
 * Idempotent — skips destination docs that already exist.
 * Restricted to platform admins.
 */
export const migrateAchievements = onCall(
  { enforceAppCheck: false, cors: CORS_ORIGINS, timeoutSeconds: 540 },
  async (request) => {
    if (!request.auth?.uid) throw new Error('Authentication required.');
    const db = admin.firestore();
    const adminDoc = await db.doc(`platform_admins/${request.auth.uid}`).get();
    if (!adminDoc.exists) throw new Error('Platform admin access required.');

    const reportsSnap = await db.collection('publicReports').limit(500).get();
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const reportDoc of reportsSnap.docs) {
      const shareToken = reportDoc.id;
      const reportData = reportDoc.data();
      const organizationId: string | undefined = reportData.organizationId;
      const assessmentId: string | undefined = reportData.assessmentId;

      if (!organizationId || !assessmentId) { skipped++; continue; }

      // In v2 the assessmentId field is the clientSlug
      const clientId: string = assessmentId;

      const legacySnap = await db
        .collection(`publicReports/${shareToken}/achievements`)
        .get();

      if (legacySnap.empty) { skipped++; continue; }

      const destBase = db.collection(
        `organizations/${organizationId}/clients/${clientId}/achievements`,
      );

      const batch = db.batch();
      let batchHasWrites = false;

      for (const achDoc of legacySnap.docs) {
        const destRef = destBase.doc(achDoc.id);
        const destSnap = await destRef.get();
        if (destSnap.exists) { skipped++; continue; }

        batch.set(destRef, { ...achDoc.data(), organizationId, clientId });
        batchHasWrites = true;
        migrated++;
      }

      if (batchHasWrites) {
        try {
          await batch.commit();
        } catch {
          errors++;
        }
      }
    }

    return { success: true, migrated, skipped, errors };
  },
);

/**
 * One-time cleanup: delete all legacy achievement docs that were left behind by
 * migrateAchievements. Those docs live at publicReports/{token}/achievements/{id}
 * and have already been copied to the org-scoped path. Deleting them removes the
 * orphaned data without affecting any active read or write path.
 *
 * Idempotent — safe to run multiple times (there will simply be nothing to delete
 * on subsequent runs). Restricted to platform admins.
 */
export const cleanupLegacyAchievements = onCall(
  { enforceAppCheck: false, cors: CORS_ORIGINS, timeoutSeconds: 540 },
  async (request) => {
    if (!request.auth?.uid) throw new Error('Authentication required.');
    const db = admin.firestore();
    const adminDoc = await db.doc(`platform_admins/${request.auth.uid}`).get();
    if (!adminDoc.exists) throw new Error('Platform admin access required.');

    const reportsSnap = await db.collection('publicReports').limit(1000).get();
    let deleted = 0;
    let skipped = 0;

    for (const reportDoc of reportsSnap.docs) {
      const achSnap = await reportDoc.ref.collection('achievements').get();
      if (achSnap.empty) { skipped++; continue; }

      // Delete in batches of 500 (Firestore batch limit)
      const chunks: admin.firestore.QueryDocumentSnapshot[][] = [];
      for (let i = 0; i < achSnap.docs.length; i += 500) {
        chunks.push(achSnap.docs.slice(i, i + 500));
      }
      for (const chunk of chunks) {
        const batch = db.batch();
        for (const achDoc of chunk) {
          batch.delete(achDoc.ref);
          deleted++;
        }
        await batch.commit();
      }
    }

    console.log(`[CleanupLegacyAchievements] Deleted: ${deleted}, Reports with no legacy achievements: ${skipped}`);
    return { success: true, deleted, reportsScanned: reportsSnap.size };
  },
);

/**
 * Notify the coach when a client uploads a self-service submission
 * (body comp scan, posture images, lifestyle check-in) via the org-scoped path.
 */
export const onClientSubmissionCreated = onDocumentWritten(
  { document: 'organizations/{orgId}/clientSubmissions/{clientUid}/items/{submissionId}' },
  async (event) => {
    if (!event.data?.after?.exists) return;
    const params = event.params as { orgId: string; clientUid: string; submissionId: string };
    const data = (event.data.after.data() ?? {}) as Record<string, unknown>;
    await handleClientSubmissionCreated(params.orgId, params.clientUid, data);
  },
);

/**
 * Notify the coach when a client submits a lifestyle check-in via the
 * public report link. Runs server-side because the client is unauthenticated.
 */
export const onLifestyleCheckinCreated = onDocumentWritten(
  { document: 'publicReports/{shareToken}/lifestyleCheckins/{checkinId}' },
  async (event) => {
    if (!event.data?.after?.exists) return;
    const params = event.params as { shareToken: string; checkinId: string };
    const checkinData = (event.data.after.data() ?? {}) as Record<string, string>;
    await handleLifestyleCheckinCreated(params.shareToken, checkinData);
  },
);

/**
 * Daily reminders — runs every day at 08:00 UTC.
 * Sends reassessment_due notifications to clients whose retest is today,
 * and schedule_review reminders to coaches for clients paused > 14 days.
 */
export const dailyReassessmentReminders = onSchedule(
  { schedule: 'every day 08:00', timeZone: 'UTC' },
  async () => { await sendReassessmentReminders(); },
);

/**
 * Notify the org admin when an invite status changes to 'accepted'.
 */
export const onInviteAccepted = onDocumentWritten(
  { document: 'invitations/{token}' },
  async (event) => {
    const before = event.data?.before?.data() as Record<string, unknown> | undefined;
    const after = event.data?.after?.data() as Record<string, unknown> | undefined;
    if (!after) return;
    await handleInviteAccepted(
      before?.status as string | undefined,
      after.status as string | undefined,
      after.invitedByUid as string | undefined,
      (after.invitedBy as string) ?? 'an admin',
      (after.email as string) ?? 'A new coach',
      (after.organizationName as string) ?? 'your organisation',
    );
  },
);

/**
 * Daily draft recovery nudges — runs every day at 09:00 UTC.
 * Notifies coaches about assessment drafts that have been open for > 48 hours.
 */
export const dailyDraftRecoveryNudges = onSchedule(
  { schedule: 'every day 09:00', timeZone: 'UTC' },
  async () => { await sendDraftRecoveryNudges(); },
);

/**
 * Purge orphan org data — callable by platform admin.
 *
 * Finds org IDs referenced in assessmentHistory snapshots that have NO
 * corresponding document in the `organizations` collection, then deletes all
 * their subcollection data. Useful for cleaning up legacy/test orgs whose root
 * document was deleted but whose subcollection data was never purged.
 *
 * Run once from the browser console:
 *   await purgeOrphanOrgs()
 */
export const purgeOrphanOrgs = onCall(
  { enforceAppCheck: false, cors: CORS_ORIGINS, timeoutSeconds: 540 },
  async (request) => {
    if (!request.auth?.uid) throw new Error('Authentication required.');
    const db = admin.firestore();
    const adminDoc = await db.doc(`platform_admins/${request.auth.uid}`).get();
    if (!adminDoc.exists) throw new Error('Platform admin access required.');

    // Load valid org IDs
    const orgsSnap = await db.collection('organizations').select().get();
    const validOrgIds = new Set(orgsSnap.docs.map(d => d.id));

    // Find all unique org IDs referenced in sessions (v2 path)
    const sessionsPage = await db.collectionGroup('sessions')
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(5000)
      .get();

    const orphanOrgIds = new Set<string>();
    for (const doc of sessionsPage.docs) {
      const parts = doc.ref.path.split('/');
      // Path: organizations/{orgId}/clients/{slug}/sessions/{id}
      if (parts[0] === 'organizations' && !validOrgIds.has(parts[1])) {
        orphanOrgIds.add(parts[1]);
      }
    }

    if (orphanOrgIds.size === 0) {
      return { success: true, purged: 0, orgIds: [] };
    }

    let totalDeleted = 0;
    const purgedIds: string[] = [];

    for (const orgId of orphanOrgIds) {
      const orgRef = db.collection('organizations').doc(orgId);
      // Delete clients and their nested v2 subcollections
      const clientsSnap = await orgRef.collection('clients').get();
      for (const clientDoc of clientsSnap.docs) {
        for (const sub of ['current', 'sessions', 'roadmap', 'achievements', 'assessmentDrafts']) {
          const subSnap = await clientDoc.ref.collection(sub).limit(1000).get();
          if (!subSnap.empty) {
            const batch = db.batch();
            subSnap.docs.forEach(d => { batch.delete(d.ref); totalDeleted++; });
            await batch.commit();
          }
        }
        await clientDoc.ref.delete(); totalDeleted++;
      }
      // Delete other known subcollections (including legacy v1 paths)
      for (const sub of ['assessments', 'coaches', 'roadmaps', 'assessmentDrafts', 'assessmentHistory', 'usage', 'clientLookup']) {
        const subSnap = await orgRef.collection(sub).limit(1000).get();
        if (!subSnap.empty) {
          const batch = db.batch();
          subSnap.docs.forEach(d => { batch.delete(d.ref); totalDeleted++; });
          await batch.commit();
        }
      }
      purgedIds.push(orgId);
    }

    return { success: true, purged: purgedIds.length, totalDeleted, orgIds: purgedIds };
  },
);

/**
 * repairClientProfiles — server-side repair callable (platform admin only)
 *
 * For every client in the given org (or all orgs if orgId is omitted):
 *  1. Finds the latest scored session
 *  2. Writes/repairs the current/state subcollection document
 *  3. Patches the client profile document with overallScore, scoresSummary,
 *     formData, and assessmentCount so the analytics Cloud Function
 *     and the coach dashboard can read scores correctly
 *
 * Uses admin SDK — bypasses Firestore security rules.
 * Idempotent: safe to run multiple times.
 */
export const repairClientProfiles = onCall(
  { enforceAppCheck: false, cors: CORS_ORIGINS, timeoutSeconds: 300 },
  async (request) => {
    if (!request.auth?.uid) throw new Error('Authentication required.');
    const db = admin.firestore();

    // Platform admin gate
    const adminDoc = await db.doc(`platform_admins/${request.auth.uid}`).get();
    if (!adminDoc.exists) throw new Error('Platform admin access required.');

    const { orgId: targetOrgId } = (request.data ?? {}) as { orgId?: string };

    // Determine which orgs to process
    let orgIds: string[];
    if (targetOrgId) {
      orgIds = [targetOrgId];
    } else {
      const orgsSnap = await db.collection('organizations').select().get();
      orgIds = orgsSnap.docs.map(d => d.id);
    }

    const results: { slug: string; status: string; score?: number }[] = [];
    let fixed = 0;
    let skipped = 0;

    for (const orgId of orgIds) {
      const clientsSnap = await db.collection(`organizations/${orgId}/clients`).get();

      for (const clientDoc of clientsSnap.docs) {
        const slug = clientDoc.id;
        // Skip non-slug docs (UUID-format legacy, metadata docs, etc.)
        if (!/^[a-z][a-z0-9\-._]+$/.test(slug)) continue;

        const data = clientDoc.data() as Record<string, unknown>;
        const profileHasScore =
          typeof data.overallScore === 'number' && (data.overallScore as number) > 0;

        // Check current/state
        const currentRef = db.doc(`organizations/${orgId}/clients/${slug}/current/state`);
        const currentSnap = await currentRef.get();
        const currentData = currentSnap.exists ? (currentSnap.data() as Record<string, unknown>) : null;
        const currentHasData =
          currentData?.formData &&
          Object.keys(currentData.formData as object).length > 0;

        if (profileHasScore && currentHasData) {
          skipped++;
          results.push({ slug, status: 'ok' });
          continue;
        }

        // Fetch sessions oldest-first
        const sessionsSnap = await db
          .collection(`organizations/${orgId}/clients/${slug}/sessions`)
          .orderBy('timestamp', 'asc')
          .get();

        if (sessionsSnap.empty) {
          results.push({ slug, status: 'no-sessions' });
          skipped++;
          continue;
        }

        // Find latest session with formData and overallScore > 0
        const sessions = sessionsSnap.docs.map(d => ({
          id: d.id,
          ...(d.data() as {
            formData?: Record<string, unknown>;
            overallScore?: number;
            scoresSummary?: unknown;
            timestamp?: admin.firestore.Timestamp;
          }),
        }));

        const latestWithData = [...sessions]
          .reverse()
          .find(s => s.formData && Object.keys(s.formData).length > 0);

        if (!latestWithData?.formData) {
          results.push({ slug, status: 'no-formdata' });
          skipped++;
          continue;
        }

        const overallScore =
          typeof latestWithData.overallScore === 'number' && latestWithData.overallScore > 0
            ? latestWithData.overallScore
            : 0;

        const scoresSummary = latestWithData.scoresSummary ?? null;
        const formData = latestWithData.formData;

        // 1. Write current/state
        await currentRef.set(
          {
            schemaVersion: 2,
            formData,
            overallScore,
            scoresSummary,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            organizationId: orgId,
          },
          { merge: false },
        );

        // 2. Patch client profile doc with score fields
        await clientDoc.ref.set(
          {
            overallScore,
            scoresSummary,
            formData,
            assessmentCount: sessions.length,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        fixed++;
        results.push({ slug, status: 'repaired', score: overallScore });
      }
    }

    admin.firestore(); // ensure app is initialised
    console.info(`[repairClientProfiles] fixed=${fixed} skipped=${skipped}`);
    return { success: true, fixed, skipped, results };
  },
);

export const createRemoteAssessmentToken = onCall({ enforceAppCheck: false }, async (request) => {
  const db = admin.firestore();
  const key = buildRateLimitKey('remoteMint', request.auth?.uid, request.rawRequest?.ip);
  await assertRateLimit(db, key, { maxRequests: 10, windowSeconds: 60 });
  return handleCreateRemoteAssessmentToken(request);
});

export const getRemoteAssessmentSession = onCall(
  { enforceAppCheck: false, invoker: 'public' },
  async (request) => {
    const db = admin.firestore();
    const key = buildRateLimitKey('remotePeek', undefined, request.rawRequest?.ip);
    await assertRateLimit(db, key, { maxRequests: 40, windowSeconds: 60 });
    return handleGetRemoteAssessmentSession(request);
  },
);

export const submitRemoteAssessmentFields = onCall(
  { enforceAppCheck: false, invoker: 'public' },
  async (request) => {
    if (!REMOTE_ASSESSMENT_MVP) {
      throw new HttpsError('failed-precondition', 'Remote assessment MVP is not enabled.');
    }
    const db = admin.firestore();
    const token =
      request.data && typeof (request.data as { token?: string }).token === 'string'
        ? (request.data as { token: string }).token.slice(0, 32)
        : 'unknown';
    const key = buildRateLimitKey('remoteSubmit', token, request.rawRequest?.ip);
    await assertRateLimit(db, key, { maxRequests: 25, windowSeconds: 60 });
    return handleSubmitRemoteAssessmentFields(request);
  },
);

export const getRemotePostureUploadUrl = onCall(
  { enforceAppCheck: false, invoker: 'public' },
  async (request) => {
    if (!REMOTE_ASSESSMENT_MVP) {
      throw new HttpsError('failed-precondition', 'Remote assessment MVP is not enabled.');
    }
    const db = admin.firestore();
    const token =
      request.data && typeof (request.data as { token?: string }).token === 'string'
        ? (request.data as { token: string }).token.trim().slice(0, 32)
        : 'unknown';
    const key = buildRateLimitKey('remotePostureUpload', token, request.rawRequest?.ip);
    await assertRateLimit(db, key, { maxRequests: 30, windowSeconds: 60 });
    return handleGetRemotePostureUploadUrl(request);
  },
);
