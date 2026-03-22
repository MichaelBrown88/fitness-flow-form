# One Assess Design System

Single source of truth for colours, typography, spacing, motion, and branding so the UI stays consistent. Follow this document when adding or changing UI.

## Overview

- **Design language:** Apple-inspired neutrals plus a gradient accent (purple–indigo by default). Neutrals are fixed; the accent is driven by design tokens and, when the org has the add-on, by organization branding.
- **Tokens:** Defined in `src/index.css` (CSS variables) and extended in `tailwind.config.ts`. `ThemeManager` applies the org gradient only when `customBrandingEnabled === true`; otherwise the default One Assess gradient is used.
- **Reference files:** `src/lib/design/appleNeutrals.ts`, `src/lib/design/gradients.ts` document the palette and gradient set.

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

- Hardcode brand colours: avoid raw `indigo-600`, `violet-600`, `slate-*` for brand/UI chrome; use design tokens so org branding and defaults stay consistent.
- Use `brand-muted`: it is not defined in the theme. Use `brand-medium` or add the token if needed.
- Introduce one-off spacing or radius values that are not on the scale without documenting them.

## Motion

Prefer the shared classes and tokens so motion feels consistent:

- `animate-fade-in-up`, `animate-scale-in`, `animate-slide-in` (defined in `index.css`).
- `transition-apple` for timing.
- Duration via `--duration-base` (or Tailwind classes that map to the tokens).

## Branding and "Powered by One Assess"

- **Default (no custom branding):** Header shows One Assess wordmark (OA mark + "One Assess"); footer shows "Powered by One Assess"; app uses default gradient (purple–indigo).
- **Custom branding (paid add-on):** When `orgSettings.customBrandingEnabled === true`, the org may use its logo and brand gradient in the app; the footer still shows "Powered by One Assess."
- **Where it appears:** AppShell (coach and public modes), public report viewer, and any shared/exported report views. Custom logo/gradient are gated by `customBrandingEnabled`; the "Powered by" line is always present.

## File Ownership

- **Single source of truth:** `src/index.css` (CSS variables), `tailwind.config.ts` (theme extend).
- **Reference only:** `src/lib/design/appleNeutrals.ts`, `src/lib/design/gradients.ts`.
- **New tokens:** Add to `index.css` and, if needed, to the Tailwind theme; update this doc.

## Checklist for New or Modified UI

1. Colours: using tokens (`primary`, `foreground`, `border`, `brand-light`, etc.) instead of hardcoded hex or Tailwind colour names?
2. Radius and spacing: from the defined scale?
3. Motion: using shared classes or duration/easing tokens?
4. No new hardcoded brand colours (indigo/violet/slate for UI chrome)?
5. If a new token is added, is it added to `index.css` (and theme if needed) and documented here?

## Optional: Linting

Consider stylelint or ESLint rules to flag hardcoded `indigo-`, `violet-`, or `slate-` in component files and prefer token-based classes so the system stays consistent over time.

## Interaction and UX standards

For loading states, errors, focus, accessibility expectations, and how to run MCP-assisted UX reviews alongside this document, see [UI_UX_STANDARDS.md](./UI_UX_STANDARDS.md).
