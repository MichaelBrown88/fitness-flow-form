# Roadmap: SaaS Readiness & Codebase Optimization

## 🛠 Standard Operating Procedure (SOP) per Task
For every task below, we must follow this exact sequence:
1.  **Implement:** Write the code/changes for the task.
2.  **Test:** Verify the logic works (using console logs, UI checks, or mock data).
3.  **Confirm:** Verify with the User that the behavior meets expectations.
4.  **Push:** Commit and push the changes to GitHub.
5.  **Complete:** Mark as completed in this document.

---

## Phase 1: Codebase Sanitization & Type Safety
*Goal: Remove redundancy and improve maintainability.*

### 1. File Cleanup [x]
- **Task:** Remove all orphaned legacy files, duplicate MD files, and `.backup` files.
- **Status:** Completed.

### 2. Strict Typing Audit [x]
- **Task:** Eliminate `any` types across the codebase, starting with services and contexts.
- **Target Files:** `src/services/`, `src/contexts/FormContext.tsx`, `src/components/reports/ClientReport.tsx`, `src/components/reports/CoachReport.tsx`.
- **Note:** Fixed linter errors in `PostureAnalysisViewer.tsx` and `Companion.tsx`.
- **Status:** Completed.

### 3. Component De-bloating [x]
- **Task:** Break down `MultiStepForm.tsx` and `ClientReport.tsx` into smaller, reusable sub-components.
- **Status:** Completed.

---

## Phase 2: SaaS Multi-Tenancy Foundation
*Goal: Prepare the architecture for organizational isolation.*

### 4. Auth Context Evolution [x]
- **Task:** Update `AuthContext.tsx` to fetch and store `organizationId` and `userRole`.
- **Status:** Completed.

### 5. Service Layer Scoping [x]
- **Task:** Update Firestore services to require `organizationId` for all queries and saves.
- **Target Files:** `clientProfiles.ts`, `assessments.ts`, `assessmentHistory.ts`, `coachAssessments.ts`.
- **Status:** Completed.

### 6. Security Rule Hardening [x]
- **Task:** Update `firestore.rules` to enforce organization-level isolation.
- **Status:** Completed.

---

## Phase 3: Performance & Scalability
*Goal: Optimize app speed and resource usage.*

### 7. Import Optimization [x]
- **Task:** Audit heavy libraries (like `lucide-react`, `recharts`, `jspdf`) and ensure tree-shaking is effective.
- **SOP:** Used `sequentialthinking` to plan and `React.lazy` to implement chunk splitting for heavy components.
- **Status:** Completed.

### 8. State Management Optimization [x]
- **Task:** Review `FormContext.tsx` for unnecessary re-renders during large form updates. (Implemented `useMemo` for context value).
- **Status:** Completed.

---

## Phase 4: Security & Compliance
*Goal: Harden the app for production SaaS usage.*

### 9. Vulnerability Scan [ ]
- **Task:** Run automated security scans using `stackhawk` MCP.
- **Status:** Pending.
