/**
 * /subscribe paywall — gym vs solo wording (i18n-ready).
 */

export const SUBSCRIBE_COPY = {
  title: 'Your trial has ended',
  leadGym: (_trialClientCap: number) =>
    `To keep your team on One Assess, choose a plan for your gym or studio. Your assessments and client data are safe — nothing is deleted.`,
  leadSolo: (_trialClientCap: number) =>
    `To keep using One Assess, choose a plan that fits your practice. Your assessments and client data are safe — nothing is deleted.`,
  bulletsTitle: "What's included",
  bulletCapacity: 'Pay for the number of clients you need — start small and scale up',
  bulletAi: 'AI posture and body composition scans included',
  bulletBranding: 'Optional: white-label client reports with your own branding',
} as const;
