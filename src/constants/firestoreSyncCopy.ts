/** User-visible copy when live Firestore listeners fail (profile or org). */
export const FIRESTORE_SYNC_COPY = {
  bannerTitle: 'Connection to your data was interrupted',
  profileBody:
    'We could not sync your coach profile in real time. Some pages may show outdated information until this resolves.',
  orgBody:
    'We could not sync your organization settings. Subscription and team defaults may be stale until this resolves.',
  combinedBody:
    'We could not sync your account data in real time. Try again, or refresh the page if the problem continues.',
  dismiss: 'Dismiss',
  retry: 'Retry sync',
  requireAuthBlockedTitle: 'We could not load your coach profile',
  requireAuthBlockedBody:
    'Check your connection, then try syncing again. If this keeps happening, sign out and sign back in.',
  requireAuthRetry: 'Try again',
  requireAuthSignOut: 'Sign out',
} as const;
