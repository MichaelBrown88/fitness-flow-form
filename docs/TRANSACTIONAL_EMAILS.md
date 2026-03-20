# Transactional Emails

## What’s in place

| Flow | How it’s sent | Notes |
|------|----------------|--------|
| **Email verification** | Firebase Auth | After sign-up (onboarding). Customize in Firebase Console → Authentication → Templates. |
| **Password reset** | Firebase Auth | Login pages use `sendPasswordResetEmail`. Customize in Authentication → Templates. |
| **Welcome (onboarding complete)** | Resend, Cloud Function | When `userProfiles/{uid}` gets `onboardingCompleted: true`. `functions/src/transactionalEmails.ts`. |
| **Coach invite** | Resend | `functions/src/invites.ts`. |
| **Report email** | Resend | `functions/src/share.ts`. |

## Resend + env vars (where to set them)

Firebase Console often **does not** show a simple “Functions → Environment variables” UI for 2nd gen functions (they run on **Cloud Run**).

**Recommended:** use **`functions/.env`** next to `functions/package.json` (gitignored). A template is in **`functions/env.example`** (`cp functions/env.example functions/.env` if you need a fresh copy).

```env
RESEND_API_KEY=re_your_key_here
RESEND_FROM=noreply@one-assess.com
PUBLIC_APP_HOST=https://your-app.web.app
```

Then deploy:

```bash
firebase deploy --only functions
```

The Firebase CLI injects these at deploy time. `functions/src/config.ts` reads `RESEND_API_KEY` and `RESEND_FROM`.

**Alternative:** Google Cloud Console → **Cloud Run** (same GCP project as Firebase) → open a function’s service → **Edit** → **Variables & secrets**.

If Resend is unset, welcome / invite / report emails are skipped (no-op).

## Adding more emails

See previous planning: sign-up confirmation (beyond Firebase verification), trial reminders, etc. — add Resend sends in `transactionalEmails.ts` or a dedicated module and trigger from Firestore / Scheduler as needed.
