# Logging exceptions (intentional `console.*`)

- [`src/services/firebase.ts`](../src/services/firebase.ts): Firebase bootstrap and DEV transport filtering use `console.warn` / `console.error` before the rest of the app wires `logger`.
- Browser DevTools utilities ([`src/services/diagnoseClient.ts`](../src/services/diagnoseClient.ts), [`src/lib/utils/reanalyzePosture.ts`](../src/lib/utils/reanalyzePosture.ts), [`src/lib/setup/admin/platformDataReconciler.ts`](../src/lib/setup/admin/platformDataReconciler.ts)): use `logger` so output respects DEV vs prod behaviour; run these only from trusted sessions.
