import { ROUTES } from '@/constants/routes';

/** Production site origin for canonical URLs, Open Graph, and sitemap. */
export const SEO_SITE_ORIGIN = 'https://one-assess.com' as const;

/** Default social preview image path (same asset referenced from index.html). */
export const SEO_DEFAULT_OG_IMAGE_PATH = '/og-image.png' as const;

export function seoAbsoluteOgImageUrl(): string {
  return `${SEO_SITE_ORIGIN}${SEO_DEFAULT_OG_IMAGE_PATH}`;
}

export type SeoPageMeta = {
  title: string;
  description: string;
  /** When true, emit robots noindex,nofollow (thin or non-public pages). */
  noindex?: boolean;
};

/** Legal paths — not on ROUTES object as named constants elsewhere. */
export const SEO_PATH = {
  TERMS: '/terms',
  PRIVACY: '/privacy',
} as const;

/**
 * Indexable marketing and legal pages: path → meta.
 * Keys must match react-router paths exactly.
 */
export const SEO_INDEXABLE_BY_PATH: Record<string, SeoPageMeta> = {
  [ROUTES.HOME]: {
    title: 'One Assess — AI fitness assessments for coaches & gyms',
    description:
      'Cut assessment admin with AI posture analysis, automated client reports, and progress tracking. Built for personal trainers and gyms.',
  },
  [ROUTES.PRICING]: {
    title: 'Pricing — One Assess | Fitness assessment software for gyms',
    description:
      'Plans for solo coaches and gyms. AI-powered assessments, branded reports, and client retention tools. See pricing and start a trial.',
  },
  [ROUTES.ABOUT]: {
    title: 'About — One Assess | Coach-first fitness assessment platform',
    description:
      'Why we built One Assess: less spreadsheet time, better client retention, and assessments that coaches actually use.',
  },
  [ROUTES.CONTACT]: {
    title: 'Contact — One Assess | Support for coaches & gyms',
    description:
      'Get in touch with One Assess for product questions, partnerships, or support. We help coaches streamline fitness assessments.',
  },
  [ROUTES.DEMO]: {
    title: 'Demo report — One Assess | Sample client fitness assessment',
    description:
      'Explore a sample One Assess client report: scores, posture insights, and coaching-ready outputs from a full assessment.',
  },
  [ROUTES.TRY]: {
    title: 'Try One Assess free — 3 AI assessments, no signup',
    description:
      'Run up to three AI-powered fitness assessments in the sandbox. See posture analysis and reporting before you create an account.',
  },
  [SEO_PATH.TERMS]: {
    title: 'Terms of Service — One Assess',
    description: 'Terms of Service for the One Assess fitness assessment platform for coaches and gyms.',
  },
  [SEO_PATH.PRIVACY]: {
    title: 'Privacy Policy — One Assess',
    description:
      'How One Assess collects, uses, and protects data for coaches, gyms, and their clients.',
  },
  [ROUTES.COOKIES]: {
    title: 'Cookie Policy — One Assess',
    description: 'How One Assess uses cookies and similar technologies on our website and app.',
  },
};

/** Resolves indexable SEO meta; throws if `path` is missing from the map (build-time safety). */
export function requireSeoForPath(path: string): SeoPageMeta {
  const meta = SEO_INDEXABLE_BY_PATH[path];
  if (meta === undefined) {
    throw new Error(`SEO_INDEXABLE_BY_PATH missing entry for path: ${path}`);
  }
  return meta;
}

/** Paths included in public/sitemap.xml (excludes /blog until there are real posts). */
export const PUBLIC_SITEMAP_PATHS: readonly string[] = [
  ROUTES.HOME,
  ROUTES.PRICING,
  ROUTES.ABOUT,
  ROUTES.CONTACT,
  ROUTES.DEMO,
  ROUTES.TRY,
  SEO_PATH.TERMS,
  SEO_PATH.PRIVACY,
  ROUTES.COOKIES,
];

export const SEO_NOINDEX_FUNNEL: SeoPageMeta = {
  title: 'Sign in — One Assess',
  description: 'Coach sign-in for One Assess.',
  noindex: true,
};

export const SEO_NOINDEX_ONBOARDING: SeoPageMeta = {
  title: 'Get started — One Assess',
  description: 'Create your One Assess account and set up your gym or coaching practice.',
  noindex: true,
};

export const SEO_NOINDEX_BLOG: SeoPageMeta = {
  title: 'Blog — One Assess',
  description: 'Articles on fitness assessment best practices and product updates from One Assess.',
  noindex: true,
};
