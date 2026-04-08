/**
 * Send every transactional email layout to your inbox for visual/copy review.
 * Does not touch Firestore or Firebase Auth.
 *
 * From the `functions/` directory:
 *   npm run email:preview -- you@example.com
 *
 * Or:
 *   TEST_EMAIL_INBOX=you@example.com npm run email:preview
 *
 * If Resend says the API key is invalid, run with `--debug-env` (no secret printed):
 *   npm run email:preview -- --debug-env you@example.com
 *
 * Requires `functions/.env` with RESEND_API_KEY and RESEND_FROM (see env.example).
 * Optional: set FOUNDER_WELCOME_FROM so the “Founder welcome” preview uses your real From + Reply-To.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import '../init-env';
import { Resend } from 'resend';
import { buildFounderWelcomeEducationContent } from '../constants/founderWelcomeEmail';
import {
  APP_HOST,
  EMAIL_ASSETS_LOGO_URL,
  FOUNDER_FEEDBACK_EMAIL,
  FOUNDER_SIGN_OFF_NAME,
  FOUNDER_WELCOME_FROM,
  RESEND_API_KEY,
  RESEND_FROM,
} from '../config';
import {
  parseDisplayNameFromFromField,
  parseEmailFromFromField,
} from '../email/fromHeader';
import {
  renderActivationEmail,
  renderEducationEmail,
  renderNotificationEmail,
  sendResendHtmlText,
} from '../email';

const APP_NAME = 'One Assess';
const PREVIEW_TAG = '[OA preview]';
const DEBUG_ENV_FLAG = '--debug-env';
/** Full Resend secrets are much longer; short values are almost always a truncated paste. */
const MIN_RESEND_KEY_LEN = 28;

function wantsEnvDebug(): boolean {
  return process.argv.includes(DEBUG_ENV_FLAG);
}

function parseRecipient(): string {
  const args = process.argv.slice(2).filter((a) => a !== DEBUG_ENV_FLAG);
  const fromArg = args.find((a) => a.includes('@') && !a.startsWith('-'))?.trim();
  const fromEnv = process.env.TEST_EMAIL_INBOX?.trim();
  const raw = fromArg || fromEnv;
  if (!raw) {
    throw new Error(
      'Pass your inbox as the first argument or set TEST_EMAIL_INBOX. Example: npm run email:preview -- you@example.com',
    );
  }
  return raw;
}

function printEnvDebug(resendKey: string): void {
  const functionsRoot = path.resolve(__dirname, '..', '..');
  const primaryEnv = path.join(functionsRoot, '.env');
  const primaryLocal = path.join(functionsRoot, '.env.local');
  const cwdEnv = path.join(process.cwd(), '.env');
  process.stderr.write('email:preview --debug-env (no full key shown)\n');
  process.stderr.write(`  cwd=${process.cwd()}\n`);
  process.stderr.write(`  script resolves functions dir=${functionsRoot}\n`);
  process.stderr.write(`  .env exists=${fs.existsSync(primaryEnv)} → ${primaryEnv}\n`);
  process.stderr.write(`  .env.local exists=${fs.existsSync(primaryLocal)} → ${primaryLocal}\n`);
  process.stderr.write(`  cwd .env exists=${fs.existsSync(cwdEnv)} → ${cwdEnv}\n`);
  process.stderr.write(
    `  RESEND_API_KEY len=${resendKey.length} prefix=${resendKey.slice(0, 4)} startsWith(re_)=${resendKey.startsWith('re_')}\n`,
  );
  if (resendKey.length > 0 && resendKey.length < MIN_RESEND_KEY_LEN) {
    process.stderr.write(
      `  hint: length < ${MIN_RESEND_KEY_LEN} usually means the key was cut off — paste the full key from Resend on one line.\n`,
    );
  }
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  if (wantsEnvDebug()) {
    printEnvDebug(RESEND_API_KEY);
  }

  if (!RESEND_API_KEY) {
    throw new Error('Set RESEND_API_KEY in functions/.env (see env.example).');
  }
  if (!RESEND_API_KEY.startsWith('re_')) {
    throw new Error(
      'RESEND_API_KEY must start with re_ (create a key in Resend → API Keys). ' +
        'Check functions/.env for typos, extra quotes around the value, or the wrong variable name.',
    );
  }
  if (RESEND_API_KEY.length < MIN_RESEND_KEY_LEN) {
    throw new Error(
      `RESEND_API_KEY is only ${RESEND_API_KEY.length} characters; full Resend keys are typically ${MIN_RESEND_KEY_LEN}+. ` +
        'In Resend → API Keys, create or reveal the key and paste the entire value on a single line in functions/.env.',
    );
  }

  const to = parseRecipient();
  const resend = new Resend(RESEND_API_KEY);
  const logoUrl = EMAIL_ASSETS_LOGO_URL || undefined;
  const dashboard = `${APP_HOST}/dashboard`;
  const login = `${APP_HOST}/login`;
  const team = `${APP_HOST}/org/team`;
  const inviteLink = `${APP_HOST}/onboarding?invite=preview-demo-token`;
  const reportLink = `${APP_HOST}/r/preview-report-token`;
  const clientUrl = `${APP_HOST}/client/${encodeURIComponent('Jamie Client')}`;

  const jobs: Array<{
    label: string;
    subject: string;
    html: string;
    text: string;
    from?: string;
    replyTo?: string;
  }> = [];

  const subjectEdu = `${PREVIEW_TAG} Education — get more from assessments`;
  jobs.push({
    label: 'Education',
    subject: subjectEdu,
    ...renderEducationEmail({
      subject: subjectEdu,
      preheader: 'Three ways coaches save time with One Assess.',
      appName: APP_NAME,
      logoUrl,
      headline: 'Get the most out of One Assess',
      paragraphs: [
        'You already run assessments — here is how to go faster next week.',
      ],
      bullets: [
        'Use ARC™ to show phased progress and milestones in one view.',
        'Share the client report link so they see AXIS Score™ between sessions.',
        'Open SIGNAL™ when building plans — cross-pillar themes from the latest assessment.',
      ],
      primaryCta: { label: 'Open dashboard', href: dashboard },
      secondaryLink: { label: 'Log in', href: login },
      footerVariant: 'transactional',
    }),
  });

  const subjectWelcome = `${PREVIEW_TAG} Welcome (onboarding complete)`;
  jobs.push({
    label: 'Welcome',
    subject: subjectWelcome,
    ...renderActivationEmail({
      subject: subjectWelcome,
      preheader: 'Your account is ready — open the dashboard to get started.',
      appName: APP_NAME,
      logoUrl,
      headline: 'Welcome, Alex',
      paragraphs: [
        'Your account is set up and you’re ready to go. Log in to start assessing clients and building their ARC™ plans.',
      ],
      primaryCta: { label: 'Go to dashboard', href: dashboard },
      secondaryLink: { label: 'Log in', href: login },
      footerVariant: 'transactional',
    }),
  });

  const founderSignOff =
    FOUNDER_SIGN_OFF_NAME.trim() ||
    (FOUNDER_WELCOME_FROM ? parseDisplayNameFromFromField(FOUNDER_WELCOME_FROM) ?? '' : '');
  const founderFeedback =
    FOUNDER_FEEDBACK_EMAIL ||
    (FOUNDER_WELCOME_FROM ? parseEmailFromFromField(FOUNDER_WELCOME_FROM) || '' : '');
  const founderBase = buildFounderWelcomeEducationContent({
    firstName: 'Alex',
    signOffName: founderSignOff,
    appName: APP_NAME,
    dashboardUrl: dashboard,
    loginUrl: login,
    feedbackEmail: founderFeedback,
  });
  const subjectFounder = `${PREVIEW_TAG} ${founderBase.subject}`;
  const previewFounderFrom = FOUNDER_WELCOME_FROM.trim() || RESEND_FROM;
  const founderReplyTo =
    FOUNDER_WELCOME_FROM.trim().length > 0
      ? parseEmailFromFromField(FOUNDER_WELCOME_FROM) ?? undefined
      : undefined;
  jobs.push({
    label: 'Founder welcome',
    subject: subjectFounder,
    ...renderEducationEmail({
      ...founderBase,
      subject: subjectFounder,
      logoUrl,
    }),
    from: previewFounderFrom,
    replyTo: founderReplyTo,
  });

  const subjectInvite = `${PREVIEW_TAG} Coach invite`;
  jobs.push({
    label: 'Coach invite',
    subject: subjectInvite,
    ...renderActivationEmail({
      subject: subjectInvite,
      preheader: 'Sam invited you to Northside Strength on One Assess.',
      appName: APP_NAME,
      logoUrl,
      headline: "You're invited!",
      paragraphs: [
        'Sam has invited you to join Northside Strength as a coach.',
        "This invite expires in 7 days. If you didn't expect this email, you can ignore it.",
      ],
      primaryCta: { label: 'Accept invite', href: inviteLink },
      footerVariant: 'transactional',
    }),
  });

  const subjectReport = `${PREVIEW_TAG} Report share (notification)`;
  jobs.push({
    label: 'Report share',
    subject: subjectReport,
    ...renderNotificationEmail({
      subject: subjectReport,
      preheader: 'Jamie Client report — AXIS Score™ ready to view.',
      appName: APP_NAME,
      summary: 'Jamie Client report is ready — AXIS Score™ and pillars in One Assess.',
      linkHref: reportLink,
      linkLabel: 'View report',
      footerVariant: 'transactional',
    }),
  });

  const subjectFirst = `${PREVIEW_TAG} First assessment celebration`;
  jobs.push({
    label: 'First assessment',
    subject: subjectFirst,
    ...renderActivationEmail({
      subject: subjectFirst,
      preheader: 'Great work — open the app to keep momentum.',
      appName: APP_NAME,
      logoUrl,
      headline: 'Your first assessment is in',
      paragraphs: [
        'You’ve saved an assessment for Jamie Client. That’s a major step toward clearer client ARC™ plans and less assessment admin.',
        'Continue in the app anytime to run more assessments, share reports, and refine ARC™ plans.',
      ],
      primaryCta: { label: 'View client', href: clientUrl },
      secondaryLink: { label: 'Go to dashboard', href: dashboard },
      footerVariant: 'transactional',
    }),
  });

  const subjectAccepted = `${PREVIEW_TAG} Invite accepted`;
  jobs.push({
    label: 'Invite accepted',
    subject: subjectAccepted,
    ...renderActivationEmail({
      subject: subjectAccepted,
      preheader: 'new.coach@example.com accepted your invite to Northside Strength.',
      appName: APP_NAME,
      logoUrl,
      headline: 'Someone joined your team',
      paragraphs: [
        'new.coach@example.com has accepted the invite you sent as Sam and joined Northside Strength.',
      ],
      primaryCta: { label: 'View team', href: team },
      footerVariant: 'transactional',
    }),
  });

  for (const job of jobs) {
    const { id } = await sendResendHtmlText(resend, {
      from: job.from ?? RESEND_FROM,
      to,
      subject: job.subject,
      html: job.html,
      text: job.text,
      replyTo: job.replyTo,
    });
    process.stdout.write(`Sent: ${job.label} → ${to} (Resend id: ${id})\n`);
    await pause(400);
  }

  process.stdout.write(`\nDone. Sent ${jobs.length} messages. Subjects are prefixed ${PREVIEW_TAG}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
