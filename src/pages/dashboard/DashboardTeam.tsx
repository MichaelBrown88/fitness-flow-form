import { useOutletContext } from 'react-router-dom';
import { TeamView } from '@/components/dashboard/sub-components/TeamView';
import type { DashboardOutletContext } from './DashboardLayout';

export default function DashboardTeam() {
  const ctx = useOutletContext<DashboardOutletContext>();
  return <TeamView search={ctx.search} />;
}
