import { useFormContext } from '@/contexts/FormContext';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const OverheadSquatStep = () => {
  const { formData, updateFormData } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Overhead Squat</h2>
        <p className="text-muted-foreground">
          Feet shoulder-width, arms straight overhead, perform 5 slow squats. Observe alignment and control.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="overheadSquatKneeAlignment">Knee Alignment</Label>
          <Select
            value={formData.overheadSquatKneeAlignment}
            onValueChange={(value) => updateFormData({ overheadSquatKneeAlignment: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select knee alignment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-issue">No issue – knees track over toes</SelectItem>
              <SelectItem value="mild-cave">Mild cave-in (valgus)</SelectItem>
              <SelectItem value="severe-cave">Severe cave-in (valgus)</SelectItem>
              <SelectItem value="knees-out">Knees push out excessively</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="overheadSquatTorsoLean">Torso Lean</Label>
          <Select
            value={formData.overheadSquatTorsoLean}
            onValueChange={(value) => updateFormData({ overheadSquatTorsoLean: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select torso lean" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upright">Upright – no excessive lean</SelectItem>
              <SelectItem value="mild-lean">Mild forward lean</SelectItem>
              <SelectItem value="excessive-lean">Excessive forward lean</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="overheadSquatHipShift">Hip Shift</Label>
          <Select
            value={formData.overheadSquatHipShift}
            onValueChange={(value) => updateFormData({ overheadSquatHipShift: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select hip shift" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-shift">No visible shift</SelectItem>
              <SelectItem value="shift-left">Shifts left</SelectItem>
              <SelectItem value="shift-right">Shifts right</SelectItem>
              <SelectItem value="shift-unstable">Shifts side-to-side / unstable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="overheadSquatDepth">Squat Depth</Label>
          <Select
            value={formData.overheadSquatDepth}
            onValueChange={(value) => updateFormData({ overheadSquatDepth: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select squat depth" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full-depth">Full depth – hips at or below knee level</SelectItem>
              <SelectItem value="mid-range">Mid range – just above parallel</SelectItem>
              <SelectItem value="shallow">Shallow – partial squat only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="overheadSquatFootHeel">Foot / Heel Behaviour</Label>
          <Select
            value={formData.overheadSquatFootHeel}
            onValueChange={(value) => updateFormData({ overheadSquatFootHeel: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select foot/heel behaviour" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="heels-down">Heels stay down, feet stable</SelectItem>
              <SelectItem value="heels-lift">Heels lift off the floor</SelectItem>
              <SelectItem value="feet-roll-in">Feet roll in (pronation)</SelectItem>
              <SelectItem value="feet-roll-out">Feet roll out (supination)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="ohsHasPain">Pain or Discomfort?</Label>
          <Select
            value={formData.ohsHasPain}
            onValueChange={(value) => updateFormData({ ohsHasPain: value })}
          >
            <SelectTrigger className="mt-1 border-rose-200 focus:ring-rose-500">
              <SelectValue placeholder="Is there any pain?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">No pain – movement is comfortable</SelectItem>
              <SelectItem value="yes">Yes – client reported pain or discomfort</SelectItem>
            </SelectContent>
          </Select>
          {formData.ohsHasPain === 'yes' && (
            <div className="mt-4 space-y-4">
              <p className="text-xs font-bold text-rose-600 flex items-center gap-1 animate-pulse">
                <span>⚠️</span> Safety Flag: Do not load this movement pattern.
              </p>
              <div>
                <Label htmlFor="ohsPainLevel">Pain Level (1-10)</Label>
                <Select
                  value={formData.ohsPainLevel}
                  onValueChange={(value) => updateFormData({ ohsPainLevel: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Rate pain intensity" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} {n <= 3 ? '(Mild)' : n <= 6 ? '(Moderate)' : '(Severe)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div>
          <Label htmlFor="overheadSquatNotes">Coach Notes (optional)</Label>
          <Textarea
            id="overheadSquatNotes"
            value={formData.overheadSquatNotes}
            onChange={(e) => updateFormData({ overheadSquatNotes: e.target.value })}
            placeholder="Record anything unusual..."
            className="mt-1 min-h-[80px]"
          />
        </div>
      </div>
    </div>
  );
};

export default OverheadSquatStep;


