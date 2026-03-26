import { useOutletContext } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { WebhooksManager } from '@/components/org/integrations/WebhooksManager';
import { CsvClientImport } from '@/components/org/integrations/CsvClientImport';
import type { OrgAdminOutletContext } from './OrgAdminLayout';

export default function OrgIntegrations() {
  const { orgDetails } = useOutletContext<OrgAdminOutletContext>();
  const { profile } = useAuth();

  const organizationId = orgDetails?.id ?? '';
  const coachUid = profile?.uid ?? '';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-foreground">Integrations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your external tools and import client data.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <WebhooksManager organizationId={organizationId} />
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <CsvClientImport organizationId={organizationId} coachUid={coachUid} />
      </div>
    </div>
  );
}
