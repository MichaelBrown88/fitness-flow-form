import { useFormContext } from '@/contexts/FormContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const Step2 = () => {
  const { formData, updateFormData } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Body Composition (InBody)</h2>
        <p className="text-muted-foreground">Detailed body composition measurements</p>
      </div>

      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="height">Height (cm) *</Label>
            <Input
              id="height"
              type="number"
              value={formData.height}
              onChange={(e) => updateFormData({ height: e.target.value })}
              placeholder="170"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="weight">Weight (kg) *</Label>
            <Input
              id="weight"
              type="number"
              value={formData.weight}
              onChange={(e) => updateFormData({ weight: e.target.value })}
              placeholder="70"
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bodyFat">Body Fat % *</Label>
            <Input
              id="bodyFat"
              type="number"
              step="0.1"
              value={formData.bodyFat}
              onChange={(e) => updateFormData({ bodyFat: e.target.value })}
              placeholder="20.5"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="skeletalMuscleMass">Skeletal Muscle Mass (kg) *</Label>
            <Input
              id="skeletalMuscleMass"
              type="number"
              step="0.1"
              value={formData.skeletalMuscleMass}
              onChange={(e) => updateFormData({ skeletalMuscleMass: e.target.value })}
              placeholder="30"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="visceralFat">Visceral Fat Rating</Label>
          <Input
            id="visceralFat"
            type="number"
            value={formData.visceralFat}
            onChange={(e) => updateFormData({ visceralFat: e.target.value })}
            placeholder="10"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="segmentalDistribution">Segmental Muscle/Fat Distribution (Optional)</Label>
          <Textarea
            id="segmentalDistribution"
            value={formData.segmentalDistribution}
            onChange={(e) => updateFormData({ segmentalDistribution: e.target.value })}
            placeholder="Enter notes about muscle and fat distribution across body segments..."
            className="mt-1 min-h-[100px]"
          />
        </div>
      </div>
    </div>
  );
};

export default Step2;
