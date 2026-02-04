import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Load restore utility globally
import '@/lib/utils/restoreAssessment';
// Load test helpers
import '@/lib/utils/testHelpers';
import { logger } from '@/lib/utils/logger';

// Temporary admin tools loader - remove after database fix
import '@/lib/setup/admin/diagnoseData';
import '@/lib/setup/admin/fixUserProfiles';
import '@/lib/setup/admin/backfillAIUsageOrganizationId';
import '@/lib/setup/admin/fixRealDataAndStats';
// New SaaS migration tools
import '@/lib/setup/admin/auditDatabase';
import '@/lib/setup/admin/createMissingClients';
import '@/lib/setup/admin/cleanupUnusedFields';
import '@/lib/setup/admin/deleteTestData';
import '@/lib/setup/admin/migrateToSaas';
import '@/lib/setup/admin/backfillAssessmentOrgId';
import '@/lib/setup/admin/deleteUserProfile';
import '@/lib/setup/admin/fixOrgCreatedAt';

// Error boundary for better debugging on iPad/Safari
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
