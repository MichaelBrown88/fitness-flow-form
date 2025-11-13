import { useFormContext } from '@/contexts/FormContext';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SitAndReachStep = () => {
  const { formData, updateFormData } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Sit-and-Reach</h2>
        <p className="text-muted-foreground">Select result category.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="sitAndReachCategory">Result *</Label>
          <Select
            value={formData.sitAndReachCategory}
            onValueChange={(value) => updateFormData({ sitAndReachCategory: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="poor">Poor — Can't reach toes</SelectItem>
              <SelectItem value="average">Average — Can reach toes</SelectItem>
              <SelectItem value="good">Good — Reach past toes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default SitAndReachStep;


