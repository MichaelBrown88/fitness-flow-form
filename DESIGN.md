# One Assess — Design System

## Palette

| Role | Value | Hex |
|------|-------|-----|
| Brand accent | `hsl(174 86% 36%)` | `#0da899` Jewel Teal |
| Brand accent dark | `hsl(174 86% 30%)` | `#0b8e82` |
| Dark background | `hsl(165 45% 9%)` | `#0c1f1a` Deep Forest |
| Light background | `hsl(76 14% 91%)` | `#e9ebe6` Ceiling White |
| Body text (light) | `hsl(180 55% 5%)` | `#061414` Rich Black |
| Accent text on light | `hsl(174 60% 22%)` | dark teal — ~7:1 on Ceiling White |
| Button text on teal | `hsl(165 45% 9%)` | `#0c1f1a` Deep Forest — 5.82:1 WCAG AA |

## Design Rationale

Warm light mode surfaces (Ceiling White `#e9ebe6`, Celeste, Laurel Leaf) paired with a cool teal accent is **intentional**. The warm/cool tension creates energy and makes the accent pop harder than a neutral-on-neutral pairing. Do not "fix" this by warming up the teal or cooling down the surfaces.

**Why Jewel Teal over the old Pear (`#bcff00`):**
- Pear fails on light mode: too neon for fills, ~1.3:1 contrast as text on white — WCAG fail.
- Jewel Teal `#0da899` works on both surfaces:
  - On Deep Forest (dark): 4.3:1 against `#0c1f1a`
  - On Ceiling White (light): dark teal `hsl(174 60% 22%)` gives ~7:1 as text — WCAG AAA
  - As button fill on both: deep forest text on teal = 5.82:1 — WCAG AA

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
