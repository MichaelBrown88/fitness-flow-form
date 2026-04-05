/** Fallback copy for route-scoped error boundaries (critical coach flows). */
export const ROUTE_ERROR_BOUNDARY_COPY = {
  assessment: {
    title: 'Assessment could not load',
    body: 'Something went wrong while loading the assessment. Your work may still be saved as a draft. Try again or return to the dashboard.',
  },
  billing: {
    title: 'Billing could not load',
    body: 'Something went wrong on this page. You can try again or go back to the dashboard.',
  },
} as const;
