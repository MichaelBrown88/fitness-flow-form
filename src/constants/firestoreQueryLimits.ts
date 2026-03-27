/**
 * Caps for org-scoped list queries. Prefer pagination when UX needs full org coverage.
 */
export const ORG_CLIENT_PROFILES_QUERY_LIMIT = 500;
export const ORG_WEBHOOKS_QUERY_LIMIT = 50;

/** Recent AI usage log rows read for coach/org stats (bounded read cost). */
export const AI_USAGE_STATS_QUERY_LIMIT = 100;

/** Max coaches read from organizations/{orgId}/coaches in one query. */
export const ORG_COACHES_SUBCOLLECTION_LIMIT = 200;

/** Page size when scanning all organization root docs (platform admin). */
export const ORGANIZATIONS_LIST_PAGE_SIZE = 100;

/** Magic-link client profile lookup by email (collectionGroup clients). */
export const CLIENT_EMAIL_LOOKUP_LIMIT = 25;

/** Max public report tokens deleted when removing one client (safety cap). */
export const PUBLIC_REPORTS_BY_CLIENT_DELETE_LIMIT = 50;
