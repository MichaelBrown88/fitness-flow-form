# Design System — Monochrome + Semantic Color
**Date:** 2026-04-14
**Status:** Approved for implementation

---

## Vision

Black, white, and grey own every structural surface. Color only appears when it carries meaning. Brand identity comes from execution quality — typography, shapes, whitespace, rhythm — not from a signature hue.

Drawn from the FitMe / Dribbble fitness platform references: near-black page backgrounds, pure-white floating cards, full-pill black buttons, mixed-weight headings, almost no shadow.

---

## Semantic Color System

Each color has one job. It does only that job, everywhere in the app. If nothing needs to be communicated, the element is grey.

| Color | Hex | Single job |
|-------|-----|------------|
| Green | `#059669` | Good score (≥75), success, positive outcome, go, completed, active, positive trend, Body Comp pillar |
| Amber | `#f59e0b` | Caution, moderate score (45–74), in-progress, due-soon, trial subscription, pinned items |
| Red | `#ef4444` | Poor score (<45), danger, overdue, billing failure, stop, severe/moderate posture deviation |
| Orange | `#f97316` | Mild posture deviation only |
| Indigo | `#6366f1` | Functional Strength pillar identifier |
| Sky | `#0ea5e9` | Metabolic Fitness / Cardio pillar identifier |
| Violet | `#8b5cf6` | Movement Quality pillar identifier |
| Purple | `#a855f7` | Lifestyle Factors pillar identifier |
| Gold | `#d4a843` | Achievements, trophies, milestones unlocked, streaks |
| Blue | `#3b82f6` | Informational notifications, client activity events |
| Cyan | `#06b6d4` | Posture reference lines, comparison baselines |

### Notification color mapping

| Notification type | Color | Why |
|---|---|---|
| `assessment_complete`, `report_shared`, `roadmap_ready`, `new_client`, `client_submission`, `lifestyle_checkin`, `coach_accepted` | Blue | Client/coach activity — informational |
| `score_drop`, `reassessment_due`, `schedule_review`, `lifestyle_reminder` | Amber | Action required — attention needed |
| `subscription_past_due`, `subscription_cancelled` | Red | Billing failure — urgent |
| `phase_complete`, `account_unpaused` | Green | Positive system event |
| `pause_request`, `pause_approved`, `pause_denied`, `account_paused`, `system` | Grey | Neutral state change |

### Score thresholds (unchanged)

| Range | Color |
|-------|-------|
| ≥ 75 | Green |
| 45–74 | Amber |
| < 45 | Red |

### Posture deviation severity

| Severity | Color |
|----------|-------|
| Good | Green `#059669` |
| Mild | Orange `#f97316` |
| Moderate | Red `#ef4444` |
| Severe | Red `#ef4444` |
| Reference line | Cyan `#06b6d4` |

---

## Structural Palette

Everything that is not semantic uses only this scale. No teal, no brand gradient, no colour for decoration.

### Light mode

| Token | Value | Role |
|-------|-------|------|
| `--background` | `#F2F2F2` | Page base — lets white cards float above it |
| `--card` | `#FFFFFF` | Cards, sheets, modals |
| `--card-elevated` | `#FAFAFA` | Nested cards, inset sections |
| `--foreground` | `#0A0A0A` | Primary text, headings |
| `--foreground-secondary` | `#525252` | Body text, labels |
| `--foreground-tertiary` | `#A3A3A3` | Captions, placeholders, muted |
| `--border` | `#E5E5E5` | Card edges, dividers |
| `--border-strong` | `#D4D4D4` | Inputs, focused state borders |
| `--input` | `#F5F5F5` | Text inputs, selects |
| `--primary` | `#0A0A0A` | Button fill, focus ring |
| `--primary-foreground` | `#FFFFFF` | Text on primary buttons |
| `--muted` | `#F5F5F5` | Muted surfaces |
| `--muted-foreground` | `#A3A3A3` | Muted text |

### Dark mode

| Token | Value | Role |
|-------|-------|------|
| `--background` | `#0A0A0A` | Page base |
| `--card` | `#141414` | Cards, sheets, modals |
| `--card-elevated` | `#1C1C1C` | Nested cards, inset sections |
| `--foreground` | `#F5F5F5` | Primary text, headings |
| `--foreground-secondary` | `#A3A3A3` | Body text, labels |
| `--foreground-tertiary` | `#737373` | Captions, placeholders, muted |
| `--border` | `#262626` | Card edges, dividers |
| `--border-strong` | `#333333` | Inputs, focused state borders |
| `--input` | `#1C1C1C` | Text inputs, selects |
| `--primary` | `#F5F5F5` | Button fill, focus ring |
| `--primary-foreground` | `#0A0A0A` | Text on primary buttons |
| `--muted` | `#1C1C1C` | Muted surfaces |
| `--muted-foreground` | `#737373` | Muted text |

### Gradient tokens (removed as structural)

`--gradient-from`, `--gradient-to`, `--gradient-from-hex`, `--gradient-to-hex`, `--gradient-light`, `--gradient-medium`, `--gradient-dark` — these tokens are removed from structural use. They remain available in `gradients.ts` for the org custom branding system (coach-facing reports and client portal only, where a coach may apply their brand colour to client-facing surfaces).

---

## Component Anatomy

### Buttons

Shape: full pill — `border-radius: 9999px`. Matches the "Get a Plan", "Continue", "Download App" buttons from the reference designs.

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| Primary | `#0A0A0A` (light) / `#F5F5F5` (dark) | `#FFFFFF` / `#0A0A0A` | none |
| Secondary | transparent | `#0A0A0A` / `#F5F5F5` | `1px solid #E5E5E5` / `#333333` |
| Destructive | `#ef4444` | `#FFFFFF` | none |
| Ghost | transparent | `#525252` | none |

Sizing:

| Size | Height | Padding H | Font size | Weight |
|------|--------|-----------|-----------|--------|
| `sm` | 32px | 16px | 13px | 600 |
| `md` | 44px | 20px | 14px | 700 |
| `lg` | 52px | 28px | 15px | 700 |

Hover: primary darkens to `#1A1A1A` (light) / `#E5E5E5` (dark). No transform effects.

### Cards

| Property | Value |
|----------|-------|
| Border radius | `20px` |
| Background | `#FFFFFF` (light) / `#141414` (dark) |
| Border | `1px solid #E5E5E5` (light) / `1px solid #262626` (dark) |
| Shadow | `0 1px 3px rgba(0,0,0,0.06)` only — cards float via background contrast, not shadow |
| Padding default | `24px` |
| Padding compact | `16px` |

Elevated cards (nested content): `#FAFAFA` / `#1C1C1C`, same radius and border.

### Inputs

| Property | Value |
|----------|-------|
| Border radius | `14px` |
| Background | `#F5F5F5` (light) / `#1C1C1C` (dark) |
| Border rest | none |
| Border focus | `1px solid #0A0A0A` (light) / `1px solid #F5F5F5` (dark) |
| Height | `44px` |
| Font size | `14px` |
| Padding H | `16px` |

### Badges / chips

| Variant | Use |
|---------|-----|
| Semantic green/amber/red | Score grades, status indicators |
| Gold | Achievement unlocks |
| Neutral (grey) | Tags, filters, neutral labels |

Border radius: `9999px` (pill). No decorative brand-coloured badges.

---

## Typography

Font stays DM Sans. The visual change is the **mixed-weight heading** pattern from the references.

**Mixed-weight headings:** pair a light-grey word with a bold-black word to create hierarchy within a single heading line. Implemented as `<span>` inside heading tags — not a new component.

```tsx
// Example
<h1>
  <span className="font-light text-foreground-tertiary">Assess </span>
  <span className="font-extrabold text-foreground">Smarter.</span>
</h1>
```

| Scale | Size | Weight | Tracking |
|-------|------|--------|----------|
| Display | `48px+` | 800 (bold word) / 300 (grey word) | `-0.03em` |
| H1 | `32px` | 800 | `-0.02em` |
| H2 | `24px` | 700 | `-0.02em` |
| H3 | `18px` | 600 | `-0.01em` |
| Body | `14px` | 400 | `0` |
| Caption | `12px` | 500 | `0.01em` |

---

## Shadow System

Almost none. Cards float because the background (`#F2F2F2`) and surface (`#FFFFFF`) contrast does the work.

| Token | Value | When to use |
|-------|-------|-------------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.06)` | Cards, sheets |
| `--shadow-colored` | removed | No longer used |
| `--shadow-md/lg/xl` | removed from card usage | Reserved for modals/popovers only |

---

## Removed Tokens

These tokens are removed from the structural system and must not be used for chrome, layout, or navigation:

- `--gradient-from`, `--gradient-to` (structural use)
- `--gradient-from-hex`, `--gradient-to-hex` (structural use)
- `--gradient-light`, `--gradient-medium`, `--gradient-dark`
- `--brand-primary-transparent`
- `--sidebar-primary` (replaces with `--primary`)
- `--shadow-colored`

Retained only in `gradients.ts` / ThemeManager for org custom branding on client-facing surfaces.

---

## Org Custom Branding

Coaches can set a custom brand colour in Settings. Under this system:

- The coach workspace (sidebar, dashboard, assessments) stays monochrome regardless of org branding settings
- The custom brand colour applies only to client-facing surfaces: client portal, shared reports, exported PDFs
- This preserves the clean professional tool aesthetic for coaches while allowing personalisation on client touchpoints

---

## Landing Page Contrast Band

The landing page has a dark section (currently using `--landing-contrast-*` tokens) that renders a dark background against the otherwise light page — same pattern as the FitMe reference (the rounded dark section with the athlete photo).

Under this system that section uses the dark mode structural palette directly:

| Token | Value |
|-------|-------|
| `--landing-contrast-bg` | `#0A0A0A` |
| `--landing-contrast-surface` | `#141414` |
| `--landing-contrast-surface-elevated` | `#1C1C1C` |
| `--landing-contrast-border` | `#262626` |
| `--landing-contrast-fg` | `#F5F5F5` |
| `--landing-contrast-muted` | `#737373` |

No teal tinting. Pure near-black, consistent with the monochrome system.

---

## What Does Not Change

| Item | Why |
|------|-----|
| Semantic score colors (green/amber/red hex values) | Already correct — `#059669`, `#f59e0b`, `#ef4444` |
| Pillar chart colors | Locked per pillar identifier system above |
| Posture deviation line colors | Locked per severity system above |
| DM Sans font | Already in use, works for both light/heavy weights |
| Border radius scale (`--radius-*` tokens) | Card/button radius overrides this — tokens stay for other elements |

---

## Definition of Done

- [ ] `src/index.css` updated: structural tokens replaced with monochrome scale, gradient tokens removed from structural use
- [ ] `src/lib/design/gradients.ts` updated: gradient system scoped to org branding only
- [ ] `src/components/ui/button.tsx` updated: pill shape, monochrome variants
- [ ] `src/components/ui/card.tsx` updated: `20px` radius, `1px` border, `shadow-sm` only
- [ ] `src/components/ui/input.tsx` updated: `14px` radius, filled background, focus border
- [ ] `src/components/ui/badge.tsx` updated: pill shape, semantic variants only
- [ ] ThemeManager scoped to client-facing surfaces only
- [ ] Both light and dark mode verified in browser
- [ ] No decorative brand-colour usage remaining in coach workspace
