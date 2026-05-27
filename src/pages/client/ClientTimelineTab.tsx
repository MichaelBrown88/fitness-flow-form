import { Link, useOutletContext } from 'react-router-dom';
import ClientHistory from './ClientHistory';
import ClientCoachNotesTab from './ClientCoachNotesTab';
import type { ClientDetailOutletContext } from './ClientDetailLayout';

function buildClientPath(name: string, sub?: string): string {
  const base = `/dashboard/clients/${encodeURIComponent(name)}`;
  return sub ? `${base}/${sub}` : base;
}

export default function ClientTimelineTab() {
  const { clientName } = useOutletContext<ClientDetailOutletContext>();

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Assessment history</h2>
          <Link
            to={buildClientPath(clientName, 'achievements')}
            className="text-xs font-semibold text-primary hover:underline"
          >
            View milestones
          </Link>
        </div>
        <ClientHistory />
      </section>

      <section id="notes" className="space-y-3 scroll-mt-24">
        <h2 className="text-sm font-semibold text-foreground">Coach notes</h2>
        <ClientCoachNotesTab />
      </section>
    </div>
  );
}
