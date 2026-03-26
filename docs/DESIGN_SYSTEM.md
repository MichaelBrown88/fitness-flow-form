# One Assess Design System

Single source of truth for colours, typography, spacing, motion, and branding so the UI stays consistent. Follow this document when adding or changing UI.

## Overview

- **Design language:** Apple-inspired neutrals plus a **volt / chartreuse gradient accent** by default (see `src/index.css`). Neutrals are token-driven; the accent is driven by design tokens and, when the org has the add-on, by organization branding via `ThemeManager`.
- **Tokens:** Defined in `src/index.css` (CSS variables) and extended in `tailwind.config.ts`. `ThemeManager` applies the org gradient only when `customBrandingEnabled === true`; otherwise the default One Assess gradient is used.
- **Reference files:** `src/lib/design/appleNeutrals.ts`, `src/lib/design/gradients.ts` document the palette and gradient set.

## Sources of truth (theming architecture)

| Layer | Responsibility | Location |
| ----- | -------------- | -------- |
| **Semantic palette** | Light values on `:root`, dark overrides in `.dark { }` — same variable **names**, different HSL triples | `src/index.css` |
| **Utility bridge** | Maps `hsl(var(--token))` to Tailwind colour names (`background`, `foreground`, `card`, …) | `tailwind.config.ts` |
| **Mode switch** | Toggles the `dark` class on `document.documentElement` | `src/contexts/ThemeModeContext.tsx` |
| **Runtime brand** | Org gradient / primary / ring / contrast-related vars when custom branding is on | `src/components/layout/ThemeManager.tsx` |
| **Browser chrome** | `meta theme-color` and FOUC script must match light/dark background tokens | `src/constants/themeChrome.ts`, `index.html` (keep in sync with `themeChrome.ts`) |

**Light and dark are both first-class:** components use one set of classes (`bg-background`, `text-foreground`, …). Do not fix only dark mode — raw utilities like `bg-white` or `text-slate-600` bypass tokens in **both** modes.

**New colour token rule:** add `--your-token` under **both** `:root` and `.dark` in `index.css`, extend `tailwind.config.ts` if you need a utility, then use that utility in components. Skipping either block causes light/dark drift.

**Exceptions (second surfaces):**

- **Charts / SVG / canvas:** libraries often need explicit colours — use `hsl(var(--score-green))` etc., variables defined next to other chart tokens in `index.css`, or `src/lib/design/chartColors.ts` (aligned with those vars), not one-off hex per file.
- **PDF / email / print:** often a fixed light palette or dedicated export profile; document it and derive from shared primitives where possible.

## Design Tokens

Use these instead of hardcoded values. Tailwind theme extends them so utilities like `text-primary`, `bg-brand-light`, `border-border`, `rounded-lg` map to the system.

- **Colours:** `--foreground`, `--foreground-secondary`, `--primary`, `--gradient-from`, `--gradient-to`, `--gradient-light`, `--gradient-medium`, `--gradient-dark`, `--border`, `--border-medium`, `--border-dark`, and score colours (`--score-green`, `--score-amber`, `--score-red`, etc.).
- **Typography:** `--font-size-xs` through `--font-size-4xl`. Body uses the system font stack and letter-spacing from `index.css`.
- **Spacing:** `--spacing-1` through `--spacing-12`. Prefer a single scale (e.g. 4/8/12/16/24) via Tailwind or CSS vars.
- **Radius:** `--radius`, `--radius-sm`, `--radius-lg`, `--radius-xl`, `--radius-2xl`, `--radius-3xl`, `--radius-full`.
- **Motion:** `--duration-fast`, `--duration-base`, `--duration-slow`, `--easing-apple`. Keyframes: `fade-in-up`, `scale-in`, `slide-in`; classes: `animate-fade-in-up`, `transition-apple`.

## Rules

**Do:**

- Use semantic tokens: `primary`, `gradient-from`, `foreground`, `border`, `bg-brand-light`, `text-primary`, etc.
- Use radius and spacing from the defined scale (Tailwind or CSS vars).
- Use shared motion classes (`animate-fade-in-up`, `transition-apple`, duration tokens) for consistency.

**Do not:**

- Hardcode brand or chrome colours: avoid raw `indigo-*`, `violet-*`, `slate-*`, `zinc-*`, `bg-white` for surfaces; use design tokens so org branding and light/dark stay consistent.
- Use `brand-muted`: it is not defined in the theme. Use `brand-medium` or add the token if needed.
- Introduce one-off spacing or radius values that are not on the scale without documenting them.

## Motion

Prefer the shared classes and tokens so motion feels consistent:

- `animate-fade-in-up`, `animate-scale-in`, `animate-slide-in` (defined in `index.css`).
- `transition-apple` for timing.
- Duration via `--duration-base` (or Tailwind classes that map to the tokens).

## Branding and "Powered by One Assess"

- **Default (no custom branding):** Header shows One Assess wordmark (OA mark + "One Assess"); footer shows "Powered by One Assess"; app uses the default gradient from `index.css` / `gradients.ts` (volt by default).
- **Custom branding (paid add-on):** When `orgSettings.customBrandingEnabled === true`, the org may use its logo and brand gradient in the app; the footer still shows "Powered by One Assess."
- **Where it appears:** AppShell (coach and public modes), public report viewer, and any shared/exported report views. Custom logo/gradient are gated by `customBrandingEnabled`; the "Powered by" line is always present.

## File Ownership

- **Semantic palette:** `src/index.css` (`:root` + `.dark`).
- **Tailwind mapping:** `tailwind.config.ts` (`theme.extend`).
- **Browser chrome hex (must match `--background` light/dark):** `src/constants/themeChrome.ts`.
- **Chart colour helpers (mirror CSS tokens):** `src/lib/design/chartColors.ts`.
- **Reference only:** `src/lib/design/appleNeutrals.ts`, `src/lib/design/gradients.ts`.
- **New tokens:** Add to `index.css` (both modes), extend Tailwind if needed, update this doc.

## Checklist for New or Modified UI

1. Colours: using tokens (`primary`, `foreground`, `border`, `brand-light`, etc.) instead of hardcoded hex or raw Tailwind greys (`slate-*`, `zinc-*`, `bg-white` for surfaces)?
2. If you added a token, did you set values in **both** `:root` and `.dark`?
3. Radius and spacing: from the defined scale?
4. Motion: using shared classes or duration/easing tokens?
5. Charts: using `chartColors` / `hsl(var(--…))` from `index.css`, not arbitrary hex?

## Token mapping (replace raw Tailwind greys / brand hues)

| Intent | Prefer |
|--------|--------|
| Page background | `bg-background`, `bg-background-secondary` |
| Primary text | `text-foreground` |
| Secondary / helper text | `text-muted-foreground` |
| Cards / surfaces | `bg-card`, `border-border` |
| Brand accent (light UI) | `text-primary`, `bg-primary/10`, `border-primary/30` |
| Score / traffic colours | `bg-score-green`, `text-score-amber-fg`, or `hsl(var(--score-red))` (see `index.css` and `chartColors.ts`) |
| Admin distribution bars | `hsl(var(--chart-distribution-orange))`, `--chart-distribution-yellow`, score + `--gradient-from` |

**Allowed raw hex exceptions:** Third-party brand marks (e.g. OAuth provider icons), screenshots, or assets that must match vendor guidelines. Document new exceptions in the PR.

## Linting

ESLint warns on common raw palette substrings inside `className` string literals and template static parts — see `eslint.config.js`. Suppress with `eslint-disable-next-line` and a short comment only when unavoidable (vendor widget, etc.).

## Interaction and UX standards

For loading states, errors, focus, accessibility expectations, and how to run MCP-assisted UX reviews alongside this document, see [UI_UX_STANDARDS.md](./UI_UX_STANDARDS.md).
