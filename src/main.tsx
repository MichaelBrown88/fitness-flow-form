import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logger } from '@/lib/utils/logger';
import { initAppCheck } from '@/services/firebase';

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

// Global error handlers — catch uncaught errors and rejected promises
// so they route through the centralized logger rather than silently failing
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error('[GLOBAL ERROR]', event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('[UNHANDLED PROMISE REJECTION]', event.reason);
  });
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found. Check index.html.");
}

createRoot(rootElement).render(<App />);
