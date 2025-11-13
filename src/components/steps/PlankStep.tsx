import { useFormContext } from '@/contexts/FormContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const PlankStep = () => {
  const { formData, updateFormData } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Plank Hold</h2>
        <p className="text-muted-foreground">Record plank hold time in seconds.</p>
      </div>

      <div className="space-y-4">
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
      </div>
    </div>
  );
};

export default PlankStep;


