# SaaS Multi-Tenancy Migration Plan

**Author:** Senior SaaS Architect
**Date:** December 27, 2025
**Project:** Fitness Flow Assessment Engine

## 1. Executive Summary
The current architecture is **"User-Centric"** (isolated by `coachUid`). To move to a **"Multi-Tenant SaaS"** model, we must shift to an **"Organization-Centric"** architecture. This ensures that multiple coaches within the same gym/organization can securely collaborate on client data while remaining strictly isolated from other organizations.

---

## 2. Hardcoded Logic & Current Assumptions
The following areas currently assume a single-coach isolation model:

*   **Firestore Paths:** Collections are nested under `/coaches/{coachUid}/`. This prevents cross-coach visibility within an organization.
    *   `src/services/coachAssessments.ts` -> `coaches/{coachUid}/assessments`
    *   `src/services/clientProfiles.ts` -> `coaches/{coachUid}/clients`
    *   `src/services/assessmentHistory.ts` -> `coaches/{coachUid}/assessments/{clientId}/history`
*   **Identity Resolution:** Clients are identified by their names (`clientName.toLowerCase()`) within a coach's silo. In a multi-tenant system, we need robust `clientId`s unique to the organization.
*   **Auth Context:** `AuthContext.tsx` only provides the Firebase User object. It has no knowledge of `organizationId` or user `role` (Admin vs. Coach).
*   **Public Reports:** `publicReports` are tied strictly to `coachUid`. If a coach leaves an organization, the organization may lose access or control over those reports.

---

## 3. Schema Gaps
To support multi-tenancy, the following schema updates are required:

### A. New Collections
*   **`organizations`**: Stores org-wide settings, branding, and subscription status.
    *   Fields: `name`, `slug`, `logoUrl`, `planType`, `createdAt`, `subscriptionActive`.
*   **`userProfiles`**: (Global) Maps a Firebase `uid` to an organization and a role.
    *   Fields: `uid`, `organizationId`, `role` (`'org_admin'`, `'coach'`), `displayName`.

### B. Updated Documents
*   **`assessments`**: Must include `organizationId`.
*   **`clients`**: Must include `organizationId` and potentially `assignedCoachUid` (for filtering while allowing admin oversight).
*   **`live_sessions`**: Must include `organizationId` to prevent cross-tenant session hijacking.

---

## 4. Security Risks (Public SaaS Level)
*   **Live Session Vulnerability:** `firestore.rules` currently allows `allow read, write: if true` for `live_sessions`. This is a critical risk. Sessions must be gated by `organizationId`.
*   **Data Leakage:** If a query is performed without an `organizationId` filter, Firestore rules must reject it. Currently, rules only check `auth.uid == coachId`.
*   **Client-Side Deletion:** Coaches can delete assessments via client-side SDK. In a SaaS, we should use a "Soft Delete" flag or move deletions to Cloud Functions to maintain audit logs for the organization.

---

## 5. Refactoring Checklist

### Level 1: Foundation (Auth & Rules)
- [ ] **`src/contexts/AuthContext.tsx`**: Update to fetch the `userProfile` (including `organizationId`) immediately after login.
- [ ] **`firestore.rules`**: Rewrite to enforce `request.auth.token.organizationId == resource.data.organizationId`.
- [ ] **`storage.rules`**: Scope image paths to `organizations/{orgId}/clients/{clientId}/`.

### Level 2: Services (API Scoping)
- [ ] **`src/services/coachAssessments.ts`**: Update all queries to include `where('organizationId', '==', orgId)`.
- [ ] **`src/services/clientProfiles.ts`**: Migrate from `coaches/{uid}/clients` to a flat `clients` collection filtered by `organizationId`.
- [ ] **`src/services/assessmentHistory.ts`**: Update path generators to include `organizationId`.

### Level 3: UI & UX
- [ ] **`src/pages/Dashboard.tsx`**: Update analytics to show Org-wide stats vs. Personal stats based on role.
- [ ] **`src/pages/ClientDetail.tsx`**: Ensure client lookup is scoped to the organization.
- [ ] **`src/components/layout/AppShell.tsx`**: Add Organization branding (Logo/Name) dynamically.
- [ ] **`src/hooks/useSettings.ts`**: Migrate from `localStorage` to Org-level Firestore settings (e.g., scoring weights, logo preferences).

### Level 4: Backend (Cloud Functions)
- [ ] **`functions/src/index.ts`**: Update triggers to handle the new path structure (`organizations/{orgId}/...`).

---

## 6. Recommended Migration Strategy: "The Tenant ID Injection"
1.  **Phase 1:** Add `organizationId` to all new documents while maintaining the `coaches/{uid}` path for backward compatibility.
2.  **Phase 2:** Update `AuthContext` to inject a default "Solo" organization ID for existing users.
3.  **Phase 3:** Deploy new Firestore Rules that allow *either* the old `coachUid` check OR the new `organizationId` check.
4.  **Phase 4:** Run a migration script to move data to the new organization-first collection structure.

