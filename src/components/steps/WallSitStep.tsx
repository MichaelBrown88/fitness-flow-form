import { useFormContext } from '@/contexts/FormContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const WallSitStep = () => {
  const { formData, updateFormData } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Wall-Sit</h2>
        <p className="text-muted-foreground">Record wall-sit time in seconds.</p>
      </div>

      <div className="space-y-4">
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
    </div>
  );
};

export default WallSitStep;


