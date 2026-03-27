# Ops: repair bad `clientName` / display names in Firestore

Use this when client rows show slug-shaped names (e.g. `john-doe`) or stale values after a canonical name change.

## Preconditions

- Confirm the coach `organizationId` and the affected client document path(s).
- Prefer the app’s **`renameClient`** (or equivalent) flow so assessments, roadmaps, and indexes stay consistent—avoid raw field edits unless you know every dependent path.

## Checklist

1. **Inventory** — List `organizations/{orgId}/clients/{clientId}` (or your schema) where `clientName` / `fullName` / slug fields look wrong.
2. **Canonical name** — Decide the display name the coach expects (usually `fullName` on the client profile).
3. **Rename via product** — If available, run an in-app client rename so linked assessments and schedules update together.
4. **Batch repair (advanced)** — If you must script Firestore: use `writeBatch()` (≤500 writes per batch), update every collection that keys on client name, and re-run any denormalized summary writes your app expects.
5. **Verify** — Open the coach dashboard client row and start an assessment; confirm prefill and reports use the new name.

## Security

- Every query and write must scope to the correct **`organizationId`**; never copy client rows across orgs.
