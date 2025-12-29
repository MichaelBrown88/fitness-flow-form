# 🎯 Refactoring Master Plan
## Fitness Flow Form - ClientReport & Performance Optimization

**Goal:** Reduce `ClientReport.tsx` from 1440 lines to <400 lines while maintaining functionality and improving performance.

---

## 📋 Phase 1: Aggressive De-bloating of `ClientReport.tsx` (High Impact, Low Risk)

### ✅ Completed
- [x] Extract `ClientReportHeader.tsx` (73 lines)
- [x] Extract `ClientReportScoreOverview.tsx` (112 lines)
- [x] Extract `ClientReportCategoryTabs.tsx` (146 lines)
- [x] Create `ClientReportConstants.ts` (82 lines)

### 🔄 In Progress

#### 1. Extract `ClientReportGoals.tsx` (Lines ~543–760)
**Dependencies Analysis:**
- Props needed: `goals`, `formData`, `orderedCats`, `immediateActions`, `secondaryActions`, `sessionsPerWeek`
- State: None (pure presentation)
- Helper functions: Goal explanation logic, discovered goals calculation

**Tool Usage:** ✅ SequentialThinking - Analyzed dependencies
**Task:** Extract goal rendering logic with tabbed/expanded views

#### 2. Extract `ClientReportLifestyle.tsx` (Lines ~763–820)
**Dependencies Analysis:**
- Props needed: `formData`, `lifestyleProfile` (computed)
- State: None
- Helper functions: Lifestyle factor status calculation

**Task:** Extract lifestyle profile mapping and status display

#### 3. Extract `ClientReportFocus.tsx` (Lines ~862–915)
**Dependencies Analysis:**
- Props needed: `plan?.clientScript`
- State: None
- Helper functions: None (static rendering)

**Task:** Move "What We'll Focus On" section (findings, why it matters, action plan)

#### 4. Extract `ClientReportWorkout.tsx` (Lines ~918–1050)
**Dependencies Analysis:**
- Props needed: `plan?.clientWorkout` or `plan?.prioritizedExercises`
- State: None
- Helper functions: Workout structure rendering

**Tool Usage:** 🔄 Context7 - Check React list rendering best practices
**Task:** Move workout rendering logic with proper memoization

#### 5. Extract `ClientReportRoadmap.tsx` (Lines ~1242–1305)
**Dependencies Analysis:**
- Props needed: `orderedCats`, `weeksByCategory`, `maxWeeks`, `sessionsPerWeek`, `setSessionsPerWeek`, `formData`
- State: `sessionsPerWeek` (managed in parent, passed as prop)
- Helper functions: Timeline calculation

**Task:** Extract roadmap timeline with session slider

---

## 📋 Phase 2: Hook Integration & Verification (Medium Impact)

### 1. Verify `MultiStepForm.tsx` Hooks
**Status:** Hooks created but integration incomplete

**Tool Usage:** 🔄 SequentialThinking - Trace data flow for race conditions
**Tasks:**
- [ ] Audit `MultiStepForm.tsx` for missed logic
- [ ] Verify `useAssessmentNavigation` handles all phase transitions
- [ ] Verify `useAssessmentSave` handles all save scenarios
- [ ] Verify `useCameraHandler` handles all camera/companion flows
- [ ] Check for race conditions between hooks

---

## 📋 Phase 3: Context & Performance (High Risk, High Reward)

### 1. `FormContext` Strategy Review
**Current State:** Single large context causing re-renders on every field change

**Tool Usage:** ✅ Tavily - Research complete
**Research Findings:**
- Context API is fine for simple, low-frequency state
- Context causes performance issues: all consumers re-render on any value change
- Zustand solves this by only re-rendering components subscribed to changed state
- For multi-step forms: Start with Context, split if needed, but splitting Context is basically reinventing Zustand
- Recommendation: Split Context first (less risky), migrate to Zustand if still having issues

**Proposed Plan:**
1. **Phase 1 (Low Risk):** Split FormContext into smaller contexts (ClientProfile, BodyComp, Lifestyle, Movement, Fitness, Strength, ParQ, Reports) - Already created `FormContextSplit.ts` template
2. **Phase 2 (If Needed):** Migrate to Zustand if performance issues persist after splitting
3. **Alternative:** Consider react-hook-form for form-specific state (already installed)

**Tasks:**
- [x] Research complete
- [x] Propose migration plan (split context first, Zustand if needed)
- [ ] Create proof-of-concept for split contexts
- [ ] Migrate if approved

---

## 📋 Phase 4: Security & Final Polish

### 1. Security Scan
**Tool Usage:** 🔄 StackHawk - Scan for vulnerabilities
**Tasks:**
- [ ] Run StackHawk scan on refactored components
- [ ] Fix any identified vulnerabilities
- [ ] Document security improvements

### 2. Dead Code Removal
**Tasks:**
- [ ] Scan for unused imports
- [ ] Remove unused variables
- [ ] Remove commented code
- [ ] Clean up console.logs

### 3. Type Safety Audit
**Tasks:**
- [ ] Verify all components have proper TypeScript types
- [ ] Check for any remaining `any` types
- [ ] Add JSDoc comments for complex functions

---

## 📊 Progress Tracking

### Current Metrics
- **ClientReport.tsx:** 1440 lines → Target: <400 lines
- **Components Extracted:** 3/8
- **Hooks Created:** 3/3 (integration pending)
- **Security Scans:** 0/1

### Success Criteria
- [ ] ClientReport.tsx < 400 lines
- [ ] All extracted components < 200 lines each
- [ ] No performance regressions
- [ ] All tests passing
- [ ] Zero security vulnerabilities
- [ ] Zero TypeScript errors
- [ ] Zero linting errors

---

## 🛠️ Tool Usage Log

### SequentialThinking
- ✅ Phase 1.1: Analyzed ClientReport dependencies and extraction strategy
- ✅ Phase 1.2: Confirmed all extractions are safe (no shared mutable state)
- 🔄 Phase 2.1: Tracing MultiStepForm data flow (pending)

### Context7
- ✅ Phase 1.4: Researched React Hook Form for list rendering (useFieldArray, memoization)
- 🔄 Phase 1.4: Applying best practices to ClientReportWorkout component

### Tavily
- ✅ Phase 3.1: Researched state management solutions (Context vs Zustand)
- ✅ Findings: Split Context first, migrate to Zustand if needed

### StackHawk
- 🔄 Phase 4.1: Security scan pending (CLI needs app running)

---

## 📝 Notes
- All extracted components should maintain the same prop interface
- Use React.memo where appropriate to prevent unnecessary re-renders
- Keep shared utilities in `ClientReportConstants.ts`
- Document any breaking changes

