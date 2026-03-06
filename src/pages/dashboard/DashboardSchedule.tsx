import { useOutletContext } from 'react-router-dom';
import { TaskListView } from '@/components/dashboard/sub-components/TaskListView';
import type { DashboardOutletContext } from './DashboardLayout';

export default function DashboardSchedule() {
  const ctx = useOutletContext<DashboardOutletContext>();
  return <TaskListView tasks={ctx.tasks} search={ctx.search} />;
}
