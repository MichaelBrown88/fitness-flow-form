# Pre-Launch Test Plan

Work through these in order — desktop/browser tests first, then in-person tablet tests.
Mark each item ✅ when confirmed working.

---

## PHASE 1 — Desktop Browser (Chrome, at your desk)

### 1.1 Auth & Onboarding

- [ ] Visit the app URL — landing page loads, no console errors
- [ ] Click "Get Started" — onboarding wizard opens
- [ ] Step through the wizard: business info, identity, equipment, package selection, team roster
- [ ] Complete onboarding → dashboard loads
- [ ] Log out → redirected to login
- [ ] Log back in → dashboard loads with correct org data
- [ ] Visit a protected route while logged out → redirected to login

### 1.2 Dashboard — Client Directory

- [ ] Client table renders with correct columns (Name, Last Assessed, Score, Trend, Goal, Actions)
- [ ] Sort by Name, Last Assessed, Score — each toggles asc/desc correctly
- [ ] Search for a client by name — results filter correctly
- [ ] Status filter (Active / Paused / Archived / All) — each tab shows the right clients
- [ ] Select one client via checkbox → bulk action bar appears
- [ ] Select all visible → bulk action bar updates count
- [ ] Bulk archive a client → client moves to Archived tab
- [ ] Open a client's Actions dropdown → items are readable and tappable
- [ ] Click "Start Assessment" from dropdown → navigates to assessment correctly
- [ ] Click "View History" from dropdown → client history loads

### 1.3 Add Client & Start Assessment

- [ ] Click "New Client" → modal opens with form
- [ ] Fill in name, submit → client appears in directory
- [ ] Navigate to Assessment → wizard loads Phase 0 (client selection/intake)
- [ ] Select the new client → proceed through phases

### 1.4 Assessment Flow (full run)

- [ ] Phase 0 (Client Info): name, DOB, gender, goals — Next works
- [ ] PAR-Q: step through all questions, Yes/No buttons are large and tappable, warning banner appears if "Yes" answered
- [ ] Phase 1 (Body Composition): all fields save, unit toggle works
- [ ] Phase 2 (Movement): OHS, Hinge, Lunge — all multiselect options work
- [ ] Phase 3 (Posture): skip camera for now (test in-person later)
- [ ] Phase 4 (Strength): all fields complete
- [ ] Phase 5 (Lifestyle): all fields complete
- [ ] Assessment Results screen: scores display, all pillars show
- [ ] "View Report" → client report opens

### 1.5 Client Report (Coach view)

- [ ] Report header shows client name and date
- [ ] Score ring / overall radar chart renders
- [ ] All sections expand (Body Comp, Movement, Strength, Lifestyle, Gap Analysis)
- [ ] "Share with Client" button opens dialog
- [ ] Generate a share link → copy works
- [ ] Coach pane tab (if visible) → shows internal notes

### 1.6 AI Assistant (Coach)

- [ ] Open AI Assistant tab
- [ ] Send a plain message → response streams in
- [ ] Ask about a specific client → response references client data
- [ ] If assistant returns a table → table renders with scroll, doesn't break layout
- [ ] Charts/visualisations (if any) render without overflow
- [ ] Collapse assistant sidebar → more space for chat
- [ ] AI credit display is accurate

### 1.7 Roadmap Builder

- [ ] Open ARC™ Roadmap for a client
- [ ] Add a phase, add goals → saves correctly
- [ ] Publish roadmap → share token generated
- [ ] Open the share link in a new tab → public roadmap loads without login

### 1.8 Settings

- [ ] Visit Settings → all tabs load
- [ ] Change org name → saves and reflects in header
- [ ] Default cadence settings → update intervals, save, re-open and confirm persisted
- [ ] Branding preview renders
- [ ] Theme toggle (light/dark) → persists on refresh

### 1.9 Billing & Subscription

- [ ] Navigate to Billing page → current plan shows correctly
- [ ] Capacity tier grid renders with correct tier highlighted
- [ ] Upgrade/downgrade UI shows correct pricing
- [ ] (Stripe test mode) Complete a checkout → BillingSuccess page loads
- [ ] Subscription status reflects in dashboard

### 1.10 Org Admin View

- [ ] Log in as an org admin (non-coaching)
- [ ] Org Overview page loads — all coaches listed
- [ ] Client list shows full org scope (not filtered to a coach)
- [ ] GDPR: Erasure request flow visible and functional

---

## PHASE 2 — Responsive Checks (Browser DevTools, at your desk)

Use Chrome DevTools → toggle device toolbar. Test each at these sizes:
- **Mobile** — 390×844 (iPhone 14)
- **Tablet** — 1024×768 (iPad landscape) and 768×1024 (iPad portrait)

### 2.1 Client Table Responsive

- [ ] **Mobile**: card layout shows (no table), each card has name, score, trend, date, actions
- [ ] **Tablet (1024px)**: table shows with Name, Last Assessed, Score, **Trend** (confirm visible), Actions
- [ ] **Tablet (1024px)**: Goal column visible at lg breakpoint
- [ ] **Desktop**: all columns visible

### 2.2 Form Inputs

- [ ] **Mobile**: text inputs are visibly taller than desktop (44px vs 40px)
- [ ] **Mobile**: dropdown menu items have generous tap height
- [ ] **Mobile**: textareas stop growing after ~240px and scroll internally

### 2.3 Navigation

- [ ] **Mobile**: hamburger menu opens/closes sidebar
- [ ] **Tablet portrait**: sidebar collapses, menu button visible
- [ ] **Desktop**: sidebar is always visible

### 2.4 Assessment on Tablet

- [ ] PAR-Q card has comfortable padding (not cramped), question text readable
- [ ] Yes/No buttons are full-height (80px), easy to tap
- [ ] Navigation (Back / Next Step) buttons are large enough

### 2.5 Reports on Mobile

- [ ] Mobile report uses tab-based layout (not accordion)
- [ ] Each tab section is readable and scrollable
- [ ] Charts don't overflow their containers

### 2.6 AI Assistant on Mobile

- [ ] Chat messages render correctly
- [ ] If assistant returns a markdown table → table scrolls horizontally, doesn't break layout
- [ ] Input area is accessible above keyboard

---

## PHASE 3 — In-Person on iPad (Tablet, with a real client scenario)

These tests require physical hardware. Do these with a colleague acting as client.

### 3.1 Posture Capture — Coach Device (iPad, front-facing)

- [ ] Open assessment → navigate to Posture phase
- [ ] Tap "Start Posture Capture" → guided capture panel opens full screen
- [ ] **Enable Camera & Motion** button appears
- [ ] Tap it → iOS prompts for camera permission → Allow
- [ ] iOS prompts for motion/orientation → **Allow**
- [ ] Phone level indicator activates correctly (green when upright)
- [ ] QR code shown for companion device option
- [ ] Pose guide box appears (red → amber → green as client positions)
- [ ] Countdown triggers and auto-captures each view
- [ ] Processing spinner shows after capture
- [ ] Results return and posture images appear in report

### 3.2 Posture Capture — Denied Motion Permission (iOS edge case)

- [ ] Deny motion permission when prompted
- [ ] **Confirm**: orange "Motion access denied" banner appears with Settings instructions
- [ ] App doesn't crash or freeze
- [ ] Capture button is disabled (greyed)

### 3.3 Posture Capture — Companion Mode (Second Phone as camera)

- [ ] On iPad (coach device): tap "Use another device as camera"
- [ ] QR code displayed
- [ ] On phone: scan QR → companion page loads
- [ ] Companion shows camera feed, pose overlay
- [ ] Phone upright → green indicator
- [ ] Auto-capture fires for each view
- [ ] Images appear on coach iPad in real time

### 3.4 Camera — Manual Snap (OCR mode)

- [ ] Assessment → Body Composition → tap camera icon for body comp scan
- [ ] Camera opens in environment-facing mode
- [ ] Guide frame visible (corner brackets)
- [ ] **Fullscreen button** visible in header → tap it → enters fullscreen
- [ ] Tap fullscreen again → exits
- [ ] Snap photo → OCR review dialog appears
- [ ] Confirm data → fields populate in form

### 3.5 Posture Capture — Flip Camera

- [ ] In posture capture: flip camera button → switches between front/rear
- [ ] Tilt indicator still works after flip

### 3.6 Assessment Flow on iPad (Full Run)

- [ ] Complete a full assessment on iPad landscape orientation
- [ ] All form fields tap correctly with no keyboard overlap issues
- [ ] Text inputs are tall enough to tap cleanly (44px+)
- [ ] Multiselect option buttons (64px height) easy to tap
- [ ] Scroll through long forms without getting stuck
- [ ] Assessment saves correctly on submit

### 3.7 Report Sharing on iPad

- [ ] Complete assessment → go to report
- [ ] Tap "Share with Client" → dialog opens
- [ ] Copy share link
- [ ] Paste on client's phone → client portal loads

---

## PHASE 4 — Client PWA (Client's Phone)

### 4.1 PWA Install

- [ ] Client opens the share link on their phone (iOS Safari or Android Chrome)
- [ ] **iOS Safari**: Share button → "Add to Home Screen" prompt visible (manual)
- [ ] **Android Chrome**: "Add to Home Screen" banner appears automatically (or install prompt)
- [ ] Install the PWA → app icon appears on home screen
- [ ] Open from home screen → loads in standalone mode (no browser chrome)

### 4.2 Client Report Portal

- [ ] Open `/r` entry → redirected to last report if token stored
- [ ] Open share link `/r/:token` → correct client report loads without login
- [ ] All report sections readable on phone
- [ ] Radar chart renders correctly on small screen (compact labels)
- [ ] Gap analysis bars render without overflow
- [ ] ARC™ Roadmap link at bottom → opens roadmap

### 4.3 Client Roadmap

- [ ] `/roadmap/:token` → roadmap loads on client's phone
- [ ] Phases and goals readable
- [ ] Trackable bars show correct progress

### 4.4 Client Achievements & Lifestyle Pages

- [ ] `/r/:token/achievements` → page loads, data shows
- [ ] `/r/:token/lifestyle` → page loads, data shows

---

## PHASE 5 — Edge Cases & Error Handling

- [ ] Refresh mid-assessment → data is preserved (offline sync / draft)
- [ ] Submit assessment with no internet → queued and syncs when back online
- [ ] Open app on very small screen (320px width) → nothing clips or breaks
- [ ] Dark mode: switch to dark → all pages readable, no invisible text on dark backgrounds
- [ ] Light mode: same check
- [ ] Log in on two tabs simultaneously → no auth loop
- [ ] Visit `/r/invalid-token` → graceful error, not blank page

---

## Sign-off Checklist

Before go-live:

- [ ] All Phase 1 items passing
- [ ] All Phase 2 responsive checks passing
- [ ] Phase 3 in-person tablet tests passing
- [ ] Phase 4 client PWA working on at least one iOS and one Android device
- [ ] App Check: flip `enforceAppCheck` from `false` to `true` in all Cloud Functions
- [ ] Run `firebase deploy` (not deploy-preview.sh) with rules + functions + hosting
- [ ] Confirm production Stripe webhook is pointed at the right endpoint
- [ ] Confirm Firestore indexes are deployed
- [ ] Smoke-test production URL with a real account after deploy
