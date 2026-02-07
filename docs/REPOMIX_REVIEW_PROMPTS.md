# Repomix Review Prompts

Reusable prompts for generating targeted repomix commands to review specific domains of the app. Paste any prompt into a Cursor conversation and ask the agent to generate the repomix command based on the current codebase state.

**Global Exclusions** (included in each prompt):
- `.xml` files (previous repomix outputs)
- `src/lib/setup/admin/**` (one-off migration scripts)
- `src/lib/test/**` (hardcoded test images)
- `src/components/ui/**` (shadcn/ui primitives)
- `public/mediapipe/**` (binary ML models)
- `docs/**`, `functions/lib/**`, root-level scripts, root `.md` files

---

## 1. Assessment Flow

> Generate a repomix command covering the entire assessment flow: the form context, all assessment phase configs, the multi-step form component, the single-field flow, phase form content, field controls and field components, assessment navigation, assessment logic hooks, assessment save hook, the scoring engine (all scoring files), and the results page. Include types and constants used by these files. Exclude: all `.xml` files, `src/lib/setup/admin/**`, `src/lib/test/**`, `src/components/ui/**`, `public/mediapipe/**`, `docs/**`, `functions/lib/**`, root-level scripts, and any `.md` files at the project root.

---

## 2. Client Reports and Sharing

> Generate a repomix command covering the client-facing and coach-facing report system: all files under components/reports, the public report viewer page, the public client report page, the assessment report page, the share service, the report recommendation generators, the gap analysis logic, the roadmap/blueprint engine, the exercise database/prioritization system, and the clinical data. Include types and constants used by these files. Exclude: all `.xml` files, `src/lib/setup/admin/**`, `src/lib/test/**`, `src/components/ui/**`, `public/mediapipe/**`, `docs/**`, `functions/lib/**`, root-level scripts, and any `.md` files at the project root.

---

## 3. Coach Dashboard and Workflow

> Generate a repomix command covering the coach dashboard: the dashboard page, all dashboard hooks (orchestrator, assessment list, client list, actions, analytics, types), the dashboard UI sub-components (header, tabs, clients grid, assessments table, priority view, dialogs, recent activity, analytics dashboard), the reassessment queue hook, the cadence engine, the retest schedule card component, and the client detail page with its hook. Include types and constants used by these files. Exclude: all `.xml` files, `src/lib/setup/admin/**`, `src/lib/test/**`, `src/components/ui/**`, `public/mediapipe/**`, `docs/**`, `functions/lib/**`, root-level scripts, and any `.md` files at the project root.

---

## 4. Platform Admin and Multi-Tenancy

> Generate a repomix command covering the platform admin system: all platform admin pages (PlatformDashboard, PlatformLogin, PlatformSetup, OrganizationManage), all platform services (platformAdmin, platformConfig, platformMetrics, impersonation, aiUsageTracking), the platform dashboard hook, the org management hook, the feature flags hook, the FeatureGate component, the ImpersonationBanner, platform types, platform constants, the database paths and collections files, and the Firestore security rules. Include types and constants used by these files. Exclude: all `.xml` files, `src/lib/setup/admin/**`, `src/lib/test/**`, `src/components/ui/**`, `public/mediapipe/**`, `docs/**`, `functions/lib/**`, root-level scripts, and any `.md` files at the project root.

---

## 5. Org Admin and Retention

> Generate a repomix command covering the organization admin experience: the OrgAdmin page, the Settings page, the org retention hook, the coach management service, the organizations service, the pricing logic, the onboarding page and all onboarding step components, the auth context, the auth hook, and the theme manager component. Include types and constants used by these files. Exclude: all `.xml` files, `src/lib/setup/admin/**`, `src/lib/test/**`, `src/components/ui/**`, `public/mediapipe/**`, `docs/**`, `functions/lib/**`, root-level scripts, and any `.md` files at the project root.

---

## 6. AI and Posture Analysis

> Generate a repomix command covering the AI and posture analysis system: all files under lib/ai, all files under lib/posture, all posture-related utility files in lib/utils (postureOverlay, postureAlignment, postureMath, postureDeviation, postureHolisticSummary, reanalyzePosture, posture-label-positions), the posture processing service, the camera components, the companion page and companion UI components, the pose detection hook, the posture companion hook, the companion auth hook, the camera capture/handler hooks, the orientation detection hook, the sequence manager hook, the live sessions service, and the background upload service. Include types and constants used by these files. Exclude: all `.xml` files, `src/lib/setup/admin/**`, `src/lib/test/**`, `src/components/ui/**`, `public/mediapipe/**`, `docs/**`, `functions/lib/**`, root-level scripts, and any `.md` files at the project root.

---

## 7. Data Layer and Security

> Generate a repomix command covering the data layer: all service files (firebase, coachAssessments, clientProfiles, assessmentHistory, assessments, organizations, publicReports, aiUsage), all database path and collection files under lib/database, the auth context, the auth hook, the validation and error handling utilities under lib/security, the validateOrganizationId utility, the Firestore security rules, the storage rules, and all Cloud Functions source files (functions/src). Include types and constants used by these files. Exclude: all `.xml` files, `src/lib/setup/admin/**`, `src/lib/test/**`, `src/components/ui/**`, `public/mediapipe/**`, `docs/**`, `functions/lib/**`, root-level scripts, and any `.md` files at the project root.

---

## 8. Scoring and Exercise Science

> Generate a repomix command covering the scoring and exercise science logic: all files under lib/scoring, all files under lib/recommendations, all files under lib/exercises, all files under lib/prioritization, the exercise database, the exercise selection logic, the exercise prioritization, the phase config, all phase files under lib/phases, the clinical data, the client archetypes, the negative outcomes, the recommendation generator, the strategy/blueprint engine, and the client types. Include types and constants used by these files. Exclude: all `.xml` files, `src/lib/setup/admin/**`, `src/lib/test/**`, `src/components/ui/**`, `public/mediapipe/**`, `docs/**`, `functions/lib/**`, root-level scripts, and any `.md` files at the project root.
