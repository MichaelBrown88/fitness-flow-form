# Deployment Notes

## ⚠️ Coupled Deploys — Always Use `firebase deploy`

Several changes must be deployed together. **Never** use `deploy-preview.sh` (hosting-only)
when any of the following files have uncommitted or undeployed changes:

| Files | Why coupling matters |
|---|---|
| `firestore.rules` + any `src/**` or `functions/**` change | Rules tightening (Phase 3) mirrors app-level coachUid filters. Split deploy breaks reads for coaches or bypasses data minimization. |
| `functions/src/executeClientErasure.ts` + `src/pages/org/OrgOverview.tsx` | Erasure UI calls this Cloud Function; deploying one without the other leaves the flow broken. |

### Safe deploy command
```sh
firebase deploy
```

### `deploy-preview.sh` is hosting-only
Use it only for UI/visual testing where no Firestore rule or Cloud Function changes are included.

---

## Phase Notes

### Phase 1 — PWA client entry point
- `ClientPortalEntry` at `/r` reads `localStorage` for last token and redirects.
- `firebase.json` has both `/r` (exact) and `/r/**` rewrites pointing to `client.html`.
- PNG icons must exist in `public/` (generated via `npx sharp-cli`).

### Phase 2 — GDPR erasure (Article 17)
- `executeClientErasure` Cloud Function performs actual deletion before marking complete.
- Erasure request flow lives in `src/pages/org/OrgOverview.tsx`.

### Phase 3 — Data minimization
- Coaches only query their own clients/assessments at both app and Firestore rule level.
- Non-coaching org admins (`isAdmin && !isActiveCoach`) get full org scope.
- `coachUidFilter: null` = all org; `undefined/uid` = own clients.

### Phase 4 — Client privacy notice (TODO)
- One-time disclosure banner on first `/r/:token` access per session (sessionStorage flag).

### Phase 5 — Org admin AI context (TODO)
- Inject `retentionSummary` + `coachMetrics` into assistant system prompt when admin is non-coaching.

### Phase 6 — Platform admin alerting (TODO)
- Webhook/email triggers for capacity, MRR drop, AI cost spikes, trial signup, past_due.
