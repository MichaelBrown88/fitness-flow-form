/**
 * /subscribe paywall — gym vs solo wording (i18n-ready).
 */

export const SUBSCRIBE_COPY = {
  title: 'Your trial has ended',
  leadGym: (trialClientCap: number) =>
    `Continue with a paid plan to keep your team on One Assess. During trial you could have up to ${trialClientCap} active clients; choose a capacity tier that fits your gym or studio.`,
  leadSolo: (trialClientCap: number) =>
    `Continue with a paid plan to keep using One Assess. During trial you could have up to ${trialClientCap} active clients; pick a capacity tier on billing that fits your practice.`,
  bulletsTitle: 'What you get',
  bulletCapacity: 'Capacity-based billing (UK GBP checkout for British organisations)',
  bulletAi: 'AI assessment credits included per tier',
  bulletBranding: 'Optional custom branding add-on at checkout',
} as const;
