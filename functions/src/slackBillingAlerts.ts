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
    console.warn('[SlackBillingAlert] Failed to post:', err);
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
