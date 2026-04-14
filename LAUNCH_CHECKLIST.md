# Launch Checklist — One Assess

Work through this top-to-bottom in a single session with Claude.
Each item links to the exact file and line where the work needs to happen.

---

## ⚖️ LEGAL & REGULATORY (pre-launch blockers — external actions required)

These cannot be coded. Michael must action each one directly before launch.

### L1. MHRA regulatory scoping opinion ← HIGHEST PRIORITY
**Why:** The posture feature observes spinal curvature, forward head position, and pelvic tilt. Under UK MDR 2002, software that monitors or detects disease conditions may be classified as a medical device requiring MHRA registration, UKCA marking, and ISO 13485 compliance. You need a qualified regulatory affairs (RA) consultant — not a general lawyer — to confirm the revised product (post code changes) falls below the threshold.  
**Who to engage:** Search for "MHRA software medical device RA consultant UK". Budget £800–2,000 for a scoping opinion in writing.  
**When:** Before any public launch, press coverage, or paid customer onboarding.  
**Status:** Pending

---

### L2. PT insurer written endorsements
**Why:** Major UK PT insurers (Insure4Sport, Balens, Protectivity) have clauses excluding "AI-assisted diagnosis" and "tools outside scope of practice." A cautious coach will not adopt the product if their insurer might reject a claim. A written endorsement from at least one major insurer becomes a sales asset.  
**What to do:** Contact Insure4Sport and Balens. Send a brief product description (posture observation for fitness coaching, not medical assessment). Request a written statement that the product does not trigger their exclusion clauses.  
**When:** Before public launch. Can happen in parallel with L1.  
**Status:** Pending

---

### L3. Data Processing Agreement (DPA) template for coaches/gyms
**Why:** UK GDPR Article 28 requires a written contract between every data controller (coaches/gyms) and every data processor (One Assess) before processing personal data. You are processing special category data (biometric photos, health flags) on behalf of every coach on the platform. Without a signed DPA, every customer relationship is non-compliant from day one.  
**What to do:** Draft a 2-page DPA. It must: name One Assess as processor; name the coach/gym as controller; list sub-processors (Google Cloud Platform, Firebase, Google Gemini API, email delivery provider); describe the categories of data processed; set out deletion obligations. Have it executed at signup (checkbox + stored record, or e-signature).  
**When:** Must be live before first paying customer.  
**Status:** Pending

---

### L4. Data Protection Impact Assessment (DPIA)
**Why:** UK GDPR Article 35 + DPA 2018 Schedule 1 requires a DPIA before high-risk processing. Processing biometric photos, health data, and automated profiling via AI — all three triggers apply. The ICO's first question in any investigation of a health-data processor is: "Please provide your DPIA."  
**What to do:** Complete the ICO's free DPIA template (available at ico.org.uk). Document: what data is processed, why, legal basis, risks, mitigations. Sign and date it. File internally — does not need to be public.  
**When:** Before launch.  
**Status:** Pending

---

### L5. ICO registration as data controller
**Why:** Any organisation processing personal data in the UK must register with the Information Commissioner's Office unless exempt. Small SaaS businesses processing health/biometric data are not exempt. Fee is £40/year for organisations with turnover under £632k.  
**What to do:** Check ico.org.uk/registration. Register or confirm existing registration covers One Assess Ltd's current activities (health data processing via software).  
**When:** Before launch. This is a legal obligation, not optional.  
**Status:** Pending

---

### L6. Marketing and landing page legal review
**Why:** The amended landing copy (Movement Analysis Engine, fitness coaching context) needs a one-off review by a lawyer familiar with UK advertising standards (CAP Code) and the Consumer Protection from Unfair Trading Regulations 2008. This confirms no remaining misrepresentation risk after the code changes were made.  
**What to do:** Instruct a lawyer with digital/consumer law experience to review the live landing page once deployed. Budget £500–1,000 for a single-page sign-off.  
**When:** Before press coverage or paid advertising. Can happen post-launch if organic only.  
**Status:** Pending

---

### L7. Verify Firebase Storage posture image deletion in erasure flow
**Why:** The `executeClientErasure` Cloud Function deletes Firestore documents including Storage URL references — but confirm it also deletes the underlying files in Firebase Storage, not just the references. If Storage objects persist after erasure, GDPR Article 17 compliance is incomplete.  
**File:** `functions/src/executeClientErasure.ts`  
**What to do:** Trace the deletion logic. If Firebase Storage deletion is not explicit, add `deleteObject()` calls for the `{view}_full.jpg` files under `organizations/{orgId}/clients/{clientId}/sessions/`.  
**Status:** Needs verification

---

### L8. Add automated 30-day erasure deadline enforcement
**Why:** The client-facing erasure flow promises processing within 30 days. Currently there is no system enforcement — it relies entirely on an admin manually executing the Cloud Function. That is a promise without a mechanism.  
**What to do:** Add a scheduled Cloud Function (daily or weekly) that queries `erasureRequests` documents with `status: 'pending'` older than 25 days and sends a Slack alert to `#one-assess-hq` naming the org and client. Optionally auto-execute after 30 days.  
**Status:** Pending

---

## 🔴 BEFORE YOU GO LIVE (technical blockers)

### 1. Enable App Check enforcement on all Cloud Functions
**Why:** All Cloud Functions have `enforceAppCheck: false`. This means any script on the internet can call your payment, erasure, and AI functions without being a real browser session.  
**File:** `functions/src/index.ts:69`  
**What to do:** After a prod smoke-test confirms reCAPTCHA works, flip every `enforceAppCheck: false` → `true`.  
**Note from code:** *"Do not enable before a prod smoke-test — it will lock out real users if the site key isn't verified first."*

---

### 2. Wire App Check enforcement on the frontend too
**Why:** The frontend comment says to verify the reCAPTCHA site key is working before flipping functions.  
**File:** `src/services/firebase.ts:169`  
**What to do:** Test a full signup/checkout flow on the production build, confirm no App Check errors in the console, then do item #1 above.

---

### 3. Enable Sentry releases (version tracking)
**Why:** Without a release version, Sentry can't tell you *which deploy* introduced a bug or show you regression graphs.  
**File:** `src/main.tsx:15`  
**What to do:** Uncomment the release line and set `VITE_APP_VERSION` in your `.env.production`. Start at `1.0.0`.

---

### 4. Enable Sentry Autofix auto-PR in Seer
**Why:** Kept off during dev to avoid noisy PRs from localhost errors.  
**Where:** Sentry → Settings → Seer → Autofix → "Create PRs by default" → ON  
**When:** Do this the moment you go live — not before.

---

## 🟡 LAUNCH DAY (do on the day)

### 5. Review posture feedback copy
**Why:** The posture feedback library is flagged as *"placeholder copy — replace with approved studio copy."*  
**File:** `src/constants/postureFeedbackLibrary.ts:2`  
**What to do:** Review every feedback string. Replace anything that reads as draft/placeholder with approved copy before coaches use posture assessments with real clients. **Important:** All copy must use non-diagnostic language — "observed", "noted", "within/outside typical range." No clinical pathology names. See legal changes in this session for approved terminology patterns.

---

### 6. Set `VITE_APP_VERSION` in production environment
**Why:** Required for Sentry release tracking (item #3).  
**Where:** Firebase Hosting environment or your CI/CD build config.  
**What to do:** Add `VITE_APP_VERSION=1.0.0` to your production build environment.

---

## 🟢 PHASE ITEMS (built but not yet wired — complete as you grow)

### Phase 4 — Client privacy notice (built, needs wiring)
**Status:** `PrivacyNoticeBanner` component exists and `CLIENT_PRIVACY_NOTICE_SEEN` sessionStorage key is defined. Not yet confirmed it's mounted on the `/r/:token` client report route.  
**Files:** `src/components/client/PrivacyNoticeBanner.tsx`, `src/constants/storageKeys.ts:49`  
**What to do:** Verify the banner actually appears on first client report load. If not, mount it in the client portal route.

---

### Phase 5 — Org admin AI context (built, needs wiring)
**Status:** `retentionSummary` and `coachMetrics` are already computed in `assistantPayloadBuilder.ts` and passed through the assistant wording. Check whether they're actually injected into the system prompt for non-coaching admins.  
**Files:** `src/lib/coachAssistant/assistantPayloadBuilder.ts:277`, `src/lib/ai/coachAssistantWording.ts:44`  
**What to do:** Test as an org admin (non-coaching) — does the assistant know org-level retention stats? If not, trace why the payload isn't flowing through.

---

### Phase 6 — Platform admin alerting ✅
**Status:** Complete.  
**What was built:**
- `slackBillingAlerts.ts` — routes alerts to correct Slack channels (engineering / finance / marketing / one-assess-hq)
- Capacity alert fires when a client is added and org hits 90% or 100% → `#one-assess-hq`
- Weekly Monday digest (MRR, active orgs, trial count, past-due) → `#finance`
- Daily AI cost spike check against configurable threshold → `#engineering`
- Stripe events (trial start/end, new sub, payment failed, past_due, cancelled) already wired → `#finance` + `#marketing`
- Webhook URLs stored in `functions/.env`

---

## ✅ ALREADY DONE (no action needed)

- Sentry environment tagging (`production` / `development`) — automatic via Vite's `MODE`
- GDPR erasure flow — Cloud Function + UI wired together
- Data minimisation (Phase 3) — coaches query only their own clients
- Client portal PWA entry point — `/r` route + localStorage token
- Stripe billing + capacity tiers — wired end to end
- GitHub → Sentry → Seer → Claude Agent — configured today

---

*Last updated: 2026-04-10*
