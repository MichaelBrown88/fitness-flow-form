# React effects and data loading

This document mirrors project rules for `useEffect`, async safety, and Firestore. The authoritative copy for AI assistants is [.cursorrules](../.cursorrules).

## When to use `useEffect`

Use it only for **external sync**:

- Browser APIs (`matchMedia`, `document` title, `IntersectionObserver`)
- Subscriptions that need teardown (Firestore `onSnapshot`, websockets, event listeners)
- Timers (`setInterval` / `setTimeout`) that must be cleared on unmount
- Imperative third-party widgets

Do **not** use `useEffect` to:

- Compute values from props or context → use render or `useMemo`
- Mirror props into state → use controlled components, keys, or lift state
- Run work that is purely user-driven → use event handlers or mutations

## Async effects

Every async effect that calls `setState` must:

1. Use a **stale guard**: `let cancelled = false` in the effect, `return () => { cancelled = true }`, and skip updates when `cancelled` is true after `await`, or
2. Use **`AbortController`** with `fetch` and abort in cleanup.

## Firestore in hooks

- Encapsulate **`onSnapshot`** in a custom hook; return **unsubscribe** from `useEffect` cleanup.
- Use **`getDoc` / `getDocs`** for one-shot reads when live updates are not required (lower cost, simpler mental model).
- Avoid multiple listeners for the same logical resource when dependencies change; consolidate or ensure prior unsubscribe runs first.

## TanStack Query

- Prefer **`useQuery`** for cacheable one-shot reads (e.g. HTTP, or a stable async function that is not a live Firestore listener).
- Do **not** replace `onSnapshot` pipelines with React Query unless you have a deliberate polling or websocket strategy.

## Lint

- `react-hooks/exhaustive-deps` is set to **error** in [eslint.config.js](../eslint.config.js). Fix dependencies or refactor; do not disable the rule without a short, reviewable comment.

## Inventory (optional)

To count `useEffect` call sites in authored source (excluding build output):

```bash
rg '\buseEffect\s*\(' src --glob '*.tsx' --glob '*.ts' --count-matches
```

Exclude `dist/` when searching the repo.

## Soft complexity cap

If a single component or hook file has **more than four** `useEffect` hooks, consider splitting responsibilities or extracting custom hooks—this usually indicates mixed concerns.
