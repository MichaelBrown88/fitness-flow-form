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

### 2. Movement Safety (Pain Fields) [ ]
- **Task:** Add `hasPainDiscomfort` boolean fields to the form state for OHS, Hinge, and Lunge. Update the UI in `Phase2` steps to include these toggles.
- **Steps:** [x] Implement | [x] Test | [ ] Confirm | [x] Push | [ ] Complete

### 3. Reliable Demographic Injection [ ]
- **Task:** Ensure `age` (calculated from DOB) and `gender` are passed correctly from `FormData` into the `computeScores` and `buildRoadmap` functions.
- **Steps:** [ ] Implement | [ ] Test | [ ] Confirm | [ ] Push | [ ] Complete

---

## Phase 2: Deterministic Logic (The "Brain")
*Goal: Replace AI guesses with mathematical and database-driven results.*

### 4. Normative Scoring Upgrade [ ]
- **Task:** Update `src/lib/scoring.ts` to use the Normative Database. 
- **Steps:** [ ] Implement | [ ] Test | [ ] Confirm | [ ] Push | [ ] Complete

### 5. Movement Logic & Contraindications [ ]
- **Task:** Link visual triggers to Movement Database for Stretches, Activations, and Contraindications.
- **Steps:** [ ] Implement | [ ] Test | [ ] Confirm | [ ] Push | [ ] Complete

### 6. Realistic Biological Roadmap [ ]
- **Task:** Update `buildRoadmap` in `scoring.ts` to use metabolic reality and Age Penalty Factors.
- **Steps:** [ ] Implement | [ ] Test | [ ] Confirm | [ ] Push | [ ] Complete

---

## Phase 3: Insights & Synthesis (The Report)
*Goal: Provide deep, interconnected insights to the client.*

### 7. Lifestyle Advice Engine [ ]
- **Task:** Map lifestyle scores to standardized "Medical Advice Blocks" from the database.
- **Steps:** [ ] Implement | [ ] Test | [ ] Confirm | [ ] Push | [ ] Complete

### 8. The Synthesis Engine (Cross-Pillar) [ ]
- **Task:** Create a logic layer that identifies relationships between pillars.
- **Steps:** [ ] Implement | [ ] Test | [ ] Confirm | [ ] Push | [ ] Complete

### 9. Report UI Cleanup [ ]
- **Task:** Final polish of reports to prioritize deterministic data and safety flags.
- **Steps:** [ ] Implement | [ ] Test | [ ] Confirm | [ ] Push | [ ] Complete
