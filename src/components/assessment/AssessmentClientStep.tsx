/**
 * Client selection step shown when starting a new assessment with no client in context.
 * Allows "Select existing client" or "New client" before proceeding to the assessment form.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFormContext } from '@/contexts/FormContext';
import { useAuth } from '@/hooks/useAuth';
import { useAssessmentList } from '@/hooks/dashboard/useAssessmentList';
import { useClientCapacity } from '@/hooks/useClientCapacity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Users, Search } from 'lucide-react';
import { writePrefillClientPayload } from '@/lib/assessment/assessmentSessionStorage';
import { ROUTES } from '@/constants/routes';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';
import { logger } from '@/lib/utils/logger';

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

  const [search, setSearch] = useState('');

  const clientNames = useMemo(() => {
    const names = new Set<string>();
    for (const item of items) {
      if (item.clientName?.trim()) names.add(item.clientName.trim());
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredClientNames = useMemo(() => {
    if (!search.trim()) return clientNames;
    const q = search.trim().toLowerCase();
    return clientNames.filter((n) => n.toLowerCase().includes(q));
  }, [clientNames, search]);

  const handleSelectClient = (name: string) => {
    updateFormData({ fullName: name });
    try {
      writePrefillClientPayload({ fullName: name });
    } catch (err) {
      logger.warn('prefill_client_storage_failed', {
        error: err instanceof Error ? err.message : String(err),
      });
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
          {clientNames.length > 6 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Search clients…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
                autoFocus
              />
            </div>
          )}
          {filteredClientNames.length > 0 ? (
            <ul className="max-h-[280px] divide-y divide-border overflow-y-auto rounded-lg border border-border/70 bg-background">
              {filteredClientNames.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => handleSelectClient(name)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    {formatClientDisplayName(name)}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No clients match &ldquo;{search}&rdquo;
            </p>
          )}
        </div>
      ) : (
        <div className="mb-8 rounded-lg border border-dashed border-border px-6 py-8 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">No clients yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use the button below to start your first assessment.
          </p>
        </div>
      )}

      <div className="pt-4 border-t border-border space-y-2">
        <Button
          type="button"
          onClick={handleNewClient}
          variant="outline"
          disabled={capLoading || !canAddClient}
          className="h-12 w-full gap-2 rounded-lg border-border px-6 font-bold sm:w-auto"
        >
          <UserPlus className="h-4 w-4" />
          New client
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
