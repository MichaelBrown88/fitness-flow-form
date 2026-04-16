import { EMAIL_TOKENS as t } from './tokens';
import { escapeHtml } from './escapeHtml';

export type EmailFooterVariant = 'transactional' | 'marketing';

export interface EmailCta {
  label: string;
  href: string;
}

export interface EducationEmailContent {
  subject: string;
  /** Shown in <title>; optional hidden preheader for inbox preview */
  preheader?: string;
  appName: string;
  logoUrl?: string | null;
  headline: string;
  paragraphs: string[];
  bullets?: string[];
  primaryCta: EmailCta;
  secondaryLink?: EmailCta;
  footerVariant?: EmailFooterVariant;
}

export interface ActivationEmailContent {
  subject: string;
  preheader?: string;
  appName: string;
  logoUrl?: string | null;
  headline: string;
  /** e.g. "Step 2 of 4" */
  stepHint?: string;
  paragraphs: string[];
  bullets?: string[];
  primaryCta: EmailCta;
  secondaryLink?: EmailCta;
  footerVariant?: EmailFooterVariant;
}

export interface DigestStatCard {
  /** Large number or value, e.g. "12" or "4.2 hrs" */
  value: string;
  /** Short label below the value, e.g. "assessments" */
  label: string;
}

export interface DigestEmailContent {
  subject: string;
  preheader?: string;
  appName: string;
  logoUrl?: string | null;
  headline: string;
  /** Stat cards shown in a row beneath the headline (1–4 cards) */
  stats: DigestStatCard[];
  paragraphs: string[];
  bullets?: string[];
  primaryCta: EmailCta;
  secondaryLink?: EmailCta;
  footerVariant?: EmailFooterVariant;
}

export interface NotificationEmailContent {
  subject: string;
  preheader?: string;
  appName: string;
  /** One-line summary (plain language) */
  summary: string;
  linkHref: string;
  /** Anchor label, default View */
  linkLabel?: string;
  /** Optional context row (e.g. due date) */
  emphasis?: string;
  footerVariant?: EmailFooterVariant;
}

export interface RenderedEmail {
  subject?: string;
  html: string;
  text: string;
}

function footerHtml(appName: string, variant: EmailFooterVariant): string {
  if (variant === 'marketing') {
    return `
    <p style="margin:0;font-size:12px;line-height:1.5;color:${t.textMuted};">
      You received this email from ${escapeHtml(appName)}.
    </p>`.trim();
  }
  return `
    <p style="margin:0;font-size:12px;line-height:1.5;color:${t.textMuted};">
      You received this email because you have an account with ${escapeHtml(appName)}. If you didn’t expect this, you can ignore it.
    </p>`.trim();
}

function footerText(appName: string, variant: EmailFooterVariant): string {
  if (variant === 'marketing') {
    return `You received this email from ${appName}.`;
  }
  return `You received this email because you have an account with ${appName}. If you didn’t expect this, you can ignore it.`;
}

function preheaderBlock(preheader: string | undefined): string {
  if (!preheader?.trim()) return '';
  const e = escapeHtml(preheader.trim());
  return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${e}</div>`;
}

function headerBlock(appName: string, logoUrl: string | null | undefined, compact: boolean): string {
  const pad = compact ? '14px 20px' : '20px 24px';
  const accentBar = `<td style="height:4px;background:${t.accent};line-height:4px;font-size:0;">&nbsp;</td>`;
  const logoRow =
    logoUrl && logoUrl.trim().length > 0
      ? `<img src="${escapeHtml(logoUrl.trim())}" alt="${escapeHtml(appName)}" width="120" style="max-width:120px;height:auto;display:block;margin:0 auto 8px;border:0;" />`
      : '';
  const wordmark = `<span style="font-size:${compact ? '13px' : '15px'};font-weight:600;color:${t.textPrimary};letter-spacing:-0.02em;">${escapeHtml(appName)}</span>`;
  return `
  <tr>${accentBar}</tr>
  <tr>
    <td style="background:${t.headerBarBg};padding:${pad};text-align:center;border-bottom:1px solid ${t.border};">
      ${logoRow}
      ${wordmark}
    </td>
  </tr>`.trim();
}

function ctaButton(href: string, label: string): string {
  const h = escapeHtml(href);
  const l = escapeHtml(label);
  return `
  <a href="${h}" style="display:inline-block;padding:12px 22px;background:${t.accent};color:${t.accentOnAccent};border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;line-height:1.2;">
    ${l}
  </a>`.trim();
}

function textLink(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="color:${t.accentOnAccent};text-decoration:underline;font-weight:500;">${escapeHtml(label)}</a>`;
}

function wrapDocument(subject: string, innerRows: string, preheader?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;font-family:${t.fontStack};background:${t.pageBg};padding:24px 16px;">
  ${preheaderBlock(preheader)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:${t.cardBg};border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <tbody>
    ${innerRows}
    </tbody>
  </table>
</body>
</html>`.trim();
}

/**
 * Education: feature explainers, longer scannable content, primary + optional secondary link.
 */
export function renderEducationEmail(content: EducationEmailContent): RenderedEmail {
  const fv = content.footerVariant ?? 'transactional';
  const h = escapeHtml(content.headline);
  const paras = content.paragraphs.map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${t.textPrimary};">${escapeHtml(p)}</p>`).join('');
  const bullets =
    content.bullets && content.bullets.length > 0
      ? `<ul style="margin:0 0 20px;padding-left:20px;color:${t.textPrimary};font-size:15px;line-height:1.5;">
          ${content.bullets.map((b) => `<li style="margin-bottom:8px;">${escapeHtml(b)}</li>`).join('')}
        </ul>`
      : '';
  const secondary = content.secondaryLink
    ? `<p style="margin:24px 0 0;font-size:13px;color:${t.textMuted};">${textLink(content.secondaryLink.href, content.secondaryLink.label)}</p>`
    : '';

  const bodyRow = `
  <tr>
    <td style="padding:28px 24px 20px;">
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;color:${t.textPrimary};font-weight:600;">${h}</h1>
      ${paras}
      ${bullets}
      <p style="margin:8px 0 0;">${ctaButton(content.primaryCta.href, content.primaryCta.label)}</p>
      ${secondary}
    </td>
  </tr>
  <tr>
    <td style="padding:16px 24px 24px;border-top:1px solid ${t.border};">
      ${footerHtml(content.appName, fv)}
    </td>
  </tr>`;

  const inner = `${headerBlock(content.appName, content.logoUrl, false)}${bodyRow}`;

  const textParts: string[] = [content.headline, '', ...content.paragraphs];
  if (content.bullets?.length) {
    textParts.push('', ...content.bullets.map((b) => `• ${b}`));
  }
  textParts.push('', `${content.primaryCta.label}: ${content.primaryCta.href}`);
  if (content.secondaryLink) {
    textParts.push(`${content.secondaryLink.label}: ${content.secondaryLink.href}`);
  }
  textParts.push('', footerText(content.appName, fv));

  return {
    html: wrapDocument(content.subject, inner, content.preheader),
    text: textParts.join('\n'),
  };
}

/**
 * Activation: onboarding, invites, single next step; optional step hint.
 */
export function renderActivationEmail(content: ActivationEmailContent): RenderedEmail {
  const fv = content.footerVariant ?? 'transactional';
  const step =
    content.stepHint?.trim() ?
      `<p style="margin:0 0 12px;font-size:13px;font-weight:600;color:${t.textMuted};text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(content.stepHint.trim())}</p>`
    : '';
  const h = escapeHtml(content.headline);
  const paras = content.paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${t.textPrimary};">${escapeHtml(p)}</p>`).join('');
  const bullets =
    content.bullets && content.bullets.length > 0
      ? `<ul style="margin:0 0 18px;padding-left:20px;color:${t.textPrimary};font-size:15px;line-height:1.5;">
          ${content.bullets.map((b) => `<li style="margin-bottom:6px;">${escapeHtml(b)}</li>`).join('')}
        </ul>`
      : '';
  const secondary = content.secondaryLink
    ? `<p style="margin:20px 0 0;font-size:13px;color:${t.textMuted};">${textLink(content.secondaryLink.href, content.secondaryLink.label)}</p>`
    : '';

  const bodyRow = `
  <tr>
    <td style="padding:24px 24px 18px;">
      ${step}
      <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:${t.textPrimary};font-weight:600;">${h}</h1>
      ${paras}
      ${bullets}
      <p style="margin:12px 0 0;">${ctaButton(content.primaryCta.href, content.primaryCta.label)}</p>
      ${secondary}
    </td>
  </tr>
  <tr>
    <td style="padding:16px 24px 22px;border-top:1px solid ${t.border};">
      ${footerHtml(content.appName, fv)}
    </td>
  </tr>`;

  const inner = `${headerBlock(content.appName, content.logoUrl, false)}${bodyRow}`;

  const textParts: string[] = [];
  if (content.stepHint?.trim()) textParts.push(content.stepHint.trim(), '');
  textParts.push(content.headline, '', ...content.paragraphs);
  if (content.bullets?.length) textParts.push('', ...content.bullets.map((b) => `• ${b}`));
  textParts.push('', `${content.primaryCta.label}: ${content.primaryCta.href}`);
  if (content.secondaryLink) textParts.push(`${content.secondaryLink.label}: ${content.secondaryLink.href}`);
  textParts.push('', footerText(content.appName, fv));

  return {
    html: wrapDocument(content.subject, inner, content.preheader),
    text: textParts.join('\n'),
  };
}

/**
 * Notification: reminders, link-first, minimal chrome.
 */
export function renderNotificationEmail(content: NotificationEmailContent): RenderedEmail {
  const fv = content.footerVariant ?? 'transactional';
  const label = content.linkLabel?.trim() || 'View';
  const emph = content.emphasis?.trim()
    ? `<p style="margin:0 0 12px;font-size:13px;font-weight:600;color:${t.textPrimary};">${escapeHtml(content.emphasis.trim())}</p>`
    : '';

  const miniHeader = `
  <tr>
    <td style="height:3px;background:${t.accent};line-height:3px;font-size:0;">&nbsp;</td>
  </tr>
  <tr>
    <td style="padding:12px 20px;background:${t.headerBarBg};border-bottom:1px solid ${t.border};">
      <span style="font-size:14px;font-weight:600;color:${t.textPrimary};">${escapeHtml(content.appName)}</span>
    </td>
  </tr>`;

  const bodyRow = `
  <tr>
    <td style="padding:20px 20px 16px;">
      ${emph}
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${t.textPrimary};">${escapeHtml(content.summary)}</p>
      <p style="margin:0;">${ctaButton(content.linkHref, label)}</p>
      <p style="margin:14px 0 0;font-size:12px;line-height:1.4;color:${t.textMuted};word-break:break-all;">${escapeHtml(content.linkHref)}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:14px 20px 20px;border-top:1px solid ${t.border};">
      ${footerHtml(content.appName, fv)}
    </td>
  </tr>`;

  const inner = `${miniHeader}${bodyRow}`;

  const textLines: string[] = [content.appName, ''];
  if (content.emphasis?.trim()) {
    textLines.push(content.emphasis.trim(), '');
  }
  textLines.push(content.summary, '', `${label}: ${content.linkHref}`, '', footerText(content.appName, fv));

  return {
    html: wrapDocument(content.subject, inner, content.preheader),
    text: textLines.join('\n'),
  };
}

/**
 * Digest: monthly recap with stat cards (value + label), then prose + optional bullets.
 * Stat cards are rendered as a responsive inline-block row — 1–4 cards fit naturally.
 */
export function renderDigestEmail(content: DigestEmailContent): RenderedEmail {
  const fv = content.footerVariant ?? 'marketing';

  // Stat cards — each card is an inline-block cell so they wrap gracefully on narrow clients
  const cardCells = content.stats
    .map(
      (card) => `
    <td style="display:inline-block;width:${Math.floor(96 / Math.min(content.stats.length, 4))}%;min-width:80px;max-width:120px;text-align:center;padding:12px 4px;vertical-align:top;">
      <div style="font-size:28px;font-weight:700;color:${t.textPrimary};line-height:1;letter-spacing:-0.02em;">${escapeHtml(card.value)}</div>
      <div style="font-size:11px;font-weight:500;color:${t.textMuted};text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">${escapeHtml(card.label)}</div>
    </td>`,
    )
    .join('');

  const statsBlock = `
  <tr>
    <td style="padding:16px 24px 4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:${t.pageBg};border-radius:8px;padding:4px 0;">
        <tbody>
          <tr style="display:block;text-align:center;">
            ${cardCells}
          </tr>
        </tbody>
      </table>
    </td>
  </tr>`;

  const h = escapeHtml(content.headline);
  const paras = content.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${t.textPrimary};">${escapeHtml(p)}</p>`,
    )
    .join('');
  const bullets =
    content.bullets && content.bullets.length > 0
      ? `<ul style="margin:0 0 20px;padding-left:20px;color:${t.textPrimary};font-size:15px;line-height:1.5;">
          ${content.bullets.map((b) => `<li style="margin-bottom:8px;">${escapeHtml(b)}</li>`).join('')}
        </ul>`
      : '';
  const secondary = content.secondaryLink
    ? `<p style="margin:24px 0 0;font-size:13px;color:${t.textMuted};">${textLink(content.secondaryLink.href, content.secondaryLink.label)}</p>`
    : '';

  const bodyRow = `
  <tr>
    <td style="padding:28px 24px 8px;">
      <h1 style="margin:0 0 4px;font-size:22px;line-height:1.25;color:${t.textPrimary};font-weight:600;">${h}</h1>
    </td>
  </tr>
  ${statsBlock}
  <tr>
    <td style="padding:20px 24px 20px;">
      ${paras}
      ${bullets}
      <p style="margin:8px 0 0;">${ctaButton(content.primaryCta.href, content.primaryCta.label)}</p>
      ${secondary}
    </td>
  </tr>
  <tr>
    <td style="padding:16px 24px 24px;border-top:1px solid ${t.border};">
      ${footerHtml(content.appName, fv)}
    </td>
  </tr>`;

  const inner = `${headerBlock(content.appName, content.logoUrl, false)}${bodyRow}`;

  // Plain-text version
  const textParts: string[] = [content.headline, ''];
  textParts.push(content.stats.map((c) => `${c.value} ${c.label}`).join('  ·  '), '');
  textParts.push(...content.paragraphs);
  if (content.bullets?.length) {
    textParts.push('', ...content.bullets.map((b) => `• ${b}`));
  }
  textParts.push('', `${content.primaryCta.label}: ${content.primaryCta.href}`);
  if (content.secondaryLink) {
    textParts.push(`${content.secondaryLink.label}: ${content.secondaryLink.href}`);
  }
  textParts.push('', footerText(content.appName, fv));

  return {
    html: wrapDocument(content.subject, inner, content.preheader),
    text: textParts.join('\n'),
  };
}
