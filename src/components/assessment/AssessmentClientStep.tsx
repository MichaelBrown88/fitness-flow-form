/**
 * Client selection step shown when starting a new assessment with no client in context.
 * Allows "Select existing client" or "New client" before proceeding to the assessment form.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFormContext } from '@/contexts/FormContext';
import { useAuth } from '@/hooks/useAuth';
import { useAssessmentList } from '@/hooks/dashboard/useAssessmentList';
import { useClientCapacity } from '@/hooks/useClientCapacity';
import { Button } from '@/components/ui/button';
import { UserPlus, Users } from 'lucide-react';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { ROUTES } from '@/constants/routes';

export function AssessmentClientStep({
  onContinue,
}: {
  /** Call with true when user chose "New client" (no name yet), false when they selected a client. */
  onContinue: (choseNewClient: boolean) => void;
}) {
  const { updateFormData } = useFormContext();
  const { user, profile, loading: authLoading, effectiveOrgId } = useAuth();
  const { items, loadingData: listLoading } = useAssessmentList({
    user,
    profile,
    loading: authLoading,
    effectiveOrgId,
    coachUidFilter: undefined,
  });
  const { loading: capLoading, canAddClient, clientCount, clientLimit } = useClientCapacity();

  const clientNames = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) {
      if (item.clientName?.trim()) names.add(item.clientName.trim());
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const handleSelectClient = (name: string) => {
    updateFormData({ fullName: name });
    try {
      sessionStorage.setItem(STORAGE_KEYS.PREFILL_CLIENT, JSON.stringify({ fullName: name }));
    } catch {
      // non-fatal
    }
    onContinue(false);
  };

  const handleNewClient = () => {
    updateFormData({ fullName: '' });
    onContinue(true);
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-8 h-8 border-2 border-border-medium border-t-muted-foreground rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
        Who is this assessment for?
      </h2>
      <p className="text-sm text-muted-foreground mb-8">
        Select an existing client or start a new assessment for someone not yet in your list.
      </p>

      {listLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-border-medium border-t-muted-foreground rounded-full animate-spin" />
        </div>
      ) : clientNames.length > 0 ? (
        <div className="space-y-3 mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Existing clients
          </p>
          <ul className="rounded-xl border border-border bg-background divide-y divide-border max-h-[280px] overflow-y-auto">
            {clientNames.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => handleSelectClient(name)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  {name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="pt-4 border-t border-border space-y-2">
        <Button
          type="button"
          onClick={handleNewClient}
          variant="outline"
          disabled={capLoading || !canAddClient}
          className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold gap-2 border-border"
        >
          <UserPlus className="h-4 w-4" />
          New client (enter details in form)
        </Button>
        {!capLoading && !canAddClient && (
          <p className="text-xs text-amber-700">
            You&apos;re at your plan limit ({clientCount}/{clientLimit} clients).{' '}
            <Link to={ROUTES.BILLING} className="font-semibold underline underline-offset-2">
              Upgrade to add clients
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
