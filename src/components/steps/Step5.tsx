import { useFormContext } from '@/contexts/FormContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const Step5 = () => {
  const { formData, updateFormData } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Strength & Endurance Tests</h2>
        <p className="text-muted-foreground">Baseline strength and endurance measurements</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="pushupReps">Push-up Reps *</Label>
          <Input
            id="pushupReps"
            type="number"
            value={formData.pushupReps}
            onChange={(e) => updateFormData({ pushupReps: e.target.value })}
            placeholder="Enter number of reps"
            className="mt-1"
          />
          <p className="text-sm text-muted-foreground mt-1">Maximum consecutive push-ups</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="plankHold">Plank Hold (seconds) *</Label>
            <Input
              id="plankHold"
              type="number"
              value={formData.plankHold}
              onChange={(e) => updateFormData({ plankHold: e.target.value })}
              placeholder="60"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="wallSit">Wall-Sit (seconds) *</Label>
            <Input
              id="wallSit"
              type="number"
              value={formData.wallSit}
              onChange={(e) => updateFormData({ wallSit: e.target.value })}
              placeholder="45"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="strengthNotes">Coach Notes (optional)</Label>
          <Textarea
            id="strengthNotes"
            value={formData.strengthNotes}
            onChange={(e) => updateFormData({ strengthNotes: e.target.value })}
            placeholder="Any additional observations or notes about strength tests..."
            className="mt-1 min-h-[100px]"
          />
        </div>
      </div>
    </div>
  );
};

export default Step5;
