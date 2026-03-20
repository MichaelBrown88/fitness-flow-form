import { WifiOff, RefreshCw } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useEffect, useState } from 'react';

export function OfflineBanner() {
  const { pendingCount, isSyncing } = useOfflineSync();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold transition-all ${
        isOnline
          ? 'bg-amber-500 text-white'
          : 'bg-slate-800 text-white'
      }`}
    >
      {isOnline ? (
        <>
          <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing
            ? 'Syncing offline assessments…'
            : `${pendingCount} assessment${pendingCount > 1 ? 's' : ''} saved offline — tap to sync`}
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          No internet — assessments will save offline and sync automatically
        </>
      )}
    </div>
  );
}
