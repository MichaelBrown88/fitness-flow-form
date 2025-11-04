import { useFormContext } from '@/contexts/FormContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const Step6 = () => {
  const { formData, updateFormData } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Cardio Fitness</h2>
        <p className="text-muted-foreground">Cardiovascular fitness assessment</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="cardioTestType">Cardio Test Type *</Label>
          <Select
            value={formData.cardioTestType}
            onValueChange={(value) => updateFormData({ cardioTestType: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select test type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vo2-max">VO2 Max Test</SelectItem>
              <SelectItem value="cooper-test">Cooper 12-Min Run Test</SelectItem>
              <SelectItem value="step-test">Step Test</SelectItem>
              <SelectItem value="rockport-walk">Rockport Walk Test</SelectItem>
              <SelectItem value="beep-test">Beep Test (Shuttle Run)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-1">
            VO2 Max = maximum oxygen uptake during intense exercise. Cooper Test = distance covered in 12 minutes.
          </p>
        </div>

        <div>
          <Label htmlFor="testResult">Test Result *</Label>
          <Input
            id="testResult"
            value={formData.testResult}
            onChange={(e) => updateFormData({ testResult: e.target.value })}
            placeholder="Enter result (e.g., 45 ml/kg/min, 2500m, etc.)"
            className="mt-1"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Enter the numeric result with appropriate units
          </p>
        </div>

        <div>
          <Label htmlFor="heartRateRecovery">Heart Rate Recovery (bpm)</Label>
          <Input
            id="heartRateRecovery"
            type="number"
            value={formData.heartRateRecovery}
            onChange={(e) => updateFormData({ heartRateRecovery: e.target.value })}
            placeholder="120"
            className="mt-1"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Heart rate 1 minute after exercise completion
          </p>
        </div>

        <div>
          <Label htmlFor="cardioNotes">Coach Notes (optional)</Label>
          <Textarea
            id="cardioNotes"
            value={formData.cardioNotes}
            onChange={(e) => updateFormData({ cardioNotes: e.target.value })}
            placeholder="Interpretation of results, observations, limitations, or recommendations..."
            className="mt-1 min-h-[100px]"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Internal notes for coaches – will be used for coach PDF / backend logic, not shown as client-facing wording.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Step6;
