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

/** Legal paths (not on ROUTES object as named constants elsewhere). */
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
    title: 'Fitness assessment software for coaches & gyms | One Assess',
    description:
      'AI posture analysis, professional client reports, and progress tracking for personal trainers and gyms. Try free, see the demo, or start a gym trial.',
  },
  [ROUTES.PRICING]: {
    title: 'Pricing & plans for coaches & gyms | One Assess',
    description:
      'Solo is free with no card; gyms get a 14-day trial. Choose Solo or Gym and your seats. Prices match what you see at checkout.',
  },
  [ROUTES.ABOUT]: {
    title: 'About One Assess | Fitness assessments for working coaches',
    description:
      'Why we built coach-first assessment software: less spreadsheet time, clearer client reports, and retention tools gyms actually use.',
  },
  [ROUTES.CONTACT]: {
    title: 'Contact One Assess | Support for coaches and gym teams',
    description:
      'Questions about fitness assessment software, partnerships, or billing? Reach our team; we help coaches and gyms get set up fast.',
  },
  [ROUTES.DEMO]: {
    title: 'Sample fitness assessment report | Interactive demo | One Assess',
    description:
      'Explore a full sample client report: movement and posture insights, scores, and coaching-ready outputs from One Assess.',
  },
  [ROUTES.TRY]: {
    title: 'Try AI fitness assessments free | No signup | One Assess',
    description:
      'Coach sandbox: run up to 3 AI-powered assessments with posture analysis and reporting. No signup. Create your account when you are ready.',
  },
  [SEO_PATH.TERMS]: {
    title: 'Terms of Service | One Assess',
    description: 'Terms of Service for the One Assess fitness assessment platform for coaches and gyms.',
  },
  [SEO_PATH.PRIVACY]: {
    title: 'Privacy Policy | One Assess',
    description:
      'How One Assess collects, uses, and protects data for coaches, gyms, and their clients.',
  },
  [ROUTES.COOKIES]: {
    title: 'Cookie Policy | One Assess',
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
  title: 'Sign in | One Assess',
  description: 'Coach sign-in for One Assess.',
  noindex: true,
};

export const SEO_NOINDEX_ONBOARDING: SeoPageMeta = {
  title: 'Get started | One Assess',
  description: 'Create your One Assess account and set up your gym or coaching practice.',
  noindex: true,
};

/** Public post-Stripe pages (guest checkout); thin funnel — do not index. */
export const SEO_NOINDEX_CHECKOUT_RESULT: SeoPageMeta = {
  title: 'Checkout | One Assess',
  description: 'Continue after payment or return to pricing.',
  noindex: true,
};

export const SEO_NOINDEX_BLOG: SeoPageMeta = {
  title: 'Blog | One Assess',
  description: 'Articles on fitness assessment best practices and product updates from One Assess.',
  noindex: true,
};

const DASHBOARD_SEO_DESCRIPTION =
  'Coach dashboard: clients, assessments, schedules, and team tools.';

/** Logged-in app shell: noindex + route-specific titles for tabs and bookmarks. */
export function getDashboardSeoForPathname(pathname: string): SeoPageMeta {
  const base: SeoPageMeta = {
    title: 'Coach workspace | One Assess',
    description: DASHBOARD_SEO_DESCRIPTION,
    noindex: true,
  };
  if (pathname === ROUTES.DASHBOARD) {
    return {
      title: 'Assistant | One Assess',
      description: 'Coach assistant, tasks, and client snapshot queries.',
      noindex: true,
    };
  }
  if (pathname.startsWith(ROUTES.DASHBOARD_CLIENTS)) {
    return {
      title: 'Clients | One Assess',
      description: 'Client roster and assessments.',
      noindex: true,
    };
  }
  if (pathname.startsWith(ROUTES.DASHBOARD_WORK)) {
    return {
      title: 'Work | One Assess',
      description: 'Reassessment tasks and follow-up calendar.',
      noindex: true,
    };
  }
  if (pathname.startsWith(ROUTES.DASHBOARD_SCHEDULE)) {
    return {
      title: 'Work | One Assess',
      description: 'Reassessment queue and due dates for your clients.',
      noindex: true,
    };
  }
  if (pathname.startsWith(ROUTES.DASHBOARD_CALENDAR)) {
    return {
      title: 'Work | One Assess',
      description: 'Assessment and follow-up calendar.',
      noindex: true,
    };
  }
  if (pathname.startsWith(ROUTES.DASHBOARD_TEAM)) {
    return {
      title: 'Team | One Assess',
      description: 'Coach roster and team metrics.',
      noindex: true,
    };
  }
  if (pathname.startsWith(ROUTES.DASHBOARD_ARTIFACTS)) {
    return {
      title: 'Artifacts | One Assess',
      description: 'Public report, roadmap, and achievements links for clients and social posts.',
      noindex: true,
    };
  }
  return base;
}

const APP_SHELL_SEO_DESCRIPTION =
  'Signed-in coach and organization tools on One Assess.';

export type AppShellSeoOptions = {
  /** Client profile tab routes (`/client/:name/...`) */
  clientDisplayName?: string;
};

/**
 * Document title + description for layouts that use AppShell without DashboardLayout’s Seo.
 * Always noindex. Pass `clientDisplayName` on client detail routes for a useful tab title.
 */
export function getAppShellSeoForPathname(
  pathname: string,
  options?: AppShellSeoOptions,
): SeoPageMeta {
  const path = pathname.split('?')[0] ?? pathname;
  const base: SeoPageMeta = {
    title: 'One Assess',
    description: APP_SHELL_SEO_DESCRIPTION,
    noindex: true,
  };

  if (path.startsWith('/client/') && options?.clientDisplayName?.trim()) {
    return {
      ...base,
      title: `${options.clientDisplayName.trim()} | One Assess`,
      description: 'Client profile, reports, roadmap, and history.',
    };
  }

  if (path === ROUTES.SETTINGS) {
    return { ...base, title: 'Settings | One Assess', description: 'Account, organization, and notification preferences.' };
  }

  if (path === ROUTES.BILLING) {
    return {
      ...base,
      title: 'Billing & subscription | One Assess',
      description: 'Plan, capacity, Stripe portal, and invoices.',
    };
  }
  if (path === ROUTES.BILLING_SUCCESS) {
    return {
      ...base,
      title: 'Billing · Success | One Assess',
      description: 'Subscription or checkout completed.',
    };
  }

  if (path === ROUTES.ORG_DASHBOARD || path === `${ROUTES.ORG_DASHBOARD}/`) {
    return { ...base, title: 'Organization · Overview | One Assess', description: 'Org subscription, coaches, and clients summary.' };
  }
  if (path.startsWith(`${ROUTES.ORG_DASHBOARD}/team`)) {
    return { ...base, title: 'Organization · Team | One Assess', description: 'Coaches and seats in your organization.' };
  }
  if (path.startsWith(`${ROUTES.ORG_DASHBOARD}/retention`)) {
    return { ...base, title: 'Organization · Retention | One Assess', description: 'Client retention signals and follow-ups.' };
  }
  if (path.startsWith(`${ROUTES.ORG_DASHBOARD}/billing`)) {
    return { ...base, title: 'Organization · Billing | One Assess', description: 'Organization billing summary for admins.' };
  }
  if (path.startsWith(`${ROUTES.ORG_DASHBOARD}/integrations`)) {
    return { ...base, title: 'Organization · Integrations | One Assess', description: 'Connected services for your organization.' };
  }
  if (path.startsWith(ROUTES.ORG_DASHBOARD)) {
    return { ...base, title: 'Organization | One Assess', description: 'Organization admin dashboard.' };
  }

  return base;
}
