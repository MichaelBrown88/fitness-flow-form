import { useFormContext } from '@/contexts/FormContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const GripStrengthStep = () => {
  const { formData, updateFormData } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Grip Strength</h2>
        <p className="text-muted-foreground">Best of 2 trials per hand using a dynamometer (kg).</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="gripLeftKg">Left Hand (kg)</Label>
          <Input
            id="gripLeftKg"
            type="number"
            step="0.5"
            value={formData.gripLeftKg}
            onChange={(e) => updateFormData({ gripLeftKg: e.target.value })}
            placeholder="e.g., 28.5"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="gripRightKg">Right Hand (kg)</Label>
          <Input
            id="gripRightKg"
            type="number"
            step="0.5"
            value={formData.gripRightKg}
            onChange={(e) => updateFormData({ gripRightKg: e.target.value })}
            placeholder="e.g., 32.0"
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
};

export default GripStrengthStep;


