/**
 * Transactional emails for standard SaaS flows.
 *
 * Uses SendGrid (same as invites and share). Requires:
 *   SENDGRID_API_KEY, SENDGRID_FROM in environment.
 *
 * Emails sent:
 *   - Welcome: when a user completes onboarding (triggered by userProfiles update).
 */

import * as admin from 'firebase-admin';
import { Resend } from 'resend';
import { APP_HOST, RESEND_API_KEY, RESEND_FROM } from './config';

const resend = new Resend(RESEND_API_KEY);

const APP_NAME = 'One Assess';
const LOGIN_URL = `${APP_HOST}/login`;
const DASHBOARD_URL = `${APP_HOST}/dashboard`;

function defaultHtmlWrapper(subject: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);overflow:hidden;">
    <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:24px;text-align:center;">
      <span style="color:rgba(255,255,255,0.9);font-size:14px;">${APP_NAME}</span>
    </div>
    <div style="padding:28px 24px;">
      ${bodyHtml}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
      You received this email because you have an account with ${APP_NAME}. If you didn’t expect this, you can ignore it.
    </div>
  </div>
</body>
</html>`.trim();
}

/**
 * Send welcome email after onboarding is completed.
 * Idempotent: safe to call even if SendGrid is not configured (no-op).
 */
export async function sendWelcomeEmail(
  toEmail: string,
  displayName: string | null,
): Promise<void> {
  if (!RESEND_API_KEY || !toEmail?.trim()) return;

  const firstName = displayName?.trim().split(/\s+/)[0] || 'there';
  const subject = `Welcome to ${APP_NAME}`;
  const bodyHtml = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Welcome, ${firstName}</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;">
      Your account is set up and you’re ready to go. Log in to start assessing clients and building their roadmaps.
    </p>
    <a href="${DASHBOARD_URL}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
      Go to dashboard
    </a>
    <p style="margin:24px 0 0;font-size:13px;color:#64748b;">
      <a href="${LOGIN_URL}" style="color:#6366f1;">Log in</a> if you need to sign in again.
    </p>
  `;

  await resend.emails.send({
    from: RESEND_FROM,
    to: toEmail.trim(),
    subject,
    html: defaultHtmlWrapper(subject, bodyHtml),
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
