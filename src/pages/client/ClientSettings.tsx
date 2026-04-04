import { useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UserCheck, Mail, Phone, Cake, CalendarClock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RetestScheduleCard } from '@/components/RetestScheduleCard';
import type { ClientDetailOutletContext } from './ClientDetailLayout';

export default function ClientSettings() {
  const ctx = useOutletContext<ClientDetailOutletContext>();
  const { profile: authProfile, orgSettings } = useAuth();
  const {
    clientName,
    profile,
    editData,
    setEditData,
    handleSaveProfile,
  } = ctx;

  const hasSynced = useRef(false);
  useEffect(() => {
    if (profile && !hasSynced.current) {
      hasSynced.current = true;
      const dateStr = profile.trainingStartDate ?? '';
      setEditData({
        clientName: profile.clientName ?? clientName,
        email: profile.email ?? '',
        phone: profile.phone ?? '',
        dateOfBirth: profile.dateOfBirth ?? '',
        trainingStartDate: dateStr,
        notes: profile.notes ?? '',
      });
    }
  }, [profile, clientName, setEditData]);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-foreground">Profile & contact</h2>
        <div className="grid gap-2">
          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
            <UserCheck className="h-3.5 w-3.5" /> Client Name
          </label>
          <Input
            value={editData.clientName ?? clientName ?? ''}
            onChange={(e) => setEditData({ ...editData, clientName: e.target.value })}
            placeholder="Full name"
            className="h-11 rounded-xl"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
            <Mail className="h-3.5 w-3.5" /> Email Address
          </label>
          <Input
            value={editData.email || ''}
            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
            placeholder="client@example.com"
            className="h-11 rounded-xl"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
            <Phone className="h-3.5 w-3.5" /> Phone Number
          </label>
          <Input
            value={editData.phone || ''}
            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
            placeholder="+1 (555) 000-0000"
            className="h-11 rounded-xl"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
              <Cake className="h-3.5 w-3.5" /> Date of Birth
            </label>
            <Input
              type="date"
              value={editData.dateOfBirth || ''}
              onChange={(e) => setEditData({ ...editData, dateOfBirth: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5" /> Training Start
            </label>
            <Input
              type="date"
              value={editData.trainingStartDate || ''}
              onChange={(e) => setEditData({ ...editData, trainingStartDate: e.target.value })}
              className="h-11 rounded-xl"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Internal Coaching Notes</label>
          <Textarea
            value={editData.notes || ''}
            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
            placeholder="Add medical history, training preferences, or other important details..."
            rows={3}
            className="rounded-xl resize-none"
          />
        </div>
        <Button onClick={() => void handleSaveProfile()} className="w-full sm:w-auto bg-foreground text-white rounded-xl h-11 px-6 font-bold">
          Save Profile
        </Button>
      </section>

      {authProfile?.organizationId && (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <RetestScheduleCard
            profile={profile}
            clientName={clientName}
            organizationId={authProfile.organizationId}
            orgDefaultIntervals={orgSettings?.defaultCadence?.intervals}
            orgDefaultActivePillars={orgSettings?.defaultCadence?.activePillars}
          />
        </section>
      )}
    </div>
  );
}
