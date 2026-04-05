import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { FIRESTORE_SYNC_COPY } from '@/constants/firestoreSyncCopy';

export function FirestoreSyncBanner() {
  const {
    user,
    firestoreProfileSyncError,
    firestoreOrgSyncError,
    retryFirestoreSync,
  } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const profileFailed = firestoreProfileSyncError != null;
  const orgFailed = firestoreOrgSyncError != null;
  const hasIssue = profileFailed || orgFailed;

  useEffect(() => {
    if (hasIssue) setDismissed(false);
  }, [firestoreProfileSyncError, firestoreOrgSyncError, hasIssue]);

  if (!user || !hasIssue || dismissed) {
    return null;
  }

  const body =
    profileFailed && orgFailed
      ? FIRESTORE_SYNC_COPY.combinedBody
      : profileFailed
        ? FIRESTORE_SYNC_COPY.profileBody
        : FIRESTORE_SYNC_COPY.orgBody;

  return (
    <div
      className="border-b border-score-amber-muted bg-score-amber-light/90 dark:bg-score-amber-muted/25 px-4 py-3 text-sm text-foreground"
      role="alert"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex gap-3 min-w-0">
          <AlertTriangle
            className="h-5 w-5 shrink-0 text-score-amber-bold"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{FIRESTORE_SYNC_COPY.bannerTitle}</p>
            <p className="mt-0.5 text-foreground-secondary">{body}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={() => retryFirestoreSync()}>
            {FIRESTORE_SYNC_COPY.retry}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => setDismissed(true)}
            aria-label={FIRESTORE_SYNC_COPY.dismiss}
          >
            <X className="h-4 w-4" aria-hidden />
            <span className="sr-only">{FIRESTORE_SYNC_COPY.dismiss}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
