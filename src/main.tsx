import * as Sentry from '@sentry/react';
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { logger } from '@/lib/utils/logger';
import { initAppCheck } from '@/services/firebase';

// Initialise Sentry before anything else so all subsequent errors are captured.
// Requires VITE_SENTRY_DSN to be set — no-op when absent (dev without explicit setup).
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN as string,
    environment: import.meta.env.MODE, // "production" | "development" | "staging"
    release: import.meta.env.VITE_APP_VERSION as string | undefined,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask all text and block all media in session replays (privacy-safe default)
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Capture 10 % of transactions for performance monitoring
    tracesSampleRate: 0.1,
    // Capture 10 % of sessions for replays (100 % on error sessions)
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

// Initialise App Check as early as possible so all subsequent calls are covered.
// No-op when VITE_RECAPTCHA_SITE_KEY is absent (dev without explicit setup).
initAppCheck();

// Side-effect: register admin tools on window for console access
// DEV-only tools stay guarded; migration tools (importPlatformData, deleteV1Paths) load always
import('@/lib/setup/admin/platformDataReconciler');
if (import.meta.env.DEV) {
  import('@/services/achievements'); // registers populateClientData on window
  import('@/services/diagnoseClient'); // registers diagnoseClient, fixClientAnimations on window
}

// Global error handlers — catch uncaught errors and rejected promises.
// Sentry.captureException forwards to Sentry when a DSN is configured;
// logger.error keeps the in-memory log for local debugging.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error('[GLOBAL ERROR]', event.error);
    Sentry.captureException(event.error ?? event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('[UNHANDLED PROMISE REJECTION]', event.reason);
    Sentry.captureException(event.reason);
  });
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found. Check index.html.");
}

createRoot(rootElement).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);
