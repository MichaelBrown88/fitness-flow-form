# Testing Guide

## Separate Firebase Project for Testing

To test onboarding and other flows without affecting production data (e.g., One Fitness), use a separate Firebase project.

### 1. Create a Test Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add project** or **Create a project**
3. Name it (e.g., `assessment-engine-test`)
4. Disable Google Analytics if not needed
5. Create the project

### 2. Enable Services

In the test project, enable:

- **Authentication** – Email/Password, Google, Apple (same providers as prod)
- **Firestore Database** – Create database
- **Cloud Functions** – Enable
- **Hosting** (optional) – For preview deploys

### 3. Environment Variables

Create `.env.local` (or use `.env.test`) with test project credentials:

```bash
VITE_FIREBASE_API_KEY=your-test-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-test-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-test-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-test-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Ensure `.env.local` is in `.gitignore` so test credentials are never committed.

### 4. Deploy to Test Project

```bash
# Target test project
firebase use your-test-project-id

# Deploy functions and indexes
firebase deploy --only functions
firebase deploy --only firestore:indexes

# Run app with test config (Vite loads .env.local)
npm run dev
```

### 5. Test Account Patterns

- Use `test@test.com` or `test+timestamp@test.com` in dev mode
- Orgs created with test emails are tagged with `metadata.isTest: true` and are easy to filter/delete in the admin dashboard

### 6. Switching Between Projects

```bash
# List projects
firebase projects:list

# Switch to production
firebase use assessment-engine-8f633

# Switch to test
firebase use your-test-project-id
```

### 7. Recommendation

- **Production**: Use for One Fitness and live customers only
- **Test**: Use for onboarding flow testing, UX verification, and demos
- Never mix test data into production; run the backfill script and aggregation only on production
