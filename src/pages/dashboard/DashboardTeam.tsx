import { useOutletContext } from 'react-router-dom';
import { TeamView } from '@/components/dashboard/sub-components/TeamView';
import type { DashboardOutletContext } from './DashboardLayout';

export default function DashboardTeam() {
  const ctx = useOutletContext<DashboardOutletContext>();
  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <TeamView search={ctx.search} />
      </div>
    </div>
  );
}
