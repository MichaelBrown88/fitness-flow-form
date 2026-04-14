# Design System — Monochrome + Semantic Color Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the jewel-teal brand colour system with a pure monochrome structural palette (black/white/grey) while keeping all semantic colours (green/amber/red/pillar colours) exactly as-is.

**Architecture:** CSS custom properties in `src/index.css` drive everything. Tasks 1–5 work from the outside in: tokens first, then UI primitives (button, card, input, badge). Task 6 scopes ThemeManager so it no longer overwrites the structural `--primary` token — org branding stays in `--gradient-*`/`--brand-*` vars only, used exclusively on client-facing surfaces.

**Tech Stack:** Tailwind CSS v4, CSS custom properties (HSL channel format), React + TypeScript, class-variance-authority (cva) for component variants, `src/components/layout/ThemeManager.tsx` for dynamic brand injection.

---

## File Map

| File | What changes |
|------|-------------|
| `src/index.css` | `:root` and `.dark` structural tokens replaced; landing contrast band, hero utility, slider utility updated |
| `src/components/ui/button.tsx` | `rounded-full` pill, monochrome variant styles, corrected size tokens |
| `src/components/ui/card.tsx` | `rounded-[20px]`, drop `glass-card` utility, explicit `bg-card border-border shadow-sm` |
| `src/components/ui/input.tsx` | `rounded-[14px]`, filled `bg-input`, transparent border at rest / `border-foreground` on focus |
| `src/components/ui/badge.tsx` | Add `success`/`warning`/`danger`/`gold` semantic variants; update `default` to neutral grey |
| `src/lib/design/brandTokens.ts` | Remove `--primary`, `--primary-foreground`, `--ring`, `--sidebar-*` from `computeBrandCssVars` output |
| `src/components/layout/ThemeManager.tsx` | No code change required — scoping is achieved by removing those vars from `computeBrandCssVars` |

---

## Task 1: CSS Structural Tokens

**Files:**
- Modify: `src/index.css` — `:root` block (lines ~571–724), `.dark` block (lines ~727–809), `@utility hero` (lines ~398–418), `@utility glass-button-active` (lines ~351–361), `@utility slider-apple` (lines ~493–539)

The current `:root` uses warm ceiling-white (`#e9ebe6`) and rich-black (`#061414`) tints. The `.dark` uses deep-forest (`#0c1f1a`). Replace both with pure monochrome. Do NOT touch score tokens, admin tokens, keyframes, radius, spacing, animation, or shadow-sm formula (update the shadow colour only).

HSL reference for new tokens (saturation is 0 — pure grey):
- `#F2F2F2` → `0 0% 95%`  
- `#FFFFFF` → `0 0% 100%`  
- `#FAFAFA` → `0 0% 98%`  
- `#F5F5F5` → `0 0% 96%`  
- `#0A0A0A` → `0 0% 4%`  
- `#525252` → `0 0% 32%`  
- `#A3A3A3` → `0 0% 64%`  
- `#737373` → `0 0% 45%`  
- `#E5E5E5` → `0 0% 90%`  
- `#D4D4D4` → `0 0% 83%`  
- `#141414` → `0 0% 8%`  
- `#1C1C1C` → `0 0% 11%`  
- `#262626` → `0 0% 15%`  
- `#333333` → `0 0% 20%`  

- [ ] **Step 1: Replace the `:root` light-mode structural block**

Replace the entire `:root` block (from `--background` through to the closing of the sidebar and landing tokens — lines ~578–724) with:

```css
    /* ── Light Mode ──────────────────────────────────────── */
    --background: 0 0% 95%;              /* #F2F2F2 — page base, lets white cards float */
    --background-secondary: 0 0% 96%;   /* #F5F5F5 */
    --background-tertiary: 0 0% 98%;    /* #FAFAFA */

    --foreground: 0 0% 4%;              /* #0A0A0A — primary text */
    --foreground-secondary: 0 0% 32%;   /* #525252 — body text, labels */
    --foreground-tertiary: 0 0% 64%;    /* #A3A3A3 — captions, placeholders */
    --foreground-quaternary: 0 0% 75%;  /* lighter muted */

    --card: 0 0% 100%;                  /* #FFFFFF */
    --card-foreground: 0 0% 4%;
    --card-elevated: 0 0% 98%;          /* #FAFAFA — nested cards */
    --card-subtle: 0 0% 97%;

    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 4%;

    /* ── Gradient / Brand tokens — kept for org branding (client portal only) ── */
    --gradient-from: 174 86% 36%;       /* jewel-teal default — ThemeManager overwrites for org */
    --gradient-to: 174 86% 30%;
    --gradient-from-hex: #0da899;
    --gradient-to-hex: #0b8e82;
    --gradient-light: 174 50% 92%;
    --gradient-medium: 174 50% 84%;
    --gradient-dark: 174 60% 22%;

    /* ── Structural Primary — monochrome, NOT overwritten by ThemeManager ── */
    --primary: 0 0% 4%;                 /* #0A0A0A — button fill, focus ring */
    --primary-foreground: 0 0% 100%;    /* #FFFFFF — text on primary buttons */

    --brand-primary: var(--gradient-from-hex);
    /* --brand-primary-transparent removed — not used structurally */

    --secondary: 0 0% 96%;
    --secondary-foreground: 0 0% 4%;

    --muted: 0 0% 96%;                  /* #F5F5F5 */
    --muted-foreground: 0 0% 64%;       /* #A3A3A3 */

    --accent: 0 0% 96%;
    --accent-foreground: 0 0% 4%;

    --destructive: 0 72% 51%;           /* red-500 — unchanged */
    --destructive-foreground: 0 0% 100%;

    /* ── Score / Semantic — unchanged ───────────────────── */
    --score-green: 160 84% 39%;
    --score-green-fg: 162 93% 24%;
    --score-green-light: 152 81% 96%;
    --score-green-muted: 149 80% 90%;
    --score-green-bold: 164 86% 16%;

    --score-amber: 38 92% 50%;
    --score-amber-fg: 32 95% 44%;
    --score-amber-light: 48 100% 96%;
    --score-amber-muted: 48 96% 89%;
    --score-amber-bold: 23 83% 31%;

    --score-red: 0 72% 51%;
    --score-red-fg: 0 65% 44%;
    --score-red-light: 0 86% 97%;
    --score-red-muted: 0 80% 92%;
    --score-red-bold: 0 63% 31%;

    --chart-distribution-orange: 25 95% 53%;
    --chart-distribution-yellow: 45 93% 47%;

    /* ── Borders & Inputs ────────────────────────────────── */
    --border: 0 0% 90%;                 /* #E5E5E5 — card edges, dividers */
    --border-medium: 0 0% 83%;          /* #D4D4D4 — inputs, focused borders */
    --border-dark: 0 0% 73%;
    --input: 0 0% 96%;                  /* #F5F5F5 — filled input background */
    --ring: 0 0% 4%;                    /* #0A0A0A — focus ring matches primary */

    /* ── Radius ──────────────────────────────────────────── */
    --radius: 0.5rem;        /* 8px  — default */
    --radius-sm: 0.375rem;   /* 6px */
    --radius-lg: 0.75rem;    /* 12px */
    --radius-xl: 1rem;       /* 16px */
    --radius-2xl: 1.25rem;   /* 20px — cards */
    --radius-3xl: 1.5rem;    /* 24px */
    --radius-full: 9999px;

    /* ── Typography Scale ────────────────────────────────── */
    --font-size-xs: 0.75rem;
    --font-size-sm: 0.875rem;
    --font-size-base: 1rem;
    --font-size-lg: 1.125rem;
    --font-size-xl: 1.25rem;
    --font-size-2xl: 1.5rem;
    --font-size-3xl: 1.875rem;
    --font-size-4xl: 2.25rem;

    /* ── Spacing ─────────────────────────────────────────── */
    --spacing-1: 0.25rem;
    --spacing-2: 0.5rem;
    --spacing-3: 0.75rem;
    --spacing-4: 1rem;
    --spacing-5: 1.25rem;
    --spacing-6: 1.5rem;
    --spacing-8: 2rem;
    --spacing-10: 2.5rem;
    --spacing-12: 3rem;

    /* ── Animation ───────────────────────────────────────── */
    --duration-fast: 120ms;
    --duration-base: 200ms;
    --duration-slow: 300ms;
    --easing-smooth: cubic-bezier(0.4, 0, 0.2, 1);
    --easing-out: cubic-bezier(0, 0, 0.2, 1);
    --easing-spring: cubic-bezier(0.16, 1, 0.3, 1);
    --easing-apple: var(--easing-spring);

    /* ── Shadows ─────────────────────────────────────────── */
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);
    --shadow-md: 0 4px 12px -2px rgba(0, 0, 0, 0.10), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 12px 24px -4px rgba(0, 0, 0, 0.12), 0 4px 8px -2px rgba(0, 0, 0, 0.06);
    --shadow-xl: 0 20px 40px -8px rgba(0, 0, 0, 0.14), 0 8px 16px -4px rgba(0, 0, 0, 0.08);

    /* ── Sidebar — monochrome structural ─────────────────── */
    --sidebar-background: 0 0% 100%;    /* white sidebar on light mode */
    --sidebar-foreground: 0 0% 4%;
    --sidebar-primary: 0 0% 4%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 0 0% 95%;
    --sidebar-accent-foreground: 0 0% 4%;
    --sidebar-border: 0 0% 90%;
    --sidebar-ring: 0 0% 4%;

    /* ── Platform Admin (always dark — unchanged) ────────── */
    --admin-bg: 222 47% 4%;
    --admin-card: 222 47% 8%;
    --admin-border: 222 47% 14%;
    --admin-surface-inset: 222 38% 11%;
    --admin-fg: 0 0% 100%;
    --admin-fg-muted: 215 14% 62%;

    /* ── Landing contrast band — uses dark-mode monochrome ── */
    --landing-contrast-bg: 0 0% 4%;           /* #0A0A0A */
    --landing-contrast-fg: 0 0% 96%;          /* #F5F5F5 */
    --landing-contrast-muted: 0 0% 45%;       /* #737373 */
    --landing-contrast-subtle: 0 0% 55%;
    --landing-contrast-border: 0 0% 15%;      /* #262626 */
    --landing-contrast-surface: 0 0% 8%;      /* #141414 */
    --landing-contrast-surface-elevated: 0 0% 11%;  /* #1C1C1C */
```

- [ ] **Step 2: Replace the `.dark` block**

Replace the entire `.dark` block (lines ~727–809) with:

```css
  .dark {
    --background: 0 0% 4%;              /* #0A0A0A — page base */
    --background-secondary: 0 0% 8%;   /* #141414 */
    --background-tertiary: 0 0% 11%;   /* #1C1C1C */

    --foreground: 0 0% 96%;             /* #F5F5F5 — primary text */
    --foreground-secondary: 0 0% 64%;   /* #A3A3A3 — body text */
    --foreground-tertiary: 0 0% 45%;    /* #737373 — captions */
    --foreground-quaternary: 0 0% 35%;

    --card: 0 0% 8%;                    /* #141414 */
    --card-foreground: 0 0% 96%;
    --card-elevated: 0 0% 11%;          /* #1C1C1C */
    --card-subtle: 0 0% 6%;

    --popover: 0 0% 8%;
    --popover-foreground: 0 0% 96%;

    /* Gradient / Brand tokens — kept for org branding (client portal only) */
    --gradient-from: 174 86% 36%;
    --gradient-to: 174 86% 30%;
    --gradient-from-hex: #0da899;
    --gradient-to-hex: #0b8e82;
    --gradient-light: 174 40% 5%;
    --gradient-medium: 174 40% 10%;
    --gradient-dark: 174 70% 65%;

    /* Structural Primary — monochrome, NOT overwritten by ThemeManager */
    --primary: 0 0% 96%;                /* #F5F5F5 — button fill on dark */
    --primary-foreground: 0 0% 4%;      /* #0A0A0A — text on primary buttons */

    --brand-primary: var(--gradient-from-hex);

    --secondary: 0 0% 11%;
    --secondary-foreground: 0 0% 96%;

    --muted: 0 0% 11%;                  /* #1C1C1C */
    --muted-foreground: 0 0% 45%;       /* #737373 */

    --accent: 0 0% 11%;
    --accent-foreground: 0 0% 96%;

    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;

    --border: 0 0% 15%;                 /* #262626 */
    --border-medium: 0 0% 20%;          /* #333333 */
    --border-dark: 0 0% 27%;
    --input: 0 0% 11%;                  /* #1C1C1C */
    --ring: 0 0% 96%;                   /* #F5F5F5 — focus ring matches primary */

    /* Score — dark surfaces (unchanged) */
    --score-green-light: 160 30% 6%;
    --score-green-muted: 160 35% 11%;
    --score-amber-light: 38 30% 6%;
    --score-amber-muted: 38 35% 11%;
    --score-red-light: 0 30% 6%;
    --score-red-muted: 0 35% 11%;

    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.40);
    --shadow-md: 0 4px 12px -2px rgba(0, 0, 0, 0.50);
    --shadow-lg: 0 12px 28px -4px rgba(0, 0, 0, 0.55);
    --shadow-xl: 0 22px 40px -8px rgba(0, 0, 0, 0.60);

    --sidebar-background: 0 0% 4%;
    --sidebar-foreground: 0 0% 96%;
    --sidebar-primary: 0 0% 96%;
    --sidebar-primary-foreground: 0 0% 4%;
    --sidebar-accent: 0 0% 11%;
    --sidebar-accent-foreground: 0 0% 96%;
    --sidebar-border: 0 0% 15%;
    --sidebar-ring: 0 0% 96%;

    --landing-contrast-bg: 0 0% 4%;
    --landing-contrast-fg: 0 0% 96%;
    --landing-contrast-muted: 0 0% 45%;
    --landing-contrast-subtle: 0 0% 55%;
    --landing-contrast-border: 0 0% 15%;
    --landing-contrast-surface: 0 0% 8%;
    --landing-contrast-surface-elevated: 0 0% 11%;
  }
```

- [ ] **Step 3: Update `@utility hero` and `@utility glass-button-active` and `@utility slider-apple`**

Replace `@utility hero` (the landing hero gradient block):

```css
@utility hero {
  /* ── Landing hero — uses dark-mode monochrome palette ── */
  background: hsl(var(--landing-contrast-bg));
  color: hsl(var(--landing-contrast-fg));
}
```

Replace `@utility glass-button-active` (currently uses brand gradient for active nav states):

```css
@utility glass-button-active {
  /* Active nav / selected state — structural monochrome */
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border: 1px solid transparent;
}
```

In `@utility slider-apple`, replace both gradient thumb backgrounds:

```css
    background: hsl(var(--primary));
```

(Replace `linear-gradient(135deg, hsl(var(--gradient-from)), hsl(var(--gradient-to)))` in BOTH the webkit and moz thumb blocks.)

- [ ] **Step 4: Update the design-direction comment at line ~562**

Replace the comment block:

```css
/*
  Design System — One Assess
  Direction: Monochrome + Semantic Color
  Black, white and grey own every structural surface.
  Color appears only where it carries meaning (scores, status, pillars).
  Font: DM Sans (Google Fonts, loaded in index.html)
*/
```

- [ ] **Step 5: Start dev server and verify both modes**

```bash
npm run dev
```

Open http://localhost:5173. Toggle dark/dark mode. Verify:
- Light mode: page is `#F2F2F2` grey, cards are white, text is near-black
- Dark mode: page is near-black, cards are dark grey `#141414`, text is near-white
- No teal anywhere in structural chrome (sidebar, nav, buttons)
- Score badges (green/amber/red) still appear correctly — they use semantic tokens, not structural

- [ ] **Step 6: Commit**

```bash
git add src/index.css
git commit -m "feat(design): replace teal structural palette with monochrome tokens"
```

---

## Task 2: Button Component — Pill Shape + Monochrome Variants

**Files:**
- Modify: `src/components/ui/button.tsx`

Current button uses `rounded-xl`, `glass-button`, `glass-subtle`, and `text-gradient-dark`. Replace with pill shape and pure monochrome variants.

- [ ] **Step 1: Rewrite `button.tsx`**

Replace the entire file with:

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold ring-offset-background transition-apple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "bg-transparent text-foreground border border-border hover:bg-muted",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        ghost:
          "bg-transparent text-foreground-secondary hover:bg-muted hover:text-foreground",
        link:
          "text-foreground underline-offset-4 hover:underline",
        outline:
          "bg-transparent text-foreground border border-border hover:bg-muted",
      },
      size: {
        default: "h-11 px-5 py-2 text-sm font-bold",
        sm: "h-8 px-4 text-[13px] font-semibold",
        lg: "h-[52px] px-7 text-[15px] font-bold",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

/* shadcn/ui: `buttonVariants` is consumed by other modules (same pattern as upstream). */
// eslint-disable-next-line react-refresh/only-export-components -- variant helper co-located with Button
export { Button, buttonVariants };
```

Key changes from current:
- `rounded-xl` → `rounded-full` (base class, no size overrides)
- `default` variant: removes `shadow-sm`, darkens to `hover:bg-primary/80`
- `secondary` variant: replaces `glass-subtle` with explicit `border-border hover:bg-muted`
- `outline` variant: replaces `glass-button` with `border-border hover:bg-muted`
- `ghost` variant: replaces `hover:bg-background-secondary` with `hover:bg-muted`
- `link` variant: replaces `text-gradient-dark` with `text-foreground`
- Size `default`: h-10 → h-11 (44px) per spec
- Size `sm`: h-9/rounded-xl → h-8, no radius override
- Size `lg`: h-12/rounded-xl → h-[52px], no radius override

- [ ] **Step 2: Verify in browser**

Check these in the running dev server:
- Primary buttons are black pills (light) / white pills (dark)
- Secondary/outline have a visible border, transparent background
- Hover on primary darkens slightly (not a colour shift)
- No teal glow on focus — focus ring is black (light) / white (dark)

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat(design): button pill shape, monochrome variants, corrected sizes"
```

---

## Task 3: Card Component — 20px Radius, Drop Glass Utility

**Files:**
- Modify: `src/components/ui/card.tsx`

Current card uses `rounded-xl glass-card`. Replace with explicit monochrome classes and `rounded-[20px]`. The `glass-card` utility can stay in index.css (other components may use it) but card.tsx stops relying on it.

- [ ] **Step 1: Rewrite `card.tsx`**

Replace the entire file with:

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-[20px] bg-card border border-border shadow-sm text-card-foreground",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
```

Key changes:
- `rounded-xl` → `rounded-[20px]`
- `glass-card` removed — replaced with `bg-card border border-border shadow-sm`
- `shadow-sm` token now resolves to `0 1px 3px rgba(0,0,0,0.06)` — almost no shadow, cards float via bg contrast

- [ ] **Step 2: Verify in browser**

Cards should appear as clean white (light) / `#141414` (dark) panels with a very faint 1px border and barely-visible shadow. No glass/blur effect.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/card.tsx
git commit -m "feat(design): card 20px radius, drop glass-card utility, shadow-sm only"
```

---

## Task 4: Input Component — Filled Background, Focus Border

**Files:**
- Modify: `src/components/ui/input.tsx`

Current input uses `rounded-md border border-input bg-background`. Spec: `14px` radius, filled `bg-input` background, no border at rest, `1px solid --foreground` on focus. Use `border-transparent` at rest to prevent layout shift on focus.

- [ ] **Step 1: Rewrite `input.tsx`**

Replace the entire file with:

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[14px] border border-transparent bg-input px-4 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:border-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
```

Key changes from current:
- `rounded-md` → `rounded-[14px]`
- `border border-input` → `border border-transparent` (1px transparent prevents layout shift)
- `bg-background` → `bg-input` (filled grey background in both modes)
- `px-3` → `px-4`
- `md:h-10` removed — consistent `h-11`
- `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` → `focus-visible:ring-0 focus-visible:border-foreground` (solid border appears, no ring)

- [ ] **Step 2: Verify in browser**

Input fields should appear as filled grey (light `#F5F5F5`) / dark grey (dark `#1C1C1C`) pill-ish rectangles with no visible border until focused. On focus a solid black (light) or white (dark) border appears.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/input.tsx
git commit -m "feat(design): input 14px radius, filled bg-input, focus border"
```

---

## Task 5: Badge Component — Semantic Variants

**Files:**
- Modify: `src/components/ui/badge.tsx`

Current badge variants (`default` gradient, `secondary` glass-subtle) need to be replaced with semantic variants. Existing `default`/`secondary`/`destructive`/`outline` names are kept for backwards compatibility but now use neutral grey. New semantic variants added: `success`, `warning`, `danger`, `gold`. All use the existing score CSS tokens — no new tokens needed.

- [ ] **Step 1: Rewrite `badge.tsx`**

Replace the entire file with:

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-apple focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        /* Neutral — structural grey. Default for tags/filters/labels. */
        default:
          "bg-muted text-foreground-secondary",
        secondary:
          "bg-muted text-muted-foreground border border-border",
        outline:
          "border border-border text-foreground-secondary",
        /* Semantic — score/status indicators */
        success:
          "bg-[hsl(var(--score-green-light))] text-[hsl(var(--score-green-fg))]",
        warning:
          "bg-[hsl(var(--score-amber-light))] text-[hsl(var(--score-amber-fg))]",
        danger:
          "bg-[hsl(var(--score-red-light))] text-[hsl(var(--score-red-fg))]",
        destructive:
          "bg-[hsl(var(--score-red-light))] text-[hsl(var(--score-red-fg))]",
        /* Achievement */
        gold:
          "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/* shadcn/ui: `badgeVariants` is consumed by other modules (same pattern as upstream). */
// eslint-disable-next-line react-refresh/only-export-components -- variant helper co-located with Badge
export { Badge, badgeVariants };
```

Key changes:
- `glass-label` removed from base classes
- `default` → neutral grey (`bg-muted text-foreground-secondary`), no more gradient
- `secondary` → subtle grey with border
- `success` / `warning` / `danger` / `gold` added as semantic variants
- `destructive` kept as alias for `danger` (backwards compatible)
- All remain `rounded-full` pill shape

- [ ] **Step 2: Verify in browser**

Check a page that shows score badges (e.g. dashboard, assessment results). Green/amber/red badges should use the score-green/amber/red tokens. Default/secondary badges should be plain grey.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/badge.tsx
git commit -m "feat(design): badge semantic variants — success/warning/danger/gold, neutral default"
```

---

## Task 6: Scope ThemeManager to Client Branding Vars Only

**Files:**
- Modify: `src/lib/design/brandTokens.ts` — `computeBrandCssVars` function (lines ~221–284)

**Problem:** ThemeManager currently calls `computeBrandCssVars` and writes the result to `document.documentElement` via `root.style.setProperty()`. The output includes `--primary`, `--primary-foreground`, `--ring`, `--sidebar-primary`, `--sidebar-ring` — which overwrites the new monochrome structural tokens with the org's brand colour. This breaks the entire design system for authenticated users.

**Fix:** Remove those structural tokens from `computeBrandCssVars` output. ThemeManager still runs and still writes `--gradient-*` and `--brand-*` tokens (used by client portal and shared reports). The coach workspace picks up `--primary` etc. from the CSS file only.

- [ ] **Step 1: Update `computeBrandCssVars` in `brandTokens.ts`**

In the `isDark` branch (lines ~228–249), change the return value to:

```ts
    return {
      '--gradient-from': primaryHsl,
      '--gradient-to': primaryToHsl,
      '--brand-primary': primary,
      '--brand-accent': primaryHsl,
      '--gradient-light': `${ph} ${Math.max(18, ps - 35)}% 12%`,
      '--gradient-medium': `${ph} ${Math.max(22, ps - 28)}% 17%`,
      '--gradient-dark': `${ph} ${Math.min(70, ps + 5)}% 60%`,
    };
```

In the light-mode branch (lines ~252–283), change the return value to:

```ts
  return {
    '--gradient-from': primaryHsl,
    '--gradient-to': primaryToHsl,
    '--brand-primary': brandHex,
    '--brand-accent': primaryHsl,
    '--gradient-light': lightTint,
    '--gradient-medium': mediumTint,
    '--gradient-dark': gradientDark,
  };
```

Removed from output (both branches): `--primary`, `--primary-foreground`, `--ring`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-ring`.

These tokens now come exclusively from the CSS file where they are set to the monochrome structural values.

- [ ] **Step 2: Update the JSDoc comment above `computeBrandCssVars`**

Replace the variable-roles comment block (lines ~200–219) with:

```ts
/**
 * Returns a map of CSS variable name → value to set on `:root` via ThemeManager.
 *
 * SCOPE: Client-facing branding only. These vars power:
 *   - Client portal branded elements
 *   - Shared report accent colour
 *   - Exported PDF brand colour
 *
 * NOT included (set structurally in index.css, monochrome):
 *   --primary, --primary-foreground, --ring, --sidebar-primary, --sidebar-ring
 *
 * Variable roles:
 *   --gradient-from / --gradient-to  Raw brand HSL, used in client portal gradients.
 *   --brand-primary                  Raw brand hex, used in SVG fills / color-mix().
 *   --brand-accent                   Alias for --gradient-from.
 *   --gradient-light / --medium      Light tints for client portal card accents.
 *   --gradient-dark                  Accessible darkened brand colour for text on white.
 */
```

- [ ] **Step 3: Verify no structural tokens are overwritten**

In the running dev server, open DevTools → Elements → select `<html>` → Styles. Look for inline `style` attribute on the html element. Verify:
- `--gradient-from`, `--gradient-to`, `--brand-primary`, `--gradient-dark` are present (org branding vars)
- `--primary`, `--ring`, `--sidebar-primary` are **NOT** in the inline styles (they come from the stylesheet)

- [ ] **Step 4: Commit**

```bash
git add src/lib/design/brandTokens.ts
git commit -m "feat(design): scope ThemeManager to client branding vars, remove --primary override"
```

---

## Task 7: Final Visual Check — Both Modes

No code changes. Verification only.

- [ ] **Step 1: Light mode check**

With dev server running at http://localhost:5173, switch to light mode. Verify:
- Page background is `#F2F2F2` (medium light grey, not white, not ceiling-white tinted)
- Cards are clean white
- Primary buttons are near-black pills with white text
- Secondary buttons have a light grey border
- Inputs are filled `#F5F5F5` grey, no visible border at rest
- Sidebar is white with black text
- No teal accent anywhere in structural chrome

- [ ] **Step 2: Dark mode check**

Switch to dark mode. Verify:
- Page background is near-black `#0A0A0A`
- Cards are dark grey `#141414`
- Elevated cards (nested) are `#1C1C1C`
- Primary buttons are near-white pills with black text
- Sidebar is `#0A0A0A` (same as page bg, merges flush)
- Focus rings are white
- Score badges (green/amber/red) remain correct — semantic colours are unaffected

- [ ] **Step 3: Semantic colour spot-check**

Navigate to any assessment or dashboard view that shows score data. Verify:
- Score ≥75 displays green
- Score 45–74 displays amber
- Score <45 displays red
- No badge uses teal/gradient fill

- [ ] **Step 4: Commit if any final tweaks made**

```bash
git add -p   # stage only what changed
git commit -m "fix(design): final visual adjustments from light/dark mode review"
```
