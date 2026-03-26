import type { EducationEmailContent } from '../email/layouts';

export interface FounderWelcomeCopyParams {
  firstName: string;
  signOffName: string;
  appName: string;
  dashboardUrl: string;
  loginUrl: string;
  /** Used for mailto secondary CTA; omit link if empty. */
  feedbackEmail: string;
}

function feedbackMailtoHref(email: string, appName: string): string {
  const subject = encodeURIComponent(`${appName} — feedback`);
  return `mailto:${encodeURIComponent(email.trim())}?subject=${subject}`;
}

/**
 * Personal founder welcome after onboarding. Copy is centralized for future i18n / edits.
 */
export function buildFounderWelcomeEducationContent(
  p: FounderWelcomeCopyParams,
): EducationEmailContent {
  const subject = `Welcome to ${p.appName} — a quick note from me`;
  const preheader =
    'Thank you for joining. A short personal note, why we built this, and an open invite for feedback.';

  const feedbackHref =
    p.feedbackEmail.trim().length > 0
      ? feedbackMailtoHref(p.feedbackEmail, p.appName)
      : '';

  const opener =
    p.firstName === 'there'
      ? `I’m really glad you’re here. Starting something new when you’re already busy with clients is a real commitment — thank you for giving ${p.appName} a try.`
      : `I’m really glad you’re here, ${p.firstName}. Starting something new when you’re already busy with clients is a real commitment — thank you for giving ${p.appName} a try.`;

  const signOffLine =
    p.signOffName.trim().length > 0 ? `— ${p.signOffName.trim()}` : `— ${p.appName}`;

  const paragraphs: string[] = [
    opener,
    `I built ${p.appName} because I kept seeing excellent coaches lose time to assessment admin instead of coaching. I wanted a calmer way to capture assessments, share progress with clients, and keep roadmaps in one place — without adding another pile of busywork.`,
    `${p.appName} is still young, and I’m working on it every day to make it genuinely useful for coaches. You’re not “just another signup” to us; you’re exactly who I’m trying to get this right for.`,
    `If anything feels confusing, missing, or slower than it should be, I’d love to hear from you. Honest feedback helps us improve fastest — you can reply to this email directly, and I read every message.`,
    signOffLine,
  ];

  const secondaryLink =
    feedbackHref.length > 0
      ? { label: 'Send feedback', href: feedbackHref }
      : { label: 'Log in', href: p.loginUrl };

  return {
    subject,
    preheader,
    appName: p.appName,
    headline: p.firstName === 'there' ? 'Welcome aboard' : `Welcome, ${p.firstName}`,
    paragraphs,
    primaryCta: { label: 'Open your dashboard', href: p.dashboardUrl },
    secondaryLink,
    footerVariant: 'transactional',
  };
}
