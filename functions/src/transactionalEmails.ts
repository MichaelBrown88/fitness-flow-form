/**
 * Transactional emails for standard SaaS flows (Resend via Cloud Functions).
 *
 * Requires RESEND_API_KEY, RESEND_FROM (see functions/env.example).
 *
 * Emails sent:
 *   - Welcome: when a user completes onboarding (triggered by userProfiles update). Personal founder
 *     copy + From address when FOUNDER_WELCOME_FROM is set; otherwise product activation template.
 *   - First assessment celebration: once per coach when their first session is created.
 *   - Invite accepted: org owner when a coach accepts an invite.
 */

import * as admin from 'firebase-admin';
import { Resend } from 'resend';
import { buildFounderWelcomeEducationContent } from './constants/founderWelcomeEmail';
import {
  APP_HOST,
  EMAIL_ASSETS_LOGO_URL,
  FOUNDER_FEEDBACK_EMAIL,
  FOUNDER_SIGN_OFF_NAME,
  FOUNDER_WELCOME_FROM,
  RESEND_API_KEY,
  RESEND_FROM,
} from './config';
import {
  parseDisplayNameFromFromField,
  parseEmailFromFromField,
} from './email/fromHeader';
import { renderActivationEmail, renderEducationEmail, sendResendHtmlText } from './email';

const resend = new Resend(RESEND_API_KEY);

const APP_NAME = 'One Assess';
const LOGIN_URL = `${APP_HOST}/login`;
const DASHBOARD_URL = `${APP_HOST}/dashboard`;

/**
 * Send welcome email after onboarding is completed.
 * Idempotent: safe to call when Resend is not configured (no-op).
 */
export async function sendWelcomeEmail(
  toEmail: string,
  displayName: string | null,
): Promise<void> {
  if (!RESEND_API_KEY || !toEmail?.trim()) return;

  const firstName = displayName?.trim().split(/\s+/)[0] || 'there';

  if (FOUNDER_WELCOME_FROM) {
    const feedbackInbox =
      FOUNDER_FEEDBACK_EMAIL || parseEmailFromFromField(FOUNDER_WELCOME_FROM) || '';
    const signOffName =
      FOUNDER_SIGN_OFF_NAME.trim() ||
      parseDisplayNameFromFromField(FOUNDER_WELCOME_FROM) ||
      '';

    const content = buildFounderWelcomeEducationContent({
      firstName,
      signOffName,
      appName: APP_NAME,
      dashboardUrl: DASHBOARD_URL,
      loginUrl: LOGIN_URL,
      feedbackEmail: feedbackInbox,
    });

    const { html, text } = renderEducationEmail({
      ...content,
      logoUrl: EMAIL_ASSETS_LOGO_URL || undefined,
    });

    const replyTo = parseEmailFromFromField(FOUNDER_WELCOME_FROM);

    await sendResendHtmlText(resend, {
      from: FOUNDER_WELCOME_FROM,
      to: toEmail.trim(),
      subject: content.subject,
      html,
      text,
      replyTo: replyTo ?? undefined,
    });
    return;
  }

  const subject = `Welcome to ${APP_NAME}`;
  const { html, text } = renderActivationEmail({
    subject,
    preheader: 'Your account is ready — open the dashboard to get started.',
    appName: APP_NAME,
    logoUrl: EMAIL_ASSETS_LOGO_URL || undefined,
    headline: firstName === 'there' ? 'Welcome aboard' : `Welcome, ${firstName}`,
    paragraphs: [
      'Your account is set up and you’re ready to go. Log in to start assessing clients and building their ARC™ plans.',
    ],
    primaryCta: { label: 'Go to dashboard', href: DASHBOARD_URL },
    secondaryLink: { label: 'Log in', href: LOGIN_URL },
    footerVariant: 'transactional',
  });

  await sendResendHtmlText(resend, {
    from: RESEND_FROM,
    to: toEmail.trim(),
    subject,
    html,
    text,
  });
}

/**
 * Resolve email for a user: profile first, then Firebase Auth.
 */
export async function resolveUserEmail(uid: string, profileEmail: string | null | undefined): Promise<string | null> {
  if (typeof profileEmail === 'string' && profileEmail.trim()) return profileEmail.trim();
  try {
    const auth = admin.auth();
    const user = await auth.getUser(uid);
    return user.email?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Firestore trigger handler: when userProfiles/{userId} is updated and
 * onboardingCompleted flips to true, send welcome email.
 */
export async function handleOnboardingCompleted(
  beforeData: admin.firestore.DocumentData | undefined,
  afterData: admin.firestore.DocumentData | undefined,
  userId: string,
): Promise<void> {
  const wasCompleted = beforeData?.onboardingCompleted === true;
  const isNowCompleted = afterData?.onboardingCompleted === true;
  if (wasCompleted || !isNowCompleted) return;

  const email = await resolveUserEmail(
    userId,
    afterData?.email ?? null,
  );
  if (!email) return;

  const displayName = typeof afterData?.displayName === 'string' ? afterData.displayName : null;
  await sendWelcomeEmail(email, displayName);
}

/**
 * One-time Activation email when a coach's first assessment session is saved.
 * Sets userProfiles/{uid}.emailMilestones.firstAssessmentCelebrationSentAt after a successful send.
 */
export async function maybeSendFirstAssessmentCelebrationEmail(
  orgId: string,
  clientSlug: string,
  sessionData: Record<string, unknown>,
): Promise<void> {
  if (!RESEND_API_KEY) return;

  const createdBy =
    typeof sessionData.createdBy === 'string' ? sessionData.createdBy.trim() : '';
  if (!createdBy) return;

  const sessionOrgId =
    typeof sessionData.organizationId === 'string' ? sessionData.organizationId.trim() : '';
  if (sessionOrgId && sessionOrgId !== orgId) return;

  const db = admin.firestore();
  const profileRef = db.doc(`userProfiles/${createdBy}`);
  const profileSnap = await profileRef.get();
  if (!profileSnap.exists) return;

  const profileData = profileSnap.data()!;
  const profileOrgId =
    typeof profileData.organizationId === 'string' ? profileData.organizationId : '';
  if (!profileOrgId || profileOrgId !== orgId) return;

  const milestones = profileData.emailMilestones as Record<string, unknown> | undefined;
  if (milestones?.firstAssessmentCelebrationSentAt != null) return;

  const toEmail = await resolveUserEmail(createdBy, profileData.email as string | undefined);
  if (!toEmail) return;

  const clientDoc = await db.doc(`organizations/${orgId}/clients/${clientSlug}`).get();
  const clientName =
    clientDoc.exists && typeof clientDoc.data()?.clientName === 'string'
      ? (clientDoc.data()!.clientName as string)
      : clientSlug;

  const subject = `You completed your first assessment on ${APP_NAME}`;
  const clientUrl = `${APP_HOST}/client/${encodeURIComponent(clientName)}`;

  const { html, text } = renderActivationEmail({
    subject,
    preheader: 'Great work — open the app to keep momentum.',
    appName: APP_NAME,
    logoUrl: EMAIL_ASSETS_LOGO_URL || undefined,
    headline: 'Your first assessment is in',
    paragraphs: [
      `You’ve saved an assessment for ${clientName}. That’s a major step toward clearer client ARC™ plans and less assessment admin.`,
      'Continue in the app anytime to run more assessments, share reports, and refine ARC™ plans.',
    ],
    primaryCta: { label: 'View client', href: clientUrl },
    secondaryLink: { label: 'Go to dashboard', href: DASHBOARD_URL },
    footerVariant: 'transactional',
  });

  await sendResendHtmlText(resend, {
    from: RESEND_FROM,
    to: toEmail,
    subject,
    html,
    text,
  });

  await profileRef.update({
    'emailMilestones.firstAssessmentCelebrationSentAt':
      admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Email the inviter when a coach accepts an invite (in-app notification is separate).
 */
export async function sendInviteAcceptedEmail(params: {
  inviterUid: string;
  joinerEmail: string;
  invitedByDisplayName: string;
  organizationName: string;
}): Promise<void> {
  if (!RESEND_API_KEY) return;

  const db = admin.firestore();
  const profileSnap = await db.doc(`userProfiles/${params.inviterUid}`).get();
  const profileEmail = profileSnap.exists
    ? (profileSnap.data()?.email as string | undefined)
    : undefined;

  const toEmail = await resolveUserEmail(params.inviterUid, profileEmail);
  if (!toEmail) return;

  const teamUrl = `${APP_HOST}/org/team`;
  const subject = `${params.joinerEmail} joined ${params.organizationName}`;

  const { html, text } = renderActivationEmail({
    subject,
    preheader: `${params.joinerEmail} accepted your invite to ${params.organizationName}.`,
    appName: APP_NAME,
    logoUrl: EMAIL_ASSETS_LOGO_URL || undefined,
    headline: 'Someone joined your team',
    paragraphs: [
      `${params.joinerEmail} has accepted the invite you sent as ${params.invitedByDisplayName} and joined ${params.organizationName}.`,
    ],
    primaryCta: { label: 'View team', href: teamUrl },
    footerVariant: 'transactional',
  });

  await sendResendHtmlText(resend, {
    from: RESEND_FROM,
    to: toEmail,
    subject,
    html,
    text,
  });
}
