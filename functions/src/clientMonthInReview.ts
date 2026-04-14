/**
 * Client Month in Review emails — sent monthly to each client with a shared public report.
 *
 * Three scenarios per client:
 *   A. Has a recent assessment (since last email):
 *      → Full progress recap: improved pillars, score deltas, ARC milestone status, what's next.
 *   B. No recent assessment, but has history:
 *      → Nudge: "Looks like you haven't had a check-in recently — ask your coach to book one."
 *   C. Only one assessment ever (nothing to compare):
 *      → Skipped until they have ≥2 assessments.
 *
 * Client cadence awareness:
 *   - Infers average gap between assessments from snapshotSummaries timestamps.
 *   - If the client's cadence is > 5 weeks (e.g. quarterly), skip the nudge email — it's
 *     normal for them not to have a new assessment yet.
 *
 * Consent gate:
 *   - Only sends if publicReports/{token}/clientConsent/prefs.monthlyEmailConsented === true.
 *
 * Deduplication:
 *   - Writes a `clientMonthInReviewSent_YYYY-MM` key to the publicReport doc to prevent
 *     duplicate sends within the same month.
 *
 * Email format:
 *   - Subject: "Your [Month] results, [FirstName] 🎉" (or nudge subject)
 *   - Coach logo at top (if org has custom branding), "Powered by One Assess" footer.
 *   - One section per improved pillar with score delta and sub-metrics.
 *   - ARC™ phase progress if roadmap exists.
 *   - CTA: "View your full report".
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { Resend } from 'resend';
import { RESEND_API_KEY, RESEND_FROM, APP_HOST, EMAIL_ASSETS_LOGO_URL } from './config';
import { escapeHtml, sendResendHtmlText } from './email';
import type { RenderedEmail } from './email';

const resend = new Resend(RESEND_API_KEY);
const APP_NAME = 'One Assess';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SnapshotSummary {
  id: string;
  score: number;
  date: admin.firestore.Timestamp;
  type: string;
}

interface ScoreDetail {
  id: string;
  label: string;
  score: number;
}

interface ScoreCategory {
  id: string;
  title: string;
  score: number;
  assessed: boolean;
  details: ScoreDetail[];
}

interface FormData {
  fullName?: string;
  email?: string;
  clientGoals?: string[];
  [key: string]: unknown;
}

interface ConsentPrefs {
  monthlyEmailConsented?: boolean | null;
  socialSharingConsented?: boolean | null;
}

interface PublicReportData {
  clientName: string;
  formData: FormData;
  previousFormData?: FormData;
  snapshotSummaries?: SnapshotSummary[];
  organizationId?: string;
  emailMilestones?: Record<string, unknown>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function monthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(): string {
  return new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Average gap in days between snapshots. Returns null if < 2 snapshots. */
function avgAssessmentGapDays(summaries: SnapshotSummary[]): number | null {
  if (summaries.length < 2) return null;
  const sorted = [...summaries].sort((a, b) => b.date.toMillis() - a.date.toMillis());
  let totalMs = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    totalMs += sorted[i].date.toMillis() - sorted[i + 1].date.toMillis();
  }
  return totalMs / (sorted.length - 1) / 86_400_000;
}

/** Days since last snapshot (most recent first). */
function daysSinceLastSnapshot(summaries: SnapshotSummary[]): number | null {
  if (summaries.length === 0) return null;
  const sorted = [...summaries].sort((a, b) => b.date.toMillis() - a.date.toMillis());
  return (Date.now() - sorted[0].date.toMillis()) / 86_400_000;
}

// ─── Email rendering ──────────────────────────────────────────────────────────

interface PillarResult {
  title: string;
  previousScore: number;
  currentScore: number;
  delta: number;
  metrics: { label: string; delta: number | null }[];
}

function renderMonthInReviewHtml(params: {
  clientFirstName: string;
  monthLabel: string;
  pillarsImproved: PillarResult[];
  overallDelta: number;
  previousOverall: number;
  currentOverall: number;
  reportUrl: string;
  coachLogoUrl?: string | null;
  coachName?: string | null;
  arcPhase?: string | null;
  arcMilestonesAchieved?: number;
  arcMilestonesTotal?: number;
}): RenderedEmail {
  const {
    clientFirstName,
    monthLabel: ml,
    pillarsImproved,
    overallDelta,
    previousOverall,
    currentOverall,
    reportUrl,
    coachLogoUrl,
    coachName,
    arcPhase,
    arcMilestonesAchieved,
    arcMilestonesTotal,
  } = params;

  const subject = `${clientFirstName}, your ${ml} results are in 🎉`;
  const preheader = `Your score went from ${previousOverall} to ${currentOverall} — ${overallDelta > 0 ? `up ${overallDelta} points` : 'check your latest results'}.`;

  const logoBlock = coachLogoUrl
    ? `<img src="${escapeHtml(coachLogoUrl)}" alt="${escapeHtml(coachName ?? 'Your coach')}" style="height:40px;max-width:180px;object-fit:contain;display:block;margin-bottom:24px;" />`
    : coachName
      ? `<p style="font-size:16px;font-weight:700;color:#1e293b;margin:0 0 24px;">${escapeHtml(coachName)}</p>`
      : '';

  const pillarsHtml = pillarsImproved
    .map(
      (p) => `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <span style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6366f1;">${escapeHtml(p.title)}</span>
        <span style="font-size:22px;font-weight:900;color:#1e293b;">${p.previousScore} → ${p.currentScore} <span style="color:#22c55e;font-size:18px;">+${p.delta}</span></span>
      </div>
      ${
        p.metrics.length > 0
          ? `<ul style="margin:0;padding:0;list-style:none;">
          ${p.metrics
            .map(
              (m) => `
            <li style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-top:1px solid #e2e8f0;font-size:13px;color:#64748b;">
              <span>${escapeHtml(m.label)}</span>
              ${m.delta !== null ? `<span style="font-weight:700;color:${m.delta >= 0 ? '#22c55e' : '#ef4444'};">${m.delta >= 0 ? '+' : ''}${m.delta}</span>` : ''}
            </li>`,
            )
            .join('')}
        </ul>`
          : ''
      }
    </div>`,
    )
    .join('');

  const arcBlock =
    arcPhase && arcMilestonesAchieved !== undefined && arcMilestonesTotal !== undefined
      ? `<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:1px;">Your ARC™ — ${escapeHtml(arcPhase)} phase</p>
        <p style="margin:8px 0 0;font-size:14px;color:#0c4a6e;">${arcMilestonesAchieved} of ${arcMilestonesTotal} milestones completed. Keep going.</p>
      </div>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="padding:32px 32px 24px;">
          ${logoBlock}
          <h1 style="margin:0;font-size:26px;font-weight:800;color:#0f172a;line-height:1.25;">${escapeHtml(clientFirstName)}, here's your ${escapeHtml(ml)} recap</h1>
          <p style="margin:12px 0 0;font-size:15px;color:#64748b;line-height:1.6;">Your overall score moved from <strong>${previousOverall}</strong> to <strong style="color:${overallDelta >= 0 ? '#22c55e' : '#ef4444'};">${currentOverall}</strong>${overallDelta > 0 ? ` — that's <strong style="color:#22c55e;">+${overallDelta} points</strong>` : ''}. Here's what drove it.</p>
        </td></tr>

        <!-- Pillars -->
        <tr><td style="padding:0 32px 8px;">
          ${pillarsHtml || '<p style="color:#64748b;font-size:14px;">No new pillar assessments this period.</p>'}
        </td></tr>

        <!-- ARC block -->
        ${arcBlock ? `<tr><td style="padding:0 32px 8px;">${arcBlock}</td></tr>` : ''}

        <!-- CTA -->
        <tr><td style="padding:8px 32px 32px;text-align:center;">
          <a href="${escapeHtml(reportUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:-0.2px;">View your full report →</a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">Sent by your coach via <strong>${escapeHtml(APP_NAME)}</strong>. You received this because you opted in. <a href="${escapeHtml(reportUrl)}" style="color:#94a3b8;">Manage preferences</a>.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // Plain text fallback
  const text = [
    `${clientFirstName}, here's your ${ml} recap`,
    '',
    `Overall score: ${previousOverall} → ${currentOverall}${overallDelta > 0 ? ` (+${overallDelta})` : ''}`,
    '',
    ...pillarsImproved.map(
      (p) =>
        `${p.title}: ${p.previousScore} → ${p.currentScore} (+${p.delta})\n${p.metrics.map((m) => `  ${m.label}: ${m.delta !== null ? (m.delta >= 0 ? '+' : '') + m.delta : '-'}`).join('\n')}`,
    ),
    '',
    arcPhase
      ? `Your ARC™ (${arcPhase} phase): ${arcMilestonesAchieved}/${arcMilestonesTotal} milestones`
      : '',
    '',
    `View your full report: ${reportUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html, text };
}

function renderNudgeHtml(params: {
  clientFirstName: string;
  monthLabel: string;
  daysSince: number;
  reportUrl: string;
  coachLogoUrl?: string | null;
  coachName?: string | null;
}): RenderedEmail {
  const { clientFirstName, monthLabel: ml, daysSince, reportUrl, coachLogoUrl, coachName } = params;

  const subject = `${clientFirstName}, it's been a while — time for a check-in?`;
  const preheader = `It's been ${Math.round(daysSince)} days since your last assessment. Ask your coach to book one.`;

  const logoBlock = coachLogoUrl
    ? `<img src="${escapeHtml(coachLogoUrl)}" alt="${escapeHtml(coachName ?? 'Your coach')}" style="height:40px;max-width:180px;object-fit:contain;display:block;margin-bottom:24px;" />`
    : coachName
      ? `<p style="font-size:16px;font-weight:700;color:#1e293b;margin:0 0 24px;">${escapeHtml(coachName)}</p>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="padding:32px;">
          ${logoBlock}
          <h1 style="margin:0;font-size:24px;font-weight:800;color:#0f172a;">Hey ${escapeHtml(clientFirstName)},</h1>
          <p style="margin:16px 0;font-size:15px;color:#64748b;line-height:1.7;">It's ${escapeHtml(ml)} and it looks like it's been a while since your last assessment (${Math.round(daysSince)} days). Regular check-ins help you track your progress and keep your programme on point.</p>
          <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.7;">Have a chat with your coach about booking one — you might be surprised how much has changed.</p>
          <a href="${escapeHtml(reportUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;">View your last report →</a>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">Sent via <strong>${escapeHtml(APP_NAME)}</strong>. <a href="${escapeHtml(reportUrl)}" style="color:#94a3b8;">Manage preferences</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Hey ${clientFirstName},\n\nIt's ${ml} and it's been ${Math.round(daysSince)} days since your last assessment. Ask your coach about booking a check-in.\n\nView your last report: ${reportUrl}`;

  return { subject, html, text };
}

// ─── Scoring helper (duplicated from frontend — no shared package) ─────────────

/**
 * Minimal score extraction from a publicReport formData snapshot.
 * Full scoring lives in the frontend scoring lib — this just reads category-level
 * scores from a pre-computed field if present, or returns empty array.
 *
 * NOTE: If the publicReport doc has a `latestOverallScore` field we use it directly.
 * For per-category scores we need to re-compute — this function delegates to
 * a lightweight inline extraction that only reads top-level category sub-scores
 * from stored snapshotSummaries metadata. Full re-computation is not done server-side
 * (the scoring engine lives in the frontend bundle).
 *
 * For the MVP, per-pillar deltas are derived from snapshotSummaries scores (overall only).
 * Full pillar-level email breakdown is a v2 enhancement once scoring is ported to shared lib.
 */
function getOverallScore(data: PublicReportData, snapshotIndex: number): number {
  const summaries = data.snapshotSummaries ?? [];
  if (summaries.length > snapshotIndex) {
    return Math.round(summaries[snapshotIndex].score);
  }
  return Math.round((data as unknown as { latestOverallScore?: number }).latestOverallScore ?? 0);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function sendClientMonthInReviewEmails(): Promise<void> {
  if (!RESEND_API_KEY) {
    logger.warn('[clientMonthInReview] RESEND_API_KEY not configured — skipping');
    return;
  }

  const db = admin.firestore();
  const mk = monthKey();
  const ml = monthLabel();
  const dedupeField = `emailMilestones.clientMonthInReviewSent_${mk}`;

  // Query all public reports where the month-in-review hasn't been sent yet.
  // We also filter for reports that have snapshotSummaries (at least 1 assessment).
  // Max 500 per run — function timeout-safe.
  const snap = await db
    .collection('publicReports')
    .where('visibility', '==', 'public')
    .where('revoked', '!=', true)
    .limit(500)
    .get();

  logger.info(`[clientMonthInReview] Processing ${snap.size} public reports for ${mk}`);

  let sent = 0;
  let skipped = 0;

  for (const reportDoc of snap.docs) {
    const token = reportDoc.id;
    const data = reportDoc.data() as PublicReportData;

    // Skip if already sent this month
    const milestones = data.emailMilestones ?? {};
    if (milestones[`clientMonthInReviewSent_${mk}`]) {
      skipped++;
      continue;
    }

    // Check client consent
    try {
      const consentSnap = await db
        .doc(`publicReports/${token}/clientConsent/prefs`)
        .get();
      const consent = consentSnap.data() as ConsentPrefs | undefined;
      if (!consent || consent.monthlyEmailConsented !== true) {
        skipped++;
        continue;
      }
    } catch {
      skipped++;
      continue;
    }

    const summaries = data.snapshotSummaries ?? [];
    const clientName = data.clientName || 'there';
    const firstName = clientName.split(' ')[0] || clientName;
    const reportUrl = `${APP_HOST}/r/${token}`;

    // Need ≥ 1 snapshot to send any email
    if (summaries.length === 0) {
      skipped++;
      continue;
    }

    // Resolve client email from formData
    const clientEmail = (data.formData?.email as string | undefined)?.trim();
    if (!clientEmail) {
      skipped++;
      continue;
    }

    // Load org branding
    let coachLogoUrl: string | null = null;
    let coachName: string | null = null;
    if (data.organizationId) {
      try {
        const orgSnap = await db.doc(`organizations/${data.organizationId}`).get();
        const orgData = orgSnap.data();
        if (orgData?.customBrandingEnabled && orgData.logoUrl) {
          coachLogoUrl = orgData.logoUrl as string;
        }
        if (orgData?.name) coachName = orgData.name as string;
      } catch {
        // Non-fatal
      }
    }

    // Determine scenario
    const avgGap = avgAssessmentGapDays(summaries);
    const daysSince = daysSinceLastSnapshot(summaries) ?? 999;
    const hasMultipleAssessments = summaries.length >= 2;

    let email: RenderedEmail | null = null;

    if (hasMultipleAssessments) {
      // Check if there's a new assessment within a reasonable window
      // "Recent" = within the last 35 days (generous to cover monthly and bi-monthly clients)
      const hasRecentAssessment = daysSince <= 35;

      if (hasRecentAssessment) {
        // Scenario A: recent assessment — full recap
        const currentOverall = getOverallScore(data, 0);
        const previousOverall = getOverallScore(data, 1);
        const overallDelta = currentOverall - previousOverall;

        // For the MVP, we only show overall delta (pillar-level scoring requires frontend lib).
        // The email still looks great as an overall progress recap.
        email = renderMonthInReviewHtml({
          clientFirstName: firstName,
          monthLabel: ml,
          pillarsImproved: [],  // v2: pass per-pillar data once scoring is ported
          overallDelta,
          previousOverall,
          currentOverall,
          reportUrl,
          coachLogoUrl,
          coachName,
        });
      } else {
        // Scenario B: no recent assessment
        // If their cadence is > 5 weeks naturally, skip the nudge (not overdue)
        if (avgGap !== null && avgGap > 35) {
          skipped++;
          await db.doc(`publicReports/${token}`).update({ [dedupeField]: true });
          continue;
        }
        email = renderNudgeHtml({
          clientFirstName: firstName,
          monthLabel: ml,
          daysSince,
          reportUrl,
          coachLogoUrl,
          coachName,
        });
      }
    } else {
      // Scenario C: only one assessment — skip until they have comparison data
      skipped++;
      continue;
    }

    if (!email) {
      skipped++;
      continue;
    }

    try {
      await sendResendHtmlText(resend, {
        from: coachName
          ? `${coachName} via ${APP_NAME} <${RESEND_FROM}>`
          : `${APP_NAME} <${RESEND_FROM}>`,
        to: clientEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });

      // Mark as sent for this month
      await db.doc(`publicReports/${token}`).update({ [dedupeField]: true });
      sent++;
    } catch (e) {
      logger.error(`[clientMonthInReview] Failed to send to token ${token}`, e);
    }
  }

  logger.info(`[clientMonthInReview] Done for ${mk}: sent=${sent}, skipped=${skipped}`);
}
