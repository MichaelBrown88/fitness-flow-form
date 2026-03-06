import { useOutletContext } from 'react-router-dom';
import { CalendarView } from '@/components/dashboard/sub-components/CalendarView';
import type { DashboardOutletContext } from './DashboardLayout';

export default function DashboardCalendar() {
  const ctx = useOutletContext<DashboardOutletContext>();
  if (!ctx.reassessmentQueue) return null;
  return (
    <CalendarView
      reassessmentQueue={ctx.reassessmentQueue}
      onNewAssessmentForClient={ctx.handleNewAssessmentForClient}
      organizationId={ctx.profile?.organizationId}
      onScheduleChanged={ctx.refreshSchedules}
    />
  );
}
