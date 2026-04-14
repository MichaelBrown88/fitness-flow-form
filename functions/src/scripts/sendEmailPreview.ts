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
  renderDigestEmail,
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

  // ── Lifecycle emails (solo variants) ────────────────────────────────────────

  const founderSender = FOUNDER_WELCOME_FROM.trim() || RESEND_FROM;

  jobs.push({
    label: 'Lifecycle [solo]: monthly digest',
    subject: `${PREVIEW_TAG} Your March 2026 One Assess recap`,
    from: founderSender,
    ...renderDigestEmail({
      subject: `${PREVIEW_TAG} Your March 2026 One Assess recap`,
      preheader: '12 assessments, ~4.2 hrs saved',
      appName: APP_NAME,
      logoUrl,
      headline: 'Your March 2026 recap',
      stats: [
        { value: '12', label: 'assessments' },
        { value: '8', label: 'AI queries' },
        { value: '4.2 hrs', label: 'saved on admin' },
      ],
      paragraphs: [
        `Hey Sarah, here's what you got done in March 2026 with One Assess.`,
        'Coaches who assess clients consistently tend to retain them longer. Clients who can see their own progress stay motivated.',
      ],
      bullets: [
        'Share a client report — clients get a branded PDF they can keep',
        'Posture screening — capture posture photos and get AI-scored feedback in seconds',
      ],
      primaryCta: { label: 'Open dashboard', href: dashboard },
      footerVariant: 'marketing',
    }),
  });

  jobs.push({
    label: 'Lifecycle [team]: monthly digest',
    subject: `${PREVIEW_TAG} Your team\'s March 2026 recap`,
    from: founderSender,
    ...renderDigestEmail({
      subject: `${PREVIEW_TAG} Your team's March 2026 recap`,
      preheader: '34 assessments across 3 coaches, ~6.8 hrs saved',
      appName: APP_NAME,
      logoUrl,
      headline: `Your team's March 2026 recap`,
      stats: [
        { value: '34', label: 'assessments' },
        { value: '21', label: 'AI queries' },
        { value: '6.8 hrs', label: 'saved on admin' },
      ],
      paragraphs: [
        `Hey James, here's what your team got done in March 2026.`,
        '34 assessments across 3 coaches, saving roughly 6.8 hours of admin. That\'s a solid month.',
      ],
      bullets: [
        'Share client reports — each coach can send clients a branded PDF after their assessment',
        'Try the AI assistant — your coaches can use it to write ARC plans in seconds',
      ],
      primaryCta: { label: 'Open dashboard', href: dashboard },
      footerVariant: 'marketing',
    }),
  });

  jobs.push({
    label: 'Lifecycle [solo]: first AI use',
    subject: `${PREVIEW_TAG} What coaches are doing with the AI assistant`,
    from: founderSender,
    ...renderEducationEmail({
      subject: `${PREVIEW_TAG} What coaches are doing with the AI assistant`,
      preheader: 'Real examples from coaches who use it every session',
      appName: APP_NAME,
      logoUrl,
      headline: 'What coaches are doing with the AI assistant',
      paragraphs: [
        `Hey Sarah, you just started using the AI assistant. Here are five things coaches use it for that save real time:`,
      ],
      bullets: [
        'Writing ARC plans: "Write a 4-week plan for a sedentary 42-year-old with lower back pain"',
        'Explaining assessment results in plain English before a client call',
        'Drafting follow-up messages after a session',
        'Getting corrective exercise cue suggestions from posture findings',
        'Summarising a client\'s progress across multiple assessments',
      ],
      primaryCta: { label: 'Try it now', href: dashboard },
      secondaryLink: { label: 'View your clients', href: `${APP_HOST}/clients` },
      footerVariant: 'marketing',
    }),
  });

  jobs.push({
    label: 'Lifecycle [team]: first AI use',
    subject: `${PREVIEW_TAG} What your coaches can do with the AI assistant`,
    from: founderSender,
    ...renderEducationEmail({
      subject: `${PREVIEW_TAG} What your coaches can do with the AI assistant`,
      preheader: 'Real examples from coaches who use it every session',
      appName: APP_NAME,
      logoUrl,
      headline: 'What your coaches can do with the AI assistant',
      paragraphs: [
        `Hey James, your team just started using the AI assistant. Here are five ways coaches are using it to save time every session:`,
      ],
      bullets: [
        'Writing ARC plans for clients: "Write a 4-week plan for a sedentary 42-year-old with lower back pain"',
        'Briefing new coaches on a client before their first session',
        'Generating consistent follow-up message templates coaches can personalise',
        'Summarising a client\'s progress across assessments for handover notes',
        'Drafting corrective exercise cues based on posture screening results',
      ],
      primaryCta: { label: 'Try it now', href: dashboard },
      footerVariant: 'marketing',
    }),
  });

  jobs.push({
    label: 'Lifecycle [solo]: report never shared',
    subject: `${PREVIEW_TAG} A gift for your clients`,
    from: founderSender,
    ...renderActivationEmail({
      subject: `${PREVIEW_TAG} A gift for your clients`,
      preheader: 'Your clients are going to love seeing this',
      appName: APP_NAME,
      logoUrl,
      headline: 'A gift for your clients',
      paragraphs: [
        `Hey Sarah, you've completed 7 assessments in One Assess. That's a solid collection of data your clients are going to love.`,
        `You can share a branded report with each client in about 10 seconds. Open an assessment, hit Share, and they get a personalised summary to keep. Coaches who share reports find clients show up more motivated and stay longer.`,
        `Try it after your next session.`,
      ],
      primaryCta: { label: 'Share a report', href: `${APP_HOST}/clients` },
      footerVariant: 'marketing',
    }),
  });

  jobs.push({
    label: 'Lifecycle [team]: report never shared',
    subject: `${PREVIEW_TAG} Something your clients are going to love`,
    from: founderSender,
    ...renderActivationEmail({
      subject: `${PREVIEW_TAG} Something your clients are going to love`,
      preheader: 'Your clients are going to love seeing this',
      appName: APP_NAME,
      logoUrl,
      headline: 'A gift your clients will love',
      paragraphs: [
        `Hey James, your team has built up 18 assessments across 3 coaches. That's a lot of valuable data your clients are going to love seeing.`,
        `Each coach can share a branded report in about 10 seconds. Clients get a summary they can keep, and it tends to open up much richer conversations in follow-up sessions.`,
        `Worth encouraging your coaches to try it after their next session.`,
      ],
      primaryCta: { label: 'Share a report', href: `${APP_HOST}/clients` },
      footerVariant: 'marketing',
    }),
  });

  jobs.push({
    label: 'Lifecycle [solo]: slowdown nudge',
    subject: `${PREVIEW_TAG} Checking in, Sarah`,
    from: founderSender,
    ...renderActivationEmail({
      subject: `${PREVIEW_TAG} Checking in, Sarah`,
      preheader: 'A quick note from the One Assess founder',
      appName: APP_NAME,
      logoUrl,
      headline: 'Just checking in',
      paragraphs: [
        `Hey Sarah, I wanted to reach out personally. Client loads go up and down, that's just coaching.`,
        `I'm curious whether there's anything I can do to make the platform work better for you. Is there a workflow that could be faster, or something you wish it did that it currently doesn't?`,
        `Reply to this and it comes straight to me.`,
        founderSignOff || 'Michael',
      ],
      primaryCta: { label: 'Open One Assess', href: dashboard },
      footerVariant: 'marketing',
    }),
  });

  jobs.push({
    label: 'Lifecycle [team]: slowdown nudge',
    subject: `${PREVIEW_TAG} Checking in, James`,
    from: founderSender,
    ...renderActivationEmail({
      subject: `${PREVIEW_TAG} Checking in, James`,
      preheader: 'A quick note from the One Assess founder',
      appName: APP_NAME,
      logoUrl,
      headline: 'Just checking in',
      paragraphs: [
        `Hey James, I wanted to check in personally. Every team has quieter months and that's completely fine.`,
        `I'm curious whether there's anything I can do to make the platform work better for your coaches. Are there workflows we could streamline, or features that would save them more time?`,
        `Reply here and it comes straight to me.`,
        founderSignOff || 'Michael',
      ],
      primaryCta: { label: 'Open One Assess', href: dashboard },
      footerVariant: 'marketing',
    }),
  });

  jobs.push({
    label: 'Lifecycle [solo]: capacity 80%',
    subject: `${PREVIEW_TAG} You've nearly filled your roster, Sarah`,
    from: founderSender,
    ...renderEducationEmail({
      subject: `${PREVIEW_TAG} You've nearly filled your roster, Sarah`,
      preheader: '24 of 30 client slots used',
      appName: APP_NAME,
      logoUrl,
      headline: `You've nearly filled your roster`,
      paragraphs: [
        `Hey Sarah, you now have 24 of your 30 client slots filled. Solid progress.`,
        `When you're ready to take on more clients, upgrading takes a couple of minutes from the billing page. No rush, just good to know the option is there.`,
      ],
      primaryCta: { label: 'View billing options', href: `${APP_HOST}/billing` },
      secondaryLink: { label: 'Back to dashboard', href: dashboard },
      footerVariant: 'transactional',
    }),
  });

  jobs.push({
    label: 'Lifecycle [team]: capacity 80%',
    subject: `${PREVIEW_TAG} Your team has nearly filled its roster`,
    from: founderSender,
    ...renderEducationEmail({
      subject: `${PREVIEW_TAG} Your team has nearly filled its roster`,
      preheader: '80 of 100 client slots used across your team',
      appName: APP_NAME,
      logoUrl,
      headline: 'Your team has nearly filled its roster',
      paragraphs: [
        `Hey James, your team now has 80 of 100 client slots filled across your coaches. That's real growth.`,
        `When you're ready to expand, you can upgrade from the billing page. Worth sorting before a coach tries to onboard someone and hits the limit mid-session.`,
      ],
      primaryCta: { label: 'View billing options', href: `${APP_HOST}/billing` },
      secondaryLink: { label: 'Back to dashboard', href: dashboard },
      footerVariant: 'transactional',
    }),
  });

  jobs.push({
    label: 'Lifecycle [solo]: founder check-in',
    subject: `${PREVIEW_TAG} 6 weeks in, how's it going?`,
    from: founderSender,
    ...renderActivationEmail({
      subject: `${PREVIEW_TAG} 6 weeks in, how's it going?`,
      preheader: 'A personal note from the One Assess founder',
      appName: APP_NAME,
      logoUrl,
      headline: '6 weeks in',
      paragraphs: [
        `Hey Sarah, it's been about 6 weeks since you joined One Assess. In that time you've run 23 assessments across 12 clients.`,
        `I'm curious whether anything has changed in your business since you started using it. Are you taking on more clients than before? Are you finding it easier to show clients their progress and keep them motivated?`,
        `And honestly, is there anything about the platform that's not working the way you expected? I read every reply personally and use it to decide what to build next.`,
        `No agenda here, I just want to hear how it's going from someone actually using it.`,
        founderSignOff || 'Michael',
      ],
      primaryCta: {
        label: 'Reply to this email',
        href: `mailto:${founderSender}?subject=One Assess feedback`,
      },
      footerVariant: 'marketing',
    }),
  });

  jobs.push({
    label: 'Lifecycle [team]: founder check-in',
    subject: `${PREVIEW_TAG} 6 weeks in, how's it going?`,
    from: founderSender,
    ...renderActivationEmail({
      subject: `${PREVIEW_TAG} 6 weeks in, how's it going?`,
      preheader: 'A personal note from the One Assess founder',
      appName: APP_NAME,
      logoUrl,
      headline: '6 weeks in',
      paragraphs: [
        `Hey James, it's been about 6 weeks since you set up your team on One Assess. You've run 52 assessments across 3 coaches and 28 clients.`,
        `I'm genuinely curious how it's landing with your coaches. Are they finding it easy to pick up? Are clients responding to the reports?`,
        `And from a business perspective, are you noticing any difference in how long members are staying, or whether new clients are coming in?`,
        `No agenda, I just find this kind of feedback really useful. Reply here and it comes straight to me.`,
        founderSignOff || 'Michael',
      ],
      primaryCta: {
        label: 'Reply to this email',
        href: `mailto:${founderSender}?subject=One Assess feedback`,
      },
      footerVariant: 'marketing',
    }),
  });

  jobs.push({
    label: 'Lifecycle [solo]: lead magnet tip',
    subject: `${PREVIEW_TAG} Something worth trying with your next prospect`,
    from: founderSender,
    ...renderEducationEmail({
      subject: `${PREVIEW_TAG} Something worth trying with your next prospect`,
      preheader: 'Coaches who offer free assessments convert prospects at 2-3x the rate',
      appName: APP_NAME,
      logoUrl,
      headline: 'A free assessment is the best first appointment you can offer',
      paragraphs: [
        `Hey Sarah, here's a simple tactic that converts prospects better than a free consultation: offer a free One Assess fitness assessment instead.`,
        `The pitch: "I'll run a free fitness assessment for you. Takes 20 minutes, you leave with a full report on your movement, posture, and baseline fitness."`,
        `It's tangible, it's educational, and it positions you as the expert from the first interaction. The report does the selling. You just ask at the end if they want to keep going.`,
      ],
      bullets: [
        'Post about it: "Free fitness assessment this week, limited spots"',
        'Run the assessment, share the branded report at the end of the session',
        'The report starts the conversation. You just ask if they want to continue.',
      ],
      primaryCta: { label: 'Run an assessment now', href: `${APP_HOST}/clients` },
      footerVariant: 'marketing',
    }),
  });

  jobs.push({
    label: 'Lifecycle [team]: lead magnet tip',
    subject: `${PREVIEW_TAG} Something worth sharing with your coaches`,
    from: founderSender,
    ...renderEducationEmail({
      subject: `${PREVIEW_TAG} Something worth sharing with your coaches`,
      preheader: 'Coaches who offer free assessments convert prospects at 2-3x the rate',
      appName: APP_NAME,
      logoUrl,
      headline: 'A free assessment is the best first appointment your coaches can offer',
      paragraphs: [
        `Hey James, here's something worth sharing with your coaches: offering a free One Assess fitness assessment to prospects converts significantly better than a standard consultation call.`,
        `The pitch is simple: "Come in for a free fitness assessment. Takes 20 minutes. You'll leave with a full report on your movement, posture, and fitness baseline."`,
        `It works because the member leaves with something concrete. The report does the selling without anyone having to push. With 3 coaches each converting just two extra clients this way, that adds up quickly.`,
      ],
      bullets: [
        'Have each coach post about it: "Free fitness assessment this week, limited spots"',
        'Run the assessment with One Assess, share the branded report at the end',
        'The report starts the conversion conversation naturally',
      ],
      primaryCta: { label: 'Run an assessment now', href: `${APP_HOST}/clients` },
      footerVariant: 'marketing',
    }),
  });

  // ── End lifecycle emails ─────────────────────────────────────────────────────

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
