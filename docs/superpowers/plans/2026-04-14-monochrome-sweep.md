# Monochrome Sweep — Remove Brand Classes from Coach Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every `gradient-bg`, `text-gradient-dark`, `bg-gradient-light`, `border-gradient-medium`, and `glass-button-active` usage in the coach workspace and public pages with monochrome structural tokens, so the entire app — coach and client — shares the same visual language.

**Architecture:** Targeted find-and-replace across 16 files grouped by feature area. No new components or utilities are created. Replacement tokens are the monochrome CSS vars already installed by the design system (Task 1 of the previous plan). Client-facing report components (`src/components/reports/client/`, `src/components/reports/MovementPostureMobility.tsx`, `src/components/reports/LifestyleFactorsBar.tsx`) are intentionally excluded — those surfaces carry org brand colour as a paid add-on feature.

**Tech Stack:** React, TypeScript, Tailwind CSS v4 with CSS custom properties. No JS changes — all fixes are className string replacements.

---

## Replacement Cheat Sheet

| Old class | Replacement | Context |
|-----------|-------------|---------|
| `gradient-bg` (button fill) | remove — Button `default` variant already applies `bg-primary` | buttons |
| `gradient-bg` (icon container) | `bg-yellow-500` (achievement) or `bg-primary` (structural) | icons |
| `gradient-bg` (progress fill) | `bg-yellow-500` (achievement) or `bg-primary` | bars |
| `text-gradient-dark` | `text-foreground-secondary` | body links, labels |
| `text-gradient-dark` (underline link) | `text-foreground underline` | nav/cta links |
| `bg-gradient-light` | `bg-muted` | tinted surface |
| `border-gradient-medium` | `border-border` | decorative border |
| `ring-gradient-medium` | `ring-border` | focus/selected ring |
| `text-on-brand-tint` | `text-foreground-secondary` | text on tinted surface |
| `glass-button-active` on Badge | `variant="default"` (neutral grey pill) | coach-side active states |
| `marker:text-gradient-dark` | `marker:text-foreground-tertiary` | list markers |

---

## File Map

| File | Changes |
|------|---------|
| `src/components/achievements/StreakDisplay.tsx` | `gradient-bg` → `bg-yellow-500` on icon and milestone dots |
| `src/components/achievements/MilestoneProgress.tsx` | `gradient-bg` → `bg-yellow-500` on unlocked state |
| `src/components/achievements/TrophyGrid.tsx` | `gradient-bg` → `bg-yellow-500`; `ring-gradient-medium` → `ring-yellow-400` |
| `src/pages/Achievements.tsx` | `gradient-bg` → `bg-yellow-500` on icon container |
| `src/pages/client/ClientAchievementsTab.tsx` | `gradient-bg` → `bg-yellow-500` on icon container |
| `src/components/layout/AppShell.tsx` | `gradient-bg` on avatar initials → `bg-primary` |
| `src/pages/org/OrgTeam.tsx` | `gradient-bg` button → remove class; `bg-gradient-light text-gradient-dark` admin badge → `bg-muted text-foreground-secondary` |
| `src/pages/org/OrgAdminLayout.tsx` | `gradient-bg` button → remove class; `text-gradient-dark` icon → `text-foreground-secondary` |
| `src/pages/org/OrgOverview.tsx` | `text-gradient-dark` icon → `text-foreground-secondary` |
| `src/components/dashboard/assistant/AssistantThreadPanel.tsx` | `text-gradient-dark` → `text-foreground-secondary` |
| `src/components/dashboard/assistant/AssistantMessageMarkdown.tsx` | `text-gradient-dark` → `text-foreground-secondary`; `marker:text-gradient-dark/70` → `marker:text-foreground-tertiary` |
| `src/components/dashboard/sub-components/ClientActionsDropdown.tsx` | `text-gradient-dark` → `text-foreground-secondary` |
| `src/components/dashboard/sub-components/CalendarDayDetail.tsx` | `text-gradient-dark` → `text-foreground-secondary` |
| `src/components/dashboard/GettingStartedChecklist.tsx` | `text-gradient-dark` → `text-foreground-secondary` |
| `src/components/companion/CompanionUI.tsx` | `text-gradient-dark` → `text-foreground-secondary` |
| `src/pages/BillingSuccess.tsx` | `text-gradient-dark` → `text-foreground-secondary` |
| `src/pages/Billing.tsx` | `text-gradient-dark` on link → `text-foreground` |
| `src/pages/Settings.tsx` | `text-gradient-dark` links → `text-foreground` |
| `src/pages/Login.tsx` | `gradient-bg` hero panel → `bg-neutral-950`; logo icon → `bg-primary`; `text-gradient-dark` → `text-foreground-secondary` |
| `src/components/landing/BuiltByExperts.tsx` | `bg-gradient-light border-gradient-medium text-on-brand-tint` → monochrome |
| `src/components/landing/HowItWorksSection.tsx` | `bg-gradient-light`, `border-primary bg-gradient-light` → monochrome |
| `src/components/landing/LandingPricingPlans.tsx` | `text-gradient-dark` links → `text-foreground-secondary` |
| `src/components/landing/ROIComparison.tsx` | `border-gradient-medium` → `border-border` |
| `src/pages/Demo.tsx` | `border-gradient-medium bg-gradient-light text-gradient-dark` → monochrome |

---

## Task 1: Achievements — Brand Gold

Achievements are the one context where non-structural colour is appropriate in the coach workspace. The semantic colour for achievements is gold. Replace `gradient-bg` (teal) with `bg-yellow-500` (gold) throughout.

**Files:**
- Modify: `src/components/achievements/StreakDisplay.tsx`
- Modify: `src/components/achievements/MilestoneProgress.tsx`
- Modify: `src/components/achievements/TrophyGrid.tsx`
- Modify: `src/pages/Achievements.tsx`
- Modify: `src/pages/client/ClientAchievementsTab.tsx`

- [ ] **Step 1: Fix `StreakDisplay.tsx`**

Two occurrences. Line 15 (flame icon container) and line 39 (unlocked milestone dot).

```tsx
// Line 15 — icon container
<div className="p-2 bg-yellow-500 rounded-xl">
  <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-950" />
</div>

// Line 37-41 — milestone dot conditional
className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
  isUnlocked
    ? 'bg-yellow-500 shadow-md'
    : 'bg-muted border-2 border-dashed border-border'
}`}

// Line 43 — text on unlocked dot
<span className={`text-xs sm:text-sm font-bold ${isUnlocked ? 'text-yellow-950' : 'text-foreground-tertiary'}`}>
```

- [ ] **Step 2: Fix `MilestoneProgress.tsx`**

Read the file first, find the two `gradient-bg` occurrences. Replace both with `bg-yellow-500`. Replace `text-primary-foreground` or `text-white` on those elements with `text-yellow-950`.

- [ ] **Step 3: Fix `TrophyGrid.tsx`**

Read the file. Three occurrences:
- Line 70: `ring-gradient-medium` → `ring-yellow-400`
- Line 76: `gradient-bg` → `bg-yellow-500`
- Line 92: `gradient-bg` progress bar fill → `bg-yellow-500`

Replace `text-primary-foreground` / `text-white` on the yellow elements with `text-yellow-950`.

- [ ] **Step 4: Fix `Achievements.tsx` and `ClientAchievementsTab.tsx`**

In each file find the `gradient-bg rounded-xl` icon container. Replace with `bg-yellow-500 rounded-xl`. Replace the icon's `text-white` with `text-yellow-950`.

- [ ] **Step 5: Commit**

```bash
git add src/components/achievements/ src/pages/Achievements.tsx src/pages/client/ClientAchievementsTab.tsx
git commit -m "feat(design): achievements use semantic gold instead of gradient-bg"
```

---

## Task 2: AppShell Avatar Initials

**Files:**
- Modify: `src/components/layout/AppShell.tsx` (line ~267)

The avatar circle uses `gradient-bg` to fill with teal. Under monochrome it should be `bg-primary` (near-black in light, near-white in dark).

- [ ] **Step 1: Fix avatar className**

Find line ~267:
```tsx
className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs sm:text-xs font-bold text-white gradient-bg"
```

Replace with:
```tsx
className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs sm:text-xs font-bold bg-primary text-primary-foreground"
```

(`text-primary-foreground` handles both modes: black text on near-white avatar in dark mode, white text on near-black avatar in light mode.)

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat(design): avatar initials use bg-primary instead of gradient-bg"
```

---

## Task 3: Org Workspace Pages

**Files:**
- Modify: `src/pages/org/OrgTeam.tsx`
- Modify: `src/pages/org/OrgAdminLayout.tsx`
- Modify: `src/pages/org/OrgOverview.tsx`

- [ ] **Step 1: Fix `OrgTeam.tsx`**

**Line ~23** — "Add Coach" button has `className="gradient-bg text-primary-foreground hover:opacity-90 text-xs sm:text-sm h-9"`. The Button `default` variant already applies `bg-primary text-primary-foreground`. Remove the brand override:

```tsx
<Button
  size="sm"
  onClick={() => setShowAddCoachDialog(true)}
  className="text-xs sm:text-sm h-9"
>
```

**Line ~57** — Admin role badge uses `bg-gradient-light text-gradient-dark`:

```tsx
<span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[10px] font-bold bg-muted text-foreground-secondary border border-border shrink-0">
  Admin
</span>
```

- [ ] **Step 2: Fix `OrgAdminLayout.tsx`**

**Line ~348** — `<UserPlus>` icon with `text-gradient-dark`:
```tsx
<UserPlus className="w-5 h-5 text-foreground-secondary" />
```

**Line ~384** — Button with `gradient-bg text-primary-foreground hover:opacity-90`. Remove the brand className override (Button default variant handles it):
```tsx
className=""
```
(Or remove `className` prop entirely if there are no other classes on that element.)

- [ ] **Step 3: Fix `OrgOverview.tsx`**

**Line ~110** — `<Package>` icon with `text-gradient-dark`:
```tsx
<Package className="w-4 h-4 sm:w-5 sm:h-5 text-foreground-secondary" />
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/org/
git commit -m "feat(design): org workspace pages use monochrome tokens"
```

---

## Task 4: Dashboard, Companion, Billing Pages

All `text-gradient-dark` in coach-facing UI. Straightforward token swap throughout.

**Files:**
- Modify: `src/components/dashboard/assistant/AssistantThreadPanel.tsx` (line ~64)
- Modify: `src/components/dashboard/assistant/AssistantMessageMarkdown.tsx` (lines ~48, ~120)
- Modify: `src/components/dashboard/sub-components/ClientActionsDropdown.tsx` (line ~104)
- Modify: `src/components/dashboard/sub-components/CalendarDayDetail.tsx` (line ~171)
- Modify: `src/components/dashboard/GettingStartedChecklist.tsx` (line ~150)
- Modify: `src/components/companion/CompanionUI.tsx` (line ~404)
- Modify: `src/pages/BillingSuccess.tsx` (lines ~73, ~79)
- Modify: `src/pages/Billing.tsx` (line ~265)
- Modify: `src/pages/Settings.tsx` (lines ~566, ~571)

- [ ] **Step 1: Fix `AssistantThreadPanel.tsx`**

Line ~64: `text-gradient-dark underline underline-offset-2` → `text-foreground-secondary underline underline-offset-2`

- [ ] **Step 2: Fix `AssistantMessageMarkdown.tsx`**

Line ~48: `marker:text-gradient-dark/70` → `marker:text-foreground-tertiary`

Line ~120: `text-gradient-dark underline underline-offset-2 hover:opacity-80` → `text-foreground-secondary underline underline-offset-2 hover:opacity-80`

- [ ] **Step 3: Fix `ClientActionsDropdown.tsx`**

Line ~104: `text-gradient-dark` → `text-foreground-secondary`

- [ ] **Step 4: Fix `CalendarDayDetail.tsx`**

Line ~171: `text-gradient-dark hover:bg-primary/10 dark:hover:bg-primary/15` → `text-foreground-secondary hover:bg-muted`

- [ ] **Step 5: Fix `GettingStartedChecklist.tsx`**

Line ~150: `text-gradient-dark` → `text-foreground-secondary`

- [ ] **Step 6: Fix `CompanionUI.tsx`**

Line ~404: `text-gradient-dark underline underline-offset-2` → `text-foreground-secondary underline underline-offset-2`

- [ ] **Step 7: Fix `BillingSuccess.tsx`**

Lines ~73 and ~79: `text-gradient-dark hover:underline` → `text-foreground-secondary hover:underline`

- [ ] **Step 8: Fix `Billing.tsx`**

Line ~265: Button with `variant="link"` and `className="text-gradient-dark"` → remove the className (the link variant already applies `text-foreground`):
```tsx
<Button type="button" variant="link" onClick={() => navigate(ROUTES.DASHBOARD)}>
```

- [ ] **Step 9: Fix `Settings.tsx`**

Lines ~566 and ~571: `text-gradient-dark underline-offset-4 hover:underline` → `text-foreground-secondary underline-offset-4 hover:underline`

- [ ] **Step 10: Commit**

```bash
git add \
  src/components/dashboard/assistant/ \
  src/components/dashboard/sub-components/ClientActionsDropdown.tsx \
  src/components/dashboard/sub-components/CalendarDayDetail.tsx \
  src/components/dashboard/GettingStartedChecklist.tsx \
  src/components/companion/CompanionUI.tsx \
  src/pages/BillingSuccess.tsx \
  src/pages/Billing.tsx \
  src/pages/Settings.tsx
git commit -m "feat(design): sweep text-gradient-dark from dashboard, companion, billing pages"
```

---

## Task 5: Login Page

**Files:**
- Modify: `src/pages/Login.tsx`

The login page is split-screen (dark decorative left, light form right). The dark left panel currently uses `gradient-bg` (teal gradient). Under monochrome it becomes near-black — consistent with the landing contrast band.

- [ ] **Step 1: Fix the left decorative panel**

Line ~111. Replace `gradient-bg`:
```tsx
<div className="hidden lg:flex flex-1 bg-neutral-950 p-12 flex-col justify-center">
```

The existing `text-white` and `text-white/80` inside are correct on `bg-neutral-950`.

- [ ] **Step 2: Fix the mobile logo icon**

Line ~139. Replace `gradient-bg`:
```tsx
<div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
  <span className="text-primary-foreground font-bold">OA</span>
</div>
```

(`text-primary-foreground` = `#FFFFFF` in light mode on `bg-primary` = `#0A0A0A`. Correct.)

- [ ] **Step 3: Fix `text-gradient-dark` links**

Line ~227 and ~254. Replace `text-gradient-dark` with `text-foreground-secondary`:
```tsx
className="text-sm font-medium text-foreground-secondary transition-colors hover:opacity-80 underline underline-offset-2"
// and
className="font-medium text-foreground-secondary hover:underline"
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Login.tsx
git commit -m "feat(design): login page hero panel and links use monochrome tokens"
```

---

## Task 6: Landing Pages

**Files:**
- Modify: `src/components/landing/BuiltByExperts.tsx` (line ~33)
- Modify: `src/components/landing/HowItWorksSection.tsx` (lines ~59, ~72)
- Modify: `src/components/landing/LandingPricingPlans.tsx` (lines ~115, ~125)
- Modify: `src/components/landing/ROIComparison.tsx` (line ~110)
- Modify: `src/pages/Demo.tsx` (lines ~45–47)

- [ ] **Step 1: Fix `BuiltByExperts.tsx`**

Line ~33 has a className string with `border-gradient-medium bg-gradient-light text-on-brand-tint dark:border-primary/30 dark:bg-primary/10 dark:text-primary`. Replace the entire string with monochrome equivalents:

```tsx
'border-border bg-muted text-foreground-secondary'
```

(Remove all dark: variants — the monochrome tokens already resolve correctly in dark mode.)

- [ ] **Step 2: Fix `HowItWorksSection.tsx`**

Line ~59 — step badge:
```tsx
<span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-foreground-secondary">
```

Line ~72 — highlighted row:
```tsx
<div className="flex items-center gap-3 rounded-lg border-2 border-border bg-muted p-2.5">
```

(Remove the dark: overrides — tokens handle both modes.)

- [ ] **Step 3: Fix `LandingPricingPlans.tsx`**

Lines ~115 and ~125: `text-gradient-dark underline-offset-4 hover:underline` → `text-foreground-secondary underline-offset-4 hover:underline`

- [ ] **Step 4: Fix `ROIComparison.tsx`**

Line ~110: `border-gradient-medium/50 bg-card ... dark:border-primary/30 dark:bg-card/90` — remove the brand border:
```tsx
<GlassCard className="relative z-10 border-border bg-card p-8 shadow-md">
```

- [ ] **Step 5: Fix `Demo.tsx`**

Lines ~45–47 — the "Live demo" pill badge:
```tsx
<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5">
  <span className="h-1.5 w-1.5 rounded-full bg-foreground-secondary" />
  <span className="text-xs font-bold uppercase tracking-[0.1em] text-foreground-secondary">
```

- [ ] **Step 6: Commit**

```bash
git add src/components/landing/ src/pages/Demo.tsx
git commit -m "feat(design): landing pages use monochrome tokens, remove gradient classes"
```

---

## Task 7: Verification Grep

Confirm no gradient brand classes remain outside of the permitted report/client-portal files.

**Files:** None modified — grep only.

- [ ] **Step 1: Run the sweep check**

```bash
cd src && grep -rn "gradient-bg\|text-gradient-dark\|bg-gradient-light\|border-gradient-medium\|glass-button-active\|text-on-brand-tint" \
  --include="*.tsx" --include="*.ts" \
  . \
  | grep -v "components/reports/client/\|components/reports/MovementPostureMobility\|components/reports/LifestyleFactorsBar\|components/reports/ClientReportConstants\|lib/design\|constants/themeChrome\|components/admin\|pages/admin"
```

Expected output: **no lines** (or only lines in explicitly excluded report/client paths).

- [ ] **Step 2: If any lines appear**

Read the file, apply the same replacement pattern from the cheat sheet at the top of this plan, and commit the fix.

- [ ] **Step 3: Final commit**

```bash
git add -p  # only if Step 2 had fixes
git commit -m "fix(design): final gradient class cleanup from sweep verification"
```
