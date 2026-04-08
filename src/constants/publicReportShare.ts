/**
 * Copy and helpers for sharing public report links (Facebook, Instagram, Messages, etc.).
 * Open Graph URLs use the production site origin so link previews resolve in production.
 */
import { PRODUCT_DISPLAY_NAME } from '@/constants/productBranding';
import { SEO_SITE_ORIGIN, seoAbsoluteOgImageUrl } from '@/constants/seo';

/** Canonical public URL for crawlers and OG `og:url` (production). */
export function publicReportCanonicalUrl(token: string): string {
  return `${SEO_SITE_ORIGIN}/r/${encodeURIComponent(token)}`;
}

/** Title shown in Facebook / iMessage / LinkedIn-style link previews (~40–60 chars ideal). */
export function publicReportOpenGraphTitle(clientName: string, coachBrandName?: string | null): string {
  const brand = coachBrandName?.trim();
  if (brand) return `${clientName} — Fitness report · ${brand}`;
  return `${clientName} — Fitness report · ${PRODUCT_DISPLAY_NAME}`;
}

/** Description for OG / Twitter cards (keep ≤ ~160 chars for most platforms). */
export function publicReportOpenGraphDescription(overallScore?: number | null): string {
  const s =
    overallScore != null && Number.isFinite(overallScore)
      ? `AXIS Score™ ${Math.round(overallScore)}. `
      : '';
  const body =
    `${s}Interactive assessment your coach shared — movement, posture, and progress. Open for the full report.`;
  return body.length > 160 ? `${body.slice(0, 157)}…` : body;
}

/**
 * Caption coaches can paste into Instagram / Facebook posts.
 * URL on its own line helps platforms detect the link; keep emoji-free for professional tone.
 */
export function publicReportSocialPostCaption(
  clientName: string,
  pageUrl: string,
  coachBrandName?: string | null,
  overallScore?: number | null,
): string {
  const brand = coachBrandName?.trim() || PRODUCT_DISPLAY_NAME;
  const scoreBit =
    overallScore != null && Number.isFinite(overallScore) ? ` AXIS Score™ ${Math.round(overallScore)}.` : '';
  return `Fitness update for ${clientName}.${scoreBit} View the full interactive report:\n\n${pageUrl}\n\n— Shared via ${brand}`;
}

export function publicReportOgImageUrl(): string {
  return seoAbsoluteOgImageUrl();
}
