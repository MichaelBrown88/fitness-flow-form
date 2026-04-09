import { logger } from 'firebase-functions';

/**
 * Slack billing alerts for solo-founder monitoring.
 *
 * Posts to SLACK_BILLING_WEBHOOK_URL (or SLACK_WEBHOOK_URL) when subscription
 * lifecycle events occur: new customer, cancellation, failed payment, trial ending.
 *
 * Fails silently — billing webhook processing must never break because Slack is down.
 */

const SLACK_WEBHOOK_URL =
  (process.env.SLACK_BILLING_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL || '').trim();

async function postToSlack(text: string): Promise<void> {
  if (!SLACK_WEBHOOK_URL) return;
  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch (err) {
    logger.warn('[SlackBillingAlert] Failed to post', err);
  }
}

export async function alertNewSubscription(params: {
  orgId: string;
  orgName?: string;
  tierName?: string;
  amountDisplay?: string;
}): Promise<void> {
  const org = params.orgName || params.orgId;
  const tier = params.tierName || 'subscription';
  const amount = params.amountDisplay ? ` at ${params.amountDisplay}` : '';
  await postToSlack(`💰 *New subscriber* — ${org} signed up for ${tier}${amount}`);
}

export async function alertSubscriptionCancelled(params: {
  orgId: string;
  orgName?: string;
  reason?: string;
}): Promise<void> {
  const org = params.orgName || params.orgId;
  const reason = params.reason ? ` — reason: ${params.reason}` : '';
  await postToSlack(`🚨 *Subscription cancelled* — ${org}${reason}`);
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
  await postToSlack(`⚠️ *Payment failed* — ${org}${attempt}${retry}`);
}

export async function alertTrialEnding(params: {
  orgId: string;
  orgName?: string;
  trialEnd?: string;
}): Promise<void> {
  const org = params.orgName || params.orgId;
  const end = params.trialEnd || 'soon';
  await postToSlack(`⏳ *Trial ending ${end}* — ${org}`);
}

export async function alertTrialStarted(params: {
  orgId: string;
  orgName?: string;
  trialEnd?: string;
}): Promise<void> {
  const org = params.orgName || params.orgId;
  const end = params.trialEnd ? ` (ends ${params.trialEnd})` : '';
  await postToSlack(`🆕 *Trial started* — ${org}${end}`);
}

export async function alertPastDue(params: {
  orgId: string;
  orgName?: string;
}): Promise<void> {
  const org = params.orgName || params.orgId;
  await postToSlack(`🔴 *Subscription past_due* — ${org} — payment failed, action required`);
}

export async function alertCapacityHit(params: {
  orgId: string;
  orgName?: string;
  clientCount: number;
  clientCap: number;
  level: 'warning' | 'full';
}): Promise<void> {
  const org = params.orgName || params.orgId;
  const pct = Math.round((params.clientCount / params.clientCap) * 100);
  if (params.level === 'full') {
    await postToSlack(`📊 *Capacity full* — ${org} has reached their ${params.clientCap}-client limit (${params.clientCount}/${params.clientCap})`);
  } else {
    await postToSlack(`📊 *Capacity warning* — ${org} is ${pct}% full (${params.clientCount}/${params.clientCap} clients)`);
  }
}

export async function alertMrrDrop(params: {
  prevMrrGbpPence: number;
  currMrrGbpPence: number;
  dropPct: number;
}): Promise<void> {
  const prev = (params.prevMrrGbpPence / 100).toFixed(2);
  const curr = (params.currMrrGbpPence / 100).toFixed(2);
  await postToSlack(`📉 *MRR drop detected* — £${prev} → £${curr} (−${params.dropPct.toFixed(1)}%)`);
}

export async function alertAiCostSpike(params: {
  mtdGbpPence: number;
  thresholdGbpPence: number;
}): Promise<void> {
  const mtd = (params.mtdGbpPence / 100).toFixed(2);
  const threshold = (params.thresholdGbpPence / 100).toFixed(2);
  await postToSlack(`🤖 *AI cost spike* — MTD spend £${mtd} exceeded threshold £${threshold}`);
}
