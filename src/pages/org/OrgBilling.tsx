import { useOutletContext } from 'react-router-dom';
import type { OrgAdminOutletContext } from './OrgAdminLayout';
import { PlanStatusCard } from '@/components/org/billing/PlanStatusCard';
import { SeatUtilisationBar } from '@/components/org/billing/SeatUtilisationBar';
import { UpgradeCTA } from '@/components/org/billing/UpgradeCTA';

export default function OrgBilling() {
  const { orgDetails, coaches } = useOutletContext<OrgAdminOutletContext>();

  const plan = orgDetails?.plan ?? 'none';
  const status = orgDetails?.status ?? 'none';
  const coachCount = coaches.length;
  const seatBlock = orgDetails?.seatBlock;
  const seatRatio = seatBlock ? coachCount / seatBlock : 0;

  return (
    <div className="max-w-2xl mx-auto pb-12 sm:pb-20 space-y-4">
      <PlanStatusCard
        plan={plan}
        status={status}
        currency={orgDetails?.currency}
        monthlyAmountLocal={orgDetails?.monthlyAmountLocal}
        trialEndsAt={orgDetails?.trialEndsAt}
      />
      <SeatUtilisationBar
        coachCount={coachCount}
        seatBlock={seatBlock}
      />
      <UpgradeCTA
        plan={plan}
        status={status}
        seatRatio={seatRatio}
      />
    </div>
  );
}
