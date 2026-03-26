# Transactional Emails

## What’s in place

| Flow | How it’s sent | Notes |
|------|----------------|--------|
| **Email verification** | Firebase Auth | After sign-up (onboarding). Customize in Firebase Console → Authentication → Templates. |
| **Password reset** | Firebase Auth | Login pages use `sendPasswordResetEmail`. Customize in Authentication → Templates. |
| **Welcome (onboarding complete)** | Resend, Cloud Function | When `userProfiles/{uid}` gets `onboardingCompleted: true`. `functions/src/transactionalEmails.ts`. If **`FOUNDER_WELCOME_FROM`** is set (verified sender in Resend), uses **Education** layout + personal founder copy from `functions/src/constants/founderWelcomeEmail.ts`, `Reply-To` to the founder address. Otherwise **Activation** layout from `RESEND_FROM`. |
| **First assessment celebration** | Resend, Cloud Function | When the first `organizations/{orgId}/clients/{slug}/sessions/{id}` is created for a coach (`createdBy`). `maybeSendFirstAssessmentCelebrationEmail` from `transactionalEmails.ts`, called after webhook fan-out in `webhooks.ts`. **Activation** layout. One email per coach (see schema below). |
| **Coach invite** | Resend | `functions/src/invites.ts`. Uses **Activation** layout. |
| **Invite accepted (inviter)** | Resend, Cloud Function | When `invitations/{token}` moves to `status: 'accepted'`. `sendInviteAcceptedEmail` in `transactionalEmails.ts`, invoked from `notifications.ts` after the in-app notification. **Activation** layout. Requires `invitedByUid` on the invitation doc (set when the invite is sent). |
| **Report email** | Resend | `functions/src/share.ts`. Uses **Notification** layout. |

## HTML layout families (`functions/src/email/`)

Shared builders live under **`functions/src/email/`** (`layouts.ts`, `tokens.ts`, `sendResendHtmlText.ts`). Each send uses **both `html` and `text`** for Resend.

| Layout | Use when | Live examples |
|--------|-----------|----------------|
| **Education** | Feature explainers, letter-style onboarding, primary + secondary link | Founder welcome when `FOUNDER_WELCOME_FROM` is set; future drips / “how to use X” |
| **Activation** | Onboarding, invites, one clear next step | Product welcome (no founder From), coach invite, first-assessment celebration, invite accepted |
| **Notification** | Reminders, link-first pings | Report share email |

**Footer variants:** `transactional` (default) and `marketing` (hook for future unsubscribe copy). Only transactional is used today.

**Branding:** Fixed **light** palette and volt accent are defined in `functions/src/email/tokens.ts` (see [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — email is a fixed export profile, not in-app dark mode).

## Schema / operational notes

### `userProfiles/{uid}.emailMilestones.firstAssessmentCelebrationSentAt`

- Written by Cloud Functions **after** a successful Resend send for the first-assessment celebration.
- If `RESEND_API_KEY` is missing or the coach has no resolvable email, the field is **not** set so a later session can retry.
- `userProfiles/{uid}` is writable by the signed-in user in [firestore.rules](../firestore.rules); tampering with `emailMilestones` is a low-probability edge case.

### `invitations/{token}.invitedByUid`

- Set to the org **owner’s** Firebase Auth UID when `sendCoachInvite` creates the invitation (`functions/src/invites.ts`).
- Used by `handleInviteAccepted` in `notifications.ts` for the in-app notification **and** the invite-accepted email. Invites created before this field existed will not notify or email until re-invited.

## Resend + env vars (where to set them)

Firebase Console often **does not** show a simple “Functions → Environment variables” UI for 2nd gen functions (they run on **Cloud Run**).

**Recommended:** use **`functions/.env`** next to `functions/package.json` (gitignored). A template is in **`functions/env.example`** (`cp functions/env.example functions/.env` if you need a fresh copy).

```env
RESEND_API_KEY=re_your_key_here
RESEND_FROM=noreply@one-assess.com
PUBLIC_APP_HOST=https://your-app.web.app

# Optional: absolute HTTPS URL to a PNG (or SVG) logo for email headers. If unset, the masthead is text-only.
# EMAIL_ASSETS_LOGO_URL=https://app.one-assess.com/assets/email-logo.png

# Optional — personal onboarding welcome (see table above)
# FOUNDER_WELCOME_FROM=Michael <michael@one-assess.com>
# FOUNDER_SIGN_OFF_NAME=Michael
# FOUNDER_FEEDBACK_EMAIL=michael@one-assess.com
```

Then deploy:

```bash
firebase deploy --only functions
```

The Firebase CLI injects these at deploy time. `functions/src/config.ts` reads `RESEND_API_KEY`, `RESEND_FROM`, `PUBLIC_APP_HOST` / `VITE_PUBLIC_APP_HOST`, `EMAIL_ASSETS_LOGO_URL`, and optional `FOUNDER_WELCOME_FROM`, `FOUNDER_SIGN_OFF_NAME`, `FOUNDER_FEEDBACK_EMAIL`.

**Alternative:** Google Cloud Console → **Cloud Run** (same GCP project as Firebase) → open a function’s service → **Edit** → **Variables & secrets**.

If Resend is unset, welcome and invite emails are skipped (no-op). Report email from `sendReportEmail` returns **`email-not-configured`** when the key is missing.

## Preview all layouts to your inbox (dev)

From `functions/` with `RESEND_*` set in `.env`:

```bash
npm run email:preview -- your@email.com
```

Sends seven sample messages (Education, product Welcome, **Founder welcome**, coach invite, report share, first-assessment celebration, invite accepted) using production layout builders. See `functions/src/scripts/sendEmailPreview.ts`. Each line prints a Resend message `id`; if the script errors, read the message (e.g. unverified `from` domain). **`API key is invalid`:** use a key from [Resend → API Keys](https://resend.com/api-keys) in **`functions/.env`** as `RESEND_API_KEY=re_...` with **no quotes** around the value (or the loader strips them). If the key in `.env` is correct but Resend still rejects it, your shell may have an old `RESEND_API_KEY` exported — run `unset RESEND_API_KEY` and try again (`functions` loads `.env` with **override** so this is mainly for other tools). If Resend accepts but nothing arrives, check spam and [Resend → Emails](https://resend.com/emails) for delivery status.

## Adding more emails

Pick a layout (`renderEducationEmail`, `renderActivationEmail`, or `renderNotificationEmail`), build `{ html, text }`, then send with `sendResendHtmlText(resend, { to, subject, html, text, from? })`.

For lifecycle mail (trial reminders, etc.), add triggers in Firestore / Cloud Scheduler and keep copy in the same module or a sibling under `functions/src/`.
