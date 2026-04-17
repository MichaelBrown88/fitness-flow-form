/**
 * ScheduleDialog — lets the coach pick which pillars to assess and when.
 * Writes dueDateOverrides to Firestore for each selected pillar.
 */

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Scan, Camera, Heart, Dumbbell, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { setDueDateOverride } from '@/services/clientProfiles';
import { formatClientDisplayName } from '@/lib/utils/clientDisplayName';
import type { ReassessmentItem, PillarSchedule } from '@/hooks/useReassessmentQueue';
import { useToast } from '@/hooks/use-toast';

const PILLAR_META = [
  { id: 'bodycomp', label: 'Body Composition', Icon: Scan, color: 'text-blue-500' },
  { id: 'posture', label: 'Movement Quality', Icon: Camera, color: 'text-violet-500' },
  { id: 'fitness', label: 'Metabolic Fitness', Icon: Heart, color: 'text-rose-500' },
  { id: 'strength', label: 'Functional Strength', Icon: Dumbbell, color: 'text-amber-500' },
  { id: 'lifestyle', label: 'Lifestyle Factors', Icon: Activity, color: 'text-emerald-500' },
] as const;

interface ScheduleDialogProps {
  client: ReassessmentItem;
  organizationId: string;
  onScheduled: () => void;
  onClose: () => void;
}

export function ScheduleDialog({ client, organizationId, onScheduled, onClose }: ScheduleDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Pre-check pillars that are due or overdue
  const duePillarIds = useMemo(() => {
    return new Set(
      client.pillarSchedules
        .filter(ps => ps.status === 'overdue' || ps.status === 'due-soon')
        .map(ps => ps.pillar)
        .filter(p => p !== 'full'),
    );
  }, [client.pillarSchedules]);

  const [selectedPillars, setSelectedPillars] = useState<Set<string>>(() => new Set(duePillarIds));

  const togglePillar = (id: string) => {
    setSelectedPillars(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canSubmit = selectedPillars.size > 0 && selectedDate;

  const handleSchedule = async () => {
    if (!selectedDate || selectedPillars.size === 0) return;
    setSaving(true);
    try {
      for (const pillar of selectedPillars) {
        await setDueDateOverride(client.clientName, organizationId, pillar, selectedDate);
      }
      toast({
        title: 'Scheduled',
        description: `${selectedPillars.size} assessment${selectedPillars.size !== 1 ? 's' : ''} scheduled for ${format(selectedDate, 'MMM d, yyyy')}.`,
      });
      onScheduled();
    } catch (err) {
      toast({
        title: 'Failed to schedule',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const displayName = formatClientDisplayName(client.clientName);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[420px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Schedule Assessment</DialogTitle>
          <DialogDescription>
            Choose which pillars to assess for {displayName} and pick a date.
          </DialogDescription>
        </DialogHeader>

        {/* Pillar checkboxes */}
        <div className="space-y-2 py-2">
          {PILLAR_META.map(({ id, label, Icon, color }) => {
            const ps = client.pillarSchedules.find(s => s.pillar === id);
            const isDue = ps && (ps.status === 'overdue' || ps.status === 'due-soon');
            return (
              <label
                key={id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedPillars.has(id)}
                  onCheckedChange={() => togglePillar(id)}
                />
                <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                <span className="text-sm font-medium text-foreground flex-1">{label}</span>
                {isDue && (
                  <span className="text-[10px] font-bold text-muted-foreground">Due</span>
                )}
              </label>
            );
          })}
        </div>

        {/* Date picker */}
        <div className="py-2">
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-11 rounded-xl text-sm font-medium"
              >
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                {selectedDate ? format(selectedDate, 'EEEE, MMM d, yyyy') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date ?? undefined);
                  setDatePickerOpen(false);
                }}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </PopoverContent>
          </Popover>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={() => void handleSchedule()}
            disabled={!canSubmit || saving}
            className="rounded-xl"
          >
            {saving ? 'Scheduling...' : `Schedule ${selectedPillars.size} pillar${selectedPillars.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
