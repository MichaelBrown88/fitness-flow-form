export const APP_HOST =
  process.env.PUBLIC_APP_HOST ||
  process.env.VITE_PUBLIC_APP_HOST ||
  'https://assessment-engine-8f633.web.app';

export const STORAGE_REPORT_PREFIX = 'reports';

export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || process.env.SENDGRID_KEY;
export const SENDGRID_FROM = process.env.SENDGRID_FROM || 'no-reply@onefitness.app';

export const SIGNED_URL_TTL_HOURS = Number(process.env.SIGNED_URL_TTL_HOURS || 24);







