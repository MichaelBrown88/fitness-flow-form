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
        <p className="text-muted-foreground">Choose Step Test or 3-min Treadmill and record heart rates.</p>
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
              <SelectItem value="step-test">Step Test (3 minutes)</SelectItem>
              <SelectItem value="treadmill-3min">Treadmill (3 minutes)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.cardioTestType === 'step-test' && (
          <div className="space-y-4 border border-border rounded-md p-4">
            <div className="text-sm text-muted-foreground">
              Standardized YMCA-style: 12" step, 96 bpm (24 steps/min) for 3 minutes.
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="stepTestImmediateHr">Immediate HR (bpm) *</Label>
                <Input
                  id="stepTestImmediateHr"
                  type="number"
                  value={formData.stepTestImmediateHr}
                  onChange={(e) => updateFormData({ stepTestImmediateHr: e.target.value })}
                  placeholder="e.g., 140"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="stepTestRecoveryIntervalSec">Recovery Interval (sec)</Label>
                <Input
                  id="stepTestRecoveryIntervalSec"
                  type="number"
                  value={formData.stepTestRecoveryIntervalSec}
                  onChange={(e) => updateFormData({ stepTestRecoveryIntervalSec: e.target.value })}
                  placeholder="60"
                  className="mt-1"
                />
              </div>
        <div>
                <Label htmlFor="stepTestRecoveryHr">Recovery HR (bpm) *</Label>
          <Input
                  id="stepTestRecoveryHr"
                  type="number"
                  value={formData.stepTestRecoveryHr}
                  onChange={(e) => updateFormData({ stepTestRecoveryHr: e.target.value })}
                  placeholder="e.g., 110"
            className="mt-1"
          />
              </div>
            </div>
        </div>
        )}

        {formData.cardioTestType === 'treadmill-3min' && (
          <div className="space-y-4 border border-border rounded-md p-4">
            <div className="text-sm text-muted-foreground">
              3 minutes at a set speed (0% incline). Record immediate and 1-min recovery heart rates.
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="treadmillSpeed">Speed *</Label>
                <Input
                  id="treadmillSpeed"
                  type="number"
                  step="0.1"
                  value={formData.treadmillSpeed}
                  onChange={(e) => updateFormData({ treadmillSpeed: e.target.value })}
                  placeholder="e.g., 5.0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="treadmillSpeedUnit">Unit</Label>
                <Select
                  value={formData.treadmillSpeedUnit}
                  onValueChange={(value) => updateFormData({ treadmillSpeedUnit: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="mph" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mph">mph</SelectItem>
                    <SelectItem value="kmh">km/h</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="treadmillImmediateHr">Immediate HR (bpm) *</Label>
                <Input
                  id="treadmillImmediateHr"
                  type="number"
                  value={formData.treadmillImmediateHr}
                  onChange={(e) => updateFormData({ treadmillImmediateHr: e.target.value })}
                  placeholder="e.g., 150"
                  className="mt-1"
                />
              </div>
        <div>
                <Label htmlFor="treadmillRecoveryHr">1-min Recovery HR (bpm) *</Label>
          <Input
                  id="treadmillRecoveryHr"
            type="number"
                  value={formData.treadmillRecoveryHr}
                  onChange={(e) => updateFormData({ treadmillRecoveryHr: e.target.value })}
                  placeholder="e.g., 120"
            className="mt-1"
          />
              </div>
            </div>
        </div>
        )}

        {/* Notes */}

        <div>
          <Label htmlFor="cardioNotes">Coach Notes (optional)</Label>
          <Textarea
            id="cardioNotes"
            value={formData.cardioNotes}
            onChange={(e) => updateFormData({ cardioNotes: e.target.value })}
            placeholder="Interpretation of results, observations, limitations, or recommendations..."
            className="mt-1 min-h-[100px]"
          />
        </div>
      </div>
    </div>
  );
};

export default Step6;
