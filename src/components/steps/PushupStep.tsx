import { useFormContext } from '@/contexts/FormContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const PushupStep = () => {
  const { formData, updateFormData } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Push-up Test</h2>
        <p className="text-muted-foreground">
          1-minute push-up test. {formData.gender === 'female' ? 'Knees on the floor.' : 'Standard full push-up.'}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="pushupReps">Push-ups completed in 1 minute *</Label>
          <Input
            id="pushupReps"
            type="number"
            value={formData.pushupReps}
            onChange={(e) => updateFormData({ pushupReps: e.target.value })}
            placeholder="Enter number of reps"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="strengthNotes">Coach Notes (optional)</Label>
          <Textarea
            id="strengthNotes"
            value={formData.strengthNotes}
            onChange={(e) => updateFormData({ strengthNotes: e.target.value })}
            placeholder="Observations for strength tests..."
            className="mt-1 min-h-[100px]"
          />
        </div>
      </div>
    </div>
  );
};

export default PushupStep;


