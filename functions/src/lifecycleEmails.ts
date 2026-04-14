/**
 * Lifecycle emails — value-first, behaviour-triggered coach communications.
 *
 * Philosophy: every email mirrors the coach's own progress back to them or
 * teaches them something useful. No retention pressure.
 *
 * All emails come from FOUNDER_WELCOME_FROM (e.g. "Michael <michael@one-assess.com>")
 * so replies land in a real inbox. Falls back to RESEND_FROM if not configured.
 *
 * Solo vs team: each email has separate copy. Team emails go to the org owner/manager
 * and speak to running a team, not just their own client list.
 *
 * Emails:
 *   1. monthlyValueDigest      — 1st of month; stat cards for assessments, AI queries, hours saved
 *   2. firstAiUseFollowUp      — first AI assistant query; 5 real coaching use cases
 *   3. reportNeverSharedNudge  — 3+ assessments, zero shared reports
 *   4. assessmentSlowdownNudge — activity drops 50%+ vs monthly average
 *   5. capacityApproachingNudge — org hits 80% of client cap
 *   6. founderCheckIn          — 6-8 weeks in; personal note asking how the business has changed
 *   7. leadMagnetTip           — free assessment as a prospect conversion tool
 *
 * Deduplication: all sends write a key to org.emailMilestones in Firestore.
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { Resend } from 'resend';
import {
  RESEND_API_KEY,
  RESEND_FROM,
  FOUNDER_WELCOME_FROM,
  FOUNDER_SIGN_OFF_NAME,
  APP_HOST,
  EMAIL_ASSETS_LOGO_URL,
} from './config';
import { renderEducationEmail, renderActivationEmail, renderDigestEmail, sendResendHtmlText } from './email';
import { resolveUserEmail } from './transactionalEmails';

const resend = new Resend(RESEND_API_KEY);
const APP_NAME = 'One Assess';

function founderFrom(): string {
  return FOUNDER_WELCOME_FROM || RESEND_FROM;
}

function founderSignOff(): string {
  if (FOUNDER_SIGN_OFF_NAME) return FOUNDER_SIGN_OFF_NAME;
  const match = (FOUNDER_WELCOME_FROM || '').match(/^([^<]+)</);
  return match ? match[1].trim() : 'Michael';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isGymOrg(orgData: admin.firestore.DocumentData): boolean {
  return (
    orgData.type === 'gym' ||
    orgData.subscription?.packageTrack === 'gym' ||
    (typeof orgData.coachCount === 'number' && orgData.coachCount > 1)
  );
}

async function getOrgOwnerEmail(
  db: admin.firestore.Firestore,
  orgData: admin.firestore.DocumentData,
): Promise<{ toEmail: string; firstName: string } | null> {
  const ownerId = orgData.ownerId as string | undefined;
  if (!ownerId) return null;
  const profileSnap = await db.doc(`userProfiles/${ownerId}`).get();
  const toEmail = await resolveUserEmail(ownerId, profileSnap.data()?.email as string | undefined);
  if (!toEmail) return null;
  const firstName =
    (profileSnap.data()?.displayName as string | undefined)?.split(/\s+/)[0] || 'there';
  return { toEmail, firstName };
}

function hasMilestone(orgData: admin.firestore.DocumentData, key: string): boolean {
  return !!(orgData.emailMilestones as Record<string, unknown> | undefined)?.[key];
}

async function markMilestone(
  db: admin.firestore.Firestore,
  orgId: string,
  key: string,
): Promise<void> {
  await db.doc(`organizations/${orgId}`).update({
    [`emailMilestones.${key}`]: true,
  });
}

// ─── 1. Monthly value digest ──────────────────────────────────────────────────

/**
 * Scheduled: 1st of each month.
 * Stat card layout showing assessments, AI queries, and hours saved last month.
 * Highlights unused features the coach or team hasn't tried yet.
 */
export async function sendMonthlyValueDigests(): Promise<void> {
  if (!RESEND_API_KEY) return;

  const db = admin.firestore();
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const milestoneKey = `monthlyDigest_${prevMonth.getFullYear()}_${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = prevMonth.toLocaleString('en-GB', { month: 'long', year: 'numeric' });

  const orgsSnap = await db
    .collection('organizations')
    .where('assessmentCount', '>', 0)
    .limit(500)
    .get();

  logger.info(`[LifecycleEmail] monthlyValueDigest: ${orgsSnap.size} orgs to process`);

  for (const doc of orgsSnap.docs) {
    const orgData = doc.data();
    if (hasMilestone(orgData, milestoneKey)) continue;

    try {
      const owner = await getOrgOwnerEmail(db, orgData);
      if (!owner) continue;

      const aiUsageKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
      const aiSnap = await db.doc(`organizations/${doc.id}/aiUsage/${aiUsageKey}`).get();
      const aiQueries = (aiSnap.data()?.totalRequests as number | undefined) ?? 0;

      // ~12 min saved per assessment (notes + ARC plan), ~3 min per AI query
      const assessments = (orgData.assessmentsThisMonth as number | undefined) ?? 0;
      const minutesSaved = assessments * 12 + aiQueries * 3;
      const hoursSaved = (minutesSaved / 60).toFixed(1);
      const coachCount = (orgData.coachCount as number | undefined) ?? 1;
      const gym = isGymOrg(orgData);

      const statCards: { value: string; label: string }[] = [];
      if (assessments > 0) statCards.push({ value: String(assessments), label: assessments === 1 ? 'assessment' : 'assessments' });
      if (aiQueries > 0) statCards.push({ value: String(aiQueries), label: aiQueries === 1 ? 'AI query' : 'AI queries' });
      if (minutesSaved >= 30) statCards.push({ value: `${hoursSaved} hrs`, label: 'saved on admin' });
      if (statCards.length === 0) statCards.push({ value: '0', label: 'assessments' });

      const unusedFeatures: string[] = [];
      if (!orgData.emailMilestones?.firstReportShared && (orgData.assessmentCount as number ?? 0) >= 2) {
        unusedFeatures.push(gym
          ? 'Share client reports — each coach can send clients a branded PDF after their session'
          : 'Share a client report — clients get a branded PDF they can keep');
      }
      if (aiQueries === 0) {
        unusedFeatures.push(gym
          ? 'Try the AI assistant — your coaches can use it to write ARC plans in seconds'
          : 'Try the AI assistant — ask it to write an ARC plan for any client');
      }
      if (!orgData.hasUsedPosture) {
        unusedFeatures.push('Posture screening — capture posture photos and get AI-scored feedback in seconds');
      }

      const subject = gym
        ? `Your team's ${monthLabel} recap`
        : `Your ${monthLabel} recap`;

      const paragraphs = gym
        ? [
            `Hey ${owner.firstName}, here's what your team got done in ${monthLabel}.`,
            assessments > 0
              ? `${assessments} assessment${assessments === 1 ? '' : 's'} across ${coachCount} coach${coachCount === 1 ? '' : 'es'}${minutesSaved >= 30 ? `, saving roughly ${hoursSaved} hours of admin` : ''}. Solid month.`
              : `Every team has slower months. If your coaches would benefit from a quick platform walkthrough, reply and I can set something up.`,
          ]
        : [
            `Hey ${owner.firstName}, here's what you got done in ${monthLabel} with One Assess.`,
            'Coaches who assess clients consistently tend to retain them longer. Clients who can see their own progress stay motivated.',
          ];

      const { html, text } = renderDigestEmail({
        subject,
        preheader: `${assessments} assessment${assessments === 1 ? '' : 's'}, ~${hoursSaved} hrs saved`,
        appName: APP_NAME,
        logoUrl: EMAIL_ASSETS_LOGO_URL || undefined,
        headline: subject,
        stats: statCards,
        paragraphs,
        bullets: unusedFeatures.length > 0 ? unusedFeatures : undefined,
        primaryCta: { label: 'Open dashboard', href: `${APP_HOST}/dashboard` },
        footerVariant: 'marketing',
      });

      await sendResendHtmlText(resend, { from: founderFrom(), to: owner.toEmail, subject, html, text });
      await markMilestone(db, doc.id, milestoneKey);
      logger.info(`[LifecycleEmail] monthlyDigest sent to ${owner.toEmail} for org ${doc.id}`);
    } catch (err) {
      logger.error(`[LifecycleEmail] monthlyDigest failed for org ${doc.id}`, err);
    }
  }
}

// ─── 2. First AI use follow-up ────────────────────────────────────────────────

/**
 * Fires when an org's aiUsage sub-collection doc is first created (Firestore trigger in index.ts).
 * Sends 5 real coaching use cases to cement the habit.
 */
export async function sendFirstAiUseFollowUp(orgId: string): Promise<void> {
  if (!RESEND_API_KEY) return;

  const db = admin.firestore();
  const orgSnap = await db.doc(`organizations/${orgId}`).get();
  if (!orgSnap.exists) return;

  const orgData = orgSnap.data()!;
  if (hasMilestone(orgData, 'firstAiFollowUp')) return;

  const owner = await getOrgOwnerEmail(db, orgData);
  if (!owner) return;

  const gym = isGymOrg(orgData);

  const subject = gym
    ? `What your coaches can do with the AI assistant`
    : `What coaches are doing with the AI assistant`;

  const intro = gym
    ? `Hey ${owner.firstName}, your team just started using the AI assistant. Here are five ways coaches are using it to save time every session:`
    : `Hey ${owner.firstName}, you just started using the AI assistant. Here are five things coaches use it for that save real time:`;

  const bullets = gym
    ? [
        'Writing ARC plans for clients: "Write a 4-week plan for a sedentary 42-year-old with lower back pain"',
        'Briefing new coaches on a client before their first session',
        'Generating consistent follow-up message templates coaches can personalise',
        'Summarising a client\'s progress across assessments for handover notes',
        'Drafting corrective exercise cues based on posture screening results',
      ]
    : [
        'Writing ARC plans: "Write a 4-week plan for a sedentary 42-year-old with lower back pain"',
        'Explaining assessment results in plain English before a client call',
        'Drafting follow-up messages after a session',
        'Getting corrective exercise cue suggestions from posture findings',
        'Summarising a client\'s progress across multiple assessments',
      ];

  const { html, text } = renderEducationEmail({
    subject,
    preheader: 'Real examples from coaches who use it every session',
    appName: APP_NAME,
    logoUrl: EMAIL_ASSETS_LOGO_URL || undefined,
    headline: subject,
    paragraphs: [intro],
    bullets,
    primaryCta: { label: 'Try it now', href: `${APP_HOST}/dashboard` },
    secondaryLink: { label: 'View your clients', href: `${APP_HOST}/clients` },
    footerVariant: 'marketing',
  });

  await sendResendHtmlText(resend, { from: founderFrom(), to: owner.toEmail, subject, html, text });
  await markMilestone(db, orgId, 'firstAiFollowUp');
  logger.info(`[LifecycleEmail] firstAiFollowUp sent to ${owner.toEmail} for org ${orgId}`);
}

// ─── 3. Report never shared nudge ────────────────────────────────────────────

/**
 * Scheduled: daily.
 * Targets orgs with 3+ assessments but zero shared client reports.
 * Sharing a report is the biggest single activation event.
 */
export async function sendReportNeverSharedNudges(): Promise<void> {
  if (!RESEND_API_KEY) return;

  const db = admin.firestore();
  const orgsSnap = await db
    .collection('organizations')
    .where('assessmentCount', '>=', 3)
    .limit(300)
    .get();

  for (const doc of orgsSnap.docs) {
    const orgData = doc.data();
    if (hasMilestone(orgData, 'reportShareNudge')) continue;

    const reportsSnap = await db
      .collection('publicReports')
      .where('organizationId', '==', doc.id)
      .limit(1)
      .get();

    if (!reportsSnap.empty) {
      await markMilestone(db, doc.id, 'reportShareNudge');
      continue;
    }

    try {
      const owner = await getOrgOwnerEmail(db, orgData);
      if (!owner) continue;

      const assessmentCount = (orgData.assessmentCount as number) ?? 3;
      const gym = isGymOrg(orgData);
      const coachCount = (orgData.coachCount as number | undefined) ?? 1;

      const subject = gym
        ? `Something your clients are going to love`
        : `A gift for your clients`;

      const paragraphs = gym
        ? [
            `Hey ${owner.firstName}, your team has built up ${assessmentCount} assessment${assessmentCount === 1 ? '' : 's'} across ${coachCount} coach${coachCount === 1 ? '' : 'es'}. That's a lot of valuable data your clients are going to love seeing.`,
            `Each coach can share a branded report in about 10 seconds. Clients get a summary they can keep, and it tends to open up much richer conversations in follow-up sessions.`,
            `Worth encouraging your coaches to try it after their next session.`,
          ]
        : [
            `Hey ${owner.firstName}, you've completed ${assessmentCount} assessment${assessmentCount === 1 ? '' : 's'} in One Assess. That's a solid collection of data your clients are going to love.`,
            `You can share a branded report with each client in about 10 seconds. Open an assessment, hit Share, and they get a personalised summary to keep. Coaches who share reports find clients show up more motivated and stay longer.`,
            `Try it after your next session.`,
          ];

      const { html, text } = renderActivationEmail({
        subject,
        preheader: 'Your clients are going to love seeing this',
        appName: APP_NAME,
        logoUrl: EMAIL_ASSETS_LOGO_URL || undefined,
        headline: gym ? 'A gift your clients will love' : 'A gift for your clients',
        paragraphs,
        primaryCta: { label: 'Share a report', href: `${APP_HOST}/clients` },
        footerVariant: 'marketing',
      });

      await sendResendHtmlText(resend, { from: founderFrom(), to: owner.toEmail, subject, html, text });
      await markMilestone(db, doc.id, 'reportShareNudge');
      logger.info(`[LifecycleEmail] reportShareNudge sent to ${owner.toEmail} for org ${doc.id}`);
    } catch (err) {
      logger.error(`[LifecycleEmail] reportShareNudge failed for org ${doc.id}`, err);
    }
  }
}

// ─── 4. Assessment slowdown nudge ────────────────────────────────────────────

/**
 * Scheduled: 1st of each month.
 * Fires when assessmentsThisMonth is 50% or less of the org's monthly average.
 * Personal from-founder tone.
 */
export async function sendAssessmentSlowdownNudges(): Promise<void> {
  if (!RESEND_API_KEY) return;

  const db = admin.firestore();
  const now = new Date();
  const milestoneKey = `slowdownNudge_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;

  const orgsSnap = await db
    .collection('organizations')
    .where('assessmentCount', '>', 5)
    .limit(300)
    .get();

  for (const doc of orgsSnap.docs) {
    const orgData = doc.data();
    if (hasMilestone(orgData, milestoneKey)) continue;

    const thisMonth = (orgData.assessmentsThisMonth as number | undefined) ?? 0;
    const totalEver = (orgData.assessmentCount as number | undefined) ?? 0;
    const createdAt = (orgData.createdAt as admin.firestore.Timestamp | undefined)?.toDate();
    if (!createdAt) continue;

    const monthsActive = Math.max(
      1,
      (now.getFullYear() - createdAt.getFullYear()) * 12 + (now.getMonth() - createdAt.getMonth()),
    );
    if (monthsActive < 2) continue;

    const monthlyAverage = totalEver / monthsActive;
    if (monthlyAverage < 2 || thisMonth > monthlyAverage * 0.5) continue;

    try {
      const owner = await getOrgOwnerEmail(db, orgData);
      if (!owner) continue;

      const gym = isGymOrg(orgData);
      const subject = `Checking in, ${owner.firstName}`;

      const paragraphs = gym
        ? [
            `Hey ${owner.firstName}, I wanted to check in personally. Every team has quieter months and that's completely fine.`,
            `I'm curious whether there's anything I can do to make the platform work better for your coaches. Are there workflows we could streamline, or features that would save them more time?`,
            `Reply here and it comes straight to me.`,
            founderSignOff(),
          ]
        : [
            `Hey ${owner.firstName}, I wanted to reach out personally. Client loads go up and down, that's just coaching.`,
            `I'm curious whether there's anything I can do to make the platform work better for you. Is there a workflow that could be faster, or something you wish it did that it currently doesn't?`,
            `Reply to this and it comes straight to me.`,
            founderSignOff(),
          ];

      const { html, text } = renderActivationEmail({
        subject,
        preheader: 'A quick note from the One Assess founder',
        appName: APP_NAME,
        logoUrl: EMAIL_ASSETS_LOGO_URL || undefined,
        headline: 'Just checking in',
        paragraphs,
        primaryCta: { label: 'Open One Assess', href: `${APP_HOST}/dashboard` },
        footerVariant: 'marketing',
      });

      await sendResendHtmlText(resend, { from: founderFrom(), to: owner.toEmail, subject, html, text });
      await markMilestone(db, doc.id, milestoneKey);
      logger.info(`[LifecycleEmail] slowdownNudge sent to ${owner.toEmail} for org ${doc.id}`);
    } catch (err) {
      logger.error(`[LifecycleEmail] slowdownNudge failed for org ${doc.id}`, err);
    }
  }
}

// ─── 5. Capacity approaching 80% ─────────────────────────────────────────────

/**
 * Called from index.ts aggregateOrgClientChanges when a client is added.
 * Fires once when the org first crosses 80% of their client cap.
 * Framed as a growth milestone, not an upsell.
 */
export async function sendCapacityApproachingEmail(orgId: string): Promise<void> {
  if (!RESEND_API_KEY) return;

  const db = admin.firestore();
  const orgSnap = await db.doc(`organizations/${orgId}`).get();
  if (!orgSnap.exists) return;

  const orgData = orgSnap.data()!;
  if (hasMilestone(orgData, 'capacity80Nudge')) return;

  const clientCount = (orgData.clientCount as number | undefined) ?? 0;
  const clientCap = (orgData.subscription?.clientCap as number | undefined) ?? 0;
  if (clientCap === 0) return;

  const pct = clientCount / clientCap;
  if (pct < 0.8) return;

  const owner = await getOrgOwnerEmail(db, orgData);
  if (!owner) return;

  const gym = isGymOrg(orgData);

  const subject = gym
    ? `Your team has nearly filled its roster`
    : `You've nearly filled your roster, ${owner.firstName}`;

  const paragraphs = gym
    ? [
        `Hey ${owner.firstName}, your team now has ${clientCount} of ${clientCap} client slots filled across your coaches. That's real growth.`,
        `When you're ready to expand, upgrading takes a couple of minutes from the billing page. Good to have sorted before your next intake.`,
      ]
    : [
        `Hey ${owner.firstName}, you now have ${clientCount} of ${clientCap} client slots filled. That's solid progress.`,
        `When you're ready to take on more clients, upgrading takes a couple of minutes from the billing page. No rush, just good to know the option is there.`,
      ];

  const { html, text } = renderEducationEmail({
    subject,
    preheader: `${clientCount} of ${clientCap} client slots used`,
    appName: APP_NAME,
    logoUrl: EMAIL_ASSETS_LOGO_URL || undefined,
    headline: subject,
    paragraphs,
    primaryCta: { label: 'View billing options', href: `${APP_HOST}/billing` },
    secondaryLink: { label: 'Back to dashboard', href: `${APP_HOST}/dashboard` },
    footerVariant: 'transactional',
  });

  await sendResendHtmlText(resend, { from: founderFrom(), to: owner.toEmail, subject, html, text });
  await markMilestone(db, orgId, 'capacity80Nudge');
  logger.info(`[LifecycleEmail] capacity80Nudge sent to ${owner.toEmail} for org ${orgId}`);
}

// ─── 6. Founder personal check-in (6-8 weeks) ────────────────────────────────

/**
 * Scheduled: daily.
 * Fires once for orgs that are 42-56 days old with 5+ assessments.
 * Personal note asking whether the business has changed since joining.
 * Replies go to the founder's real inbox.
 */
export async function sendFounderCheckIns(): Promise<void> {
  if (!RESEND_API_KEY) return;

  const db = admin.firestore();
  const now = new Date();
  const cutoffEarly = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);
  const cutoffLate = new Date(now.getTime() - 42 * 24 * 60 * 60 * 1000);

  const orgsSnap = await db
    .collection('organizations')
    .where('assessmentCount', '>=', 5)
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(cutoffEarly))
    .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(cutoffLate))
    .limit(200)
    .get();

  logger.info(`[LifecycleEmail] founderCheckIn: ${orgsSnap.size} orgs in window`);

  for (const doc of orgsSnap.docs) {
    const orgData = doc.data();
    if (hasMilestone(orgData, 'founderCheckIn')) continue;

    try {
      const owner = await getOrgOwnerEmail(db, orgData);
      if (!owner) continue;

      const createdAt = (orgData.createdAt as admin.firestore.Timestamp).toDate();
      const weeksAgo = Math.round((now.getTime() - createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const totalAssessments = (orgData.assessmentCount as number) ?? 0;
      const clientCount = (orgData.clientCount as number | undefined) ?? 0;
      const coachCount = (orgData.coachCount as number | undefined) ?? 1;
      const gym = isGymOrg(orgData);

      const subject = `${weeksAgo} weeks in, how's it going?`;

      const paragraphs = gym
        ? [
            `Hey ${owner.firstName}, it's been about ${weeksAgo} weeks since you set up your team on One Assess. In that time you've run ${totalAssessments} assessment${totalAssessments === 1 ? '' : 's'} across ${coachCount} coach${coachCount === 1 ? '' : 'es'} and ${clientCount} client${clientCount === 1 ? '' : 's'}.`,
            `I'm genuinely curious how it's landing with your coaches. Are they finding it easy to pick up? Are clients responding to the reports?`,
            `And from a business perspective, are you noticing any difference in how long clients are staying, or whether new clients are coming in? I'd love to hear what's actually changed.`,
            `No agenda, I just find this kind of feedback really useful. Reply here and it comes straight to me.`,
            founderSignOff(),
          ]
        : [
            `Hey ${owner.firstName}, it's been about ${weeksAgo} weeks since you joined One Assess. In that time you've run ${totalAssessments} assessment${totalAssessments === 1 ? '' : 's'} across ${clientCount} client${clientCount === 1 ? '' : 's'}.`,
            `I'm curious whether anything has changed in your business since you started using it. Are you taking on more clients than before? Are you finding it easier to show clients their progress and keep them motivated?`,
            `And if there's anything I can make better for you, I'd genuinely love to hear it. I read every reply personally and use the feedback to decide what to build next.`,
            `No agenda here, I just want to hear how it's going from someone actually using it.`,
            founderSignOff(),
          ];

      const { html, text } = renderActivationEmail({
        subject,
        preheader: 'A personal note from the One Assess founder',
        appName: APP_NAME,
        logoUrl: EMAIL_ASSETS_LOGO_URL || undefined,
        headline: `${weeksAgo} weeks in`,
        paragraphs,
        primaryCta: {
          label: 'Reply to this email',
          href: `mailto:${founderFrom()}?subject=One Assess feedback`,
        },
        footerVariant: 'marketing',
      });

      await sendResendHtmlText(resend, { from: founderFrom(), to: owner.toEmail, subject, html, text });
      await markMilestone(db, doc.id, 'founderCheckIn');
      logger.info(`[LifecycleEmail] founderCheckIn sent to ${owner.toEmail} for org ${doc.id}`);
    } catch (err) {
      logger.error(`[LifecycleEmail] founderCheckIn failed for org ${doc.id}`, err);
    }
  }
}

// ─── 7. Lead magnet tip ───────────────────────────────────────────────────────

/**
 * Scheduled: daily.
 * Fires once for orgs that are 14-21 days old with 1+ assessments and under 10 clients.
 * Teaches the free assessment as a prospect conversion tactic.
 */
export async function sendLeadMagnetTips(): Promise<void> {
  if (!RESEND_API_KEY) return;

  const db = admin.firestore();
  const now = new Date();
  const cutoffEarly = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
  const cutoffLate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const orgsSnap = await db
    .collection('organizations')
    .where('assessmentCount', '>=', 1)
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(cutoffEarly))
    .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(cutoffLate))
    .limit(200)
    .get();

  logger.info(`[LifecycleEmail] leadMagnetTip: ${orgsSnap.size} orgs in window`);

  for (const doc of orgsSnap.docs) {
    const orgData = doc.data();
    if (hasMilestone(orgData, 'leadMagnetTip')) continue;

    const clientCount = (orgData.clientCount as number | undefined) ?? 0;
    if (clientCount >= 10) {
      await markMilestone(db, doc.id, 'leadMagnetTip');
      continue;
    }

    try {
      const owner = await getOrgOwnerEmail(db, orgData);
      if (!owner) continue;

      const gym = isGymOrg(orgData);
      const coachCount = (orgData.coachCount as number | undefined) ?? 1;

      const subject = gym
        ? `Something worth sharing with your coaches`
        : `Something worth trying with your next prospect`;

      const paragraphs = gym
        ? [
            `Hey ${owner.firstName}, here's something worth sharing with your coaches: offering a free One Assess fitness assessment to prospects converts significantly better than a standard consultation call.`,
            `The pitch is simple: "Come in for a free fitness assessment. Takes 20 minutes. You'll leave with a full report on your movement, posture, and fitness baseline."`,
            `It works because the client leaves with something concrete. The report does the selling without anyone having to push. If you have ${coachCount} coaches each converting just two extra clients this way, that adds up quickly.`,
          ]
        : [
            `Hey ${owner.firstName}, here's a simple tactic that converts prospects better than a free consultation: offer a free One Assess fitness assessment instead.`,
            `The pitch: "I'll run a free fitness assessment for you. Takes 20 minutes, you leave with a full report on your movement, posture, and baseline fitness."`,
            `It's tangible, it's educational, and it positions you as the expert from the first interaction. The report does the selling. You just ask at the end if they want to keep going.`,
          ];

      const bullets = gym
        ? [
            'Have each coach post about it: "Free fitness assessment this week, limited spots"',
            'Run the assessment with One Assess, share the branded report at the end',
            'The report starts the conversion conversation naturally',
          ]
        : [
            'Post about it: "Free fitness assessment this week, limited spots"',
            'Run the assessment, share the branded report at the end of the session',
            'The report starts the conversation. You just ask if they want to continue.',
          ];

      const { html, text } = renderEducationEmail({
        subject,
        preheader: 'Coaches who offer free assessments convert prospects at 2-3x the rate',
        appName: APP_NAME,
        logoUrl: EMAIL_ASSETS_LOGO_URL || undefined,
        headline: 'A free assessment is the best first appointment you can offer',
        paragraphs,
        bullets,
        primaryCta: { label: 'Run an assessment now', href: `${APP_HOST}/clients` },
        footerVariant: 'marketing',
      });

      await sendResendHtmlText(resend, { from: founderFrom(), to: owner.toEmail, subject, html, text });
      await markMilestone(db, doc.id, 'leadMagnetTip');
      logger.info(`[LifecycleEmail] leadMagnetTip sent to ${owner.toEmail} for org ${doc.id}`);
    } catch (err) {
      logger.error(`[LifecycleEmail] leadMagnetTip failed for org ${doc.id}`, err);
    }
  }
}
