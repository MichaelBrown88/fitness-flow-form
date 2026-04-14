import { logger } from 'firebase-functions';

/**
 * Slack platform alerts — routes each event type to the correct channel.
 *
 * Channels:
 *   SLACK_WEBHOOK_ENGINEERING   — #02-engineering  (infra, AI cost, errors)
 *   SLACK_WEBHOOK_FINANCE       — #03-finance       (revenue, payments, MRR)
 *   SLACK_WEBHOOK_MARKETING     — #04-marketing     (trial signups, conversions)
 *   SLACK_WEBHOOK_ONE_ASSESS_HQ — #one-assess-hq    (product health, capacity)
 *
 * All functions fail silently — alerts must never break primary business logic.
 */

const WEBHOOKS = {
  engineering: (process.env.SLACK_WEBHOOK_ENGINEERING || '').trim(),
  finance: (process.env.SLACK_WEBHOOK_FINANCE || '').trim(),
  marketing: (process.env.SLACK_WEBHOOK_MARKETING || '').trim(),
  hq: (process.env.SLACK_WEBHOOK_ONE_ASSESS_HQ || '').trim(),
} as const;

type Channel = keyof typeof WEBHOOKS;

async function postToSlack(channel: Channel, text: string): Promise<void> {
  const url = WEBHOOKS[channel];
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch (err) {
    logger.warn(`[SlackAlert] Failed to post to ${channel}`, err);
  }
}

// ─── Finance channel ──────────────────────────────────────────────────────────

export async function alertNewSubscription(params: {
  orgId: string;
  orgName?: string;
  tierName?: string;
  amountDisplay?: string;
}): Promise<void> {
  const org = params.orgName || params.orgId;
  const tier = params.tierName || 'subscription';
  const amount = params.amountDisplay ? ` at ${params.amountDisplay}` : '';
  // Revenue event → finance; conversion event → marketing
  await Promise.all([
    postToSlack('finance', `💰 *New subscriber* — ${org} signed up for ${tier}${amount}`),
    postToSlack('marketing', `🎉 *Conversion* — ${org} upgraded from trial to ${tier}${amount}`),
  ]);
}

export async function alertSubscriptionCancelled(params: {
  orgId: string;
  orgName?: string;
  reason?: string;
}): Promise<void> {
  const org = params.orgName || params.orgId;
  const reason = params.reason ? ` — reason: ${params.reason}` : '';
  await postToSlack('finance', `🚨 *Subscription cancelled* — ${org}${reason}`);
}

export async function alertPaymentFailed(params: {
  orgId: string;
  orgName?: string;
  invoiceId?: string;
  attemptCount?: number;
  nextRetry?: string;
}): Promise<void> {
  const org = params.orgName || params.orgId;
  const attempt = params.attemptCount ? ` (attempt ${params.attemptCount})` : '';
  const retry = params.nextRetry ? ` — next retry: ${params.nextRetry}` : '';
  await postToSlack('finance', `⚠️ *Payment failed* — ${org}${attempt}${retry}`);
}

export async function alertPastDue(params: {
  orgId: string;
  orgName?: string;
}): Promise<void> {
  const org = params.orgName || params.orgId;
  await postToSlack('finance', `🔴 *Subscription past_due* — ${org} — payment failed, action required`);
}

export async function alertMrrDrop(params: {
  prevMrrGbpPence: number;
  currMrrGbpPence: number;
  dropPct: number;
}): Promise<void> {
  const prev = (params.prevMrrGbpPence / 100).toFixed(2);
  const curr = (params.currMrrGbpPence / 100).toFixed(2);
  await postToSlack('finance', `📉 *MRR drop detected* — £${prev} → £${curr} (−${params.dropPct.toFixed(1)}%)`);
}

export async function alertWeeklyFinanceDigest(params: {
  mrrGbpPence: number;
  activeOrgs: number;
  trialOrgs: number;
  pastDueOrgs: number;
  weekLabel: string;
}): Promise<void> {
  const mrr = (params.mrrGbpPence / 100).toFixed(2);
  const lines = [
    `📊 *Weekly digest — w/c ${params.weekLabel}*`,
    `MRR: £${mrr}`,
    `Active orgs: ${params.activeOrgs}`,
    `On trial: ${params.trialOrgs}`,
    params.pastDueOrgs > 0 ? `⚠️ Past due: ${params.pastDueOrgs}` : `Past due: 0`,
  ];
  await postToSlack('finance', lines.join('\n'));
}

// ─── Marketing channel ────────────────────────────────────────────────────────

export async function alertTrialStarted(params: {
  orgId: string;
  orgName?: string;
  trialEnd?: string;
}): Promise<void> {
  const org = params.orgName || params.orgId;
  const end = params.trialEnd ? ` (ends ${params.trialEnd})` : '';
  await postToSlack('marketing', `🆕 *Trial started* — ${org}${end}`);
}

export async function alertTrialEnding(params: {
  orgId: string;
  orgName?: string;
  trialEnd?: string;
}): Promise<void> {
  const org = params.orgName || params.orgId;
  const end = params.trialEnd || 'soon';
  await postToSlack('marketing', `⏳ *Trial ending ${end}* — ${org}`);
}

// ─── One Assess HQ channel ────────────────────────────────────────────────────

export async function alertCapacityHit(params: {
  orgId: string;
  orgName?: string;
  clientCount: number;
  clientCap: number;
  level: 'warning' | 'full';
}): Promise<void> {
  const org = params.orgName || params.orgId;
  const pct = Math.round((params.clientCount / params.clientCap) * 100);
  const msg = params.level === 'full'
    ? `📊 *Capacity full* — ${org} has reached their ${params.clientCap}-client limit (${params.clientCount}/${params.clientCap})`
    : `📊 *Capacity warning* — ${org} is at ${pct}% capacity (${params.clientCount}/${params.clientCap} clients) — upsell opportunity`;
  await postToSlack('hq', msg);
}

export async function alertLowAiCredits(params: {
  orgId: string;
  orgName?: string;
  creditsRemaining: number;
}): Promise<void> {
  const org = params.orgName || params.orgId;
  await postToSlack('hq', `🤖 *Low AI credits* — ${org} has ${params.creditsRemaining} AI credits remaining`);
}

// ─── Engineering channel ──────────────────────────────────────────────────────

export async function alertAiCostSpike(params: {
  mtdGbpPence: number;
  thresholdGbpPence: number;
}): Promise<void> {
  const mtd = (params.mtdGbpPence / 100).toFixed(2);
  const threshold = (params.thresholdGbpPence / 100).toFixed(2);
  await postToSlack('engineering', `🤖 *AI cost spike* — MTD spend £${mtd} exceeded threshold £${threshold}`);
}
