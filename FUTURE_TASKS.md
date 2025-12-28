# Roadmap: Moving from AI "Guessing" to Clinical Logic

## 🛠 Standard Operating Procedure (SOP) per Task
For every task below, we must follow this exact sequence:
1.  **Implement:** Write the code for the task.
2.  **Test:** Manually or programmatically verify the logic works (using console logs, UI checks, or mock data).
3.  **Confirm:** Verify with the User that the behavior meets expectations.
4.  **Push:** Commit and push the changes to GitHub.
5.  **Complete:** Mark as completed in this document and the TODO list.

---

## Phase 1: Foundation (Data & Inputs)
*Goal: Set up the infrastructure and capture the missing clinical data.*

### 1. The Clinical Database Foundation [x]
- **Task:** Create `src/lib/clinical-data.ts`.
- **Content:** Port the Movement Logic, Normative Benchmarks, Biological Timelines, and Lifestyle Feedback tables into structured TypeScript constants/objects.
- **Steps:** [x] Implement | [x] Test | [x] Confirm | [x] Push | [x] Complete

### 2. Movement Safety (Pain Fields) [x]
- **Task:** Add `hasPainDiscomfort` boolean fields to the form state for OHS, Hinge, and Lunge. Update the UI in `Phase2` steps to include these toggles.
- **Steps:** [x] Implement | [x] Test | [x] Confirm | [x] Push | [x] Complete

### 3. Reliable Demographic Injection [x]
- **Task:** Ensure `age` (calculated from DOB) and `gender` are passed correctly from `FormData` into the `computeScores` and `buildRoadmap` functions.
- **Steps:** [x] Implement | [x] Test | [x] Confirm | [x] Push | [x] Complete

---

## Phase 2: Deterministic Logic (The "Brain")
*Goal: Replace AI guesses with mathematical and database-driven results.*

### 4. Normative Scoring Upgrade [x]
- **Task:** Update `src/lib/scoring.ts` to use the Normative Database. 
- **Steps:** [x] Implement | [x] Test | [x] Confirm | [x] Push | [x] Complete

### 5. Movement Logic & Contraindications [x]
- **Task:** Link visual triggers to Movement Database for Stretches, Activations, and Contraindications.
- **Steps:** [x] Implement | [x] Test | [x] Confirm | [x] Push | [x] Complete

### 6. Realistic Biological Roadmap [x]
- **Task:** Update `buildRoadmap` in `scoring.ts` to use metabolic reality and Age Penalty Factors.
- **Steps:** [x] Implement | [x] Test | [x] Confirm | [x] Push | [x] Complete

---

## Phase 3: Insights & Synthesis (The Report)
*Goal: Provide deep, interconnected insights to the client.*

### 7. Lifestyle Advice Engine [x]
- **Task:** Map lifestyle scores to standardized "Medical Advice Blocks" from the database.
- **Steps:** [x] Implement | [x] Test | [x] Confirm | [x] Push | [x] Complete

### 8. The Synthesis Engine (Cross-Pillar) [x]
- **Task:** Create a logic layer that identifies relationships between pillars.
- **Steps:** [x] Implement | [x] Test | [x] Confirm | [x] Push | [x] Complete

### 9. Report UI Cleanup [x]
- **Task:** Final polish of reports to prioritize deterministic data and safety flags.
- **Steps:** [x] Implement | [x] Test | [x] Confirm | [x] Push | [x] Complete

### 10. Database Reliability & Snapshot Comparison [x]
- **Task:** Ensure full `formData` is saved in dashboard summaries and implement a robust snapshot-to-current comparison UI in Client Details.
- **Steps:** [x] Implement | [x] Test | [x] Confirm | [x] Push | [x] Complete

### 11. Codebase Sanitization & Cleanup [x]
- **Task:** Remove all orphaned legacy files and directories to ensure a clean, configuration-driven codebase.
- **Steps:** [x] Implement | [x] Test | [x] Confirm | [x] Push | [x] Complete

### 12. InBody Segmental Analysis & Asymmetry [x]
- **Task:** Analyze limb imbalances (>10% diff) and trunk/limb distribution to prioritize unilateral work and hypertrophy focus.
- **Steps:** [x] Implement | [x] Test | [x] Confirm | [x] Push | [x] Complete

### 13. Narrative Storytelling Engine [x]
- **Task:** Create a narrative-driven "client script" using metaphors (speed bumps, performance tuning) to explain findings.
- **Steps:** [x] Implement | [x] Test | [x] Confirm | [x] Push | [x] Complete

### 14. Multi-Goal Support & Personalization [x]
- **Task:** Update exercise prioritization to handle multiple client goals and ambition levels simultaneously.
- **Steps:** [x] Implement | [x] Test | [x] Confirm | [x] Push | [x] Complete

---

## Phase 4: Production & Deployment
*Goal: Transition changes to the live environment.*

### 15. Deployment to Production [x]
- **Task:** Merge all changes from `camera-features` to `main` and deploy to Firebase.
- **Steps:** [x] Implement | [x] Test | [x] Confirm | [x] Push | [x] Complete
