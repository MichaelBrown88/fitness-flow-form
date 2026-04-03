/**
 * Trial expiry nudge emails.
 *
 * Two triggers:
 *   1. Webhook: customer.subscription.trial_will_end (Stripe fires 3 days before)
 *      → sends "Your trial ends in 3 days" email.
 *   2. Scheduled: daily at 08:30 UTC
 *      → queries Firestore for orgs whose trialEndsAt is tomorrow → "Last day" email.
 *
 * Uses the same Resend + renderActivationEmail pipeline as other transactional emails.
 */

import * as admin from 'firebase-admin';
import { Resend } from 'resend';
import { RESEND_API_KEY, RESEND_FROM, APP_HOST, EMAIL_ASSETS_LOGO_URL } from './config';
import { renderActivationEmail, sendResendHtmlText } from './email';
import { resolveUserEmail } from './transactionalEmails';

const resend = new Resend(RESEND_API_KEY);
const APP_NAME = 'One Assess';

export async function sendTrialEndingSoonEmail(
  orgId: string,
  daysLeft: number,
): Promise<void> {
  if (!RESEND_API_KEY) return;

  const db = admin.firestore();
  const orgSnap = await db.doc(`organizations/${orgId}`).get();
  if (!orgSnap.exists) return;

  const orgData = orgSnap.data()!;
  const ownerId = orgData.ownerId as string | undefined;
  if (!ownerId) return;

  const alreadySent = orgData.emailMilestones?.trialNudgeSentDays as number[] | undefined;
  if (alreadySent?.includes(daysLeft)) return;

  const profileSnap = await db.doc(`userProfiles/${ownerId}`).get();
  const toEmail = await resolveUserEmail(ownerId, profileSnap.data()?.email as string | undefined);
  if (!toEmail) return;

  const firstName = (profileSnap.data()?.displayName as string | undefined)?.split(/\s+/)[0] || 'there';
  const billingUrl = `${APP_HOST}/billing`;

  const isLastDay = daysLeft <= 1;
  const subject = isLastDay
    ? `Your ${APP_NAME} trial ends tomorrow`
    : `Your ${APP_NAME} trial ends in ${daysLeft} days`;

  const { html, text } = renderActivationEmail({
    subject,
    preheader: isLastDay
      ? 'Subscribe now to keep your data and client access.'
      : `You have ${daysLeft} days left to try ${APP_NAME}.`,
    appName: APP_NAME,
    logoUrl: EMAIL_ASSETS_LOGO_URL || undefined,
    headline: isLastDay ? 'Last day of your trial' : `${daysLeft} days left on your trial`,
    paragraphs: isLastDay
      ? [
          `Hey ${firstName}, your ${APP_NAME} gym trial ends tomorrow. After that, you'll lose access to your client data and assessments.`,
          'Subscribe now to keep everything — all your clients, assessments, and roadmaps stay exactly where they are.',
        ]
      : [
          `Hey ${firstName}, your ${APP_NAME} gym trial ends in ${daysLeft} days. We wanted to give you a heads-up so you have time to decide.`,
          'When you subscribe, nothing changes — all your clients, data, and progress carry over seamlessly.',
        ],
    primaryCta: { label: 'Choose a plan', href: billingUrl },
    secondaryLink: { label: 'Go to dashboard', href: `${APP_HOST}/dashboard` },
    footerVariant: 'transactional',
  });

  await sendResendHtmlText(resend, {
    from: RESEND_FROM,
    to: toEmail,
    subject,
    html,
    text,
  });

  await db.doc(`organizations/${orgId}`).update({
    [`emailMilestones.trialNudgeSentDays`]: admin.firestore.FieldValue.arrayUnion(daysLeft),
  });

  console.log(`[TrialNudge] Sent ${daysLeft}-day nudge to ${toEmail} for org ${orgId}`);
}

/**
 * Scheduled function: find orgs whose trial ends tomorrow and send last-day nudge.
 * Called by onSchedule in index.ts.
 */
export async function sendTrialExpiryNudges(): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log('[TrialNudge] RESEND_API_KEY not set, skipping');
    return;
  }

  const db = admin.firestore();
  const now = new Date();
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);

  const orgsSnap = await db
    .collection('organizations')
    .where('subscription.status', '==', 'trial')
    .where('subscription.trialEndsAt', '>=', admin.firestore.Timestamp.fromDate(tomorrowStart))
    .where('subscription.trialEndsAt', '<', admin.firestore.Timestamp.fromDate(tomorrowEnd))
    .limit(200)
    .get();

  console.log(`[TrialNudge] Found ${orgsSnap.size} orgs with trial ending tomorrow`);

  for (const doc of orgsSnap.docs) {
    try {
      await sendTrialEndingSoonEmail(doc.id, 1);
    } catch (err) {
      console.error(`[TrialNudge] Failed for org ${doc.id}:`, err);
    }
  }
}
