# Color System Standardization

## Overview

The app now uses a standardized color system that separates:
1. **Fixed Neutral Colors** - Apple Design Language (whites, greys, blacks) - not customizable
2. **Gradient System** - Predefined gradients that organizations can select from

## Architecture

### 1. Apple Neutral Colors (Fixed)

All neutral colors follow Apple's design language and are **not customizable**:

- **Backgrounds**: Pure white (#ffffff), light grey (#f5f5f7), subtle grey (#e5e5e7)
- **Text**: Almost black (#1d1d1f) for primary, medium grey (#6e6e73) for secondary
- **Borders**: Light (#d2d2d7), medium (#c7c7cc), dark (#a1a1a6)
- **Shadows**: Apple-style soft shadows with subtle depth

These are defined in `src/lib/design/appleNeutrals.ts` and `src/index.css`.

### 2. Gradient System (Customizable)

Organizations can select from 8 predefined gradients:

1. **Purple Indigo** (default) - `indigo-500` → `purple-500`
2. **Blue Cyan** - `blue-500` → `cyan-500`
3. **Emerald Teal** - `emerald-500` → `teal-500`
4. **Rose Pink** - `rose-500` → `pink-500`
5. **Amber Orange** - `amber-500` → `orange-500`
6. **Violet Purple** - `violet-500` → `purple-500`
7. **Sky Blue** - `sky-400` → `blue-500`
8. **Indigo Blue** - `indigo-600` → `blue-600`

Each gradient includes:
- `from` and `to` colors (HSL and hex)
- `light`, `medium`, `dark` tints for backgrounds, borders, and text

Gradients are defined in `src/lib/design/gradients.ts`.

## Usage in Components

### CSS Variables

The gradient system exposes CSS variables:

```css
--gradient-from: /* HSL value */
--gradient-to: /* HSL value */
--gradient-from-hex: /* Hex color */
--gradient-to-hex: /* Hex color */
--gradient-light: /* Light tint */
--gradient-medium: /* Medium tint */
--gradient-dark: /* Dark tint */
```

### Tailwind Classes

Use these Tailwind classes:

```tsx
// Gradient background
<div className="gradient-bg">...</div>

// Gradient text
<span className="gradient-text">...</span>

// Gradient colors
<div className="bg-gradient-light">...</div>
<div className="bg-gradient-medium">...</div>
<div className="text-gradient-dark">...</div>

// Direct color access
<div className="bg-gradient-from">...</div>
<div className="bg-gradient-to">...</div>
```

### In Components

Replace hardcoded colors like `bg-indigo-500` with:

```tsx
// Old
<div className="bg-indigo-500 text-indigo-700">...</div>

// New
<div className="bg-gradient-from text-gradient-dark">...</div>
// Or use the utility classes
<div className="gradient-bg text-white">...</div>
```

### SVG Gradients

For SVG elements (like the overall score circle):

```tsx
<linearGradient id="gradient-score" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" stopColor="var(--gradient-from-hex)" />
  <stop offset="100%" stopColor="var(--gradient-to-hex)" />
</linearGradient>
```

## Organization Settings

Organizations select their gradient via `orgSettings.gradientId`:

```typescript
{
  gradientId: 'purple-indigo' // or any other gradient ID
}
```

The `ThemeManager` component automatically applies the selected gradient to CSS variables.

## Migration Guide

### Replacing Hardcoded Colors

1. **Indigo/Purple colors** → Use `gradient-*` classes or CSS variables
2. **Neutral colors** → Use Apple neutral classes:
   - `bg-background`, `bg-background-secondary`
   - `text-foreground`, `text-foreground-secondary`
   - `border-border`, `border-border-medium`

### Example Migration

```tsx
// Before
<div className="bg-indigo-100 text-indigo-700 border-indigo-200">
  <span className="text-indigo-600">Target</span>
</div>

// After
<div className="bg-gradient-light text-gradient-dark border-gradient-medium">
  <span className="text-gradient-dark">Target</span>
</div>
```

## Benefits

1. **Consistency**: All organizations use the same neutral palette (Apple design)
2. **Cohesion**: Gradients are carefully chosen to work with neutrals
3. **Flexibility**: Organizations can pick a gradient closest to their brand
4. **Maintainability**: Single source of truth for colors
5. **Quality**: All gradients are tested to ensure good contrast and readability

## Files

- `src/lib/design/gradients.ts` - Gradient definitions
- `src/lib/design/appleNeutrals.ts` - Apple neutral colors
- `src/index.css` - CSS variables and utility classes
- `src/components/layout/ThemeManager.tsx` - Applies gradient to CSS variables
- `tailwind.config.ts` - Tailwind color configuration

