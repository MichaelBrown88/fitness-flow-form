import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Load restore utility globally
import '@/lib/utils/restoreAssessment';
// Load cleanup utilities (available in browser console)
// Admin/debugging utilities (available in browser console via window.*)
import '@/lib/setup/admin/cleanupOrganizations';
import '@/lib/setup/admin/fixRealDataAndStats';
import '@/lib/setup/admin/diagnoseData';
import '@/lib/setup/admin/fixUserProfiles';
import '@/lib/setup/admin/finalCleanup';
import '@/lib/setup/admin/removeOrphanedOrg';
import '@/lib/setup/admin/fixPlatformAdmin';
import '@/lib/setup/admin/fixPlatformAdminProfile';
import '@/lib/setup/admin/updateOneFitnessCoaches';
import '@/lib/setup/admin/addOrganizationNames';
import '@/lib/setup/admin/backfillAIUsageOrganizationId';
import '@/lib/setup/admin/recalculateAICosts';
import '@/lib/setup/admin/diagnosePublicReports';
import '@/lib/setup/admin/checkCoachIdentity';
import '@/lib/setup/seedPlatformAdmin';
import '@/lib/setup/verifyDatabaseIntegrity';

// Error boundary for better debugging on iPad/Safari
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('[GLOBAL ERROR]', event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[UNHANDLED PROMISE REJECTION]', event.reason);
  });
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found. Check index.html.");
}

createRoot(rootElement).render(<App />);
