# Brand Recolor — Jewel Teal + Deep Forest
**Date:** 2026-04-14  
**Status:** Approved for implementation

---

## Decision

Replace the pear (`#bcff00`) accent and rich black (`#061414`) dark background with:

| Role | Old | New |
|------|-----|-----|
| Brand accent (primary) | `#bcff00` pear | `#0da899` Jewel Teal |
| Dark mode background | `#061414` rich black | `#0c1f1a` Deep Forest |
| Button text on accent | `#061414` (dark on neon) | `#0c1f1a` (dark forest) |
| Accent-as-text on light | `hsl(76 70% 22%)` dark olive | `hsl(174 60% 22%)` dark teal |
| Light mode surfaces | `#e9ebe6` ceiling white (warm) | **unchanged** — warm/cool contrast is intentional |

---

## Design Rationale

Pear fails on light mode: it's too neon for fills and fails WCAG contrast as text. Jewel Teal works on both surfaces:
- **On deep forest (dark):** `#0da899` is visible and energetic, 4.3:1 against `#0c1f1a`
- **On ceiling white (light):** `hsl(174 60% 22%)` dark teal gives ~7:1 contrast as link/label text
- **As a button fill on both:** dark forest text (`#0c1f1a`) on teal gives 5.82:1 — WCAG AA pass

Warm light surfaces + cool teal accent is intentional. The contrast creates energy and makes the accent pop harder than a neutral-on-neutral pairing.

---

## Files to Change

### 1. `src/index.css` — Token swap (primary change)

**CSS variables to update in `:root` (light mode):**

| Variable | Old value | New value |
|----------|-----------|-----------|
| `--gradient-from` | `76 100% 50%` | `174 86% 36%` |
| `--gradient-to` | `78 100% 44%` | `174 86% 30%` |
| `--gradient-from-hex` | `#bcff00` | `#0da899` |
| `--gradient-to-hex` | `#a8e600` | `#0b8e82` |
| `--gradient-light` | `76 80% 92%` | `174 50% 92%` |
| `--gradient-medium` | `76 70% 84%` | `174 50% 84%` |
| `--gradient-dark` | `76 70% 22%` | `174 60% 22%` |
| `--primary-foreground` | `180 55% 5%` | `165 45% 9%` |
| `--brand-primary` | `var(--gradient-from-hex)` | *(no change — references hex var)* |
| `--ring` | `76 100% 38%` | `174 86% 36%` |

**CSS variables to update in `.dark` (dark mode):**

| Variable | Old value | New value |
|----------|-----------|-----------|
| `--background` | `180 55% 5%` | `165 45% 9%` |
| `--background-secondary` | `180 35% 7%` | `165 35% 11%` |
| `--background-tertiary` | `180 25% 10%` | `165 25% 14%` |
| `--card` | `180 35% 7%` | `165 35% 11%` |
| `--card-elevated` | `180 25% 9%` | `165 25% 13%` |
| `--card-subtle` | `180 40% 6%` | `165 40% 8%` |
| `--popover` | `180 35% 7%` | `165 35% 11%` |
| `--gradient-from` | `76 100% 50%` | `174 86% 36%` |
| `--gradient-to` | `78 100% 44%` | `174 86% 30%` |
| `--gradient-from-hex` | `#bcff00` | `#0da899` |
| `--gradient-to-hex` | `#a8e600` | `#0b8e82` |
| `--gradient-light` | `76 50% 9%` | `174 40% 9%` |
| `--gradient-medium` | `76 55% 14%` | `174 40% 14%` |
| `--gradient-dark` | `76 100% 65%` | `174 70% 65%` |
| `--primary-foreground` | `180 55% 5%` | `165 45% 9%` |
| `--muted` | `180 20% 9%` | `165 20% 11%` |
| `--accent` | `180 20% 10%` | `165 20% 12%` |
| `--border` | `180 20% 13%` | `165 20% 15%` |
| `--border-medium` | `180 15% 18%` | `165 15% 20%` |
| `--border-dark` | `180 12% 24%` | `165 12% 26%` |
| `--input` | `180 20% 11%` | `165 20% 13%` |
| `--ring` | `76 100% 50%` | `174 86% 36%` |
| `--shadow-sm` | `hsl(20 4% 2% / 0.50)` | `hsl(165 30% 2% / 0.50)` |
| `--shadow-md` | `hsl(20 4% 2% / 0.55)` | `hsl(165 30% 2% / 0.55)` |
| `--shadow-lg` | `hsl(20 4% 2% / 0.60)` | `hsl(165 30% 2% / 0.60)` |
| `--shadow-xl` | `hsl(20 4% 2% / 0.65)` | `hsl(165 30% 2% / 0.65)` |
| `--shadow-colored` | `hsl(76 100% 50% / 0.15)` | `hsl(174 86% 36% / 0.15)` |
| `--sidebar-background` | `180 50% 4%` | `165 45% 6%` |
| `--sidebar-primary` | `76 100% 50%` | `174 86% 36%` |
| `--sidebar-ring` | `76 100% 50%` | `174 86% 36%` |

**Landing contrast band (in `:root`):**

| Variable | Old value | New value |
|----------|-----------|-----------|
| `--landing-contrast-bg` | `180 55% 5%` | `165 45% 9%` |
| `--landing-contrast-surface` | `180 35% 7%` | `165 35% 11%` |
| `--landing-contrast-surface-elevated` | `180 25% 10%` | `165 25% 14%` |
| `--landing-contrast-border` | `180 25% 13%` | `165 25% 15%` |

**`@utility hero` background gradient** — shift from terracotta-warm to forest-tinted:
```css
/* Old */
background:
  radial-gradient(900px 420px at 20% -120px, hsl(21 52% 55% / 0.1), transparent 60%),
  radial-gradient(800px 520px at 110% -80px, hsl(30 10% 8% / 0.8), transparent 55%),
  linear-gradient(180deg, hsl(30 15% 5%) 0%, hsl(30 13% 7%) 60%, transparent 100%);
color: hsl(37 29% 94%);

/* New */
background:
  radial-gradient(900px 420px at 20% -120px, hsl(174 50% 40% / 0.08), transparent 60%),
  radial-gradient(800px 520px at 110% -80px, hsl(165 20% 8% / 0.8), transparent 55%),
  linear-gradient(180deg, hsl(165 35% 6%) 0%, hsl(165 25% 8%) 60%, transparent 100%);
color: hsl(76 14% 91%);  /* ceiling white — unchanged */
```

---

### 2. `src/lib/design/gradients.ts` — Rename default, add jewel-teal entry

- Rename the `pear` entry id to `jewel-teal`, update `name`, `fromHex`/`toHex`, and Tailwind class hints
- Update `getGradient()` default argument from `'pear'` to `'jewel-teal'`
- Update `GradientId` union type to replace `'pear'` with `'jewel-teal'`
- Keep remaining gradient options (terracotta, volt, etc.) untouched — they're user-selectable org branding

```ts
// New entry
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

---

### 3. `src/lib/design/brandTokens.ts` — Update fallback defaults

- Line ~42: `CHARCOAL_HEX` stays as-is (it's used for WCAG contrast math on user-chosen brand colors, not the default)
- Line ~158: `safeHex` fallback `'#bcff00'` → `'#0da899'`
- Update any comment references to "volt" or "pear" to "jewel-teal"

---

### 4. `src/pages/Settings.tsx` — Update color picker fallbacks

Four occurrences of `'#bcff00'` used as fallback in `localBrandHex` validations (lines ~600, 601, 654, 658). Change all to `'#0da899'`.

---

### 5. `src/lib/posture/postureWireframeRenderer.ts` — Update wireframe background default

- Default parameter `backgroundColor = '#1a1a2e'` → `backgroundColor = '#0c1f1a'`
- This is the background for posture wireframe canvases. Deep forest is more on-brand than the old navy.

---

### 6. `src/components/dashboard/artifacts/ArtifactGridCard.tsx` — Update social card backgrounds

- `background: '#0f172a'` (line ~82) → `background: '#0c1f1a'`
- `background: '#0f172a'` (line ~99) → `background: '#0c1f1a'`
- `background: '#070d18'` (line ~140) → `background: '#081510'` (deep forest darkened — consistent depth relationship)

These are social share card canvases. Matching the brand dark creates consistency across in-app and shared content.

---

## Out of Scope

These hardcoded hex values are **intentional and must not change**:

| Location | Color | Reason |
|----------|-------|--------|
| `Login.tsx`, `AccountCreationStep.tsx` | `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335` | Google brand colors — vendor spec |
| `PillarScoreCard.tsx`, `PillarStoryCard.tsx` | `#22c55e`, `#ef4444` | Semantic score delta (positive/negative) — not brand |
| `useClientReportData.ts` | `#3b82f6` | Chart data series color — not brand |
| Admin dashboard files | `#334155`, `#64748b`, `#10b981`, etc. | Admin-only data viz colors — separate design system |

---

## DESIGN.md

Create `DESIGN.md` in the project root documenting the final system. One Assess uses warm light mode surfaces (ceiling white) with a cool teal accent — the tension is intentional. Include the full token reference for future decisions.

---

## Definition of Done

- All 6 files updated
- `DESIGN.md` written
- Both light and dark mode checked visually in the browser (`:8080`)
- No `#bcff00`, `#a8e600`, or `#061414` remaining outside admin/vendor/semantic contexts
- Git: one commit per file changed
