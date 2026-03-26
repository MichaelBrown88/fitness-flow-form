import type { Resend } from 'resend';
import { RESEND_FROM } from '../config';

export interface ResendHtmlTextPayload {
  to: string;
  from?: string;
  /** Resend `replyTo` — use for founder / support so replies reach a real inbox. */
  replyTo?: string | string[];
  subject: string;
  html: string;
  text: string;
}

/** Resend send with both html and text (recommended for deliverability and plain-text clients). */
export async function sendResendHtmlText(
  resend: Resend,
  payload: ResendHtmlTextPayload,
): Promise<{ id: string }> {
  const { data, error } = await resend.emails.send({
    from: payload.from ?? RESEND_FROM,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    ...(payload.replyTo != null &&
    (typeof payload.replyTo === 'string'
      ? payload.replyTo.trim().length > 0
      : payload.replyTo.length > 0)
      ? { replyTo: payload.replyTo }
      : {}),
  });

  if (error) {
    throw new Error(`Resend ${error.name}: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error('Resend returned no email id');
  }
  return { id: data.id };
}
