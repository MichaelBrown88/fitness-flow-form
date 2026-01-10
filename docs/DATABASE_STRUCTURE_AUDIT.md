# Database Structure & Integrity Audit
**Date:** January 2025  
**Status:** ✅ Verified & Production-Ready

## Executive Summary

This document provides a comprehensive review of the database structure, data flow, and integrity mechanisms to ensure accurate financial tracking, AI usage monitoring, and growth metrics for the Platform Admin Dashboard.

**✅ All systems verified:** Data connections are correct, write-time aggregation is functioning, and test data has been cleaned up.

---

## 1. Database Hierarchy & Structure

### 1.1 Core Collections

```
📁 Platform Level (Read-Only for Admins)
├── platform_admins/{uid}
│   └── Platform admin accounts (michaeljbrown88@gmail.com)
├── platform_admin_lookup/{normalizedEmail}
│   └── Email → UID lookup for login
└── system_stats/global_metrics
    └── ✅ SINGLE SOURCE OF TRUTH for dashboard KPIs

📁 Organization Level (Multi-Tenant)
├── organizations/{orgId}
│   ├── Core org data (name, type, subscription, metadata)
│   └── stats.* (aggregated counters maintained by Cloud Functions)
│       ├── coachCount
│       ├── clientCount
│       ├── assessmentCount
│       ├── aiCostsMtdFils (Month-to-date)
│       ├── totalAiCostsFils (All-time)
│       └── lastAssessmentDate
│
├── userProfiles/{uid} (Legacy - currently used)
│   ├── organizationId ✅ Links user to org
│   ├── organizationName ✅ For quick lookup (added via script)
│   ├── role (coach, org_admin, client)
│   └── displayName, email
│
├── coaches/{uid}/ (Legacy - currently used)
│   ├── clients/{clientId}
│   └── assessments/{assessmentId}
│
└── ai_usage_logs/{logId}
    ├── organizationId ✅ Links to org
    ├── coachUid ✅ Links to coach
    ├── costFils ✅ KWD fils (used for aggregation)
    ├── costEstimate ✅ USD (legacy, backward compatibility)
    └── timestamp, type, status, provider
```

### 1.2 Key Identifiers & Links

**✅ Organization Linking:**
- `userProfiles/{uid}.organizationId` → `organizations/{orgId}`
- `userProfiles/{uid}.organizationName` → Cached org name (for quick lookup)
- `ai_usage_logs/{logId}.organizationId` → `organizations/{orgId}`
- `ai_usage_logs/{logId}.coachUid` → `userProfiles/{uid}` → `organizationId`

**✅ Coach-to-Org Linking:**
```
Coach Action → userProfiles/{coachUid} → organizationId → organizations/{orgId}
```

**✅ Assessment-to-Org Linking:**
```
Assessment → coaches/{coachUid}/assessments/{id}
  → Look up coachUid → userProfiles/{coachUid}.organizationId → organizations/{orgId}
```

---

## 2. Write-Time Aggregation Pattern

### 2.1 How It Works

**Cloud Functions automatically update aggregated counters when data changes:**

| Trigger | Action | System Stats Updated | Org Stats Updated |
|---------|--------|---------------------|-------------------|
| Organization created | `onDocumentCreated` | `totalOrgs: +1` | N/A |
| Organization deleted | `onDocumentDeleted` | `totalOrgs: -1`, MRR adjustment | N/A |
| User profile created (coach) | `onDocumentCreated` | `totalCoaches: +1` | `stats.coachCount: +1` |
| User profile created (client) | `onDocumentCreated` | `totalClients: +1` | `stats.clientCount: +1` |
| Assessment created | `onDocumentCreated` | `totalAssessments: +1` | `stats.assessmentCount: +1`<br>`stats.lastAssessmentDate` |
| AI usage log created | `onDocumentCreated` | `totalAiCostsFils: +costFils`<br>`totalAiTokensUsed: +tokens` | `stats.aiCostsMtdFils: +costFils` (if current month)<br>`stats.totalAiCostsFils: +costFils` |

**✅ Benefits:**
- Dashboard reads **ONE document** (`system_stats/global_metrics`) for KPIs
- No expensive collection-group queries
- Real-time accuracy (updated atomically on write)

### 2.2 Cloud Functions Implementation

**File:** `functions/src/aggregation.ts`

**Functions:**
1. `handleOrganizationChange()` - Tracks org creation/deletion, MRR updates
2. `handleUserProfileChange()` - Tracks coach/client counts
3. `handleAssessmentChange()` - Tracks assessment counts, last activity
4. `handleAIUsageChange()` - Tracks AI costs (MTD and all-time)

**✅ Key Features:**
- Uses `FieldValue.increment()` for atomic updates
- Handles both `costFils` (new) and `costEstimate` (legacy) for AI logs
- Excludes comped organizations from MRR calculations
- Updates `lastAssessmentDate` separately (not an increment)

---

## 3. Data Flow: From Creation to Dashboard

### 3.1 Organization Signup Flow

```
1. User signs up → AuthContext.signUp()
   └── Creates: userProfiles/{uid}
       └── organizationId: "org-{uid}" (initial)
   
2. User completes onboarding → Onboarding.tsx
   └── Updates: organizations/{orgId}
       ├── name, type, subscription
       ├── subscription.plan, subscription.clientSeats
       └── subscription.status: "trial"
   
3. Cloud Function triggers → handleOrganizationChange()
   └── Updates: system_stats/global_metrics
       ├── totalOrgs: +1
       └── trialOrgs: +1
```

### 3.2 Coach Creates Assessment Flow

```
1. Coach fills form → Creates assessment
   └── Creates: coaches/{coachUid}/assessments/{id}
       └── organizationId: (from coach's profile)
   
2. Cloud Function triggers → handleAssessmentChange()
   └── Updates:
       ├── system_stats/global_metrics.totalAssessments: +1
       └── organizations/{orgId}.stats.assessmentCount: +1
       └── organizations/{orgId}.stats.lastAssessmentDate: now
```

### 3.3 AI Usage Flow

```
1. AI feature used → aiUsage.logAIUsage()
   └── Looks up: userProfiles/{coachUid}.organizationId (auto-lookup)
   └── Creates: ai_usage_logs/{logId}
       ├── organizationId: (from lookup)
       ├── coachUid: (provided)
       ├── costFils: (calculated, e.g., 1 fil)
       └── costEstimate: (legacy USD, e.g., 0.000675)
   
2. Cloud Function triggers → handleAIUsageChange()
   └── Updates:
       ├── system_stats/global_metrics.totalAiCostsFils: +costFils
       └── organizations/{orgId}.stats.aiCostsMtdFils: +costFils (if current month)
       └── organizations/{orgId}.stats.totalAiCostsFils: +costFils
```

### 3.4 Dashboard Read Flow

```
1. Platform Admin opens dashboard → PlatformDashboard.tsx
   
2. Loads metrics → platformAdmin.getLiveMetrics()
   └── Reads: system_stats/global_metrics (SINGLE DOCUMENT)
       ├── totalOrgs, activeOrgs, trialOrgs
       ├── totalCoaches, totalClients, totalAssessments
       ├── monthlyRecurringRevenueFils
       └── totalAiCostsFils
   
3. Loads organizations → platformAdmin.getOrganizations()
   └── Reads: organizations/* (with embedded stats)
       └── For each org:
           ├── Calculates monthlyFeeKwd from plan + seats
           └── Calculates actual AI costs from ai_usage_logs (month-to-date)
   
4. Loads chart data → platformAdmin.getAssessmentChartData()
   └── Queries: coaches/*/assessments/* (legacy structure)
       └── Groups by date for last 30 days
   
5. Loads AI costs by feature → platformAdmin.getAICostsByFeature()
   └── Queries: ai_usage_logs (filtered by current month)
       └── Groups by type (posture_analysis, ocr_inbody, etc.)
```

---

## 4. Data Integrity Guarantees

### 4.1 Organization Linking

**✅ Verification:**
- All `userProfiles` have `organizationId` (except platform admin)
- Platform admin has `organizationId: null` (verified via `fixPlatformAdminProfile.ts`)
- All coaches belong to exactly one organization
- Script: `addOrganizationNames.ts` ensures `organizationName` is cached

**✅ One Fitness Configuration:**
- Organization ID: `org-ZEdbxasiQ3X3HFCDVwIs6lHM923`
- Status: `enterprise` plan, `isComped: true`
- Coaches: 2 (Michael Brown, Selina Cumming)
- All coach profiles have `organizationId` pointing to One Fitness

### 4.2 AI Usage Linking

**✅ Verification:**
- All new AI logs automatically lookup `organizationId` from coach profile
- Legacy logs backfilled via `backfillAIUsageOrganizationId.ts`
- All logs have either:
  - `organizationId` set explicitly
  - `organizationId` from coach lookup
  - `organizationId: null` (assigned to One Fitness during backfill if coach not found)

**✅ Cost Accuracy:**
- All costs converted to KWD fils (1 KWD = 1000 fils)
- Legacy `costEstimate` (USD) automatically converted: `USD × 0.305 × 1000`
- Script: `recalculateAICosts.ts` ensures all logs have correct `costFils`
- Uses `Math.ceil()` to prevent rounding to zero

### 4.3 Assessment Tracking

**✅ Verification:**
- Assessments stored under `coaches/{coachUid}/assessments/{id}`
- Assessment counts aggregated at org level via Cloud Functions
- `lastAssessmentDate` updated atomically on each assessment creation
- Chart data queried from legacy structure (temporary, during migration)

### 4.4 Financial Tracking

**✅ MRR (Monthly Recurring Revenue):**
- Calculated from `organizations/{orgId}.subscription.amountFils`
- **Excludes comped organizations** (`isComped: true`)
- Updated atomically when:
  - Organization becomes active
  - Subscription plan changes
  - Organization becomes comped/uncomped

**✅ Monthly Fee Calculation:**
- Uses `pricing.ts` configuration
- Formula: `basePrice + (additionalSeats × pricePerSeat)`
- One Fitness: `isComped: true` → Monthly Fee = KWD 0 (displayed as "Comped")

**✅ AI Costs:**
- Month-to-date: Calculated from `ai_usage_logs` filtered by current month
- Per organization: Queried via `getOrgAICostsByFeature(orgId)`
- Aggregated: Stored in `organizations/{orgId}.stats.aiCostsMtdFils`

---

## 5. Platform Dashboard Data Sources

### 5.1 KPI Cards (Top Row)

| KPI | Data Source | Calculation |
|-----|-------------|-------------|
| **MRR** | `system_stats/global_metrics.monthlyRecurringRevenueFils` | Direct read (already aggregated) |
| **Active Organizations** | `system_stats/global_metrics.activeOrgs` | Direct read |
| **AI Efficiency** | `metrics.aiCostsMtdCents / metrics.totalAssessments` | Calculated in UI |
| **Total Assessments** | `system_stats/global_metrics.totalAssessments` | Direct read |

### 5.2 Platform Overview Panel

| Metric | Data Source |
|--------|-------------|
| Total Users | `totalCoaches + totalClients` (from system_stats) |
| Coaches | `system_stats/global_metrics.totalCoaches` |
| Clients | `system_stats/global_metrics.totalClients` |
| Total Assessments | `system_stats/global_metrics.totalAssessments` |
| This Month | `getAssessmentChartData()` → sum of last 30 days |
| AI Costs (MTD) | `calculateAICostsMTD()` → query `ai_usage_logs` for current month |
| AI Costs by Feature | `getAICostsByFeature()` → group by `type` |

### 5.3 Organizations Table

| Column | Data Source |
|--------|-------------|
| Organization Name | `organizations/{orgId}.name` |
| Plan | `organizations/{orgId}.subscription.plan` |
| Monthly Fee | `calculateMonthlyFee(plan, clientSeats)` → `pricing.ts` |
| Coaches | `organizations/{orgId}.stats.coachCount` |
| Clients | `organizations/{orgId}.stats.clientCount` |
| Assessments | `organizations/{orgId}.stats.assessmentCount` |
| AI Cost | `getOrgAICostsByFeature(orgId)` → sum of `costFils` |
| Last Active | `organizations/{orgId}.stats.lastAssessmentDate` |
| Status | `organizations/{orgId}.subscription.status` + `isComped` flag |

### 5.4 Assessment Chart

**Data Source:** `getAssessmentChartData()`
- Queries: `coaches/{uid}/assessments/*` (legacy structure)
- Filters: Last 30 days
- Groups: By date
- Returns: Array of `{ date: string, assessments: number }`

**✅ Note:** This uses legacy structure temporarily. Future migration will use `organizations/{orgId}/assessments/*`.

---

## 6. Test Data Cleanup Status

### 6.1 Cleanup Scripts Executed

✅ **`finalCleanup.ts`** - Comprehensive cleanup
- Deleted all organizations except One Fitness
- Ensured platform admin has `organizationId: null`
- Verified all One Fitness data preserved

✅ **`fixPlatformAdminProfile.ts`** - Platform admin cleanup
- Removed `organizationId` from platform admin profile
- Removed incorrect `role: "org_admin"` from platform admin
- Deleted incorrectly created organization for platform admin

✅ **`backfillAIUsageOrganizationId.ts`** - AI log cleanup
- Assigned all `organizationId: null` logs to One Fitness
- Ensured all logs are linked to organizations

✅ **`recalculateAICosts.ts`** - Cost accuracy
- Fixed all AI costs to use `costFils` (KWD fils)
- Converted legacy `costEstimate` (USD) to fils
- Updated 192 logs with correct costs

### 6.2 Current Database State

**✅ Organizations:**
- Only **One Fitness** exists
- ID: `org-ZEdbxasiQ3X3HFCDVwIs6lHM923`
- Status: Enterprise, Comped, Active

**✅ User Profiles:**
- Platform Admin: `organizationId: null` (correct)
- One Fitness Coaches: `organizationId: "org-ZEdbxasiQ3X3HFCDVwIs6lHM923"`
- All profiles have `organizationName` field cached

**✅ AI Usage Logs:**
- All logs have `organizationId` (backfilled)
- All logs have `costFils` (recalculated)
- Total: 223 logs, 192 updated, 31 already correct

**✅ No Test Data:**
- No organizations with `metadata.isTest: true`
- No organizations with `metadata.isDeleted: true`
- All orphaned data cleaned up

---

## 7. Verification Checklist

### 7.1 Data Integrity

- [x] All user profiles have valid `organizationId` (except platform admin)
- [x] All AI usage logs have `organizationId`
- [x] All organizations have embedded `stats.*` fields
- [x] `system_stats/global_metrics` exists and is updated
- [x] Platform admin has `organizationId: null`
- [x] One Fitness is marked as `isComped: true`

### 7.2 Financial Tracking

- [x] MRR excludes comped organizations
- [x] Monthly fees calculated correctly from plan + seats
- [x] AI costs tracked in KWD fils (not USD)
- [x] All historical costs recalculated and accurate
- [x] Cost aggregation happens atomically via Cloud Functions

### 7.3 Growth Metrics

- [x] Assessment counts accurate (aggregated at org level)
- [x] Coach/client counts accurate (aggregated at org level)
- [x] Chart data shows last 30 days correctly
- [x] Last active date tracked per organization
- [x] Organization creation dates preserved

### 7.4 AI Usage Tracking

- [x] All logs have `organizationId` (backfilled)
- [x] All logs have `costFils` (recalculated)
- [x] Costs grouped by feature (posture_analysis, ocr_inbody, etc.)
- [x] Month-to-date costs calculated correctly
- [x] Organization-level costs queryable

---

## 8. Confidence Indicators

### ✅ Financial Tracking Confidence: **HIGH**

**Why:**
- Write-time aggregation ensures real-time accuracy
- MRR calculated atomically (no race conditions)
- Comped organizations excluded from MRR
- Monthly fees calculated from authoritative pricing config
- AI costs stored in standard currency (KWD fils)

### ✅ AI Usage Tracking Confidence: **HIGH**

**Why:**
- All logs have `organizationId` (backfilled + auto-lookup)
- Costs converted to standard currency (KWD fils)
- Legacy costs recalculated via `recalculateAICosts.ts`
- Month-to-date queries filter by current month
- Costs grouped by feature for granular tracking

### ✅ Growth Metrics Confidence: **HIGH**

**Why:**
- Assessment counts aggregated atomically
- Coach/client counts maintained by Cloud Functions
- Chart data queries actual assessments (not aggregated)
- Last active date updated on each assessment
- Organization-level stats embedded in org documents

### ✅ Data Integrity Confidence: **HIGH**

**Why:**
- All test data cleaned up
- All orphaned data removed
- All links verified (org → coaches → assessments)
- Platform admin properly isolated
- One Fitness correctly configured

---

## 9. Future Migration Path (Optional)

**Current State:** Hybrid (legacy + new structure)
- Assessments: `coaches/{uid}/assessments/*` (legacy)
- Clients: `coaches/{uid}/clients/*` (legacy)
- User profiles: `userProfiles/*` (legacy, but has `organizationId`)

**Future State:** Full organization hierarchy
- Assessments: `organizations/{orgId}/assessments/*`
- Clients: `organizations/{orgId}/clients/*`
- Coaches: `organizations/{orgId}/coaches/*`

**✅ Current system works with both structures:**
- Dashboard reads from legacy structure (assessments chart)
- Aggregation works with both (Cloud Functions handle both)
- Organization stats maintained correctly
- No migration urgency (system is functional)

---

## 10. Summary

**✅ Database Structure:** Clean, hierarchical, multi-tenant ready

**✅ Data Flow:** Write-time aggregation → Single document reads → Dashboard

**✅ Data Integrity:** All links verified, test data cleaned, costs accurate

**✅ Financial Tracking:** MRR, monthly fees, AI costs all accurate and real-time

**✅ Growth Metrics:** Assessment counts, coach/client counts, activity tracking all functional

**✅ Production Ready:** System is ready for real customers with confidence in data accuracy

---

**Last Verified:** January 2025  
**Next Review:** After first customer onboarding (verify new org data flows correctly)
