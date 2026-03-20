export const APP_HOST =
  process.env.PUBLIC_APP_HOST ||
  process.env.VITE_PUBLIC_APP_HOST ||
  'https://app.one-assess.com';

export const STORAGE_REPORT_PREFIX = 'reports';

export const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
export const RESEND_FROM = process.env.RESEND_FROM || 'noreply@one-assess.com';

export const SIGNED_URL_TTL_HOURS = Number(process.env.SIGNED_URL_TTL_HOURS || 24);







