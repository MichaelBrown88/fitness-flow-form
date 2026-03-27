# Firestore client query audit (rolling)

Checklist aligned with `.cursorrules`: org boundaries, `limit()` on list reads, indexes for composite/collectionGroup queries.

## Changes in compliance pass

| Area | Change |
|------|--------|
| `ai_usage_logs` | Validated coach `create` in rules; reads scoped by `organizationId` + coach; composite index `organizationId`, `coachUid`, `timestamp` |
| `getRevenueByRegion` | Paginated org root reads (`orderBy(documentId())`, page size from `ORGANIZATIONS_LIST_PAGE_SIZE`) |
| Org coaches | `getOrgCoachesWithStats`, `getOrgCoaches` use `ORG_COACHES_SUBCOLLECTION_LIMIT` |
| `userProfiles` fallback | Existing `COACH_PROFILE_LIMIT`; email lookup uses `limit(5)` |
| Magic link `AuthContext` | `collectionGroup('clients')` by email + `CLIENT_EMAIL_LOOKUP_LIMIT`; single-field `email` uses Firestore automatic indexing (do not add a one-field composite in `firestore.indexes.json` — deploy rejects it) |
| `deleteClientPermanently` | Subcollection deletes paginated; publicReports query capped with `PUBLIC_REPORTS_BY_CLIENT_DELETE_LIMIT` |
| `platformDataReconciler` | Legacy `history` collectionGroup read capped at 500 |

## Ongoing review

When adding `query(` / `getDocs(` / `onSnapshot(`:

1. Path under `organizations/{orgId}/...` or explicit `where('organizationId','==', orgId)` for root collections.
2. Always `limit(N)` (or paginate with `startAfter`).
3. Add composite indexes to `firestore.indexes.json` in the same change as new constraints.

Platform admin toolkit in `platformDataReconciler.ts` intentionally performs broad reads for migrations; keep caps and run only from trusted sessions. `inspectCollections` still lists all org root docs in one `getDocs` (platform-only); consider reusing the paginated org iterator from `getRevenueByRegion` if org count grows past a few hundred.
