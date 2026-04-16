# Brand Recolor — Jewel Teal + Deep Forest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pear (`#bcff00`) accent and rich black (`#061414`) dark background with Jewel Teal (`#0da899`) and Deep Forest (`#0c1f1a`) across 6 source files, then document the final system in `DESIGN.md`.

**Architecture:** Pure token swap — no logic changes, no new components. All brand colour references flow through CSS custom properties in `src/index.css`, with a few hardcoded hex fallbacks in design utilities and canvas renderers. Update CSS tokens first so the visual result is immediately testable, then sweep the hardcoded fallbacks, then write `DESIGN.md`.

**Tech Stack:** React + TypeScript + Vite, Tailwind CSS v4 (custom CSS variables in `@layer base`), Firebase hosting.

---

## File Map

| File | Change |
|------|--------|
| `src/index.css` | Swap ~26 CSS variable values in `:root`, `.dark`, landing contrast band, and `@utility hero` |
| `src/lib/design/gradients.ts` | Rename `pear` entry → `jewel-teal`, update hex values, `GradientId` type, `getGradient()` default |
| `src/lib/design/brandTokens.ts` | Update `safeHex` fallback `'#bcff00'` → `'#0da899'` and fix comments |
| `src/pages/Settings.tsx` | Replace 4 occurrences of `'#bcff00'` with `'#0da899'` in color picker fallbacks |
| `src/lib/posture/postureWireframeRenderer.ts` | Default `backgroundColor` parameter `'#1a1a2e'` → `'#0c1f1a'` |
| `src/components/dashboard/artifacts/ArtifactGridCard.tsx` | 3 hardcoded dark hex backgrounds → forest equivalents |
| `DESIGN.md` | New file — document the complete design system for future decisions |

---

## Task 1: CSS tokens — `:root` (light mode accent + ring)

**Files:**
- Modify: `src/index.css` (`:root` block, lines ~597–706)

These are the pear-specific variables in light mode. They control button fills, gradient text, badge tints, and focus rings. The light mode background surfaces (`--background`, `--card`, etc.) stay warm — that contrast is intentional.

- [ ] **Step 1: Update gradient and primary tokens in `:root`**

Find the "Accent / Primary — Pear" comment block (around line 596) and replace the nine variable values:

```css
/* OLD */
--gradient-from: 76 100% 50%;          /* #bcff00 pear */
--gradient-to: 78 100% 44%;
--gradient-from-hex: #bcff00;
--gradient-to-hex: #a8e600;
--gradient-light: 76 80% 92%;
--gradient-medium: 76 70% 84%;
--gradient-dark: 76 70% 22%;           /* deep olive-green for text-on-light — legible on ceiling white */
...
--primary-foreground: 180 55% 5%;      /* rich black on pear */
...
--ring: 76 100% 38%;

/* NEW */
--gradient-from: 174 86% 36%;          /* #0da899 jewel teal */
--gradient-to: 174 86% 30%;
--gradient-from-hex: #0da899;
--gradient-to-hex: #0b8e82;
--gradient-light: 174 50% 92%;
--gradient-medium: 174 50% 84%;
--gradient-dark: 174 60% 22%;          /* dark teal for text-on-light — ~7:1 on ceiling white */
...
--primary-foreground: 165 45% 9%;      /* deep forest on teal */
...
--ring: 174 86% 36%;
```

Also update `--shadow-colored` in the Shadows section and `--sidebar-primary` / `--sidebar-ring` in the Sidebar section:

```css
/* OLD */
--shadow-colored: 0 8px 24px -4px hsl(76 100% 50% / 0.22);
...
--sidebar-primary: 76 100% 50%;
...
--sidebar-ring: 76 100% 38%;

/* NEW */
--shadow-colored: 0 8px 24px -4px hsl(174 86% 36% / 0.22);
...
--sidebar-primary: 174 86% 36%;
...
--sidebar-ring: 174 86% 36%;
```

- [ ] **Step 2: Update the design system comment header**

At the top of the `@layer base` block (around line 565), update the comments:

```css
/* OLD */
Dark mode first. Rich black base (#061414). Pear accent (#bcff00).
...
pear #bcff00 · rich black #061414 · laurel leaf #96998c

/* NEW */
Dark mode first. Deep forest base (#0c1f1a). Jewel Teal accent (#0da899).
...
jewel-teal #0da899 · deep forest #0c1f1a · laurel leaf #96998c
```

Also update the `--gradient-dark` comment and the `--primary-foreground` comment to reference teal instead of pear/olive.

- [ ] **Step 3: Verify the build compiles**

```bash
cd "/Users/michael/Apps in Development/fitness-flow-form" && npm run build 2>&1 | tail -20
```

Expected: build succeeds, no CSS parse errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/michael/Apps in Development/fitness-flow-form"
git add src/index.css
git commit -m "style: swap pear → jewel-teal tokens in :root (light mode)"
```

---

## Task 2: CSS tokens — `.dark` (dark mode backgrounds + accent)

**Files:**
- Modify: `src/index.css` (`.dark` block, lines ~728–820)

This block controls the entire dark mode — backgrounds shift from rich black (hue 180) to deep forest (hue 165), and the pear gradient vars change to teal.

- [ ] **Step 1: Update background and surface tokens**

Find the `/* Rich black base */` comment and replace the background/surface/card/popover variables:

```css
/* OLD */
--background: 180 55% 5%;              /* #061414 rich black */
--background-secondary: 180 35% 7%;
--background-tertiary: 180 25% 10%;
...
--card: 180 35% 7%;
--card-elevated: 180 25% 9%;
--card-subtle: 180 40% 6%;
...
--popover: 180 35% 7%;

/* NEW */
--background: 165 45% 9%;              /* #0c1f1a deep forest */
--background-secondary: 165 35% 11%;
--background-tertiary: 165 25% 14%;
...
--card: 165 35% 11%;
--card-elevated: 165 25% 13%;
--card-subtle: 165 40% 8%;
...
--popover: 165 35% 11%;
```

- [ ] **Step 2: Update gradient, primary, muted, accent, border, and input tokens**

```css
/* OLD */
--gradient-from: 76 100% 50%;          /* #bcff00 pear */
--gradient-to: 78 100% 44%;
--gradient-from-hex: #bcff00;
--gradient-to-hex: #a8e600;
--gradient-light: 76 50% 9%;
--gradient-medium: 76 55% 14%;
--gradient-dark: 76 100% 65%;
...
--primary-foreground: 180 55% 5%;
...
--muted: 180 20% 9%;
...
--accent: 180 20% 10%;
...
--border: 180 20% 13%;
--border-medium: 180 15% 18%;
--border-dark: 180 12% 24%;
--input: 180 20% 11%;
--ring: 76 100% 50%;

/* NEW */
--gradient-from: 174 86% 36%;          /* #0da899 jewel teal */
--gradient-to: 174 86% 30%;
--gradient-from-hex: #0da899;
--gradient-to-hex: #0b8e82;
--gradient-light: 174 40% 9%;          /* dark teal surface tint */
--gradient-medium: 174 40% 14%;
--gradient-dark: 174 70% 65%;          /* bright teal for text-on-dark */
...
--primary-foreground: 165 45% 9%;
...
--muted: 165 20% 11%;
...
--accent: 165 20% 12%;
...
--border: 165 20% 15%;
--border-medium: 165 15% 20%;
--border-dark: 165 12% 26%;
--input: 165 20% 13%;
--ring: 174 86% 36%;
```

- [ ] **Step 3: Update shadow and sidebar tokens**

```css
/* OLD */
--shadow-sm: 0 1px 2px 0 hsl(20 4% 2% / 0.50);
--shadow-md: 0 4px 12px -2px hsl(20 4% 2% / 0.55);
--shadow-lg: 0 12px 28px -4px hsl(20 4% 2% / 0.60);
--shadow-xl: 0 22px 40px -8px hsl(20 4% 2% / 0.65);
--shadow-colored: 0 10px 30px -6px hsl(76 100% 50% / 0.15);
...
--sidebar-background: 180 50% 4%;
...
--sidebar-primary: 76 100% 50%;
...
--sidebar-ring: 76 100% 50%;

/* NEW */
--shadow-sm: 0 1px 2px 0 hsl(165 30% 2% / 0.50);
--shadow-md: 0 4px 12px -2px hsl(165 30% 2% / 0.55);
--shadow-lg: 0 12px 28px -4px hsl(165 30% 2% / 0.60);
--shadow-xl: 0 22px 40px -8px hsl(165 30% 2% / 0.65);
--shadow-colored: 0 10px 30px -6px hsl(174 86% 36% / 0.15);
...
--sidebar-background: 165 45% 6%;
...
--sidebar-primary: 174 86% 36%;
...
--sidebar-ring: 174 86% 36%;
```

Also update the block comment from `/* Rich black base — pear accent carries all the energy */` to `/* Deep forest base — jewel teal accent carries all the energy */`.

- [ ] **Step 4: Verify build**

```bash
cd "/Users/michael/Apps in Development/fitness-flow-form" && npm run build 2>&1 | tail -20
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
cd "/Users/michael/Apps in Development/fitness-flow-form"
git add src/index.css
git commit -m "style: swap pear → jewel-teal tokens in .dark (dark mode)"
```

---

## Task 3: CSS tokens — landing contrast band + hero gradient

**Files:**
- Modify: `src/index.css` (landing contrast section in `:root`, `@utility hero` block)

The landing contrast band uses the dark background colours (it simulates dark mode on the otherwise-light marketing page). The `@utility hero` has hardcoded warm terracotta gradients that need to shift to forest-tinted.

- [ ] **Step 1: Update landing contrast variables (in `:root`)**

Find the `/* ── Landing contrast band ──` comment and update four variables:

```css
/* OLD */
--landing-contrast-bg: 180 55% 5%;    /* rich black */
...
--landing-contrast-border: 180 25% 13%;
--landing-contrast-surface: 180 35% 7%;
--landing-contrast-surface-elevated: 180 25% 10%;

/* NEW */
--landing-contrast-bg: 165 45% 9%;    /* deep forest */
...
--landing-contrast-border: 165 25% 15%;
--landing-contrast-surface: 165 35% 11%;
--landing-contrast-surface-elevated: 165 25% 14%;
```

- [ ] **Step 2: Update `@utility hero` background gradient**

Find the `@utility hero {` block (around line 398) and replace the background/color values:

```css
/* OLD */
@utility hero {
  /* ── Landing hero ───────────────────────────────────────── */
  background:
    radial-gradient(
      900px 420px at 20% -120px,
      hsl(21 52% 55% / 0.1),
      transparent 60%
    ),
    radial-gradient(
      800px 520px at 110% -80px,
      hsl(30 10% 8% / 0.8),
      transparent 55%
    ),
    linear-gradient(
      180deg,
      hsl(30 15% 5%) 0%,
      hsl(30 13% 7%) 60%,
      transparent 100%
    );
  color: hsl(37 29% 94%);
}

/* NEW */
@utility hero {
  /* ── Landing hero ───────────────────────────────────────── */
  background:
    radial-gradient(
      900px 420px at 20% -120px,
      hsl(174 50% 40% / 0.08),
      transparent 60%
    ),
    radial-gradient(
      800px 520px at 110% -80px,
      hsl(165 20% 8% / 0.8),
      transparent 55%
    ),
    linear-gradient(
      180deg,
      hsl(165 35% 6%) 0%,
      hsl(165 25% 8%) 60%,
      transparent 100%
    );
  color: hsl(76 14% 91%);  /* ceiling white — unchanged */
}
```

- [ ] **Step 3: Verify build**

```bash
cd "/Users/michael/Apps in Development/fitness-flow-form" && npm run build 2>&1 | tail -20
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
cd "/Users/michael/Apps in Development/fitness-flow-form"
git add src/index.css
git commit -m "style: update landing contrast band and hero gradient to deep forest"
```

---

## Task 4: `gradients.ts` — rename pear entry, update type + default

**Files:**
- Modify: `src/lib/design/gradients.ts`

`GRADIENT_PALETTE` is a record keyed by `GradientId`. The `pear` key is the app's default gradient — it drives the org branding picker in Settings and the ThemeManager. Rename it to `jewel-teal` everywhere in this file. Other palette entries (terracotta, volt, etc.) are user-selectable org branding and must not change.

- [ ] **Step 1: Update `GradientId` union type**

Around line 7–8, change:

```ts
// OLD
export type GradientId =
  | 'pear'             // Default: #bcff00 pear — One Assess brand

// NEW
export type GradientId =
  | 'jewel-teal'       // Default: #0da899 jewel teal — One Assess brand
```

- [ ] **Step 2: Rename the `pear` palette entry and update its values**

Around line 37–47, replace the entire `pear` object:

```ts
// OLD
pear: {
  id: 'pear',
  name: 'Pear',
  from: 'lime-400',
  to: 'lime-500',
  fromHex: '#bcff00',
  toHex: '#a8e600',
  light: 'lime-50',
  medium: 'lime-100',
  dark: 'lime-700',
},

// NEW
'jewel-teal': {
  id: 'jewel-teal',
  name: 'Jewel Teal',
  from: 'teal-500',
  to: 'teal-600',
  fromHex: '#0da899',
  toHex: '#0b8e82',
  light: 'teal-50',
  medium: 'teal-100',
  dark: 'teal-800',
},
```

- [ ] **Step 3: Update `getGradient()` default and fallback**

Around line 163–164, change:

```ts
// OLD
export function getGradient(id: GradientId = 'pear'): GradientDefinition {
  return GRADIENT_PALETTE[id] || GRADIENT_PALETTE.pear;

// NEW
export function getGradient(id: GradientId = 'jewel-teal'): GradientDefinition {
  return GRADIENT_PALETTE[id] || GRADIENT_PALETTE['jewel-teal'];
```

- [ ] **Step 4: Check for any remaining `'pear'` references in this file**

```bash
grep -n "pear" "/Users/michael/Apps in Development/fitness-flow-form/src/lib/design/gradients.ts"
```

Expected: no matches (all removed in previous steps).

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd "/Users/michael/Apps in Development/fitness-flow-form" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. If `'pear'` is referenced as a `GradientId` elsewhere, TypeScript will catch it here — fix those before committing.

- [ ] **Step 6: Commit**

```bash
cd "/Users/michael/Apps in Development/fitness-flow-form"
git add src/lib/design/gradients.ts
git commit -m "style: rename pear → jewel-teal in gradient palette"
```

---

## Task 5: `brandTokens.ts` — update safeHex fallback

**Files:**
- Modify: `src/lib/design/brandTokens.ts`

`brandTokens.ts` computes dynamic CSS tokens for org custom branding. Line 158 has a regex-validated fallback hex — if an org's stored `brandHex` is malformed, this default is used. Update it from pear to teal. The `CHARCOAL_HEX` constant on line 42 stays — it's used for WCAG math on user-chosen brand colours, not the default brand.

- [ ] **Step 1: Update `safeHex` fallback on line 158**

```ts
// OLD
const safeHex = /^#[0-9a-fA-F]{6}$/.test(brandHex) ? brandHex : '#bcff00';

// NEW
const safeHex = /^#[0-9a-fA-F]{6}$/.test(brandHex) ? brandHex : '#0da899';
```

- [ ] **Step 2: Update comments that reference volt/pear**

Around lines 9–19, the file header comment gives contrast examples. Update the example references from `volt (#bcff00)` to teal:

```ts
// OLD (around line 9)
 * Bright neon colours (volt, pear) CAN work in light mode — you just flip
...
 * e.g. volt (#bcff00) → charcoal   |   navy → white

// NEW
 * Bright neon colours (volt, pear) worked on dark; jewel teal works on both.
...
 * e.g. teal (#0da899) → charcoal   |   navy → white
```

- [ ] **Step 3: Verify build**

```bash
cd "/Users/michael/Apps in Development/fitness-flow-form" && npm run build 2>&1 | tail -10
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
cd "/Users/michael/Apps in Development/fitness-flow-form"
git add src/lib/design/brandTokens.ts
git commit -m "style: update brandTokens safeHex fallback to jewel-teal"
```

---

## Task 6: `Settings.tsx` — replace color picker fallbacks

**Files:**
- Modify: `src/pages/Settings.tsx` (lines 600, 601, 654, 658)

The Settings page has a brand colour picker with inline validation. When `localBrandHex` fails the `#RRGGBB` regex, a fallback hex is used as the displayed colour and the `<input type="color">` value. These four occurrences all need to change from `'#bcff00'` to `'#0da899'`.

- [ ] **Step 1: Replace all four occurrences**

Run a targeted replacement for all four instances on lines 600, 601, 654, 658:

Line 600 — color swatch background:
```tsx
// OLD
style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(localBrandHex) ? localBrandHex : '#bcff00' }}

// NEW
style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(localBrandHex) ? localBrandHex : '#0da899' }}
```

Line 601 — color input value:
```tsx
// OLD
value={/^#[0-9a-fA-F]{6}$/.test(localBrandHex) ? localBrandHex : '#bcff00'}

// NEW
value={/^#[0-9a-fA-F]{6}$/.test(localBrandHex) ? localBrandHex : '#0da899'}
```

Line 654 — second color swatch (duplicate picker section):
```tsx
// OLD
style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(localBrandHex) ? localBrandHex : '#bcff00' }}

// NEW
style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(localBrandHex) ? localBrandHex : '#0da899' }}
```

Line 658 — second color input value:
```tsx
// OLD
value={/^#[0-9a-fA-F]{6}$/.test(localBrandHex) ? localBrandHex : '#bcff00'}

// NEW
value={/^#[0-9a-fA-F]{6}$/.test(localBrandHex) ? localBrandHex : '#0da899'}
```

- [ ] **Step 2: Verify no remaining `#bcff00` in Settings.tsx**

```bash
grep -n "bcff00" "/Users/michael/Apps in Development/fitness-flow-form/src/pages/Settings.tsx"
```

Expected: no matches.

- [ ] **Step 3: Verify build**

```bash
cd "/Users/michael/Apps in Development/fitness-flow-form" && npm run build 2>&1 | tail -10
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
cd "/Users/michael/Apps in Development/fitness-flow-form"
git add src/pages/Settings.tsx
git commit -m "style: update color picker fallback from pear to jewel-teal in Settings"
```

---

## Task 7: `postureWireframeRenderer.ts` — update canvas background default

**Files:**
- Modify: `src/lib/posture/postureWireframeRenderer.ts` (line 666)

The wireframe renderer draws posture skeleton canvases. The `backgroundColor` default parameter was the old navy `#1a1a2e`. Replace with deep forest `#0c1f1a` for brand consistency on exported posture images.

- [ ] **Step 1: Update the default parameter on line 666**

```ts
// OLD
    backgroundColor = '#1a1a2e',

// NEW
    backgroundColor = '#0c1f1a',
```

- [ ] **Step 2: Verify build**

```bash
cd "/Users/michael/Apps in Development/fitness-flow-form" && npm run build 2>&1 | tail -10
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd "/Users/michael/Apps in Development/fitness-flow-form"
git add src/lib/posture/postureWireframeRenderer.ts
git commit -m "style: update wireframe canvas default background to deep forest"
```

---

## Task 8: `ArtifactGridCard.tsx` — update social card backgrounds

**Files:**
- Modify: `src/components/dashboard/artifacts/ArtifactGridCard.tsx` (lines 82, 99, 140)

Social share card canvases use hardcoded navy/dark-slate hex values. Matching the brand dark creates consistency between in-app preview and shared content.

- [ ] **Step 1: Update the three background values**

Line 82 — outer card wrapper (loading state and container):
```tsx
// OLD
<div style={{ width: POST_W, height: POST_W, background: '#0f172a', overflow: 'hidden' }}>

// NEW
<div style={{ width: POST_W, height: POST_W, background: '#0c1f1a', overflow: 'hidden' }}>
```

Line 99 — clickable card block:
```tsx
// OLD
style={{ background: '#0f172a', display: 'block', width: POST_W }}

// NEW
style={{ background: '#0c1f1a', display: 'block', width: POST_W }}
```

Line 140 — caption band at bottom of card:
```tsx
// OLD
style={{ height: POST_H - POST_W, background: '#070d18' }}

// NEW
style={{ height: POST_H - POST_W, background: '#081510' }}
```

Note: `#081510` is deep forest darkened (same depth relationship as the old `#070d18` was to `#0f172a`).

- [ ] **Step 2: Verify no remaining old dark hex values**

```bash
grep -n "0f172a\|070d18" "/Users/michael/Apps in Development/fitness-flow-form/src/components/dashboard/artifacts/ArtifactGridCard.tsx"
```

Expected: no matches.

- [ ] **Step 3: Verify build**

```bash
cd "/Users/michael/Apps in Development/fitness-flow-form" && npm run build 2>&1 | tail -10
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
cd "/Users/michael/Apps in Development/fitness-flow-form"
git add src/components/dashboard/artifacts/ArtifactGridCard.tsx
git commit -m "style: update social card canvas backgrounds to deep forest"
```

---

## Task 9: Create `DESIGN.md`

**Files:**
- Create: `DESIGN.md` (project root)

Document the final design system so future decisions have a reference. Include the complete token table, the warm/cool intentional contrast rationale, and what must not change.

- [ ] **Step 1: Create `DESIGN.md`**

```markdown
# One Assess — Design System

## Palette

| Role | Token | Value | Hex |
|------|-------|-------|-----|
| Brand accent | `--gradient-from` | `174 86% 36%` | `#0da899` Jewel Teal |
| Brand accent dark | `--gradient-to` | `174 86% 30%` | `#0b8e82` |
| Dark background | `--background` (dark) | `165 45% 9%` | `#0c1f1a` Deep Forest |
| Light background | `--background` (light) | `76 14% 91%` | `#e9ebe6` Ceiling White |
| Body text (light) | `--foreground` (light) | `180 55% 5%` | `#061414` Rich Black |
| Accent text on light | `--gradient-dark` (light) | `174 60% 22%` | dark teal ~7:1 on ceiling white |
| Button text on teal | `--primary-foreground` | `165 45% 9%` | `#0c1f1a` Deep Forest — 5.82:1 WCAG AA |

## Design Rationale

Warm light mode surfaces (Ceiling White `#e9ebe6`, Celeste, Laurel Leaf) paired with a cool teal accent is intentional. The warm/cool tension creates energy and makes the accent pop harder than a neutral-on-neutral pairing. Do not "fix" this by warming up the teal or cooling down the surfaces.

**Why Jewel Teal over the old Pear (`#bcff00`):**
- Pear fails on light mode: too neon for fills, ~1.3:1 contrast as text on white — WCAG fail.
- Jewel Teal `#0da899` works on both surfaces:
  - On Deep Forest (dark): 4.3:1 against `#0c1f1a`
  - On Ceiling White (light): dark teal `hsl(174 60% 22%)` gives ~7:1 as text — WCAG AAA
  - As button fill on both: deep forest text on teal = 5.82:1 — WCAG AA pass

## What Must Not Change

| Location | Color | Reason |
|----------|-------|--------|
| `Login.tsx`, `AccountCreationStep.tsx` | `#4285F4` `#34A853` `#FBBC05` `#EA4335` | Google brand — vendor spec |
| `PillarScoreCard.tsx`, `PillarStoryCard.tsx` | `#22c55e` `#ef4444` | Semantic score delta (positive/negative) |
| `useClientReportData.ts` | `#3b82f6` | Chart data series — not brand |
| Admin dashboard files | `#334155` `#64748b` `#10b981` etc. | Admin-only data viz — separate system |

## CSS Token Reference — Light Mode (`:root`)

```css
--gradient-from: 174 86% 36%;        /* #0da899 jewel teal */
--gradient-to: 174 86% 30%;
--gradient-from-hex: #0da899;
--gradient-to-hex: #0b8e82;
--gradient-light: 174 50% 92%;       /* teal surface tint */
--gradient-medium: 174 50% 84%;
--gradient-dark: 174 60% 22%;        /* dark teal for text-on-light */
--primary-foreground: 165 45% 9%;    /* deep forest on teal buttons */
--ring: 174 86% 36%;
--shadow-colored: 0 8px 24px -4px hsl(174 86% 36% / 0.22);
--sidebar-primary: 174 86% 36%;
--sidebar-ring: 174 86% 36%;
--landing-contrast-bg: 165 45% 9%;
--landing-contrast-surface: 165 35% 11%;
--landing-contrast-surface-elevated: 165 25% 14%;
--landing-contrast-border: 165 25% 15%;
```

## CSS Token Reference — Dark Mode (`.dark`)

```css
--background: 165 45% 9%;            /* #0c1f1a deep forest */
--background-secondary: 165 35% 11%;
--background-tertiary: 165 25% 14%;
--card: 165 35% 11%;
--card-elevated: 165 25% 13%;
--card-subtle: 165 40% 8%;
--popover: 165 35% 11%;
--gradient-from: 174 86% 36%;        /* #0da899 jewel teal */
--gradient-to: 174 86% 30%;
--gradient-from-hex: #0da899;
--gradient-to-hex: #0b8e82;
--gradient-light: 174 40% 9%;
--gradient-medium: 174 40% 14%;
--gradient-dark: 174 70% 65%;        /* bright teal for text-on-dark */
--primary-foreground: 165 45% 9%;
--muted: 165 20% 11%;
--accent: 165 20% 12%;
--border: 165 20% 15%;
--border-medium: 165 15% 20%;
--border-dark: 165 12% 26%;
--input: 165 20% 13%;
--ring: 174 86% 36%;
--shadow-sm: 0 1px 2px 0 hsl(165 30% 2% / 0.50);
--shadow-md: 0 4px 12px -2px hsl(165 30% 2% / 0.55);
--shadow-lg: 0 12px 28px -4px hsl(165 30% 2% / 0.60);
--shadow-xl: 0 22px 40px -8px hsl(165 30% 2% / 0.65);
--shadow-colored: 0 10px 30px -6px hsl(174 86% 36% / 0.15);
--sidebar-background: 165 45% 6%;
--sidebar-primary: 174 86% 36%;
--sidebar-ring: 174 86% 36%;
```
```

- [ ] **Step 2: Verify the final state — no orphaned pear/black hex values**

```bash
grep -rn "bcff00\|a8e600\|061414" \
  "/Users/michael/Apps in Development/fitness-flow-form/src" \
  "/Users/michael/Apps in Development/fitness-flow-form/functions/src" \
  2>/dev/null | grep -v "node_modules" | grep -v "\.d\.ts"
```

Expected: zero matches outside admin/vendor/semantic exceptions (see DESIGN.md "What Must Not Change" table). If any hits remain, fix them before committing.

- [ ] **Step 3: Commit `DESIGN.md`**

```bash
cd "/Users/michael/Apps in Development/fitness-flow-form"
git add DESIGN.md
git commit -m "docs: add DESIGN.md — jewel teal design system reference"
```

---

## Definition of Done

- [ ] `npm run build` passes clean (no errors, no warnings about unknown CSS properties)
- [ ] `npx tsc --noEmit` passes clean
- [ ] `grep -rn "bcff00\|a8e600" src/` returns zero matches
- [ ] Both light and dark mode checked visually in the browser at `:8080` (or Vite dev server)
- [ ] `DESIGN.md` exists in project root with full token reference
- [ ] Seven commits, one per file changed (as above)
