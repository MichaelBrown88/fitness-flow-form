import { useFormContext } from '@/contexts/FormContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const LowerBodyEnduranceStep = () => {
  const { formData, updateFormData } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Lower Body Endurance</h2>
        <p className="text-muted-foreground">Bodyweight squats completed in 1 minute.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="bwSquats1Min">BW Squats in 1 minute *</Label>
          <Input
            id="bwSquats1Min"
            type="number"
            value={formData.bwSquats1Min}
            onChange={(e) => updateFormData({ bwSquats1Min: e.target.value })}
            placeholder="e.g., 35"
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
};

export default LowerBodyEnduranceStep;


