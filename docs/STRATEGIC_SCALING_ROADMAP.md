# One Assess: Strategic Scaling Roadmap

> Master reference for platform expansion. Aligns with codebase at `teamMetrics.ts`, `ocrEngine.ts`, `useOrgRetention.ts`, `lifestyleScoring.ts`, `postureAnalysis.ts`, `pricing.ts`, `PublicReportViewer.tsx`, and `OrgAdmin.tsx`.

---

## Phase 1: The "Engagement & Accuracy" Foundation (Months 0–6)

**Focus:** Establishing the platform as the undeniable "Source of Truth" for coaching data.

### MediaPipe 2.0: Automated Rep Counting

- Use MediaPipe to live-count squats, push-ups, and planks via the client's camera.
- Implement "Quality-Only" logic: reps only count if they meet specific joint-angle thresholds.
- **Code touchpoints:** `postureLandmarks.ts`, `usePoseDetection.ts`, `mediapipeSingleton.ts` — extend to continuous pose over time (not just single-frame).

### The "One-Assess" Launch Kit

- Dashboard section providing coaches with white-labeled marketing materials, social media templates, and WhatsApp/Email scripts.
- **Code touchpoints:** New dashboard route/section, assets in Firebase Storage or CMS.

### Transformation Challenge Module

- Leaderboard engine crowning winners based on "Holistic Improvement" (point deltas in posture, mobility, biometrics) rather than weight loss alone.
- **Code touchpoints:** `computeScores`, `ScoreSummary` — define a holistic improvement index (weighted pillar deltas).

### AI OCR "Confidence" Learning

- Enhance `ocrEngine.ts` to learn from coach corrections on InBody reports for 99% accuracy over time.
- **Code touchpoints:** `ocrEngine.ts` (Gemini), `checkLearnedPatterns` / `learnPattern` — add correction UX and storage for corrections + original image.

---

## Phase 2: The "Regional Prestige" Engine (Months 6–12)

**Focus:** Creating network effects where gyms compete to be associated with your brand.

### Facility Health Index (FHI)

- Aggregate score representing average client improvement across a whole facility.
- **Code touchpoints:** `teamMetrics.ts` — add facility-level aggregation; requires `facilityId` on clients/assessments.

### Regional Certification Program

- "Certified Excellence" status for gyms meeting minimum assessment volumes and low "At-Risk" percentages.
- **Code touchpoints:** Org schema, `useOrgRetention` thresholds, certification rules engine.

### Public-Facing "Verified Gym" Map

- Directory derived from `PublicReportViewer`-style data where potential clients find top One Assess gyms by city.
- **Code touchpoints:** New public route, org location/visibility fields, consent for public listing.

### Coach "Success" Leaderboards

- Internal rankings in `OrgAdmin.tsx` showing which coaches have the most improved client rosters.
- **Code touchpoints:** `teamMetrics.ts` (extend `CoachMetrics`), `OrgAdmin.tsx`, `TeamView.tsx`.

### Health App Integrations

- Connect to Apple Health, Google Fit, Fitbit to import objective sleep, HR, HRV, steps, and VO2 max.
- Feeds `lifestyleScoring.ts` and `cardioScoring.ts` with real data instead of self-reported inputs.
- **Code touchpoints:** OAuth flows for Fitbit/Google Fit; HealthKit (iOS) / Health Connect (Android) for companion app; Firestore schema for aggregated metrics.
- **Privacy:** Explicit consent, store aggregated/derived values (e.g., 7-day avg sleep hours), not raw timelines.

---

## Phase 3: The "Retention & Business ROI" Layer (Year 1–2)

**Focus:** Proving financial value to the business owner.

### Retention Hero Dashboard

- Expanded `useOrgRetention` analytics showing dollar amount of revenue saved by re-engaging "At-Risk" clients.
- **Code touchpoints:** `useOrgRetention.ts`, org subscription data (MRR per client), retention dashboard UI.

### Performance-Based Pricing Rebates

- Automated logic granting monthly fee discounts to gyms maintaining "Top 3" regional ranking.
- **Code touchpoints:** `pricing.ts` — add `applyRebate` / Stripe credits; integrate with FHI/regional ranking.

### Predictive Client Readiness

- Daily alerts for coaches combining `lifestyleScoring` and cardio recovery data to recommend "Push" or "De-load" sessions.
- **Code touchpoints:** `lifestyleScoring.ts`, cardio/HRV from Health integrations, scheduled Cloud Function for daily alerts.

---

## Phase 4: The "Intelligence Infrastructure" Scale (Year 2–3+)

**Focus:** Expanding beyond the gym into the global fitness economy.

### Assessment-as-a-Service (AaaS)

- Standalone landing pages for coaches to sell deep-dive AI assessments as a high-margin entry product via Stripe.
- **Code touchpoints:** New `/assess/buy` route, Stripe Checkout (one-time payment), separate from org subscriptions.

### Global Niche Leaderboards

- Rankings for online coaches by specialty (e.g., "Top 50 Mobility Coaches") based on verified MediaPipe movement data.
- **Code touchpoints:** Extended leaderboard engine, coach specialty taxonomy, MediaPipe verification pipeline.

### One Assess Enterprise API

- License `ocrEngine.ts` and `postureAnalysis.ts` to hardware manufacturers (InBody/Peloton) and health insurance providers.
- **Code touchpoints:** Dedicated API service, auth/rate limiting, usage metering, decoupled from Firebase/Gemini where needed.

---

## Pre-requisites & Schema Additions

| Requirement | Purpose |
|-------------|---------|
| `facilityId` on clients/assessments | FHI, multi-site orgs |
| Org `location` / `region` / `publicListing` | Verified gym map, regional rankings |
| OCR correction event schema | AI confidence learning |
| Cardio recovery / HRV fields | Predictive readiness |
| Health integration aggregated metrics | Lifestyle & cardio scoring, readiness alerts |
| API product schema (keys, usage) | Enterprise API |

---

## Risk Register

| Item | Risk | Mitigation |
|------|------|------------|
| OCR learning | Coach corrections not captured systematically | Design explicit "Edit & Confirm" OCR review UX with correction events |
| MediaPipe rep counting | Continuous pose vs single-frame; MediaPipe 2.0 API changes | Evaluate MediaPipe Tasks vs Pose; prototype rep counting early |
| AaaS / Enterprise API | New product surfaces, different billing | Treat as separate products with isolated services |
| Rebates | Stripe doesn't natively support dynamic discounts post-invoice | Use Stripe Credits or proration; document process |
| Health integrations | Privacy, platform compliance (Apple/Google) | Explicit consent; store aggregated metrics; follow store guidelines |
