import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/services/firebase';
import { STRIPE_CONFIG } from '@/constants/platform';
import { logger } from '@/lib/utils/logger';
import type {
  ListRecentInvoicesRequest,
  ListRecentInvoicesResponse,
  InvoiceSummary,
} from '@/types/platform';

export function useInvoices(organizationId: string | null, limit = 5) {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId || !STRIPE_CONFIG.isEnabled) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const functions = getFirebaseFunctions();
    const listInvoices = httpsCallable<ListRecentInvoicesRequest, ListRecentInvoicesResponse>(
      functions,
      'listRecentInvoices',
    );

    listInvoices({ organizationId, limit })
      .then((result) => {
        if (!cancelled) {
          setInvoices(result.data.invoices);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          logger.error('Failed to load invoices:', err);
          setError(err instanceof Error ? err.message : 'Could not load invoices.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, limit]);

  return { invoices, loading, error };
}
