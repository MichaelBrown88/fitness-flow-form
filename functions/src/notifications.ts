/**
 * Notification triggers and scheduled tasks.
 *
 * - onLifestyleCheckinCreated: Firestore trigger that notifies the coach
 *   when a client submits a lifestyle check-in via the public report link.
 *   Runs server-side because the client is unauthenticated.
 *
 * - sendReassessmentReminders: Daily scheduled function that fires
 *   reassessment_due notifications to clients whose retest date falls today.
 */

import * as admin from 'firebase-admin';
import { sendInviteAcceptedEmail } from './transactionalEmails';

const PHASE_NAMES: Record<string, string> = {
  foundation: 'Foundation',
  development: 'Development',
  performance: 'Performance',
};

/**
 * Notify the org admin when a coach accepts their invite.
 * Fires from an onDocumentWritten trigger on invitations/{token}.
 */
export async function handleInviteAccepted(
  beforeStatus: string | undefined,
  afterStatus: string | undefined,
  invitedByUid: string | undefined,
  invitedBy: string,
  coachEmail: string,
  organizationName: string,
): Promise<void> {
  if (beforeStatus === afterStatus) return;
  if (afterStatus !== 'accepted') return;
  if (!invitedByUid) return;

  const db = admin.firestore();
  await db.collection(`notifications/${invitedByUid}/items`).add({
    type: 'coach_accepted',
    title: `${coachEmail} joined ${organizationName}`,
    body: `${coachEmail} has accepted the invite sent by ${invitedBy} and joined your team.`,
    priority: 'low',
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    recipientUid: invitedByUid,
    actionUrl: '/org/team',
  });

  try {
    await sendInviteAcceptedEmail({
      inviterUid: invitedByUid,
      joinerEmail: coachEmail,
      invitedByDisplayName: invitedBy,
      organizationName,
    });
  } catch (err) {
    console.error('[handleInviteAccepted] invite-accepted email failed', err);
  }
}

const SUBMISSION_TYPE_LABELS: Record<string, string> = {
  body_comp_scan: 'body composition scan',
  posture_images: 'posture images',
  lifestyle_checkin: 'lifestyle check-in',
};

/**
 * Notify the coach when a client uploads a self-service submission
 * (body comp scan, posture images, or lifestyle check-in) via the
 * org-scoped clientSubmissions path.
 *
 * Resolves the assigned coach by looking up the client profile doc
 * where firebaseUid matches the submitting client's UID.
 */
export async function handleClientSubmissionCreated(
  orgId: string,
  clientUid: string,
  submissionData: Record<string, unknown>,
): Promise<void> {
  const db = admin.firestore();
  const submissionType = typeof submissionData.type === 'string' ? submissionData.type : 'submission';
  const typeLabel = SUBMISSION_TYPE_LABELS[submissionType] ?? submissionType;

  // Resolve client profile to get the assigned coach UID and client name
  const clientsSnap = await db
    .collection(`organizations/${orgId}/clients`)
    .where('firebaseUid', '==', clientUid)
    .limit(1)
    .get();

  if (clientsSnap.empty) return;

  const clientData = clientsSnap.docs[0].data();
  const coachUid: string | undefined = clientData.assignedCoachUid;
  const clientName: string = clientData.clientName ?? 'A client';

  if (!coachUid) return;

  await db.collection(`notifications/${coachUid}/items`).add({
    type: 'client_submission',
    title: `${clientName} submitted a ${typeLabel}`,
    body: 'New client data is available for review.',
    priority: 'medium',
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    recipientUid: coachUid,
    actionUrl: `/client/${encodeURIComponent(clientName)}`,
    meta: { submissionType, orgId, clientUid },
  });
}

/** Translates a qualitative activity level into an estimated steps/day value. */
const ACTIVITY_TO_STEPS: Record<string, string> = {
  sedentary: '2000',
  lightly_active: '5000',
  moderately_active: '8000',
  active: '10000',
  very_active: '15000',
};

/**
 * Notify the coach when a new lifestyle check-in lands, and merge the
 * check-in fields into the live report's formData so scores update automatically.
 * Called from the Firestore trigger registered in index.ts.
 */
export async function handleLifestyleCheckinCreated(
  shareToken: string,
  checkinData: Record<string, string>,
): Promise<void> {
  const db = admin.firestore();

  const reportRef = db.doc(`publicReports/${shareToken}`);
  const reportSnap = await reportRef.get();
  if (!reportSnap.exists) return;

  const reportData = reportSnap.data()!;
  const coachUid: string | undefined = reportData.coachUid;
  const clientName: string = reportData.clientName ?? 'A client';

  // Merge check-in fields into formData — fields with identical keys map directly.
  // activityLevel needs translation to stepsPerDay (used by the lifestyle scorer).
  const formDataUpdates: Record<string, string> = {};
  const directFields = ['sleepArchetype', 'stressLevel', 'nutritionHabits', 'hydrationHabits', 'stepsPerDay'];
  for (const field of directFields) {
    if (checkinData[field]) formDataUpdates[`formData.${field}`] = checkinData[field];
  }
  if (checkinData.activityLevel) {
    formDataUpdates['formData.activityLevel'] = checkinData.activityLevel;
    // Only overwrite stepsPerDay if the client didn't submit an explicit value
    if (!checkinData.stepsPerDay) {
      const estimated = ACTIVITY_TO_STEPS[checkinData.activityLevel];
      if (estimated) formDataUpdates['formData.stepsPerDay'] = estimated;
    }
  }

  if (Object.keys(formDataUpdates).length > 0) {
    await reportRef.update({
      ...formDataUpdates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Notify the coach
  if (!coachUid) return;
  await db.collection(`notifications/${coachUid}/items`).add({
    type: 'lifestyle_checkin',
    title: `${clientName} submitted a lifestyle check-in`,
    body: 'Their live report scores have been updated with the new data.',
    priority: 'medium',
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    actionUrl: `/client/${encodeURIComponent(clientName)}`,
    recipientUid: coachUid,
    meta: { shareToken },
  });
}

/**
 * Daily reassessment reminders.
 *
 * Scans all active clients and sends a reassessment_due notification to any
 * client whose dueDateOverride for one or more pillars falls on today (UTC).
 * Also sends a schedule_review reminder to coaches for any client that has
 * been paused for more than 14 days.
 */
export async function sendReassessmentReminders(): Promise<void> {
  const db = admin.firestore();
  const now = new Date();

  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sevenDayWindowStart = new Date(Date.UTC(sevenDaysFromNow.getUTCFullYear(), sevenDaysFromNow.getUTCMonth(), sevenDaysFromNow.getUTCDate(), 0, 0, 0));
  const sevenDayWindowEnd = new Date(Date.UTC(sevenDaysFromNow.getUTCFullYear(), sevenDaysFromNow.getUTCMonth(), sevenDaysFromNow.getUTCDate(), 23, 59, 59));
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const orgsSnap = await db.collection('organizations').get();
  let reassessmentSent = 0;
  let pausedRemindersSent = 0;
  let upcomingRemindersSent = 0;
  let inactiveRemindersSent = 0;

  // Batch upcoming-due and inactive clients per coach to avoid notification spam
  const upcomingByCoach: Map<string, string[]> = new Map();
  const inactiveByCoach: Map<string, string[]> = new Map();

  for (const orgDoc of orgsSnap.docs) {
    const orgData = orgDoc.data();
    if (orgData.metadata?.isDeleted === true) continue;

    const clientsSnap = await db
      .collection(`organizations/${orgDoc.id}/clients`)
      .get();

    for (const clientDoc of clientsSnap.docs) {
      const data = clientDoc.data();
      const status: string = data.status ?? 'active';

      // --- Pass 1: Reassessment due today (client notification) ---
      if (status === 'active') {
        const shareToken: string | undefined = data.shareToken;
        const dueDateOverrides = data.dueDateOverrides as
          | Record<string, admin.firestore.Timestamp>
          | undefined;

        if (shareToken && dueDateOverrides) {
          const duePillars: string[] = [];
          for (const [pillar, ts] of Object.entries(dueDateOverrides)) {
            const dueDate = ts.toDate();
            if (dueDate >= todayStart && dueDate <= todayEnd) {
              duePillars.push(pillar);
            }
          }

          if (duePillars.length > 0) {
            const pillarLabels = duePillars.map((p) => PHASE_NAMES[p] ?? p).join(', ');
            await db.collection(`publicReports/${shareToken}/notifications`).add({
              type: 'reassessment_due',
              title: 'Time for your reassessment',
              body: `Your ${pillarLabels} reassessment is due today. Contact your coach to book a session.`,
              priority: 'medium',
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              meta: { duePillars },
            });
            reassessmentSent++;
          }
        }
      }

      // --- Pass 2: Reassessment due in 7 days (coach proactive nudge) ---
      if (status === 'active') {
        const coachUid: string | undefined = data.assignedCoachUid;
        const dueDateOverrides = data.dueDateOverrides as
          | Record<string, admin.firestore.Timestamp>
          | undefined;
        const clientName: string = data.clientName ?? 'A client';

        if (coachUid && dueDateOverrides) {
          for (const ts of Object.values(dueDateOverrides)) {
            const dueDate = ts.toDate();
            if (dueDate >= sevenDayWindowStart && dueDate <= sevenDayWindowEnd) {
              const list = upcomingByCoach.get(coachUid) ?? [];
              if (!list.includes(clientName)) list.push(clientName);
              upcomingByCoach.set(coachUid, list);
              break;
            }
          }
        }
      }

      // --- Pass 3: Active clients with no retest date and > 30 days since last session ---
      if (status === 'active') {
        const coachUid: string | undefined = data.assignedCoachUid;
        const dueDateOverrides = data.dueDateOverrides as Record<string, admin.firestore.Timestamp> | undefined;
        const lastSessionAt = (data.lastSessionAt as admin.firestore.Timestamp | undefined)?.toDate();
        const clientName: string = data.clientName ?? 'A client';

        const hasNoDueDates = !dueDateOverrides || Object.keys(dueDateOverrides).length === 0;
        const isInactive = !lastSessionAt || lastSessionAt <= thirtyDaysAgo;

        if (coachUid && hasNoDueDates && isInactive) {
          const list = inactiveByCoach.get(coachUid) ?? [];
          if (!list.includes(clientName)) list.push(clientName);
          inactiveByCoach.set(coachUid, list);
        }
      }

      // --- Paused client coach reminder (C3) ---
      if (status === 'paused') {
        const pausedAt = (data.pausedAt as admin.firestore.Timestamp | undefined)?.toDate();
        const coachUid: string | undefined = data.assignedCoachUid;
        if (pausedAt && pausedAt <= fourteenDaysAgo && coachUid) {
          const clientName: string = data.clientName ?? 'A client';
          await db.collection(`notifications/${coachUid}/items`).add({
            type: 'schedule_review',
            title: `${clientName} has been paused for over 2 weeks`,
            body: 'Consider reaching out to review their status and plan a return to training.',
            priority: 'medium',
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            recipientUid: coachUid,
            actionUrl: `/client/${encodeURIComponent(clientName)}`,
          });
          pausedRemindersSent++;
        }
      }
    }
  }

  // Flush batched upcoming-due nudges (one notification per coach)
  for (const [coachUid, clientNames] of upcomingByCoach.entries()) {
    const count = clientNames.length;
    const preview = clientNames.slice(0, 2).join(', ') + (count > 2 ? ` and ${count - 2} more` : '');
    await db.collection(`notifications/${coachUid}/items`).add({
      type: 'schedule_review_upcoming',
      title: `${count} client${count > 1 ? 's' : ''} due for reassessment in 7 days`,
      body: `${preview} — book their sessions now to stay ahead of the schedule.`,
      priority: 'medium',
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      recipientUid: coachUid,
      actionUrl: '/dashboard',
      meta: { clientNames, daysAhead: 7 },
    });
    upcomingRemindersSent++;
  }

  // Flush batched inactive (no schedule) nudges (one notification per coach)
  for (const [coachUid, clientNames] of inactiveByCoach.entries()) {
    const count = clientNames.length;
    const preview = clientNames.slice(0, 2).join(', ') + (count > 2 ? ` and ${count - 2} more` : '');
    await db.collection(`notifications/${coachUid}/items`).add({
      type: 'schedule_review_upcoming',
      title: `${count} client${count > 1 ? 's' : ''} without a reassessment schedule`,
      body: `${preview} ${count > 1 ? 'have' : 'has'} not been reassessed in over 30 days and have no retest date set.`,
      priority: 'low',
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      recipientUid: coachUid,
      actionUrl: '/dashboard',
      meta: { clientNames, reason: 'no_schedule_inactive' },
    });
    inactiveRemindersSent++;
  }

  console.log(
    `[DailyReminders] Due today: ${reassessmentSent}, Paused: ${pausedRemindersSent}, ` +
    `Upcoming 7d: ${upcomingRemindersSent}, Inactive: ${inactiveRemindersSent}`
  );
}

/**
 * Draft recovery nudges.
 *
 * Scans all assessmentDraft docs (via collectionGroup) that have not been
 * updated in more than 48 hours and notifies the coach to follow up or discard.
 * Uses the COLLECTION_GROUP index on assessmentDrafts.updatedAt.
 */
export async function sendDraftRecoveryNudges(): Promise<void> {
  const db = admin.firestore();
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const cutoff = admin.firestore.Timestamp.fromDate(fortyEightHoursAgo);

  const draftsSnap = await db
    .collectionGroup('assessmentDrafts')
    .where('updatedAt', '<', cutoff)
    .limit(200)
    .get();

  let nudgesSent = 0;

  for (const draftDoc of draftsSnap.docs) {
    const data = draftDoc.data();
    const orgId: string | undefined = data.organizationId;
    const clientName: string | undefined = data.clientName;
    if (!orgId || !clientName) continue;

    // Find the coach from the org's client profile
    const clientsSnap = await db
      .collection(`organizations/${orgId}/clients`)
      .where('clientName', '==', clientName)
      .limit(1)
      .get();

    const coachUid: string | undefined = clientsSnap.docs[0]?.data().assignedCoachUid;
    if (!coachUid) continue;

    await db.collection(`notifications/${coachUid}/items`).add({
      type: 'schedule_review',
      title: `Incomplete assessment for ${clientName}`,
      body: 'An assessment was started but not completed. Resume or discard the draft.',
      priority: 'low',
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      recipientUid: coachUid,
      actionUrl: `/client/${encodeURIComponent(clientName)}`,
      meta: { draftPath: draftDoc.ref.path },
    });

    nudgesSent++;
  }

  console.log(`[DraftRecovery] Nudges sent: ${nudgesSent}`);
}
