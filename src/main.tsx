import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logger } from '@/lib/utils/logger';

// Side-effect: register admin tools on window for console access (dev only)
if (import.meta.env.DEV) {
  import('@/lib/setup/admin/migrateOneFitness');
  import('@/lib/setup/admin/repairClientData');
  import('@/lib/setup/admin/backfillRoadmaps');
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
