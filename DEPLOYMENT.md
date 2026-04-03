# Deployment notes

## Firebase Hosting — custom domain for mobile posture scan

When DNS is available, add a custom subdomain (for example `scan.onefitnessstudio.com`) for the mobile companion / scan experience in **Firebase Console → Hosting → Add custom domain**. No application code change is required.

Do **not** add deployment reminders as extra keys inside `firebase.json`; unknown fields under `hosting` will cause `firebase deploy` to fail.
