# Brand Color Migration Guide

## Overview

All accent/brand colors throughout the app now use the centralized gradient system. This ensures a single change (selecting a gradient in Settings) affects all branded elements.

## Centralized Control

**Single Source of Truth**: `src/lib/design/gradients.ts` and CSS variables in `src/index.css`

All brand colors are controlled via CSS variables:
- `--gradient-from` / `--gradient-to` (HSL)
- `--gradient-from-hex` / `--gradient-to-hex` (for SVG/CSS)
- `--gradient-light` / `--gradient-medium` / `--gradient-dark` (tints)

## What Uses Gradients

✅ **All accent colors** (icons, highlights, progress bars, badges)
✅ **Timeline progress bars** (all use same gradient)
✅ **Card edge highlights** (top borders)
✅ **Icon colors** (when not status-related)
✅ **Category colors** (all categories use gradient)
✅ **Blueprint pillars** (except red/amber status colors)

## What Stays Fixed

❌ **Status colors** (green/amber/red for traffic light system)
❌ **Neutral colors** (Apple's whites, greys, blacks)
❌ **Warning/error colors** (red for destructive actions)

## Migration Checklist

- [x] Settings page - gradient selection UI
- [x] ClientReport.tsx - all accent colors
- [x] MovementPostureMobility.tsx - icon and badge colors
- [x] RoadmapTimeline.tsx - progress bars
- [x] ClientReportConstants.ts - category colors
- [ ] Other report components (Blueprint, LifestyleFactorsBar, etc.)
- [ ] Dashboard components
- [ ] Form components
- [ ] Companion UI components

## Usage Examples

```tsx
// ✅ Correct - Use gradient classes
<div className="bg-gradient-light text-gradient-dark">...</div>
<div className="gradient-bg">...</div>
<span className="text-gradient-dark">...</span>

// ✅ Correct - Use CSS variables for inline styles
<div style={{ borderTopColor: 'hsl(var(--gradient-from))' }}>...</div>
<stop offset="0%" stopColor="var(--gradient-from-hex)" />

// ❌ Wrong - Hardcoded colors
<div className="bg-emerald-100 text-emerald-700">...</div>
<div className="bg-sky-500">...</div>
```

## Finding Remaining Hardcoded Colors

Search for these patterns:
- `bg-emerald-*`, `text-emerald-*`
- `bg-sky-*`, `text-sky-*`
- `bg-blue-*`, `text-blue-*` (except status)
- `bg-teal-*`, `text-teal-*`
- `bg-cyan-*`, `text-cyan-*`

Replace with gradient equivalents unless they're status colors (green/amber/red for traffic lights).

