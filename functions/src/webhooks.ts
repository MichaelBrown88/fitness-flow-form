/**
 * Webhook Fan-out System
 *
 * Delivers signed event payloads to URLs registered in each org's
 * `organizations/{orgId}/webhooks` subcollection.
 *
 * Signature: HMAC-SHA256(secret, JSON.stringify(payload))
 * Header:    X-OneAssess-Signature: sha256=<hex>
 *
 * Supported events:
 *   assessment.completed   — Firestore trigger on sessions write
 *   client.score_changed   — Can be emitted from future triggers
 *   client.phase_completed — Can be emitted from future triggers
 */

import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

export type WebhookEvent =
  | 'assessment.completed'
  | 'client.score_changed'
  | 'client.phase_completed';

export interface WebhookConfig {
  id: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  active: boolean;
  createdAt?: admin.firestore.Timestamp;
}

export interface WebhookPayload {
  event: WebhookEvent;
  organizationId: string;
  timestamp: string; // ISO-8601
  data: Record<string, unknown>;
}

function sign(secret: string, payload: string): string {
  return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
}

async function deliver(
  webhookUrl: string,
  signature: string,
  body: string,
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10s timeout

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-OneAssess-Signature': signature,
        'X-OneAssess-Event': 'webhook',
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fan out a webhook event to all active, subscribed endpoints for an org.
 * Called from Firestore triggers.
 */
export async function fanOutWebhookEvent(
  orgId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  const db = admin.firestore();

  const webhooksSnap = await db
    .collection(`organizations/${orgId}/webhooks`)
    .where('active', '==', true)
    .get();

  if (webhooksSnap.empty) return;

  const payload: WebhookPayload = {
    event,
    organizationId: orgId,
    timestamp: new Date().toISOString(),
    data,
  };
  const body = JSON.stringify(payload);

  const deliveries = webhooksSnap.docs
    .filter((d) => {
      const cfg = d.data() as WebhookConfig;
      return cfg.events?.includes(event) && cfg.url && cfg.secret;
    })
    .map(async (d) => {
      const { url, secret } = d.data() as WebhookConfig;
      const signature = sign(secret, body);
      const ok = await deliver(url, signature, body);

      // Write a delivery log to the webhook doc's deliveries subcollection
      await d.ref.collection('deliveries').add({
        event,
        ok,
        statusAt: admin.firestore.FieldValue.serverTimestamp(),
        payloadSize: body.length,
      });

      if (!ok) {
        console.warn(`[Webhook] Delivery failed to ${url} for event ${event}`);
      }
    });

  await Promise.allSettled(deliveries);
}

/**
 * Firestore trigger handler: fires when a new session document is created
 * (i.e., an assessment is saved).
 */
export async function handleAssessmentCompletedTrigger(
  orgId: string,
  clientSlug: string,
  sessionData: Record<string, unknown>,
): Promise<void> {
  await fanOutWebhookEvent(orgId, 'assessment.completed', {
    clientSlug,
    assessmentId: sessionData.id ?? null,
    overallScore: sessionData.overallScore ?? null,
    assessedAt: sessionData.createdAt ?? null,
  });
}
