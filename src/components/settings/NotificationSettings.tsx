import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { NotificationType } from '@/types/notifications';

interface NotificationPreference {
  type: NotificationType;
  label: string;
  description: string;
  enabled: boolean;
}

const DEFAULT_PREFERENCES: Omit<NotificationPreference, 'enabled'>[] = [
  { type: 'assessment_complete', label: 'Assessment Complete', description: 'When a client assessment is finalized' },
  { type: 'reassessment_due', label: 'Reassessment Due', description: 'When a client is due for a retest' },
  { type: 'lifestyle_reminder', label: 'Lifestyle Reminders', description: 'Periodic lifestyle check-in prompts' },
  { type: 'new_client', label: 'New Client', description: 'When a new client is added to your roster' },
  { type: 'client_submission', label: 'Client Submission', description: 'When a client submits body comp or posture data' },
  { type: 'schedule_review', label: 'Schedule Review', description: 'Reminders to review client follow-up schedules' },
];

export function NotificationSettings() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const ref = doc(getDb(), 'userProfiles', user.uid);
        const snap = await getDoc(ref);
        const data = snap.data();
        const prefs = (data?.notificationPreferences || {}) as Record<string, boolean>;
        const merged: Record<string, boolean> = {};
        for (const p of DEFAULT_PREFERENCES) {
          merged[p.type] = prefs[p.type] !== undefined ? prefs[p.type] : true;
        }
        setPreferences(merged);
      } catch {
        const defaults: Record<string, boolean> = {};
        for (const p of DEFAULT_PREFERENCES) defaults[p.type] = true;
        setPreferences(defaults);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleToggle = async (type: string, value: boolean) => {
    if (!user) return;
    const updated = { ...preferences, [type]: value };
    setPreferences(updated);
    setSaving(true);
    try {
      await setDoc(
        doc(getDb(), 'userProfiles', user.uid),
        { notificationPreferences: updated },
        { merge: true },
      );
    } catch {
      setPreferences(prev => ({ ...prev, [type]: !value }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground mb-1">Notification Preferences</h3>
        <p className="text-sm text-muted-foreground">Control which notifications you receive.</p>
      </div>

      <div className="space-y-1">
        {DEFAULT_PREFERENCES.map((pref) => (
          <div key={pref.type} className="flex items-center justify-between py-3 border-b border-border last:border-0">
            <div>
              <Label className="text-sm font-semibold text-foreground">{pref.label}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{pref.description}</p>
            </div>
            <Switch
              checked={preferences[pref.type] ?? true}
              onCheckedChange={(v) => handleToggle(pref.type, v)}
              disabled={saving}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
