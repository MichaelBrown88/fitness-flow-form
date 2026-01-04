import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Load restore utility globally
import '@/lib/utils/restoreAssessment';

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
