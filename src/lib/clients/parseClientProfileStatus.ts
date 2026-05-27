import type { ClientGroup } from '@/hooks/dashboard/types';

/** Normalize Firestore `status` on organizations/{orgId}/clients/{slug} docs. */
export function parseClientProfileStatus(status: unknown): ClientGroup['clientStatus'] {
  if (
    status === 'paused' ||
    status === 'archived' ||
    status === 'deleted' ||
    status === 'inactive'
  ) {
    return status;
  }
  return 'active';
}

export function isInactiveClientStatus(status: ClientGroup['clientStatus'] | undefined): boolean {
  return status === 'deleted' || status === 'archived' || status === 'paused';
}
