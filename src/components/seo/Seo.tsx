import { Helmet } from 'react-helmet-async';
import {
  SEO_SITE_ORIGIN,
  seoAbsoluteOgImageUrl,
} from '@/constants/seo';

export type SeoProps = {
  /** URL pathname only, e.g. `/about` (used for canonical and og:url). */
  pathname: string;
  title: string;
  description: string;
  noindex?: boolean;
  ogType?: string;
};

/**
 * Per-route document head for SPA SEO (title, description, canonical, Open Graph, Twitter).
 */
export function Seo({
  pathname,
  title,
  description,
  noindex = false,
  ogType = 'website',
}: SeoProps) {
  const normalizedPath =
    pathname === '' || pathname === '/' ? '/' : pathname.startsWith('/') ? pathname : `/${pathname}`;
  const canonicalUrl = `${SEO_SITE_ORIGIN}${normalizedPath}`;
  const ogImage = seoAbsoluteOgImageUrl();

  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="One Assess" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@oneassess" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
