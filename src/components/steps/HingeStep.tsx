import { useFormContext } from '@/contexts/FormContext';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const HingeStep = () => {
  const { formData, updateFormData } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Hip Hinge</h2>
        <p className="text-muted-foreground">Assess hip hinge pattern quality and spinal control.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="hingeQuality">Hinge Quality</Label>
          <Select
            value={formData.hingeQuality}
            onValueChange={(value) => updateFormData({ hingeQuality: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select quality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="good">Good – neutral spine, hips back</SelectItem>
              <SelectItem value="compensation">Compensations – minor rounding or knee bend</SelectItem>
              <SelectItem value="poor">Poor – significant rounding or squat-dominant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="hingeBalance">Balance / Control</Label>
          <Select
            value={formData.hingeBalance}
            onValueChange={(value) => updateFormData({ hingeBalance: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select balance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stable">Stable</SelectItem>
              <SelectItem value="slight-wobble">Slight wobble</SelectItem>
              <SelectItem value="unstable">Unstable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="hingeHasPain">Pain or Discomfort?</Label>
          <Select
            value={formData.hingeHasPain}
            onValueChange={(value) => updateFormData({ hingeHasPain: value })}
          >
            <SelectTrigger className="mt-1 border-rose-200 focus:ring-rose-500">
              <SelectValue placeholder="Is there any pain?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">No pain – movement is comfortable</SelectItem>
              <SelectItem value="yes">Yes – client reported pain or discomfort</SelectItem>
            </SelectContent>
          </Select>
          {formData.hingeHasPain === 'yes' && (
            <p className="mt-1.5 text-xs font-bold text-rose-600 flex items-center gap-1 animate-pulse">
              <span>⚠️</span> Safety Flag: Do not load this movement pattern.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="hingeNotes">Coach Notes (optional)</Label>
          <Textarea
            id="hingeNotes"
            value={formData.hingeNotes}
            onChange={(e) => updateFormData({ hingeNotes: e.target.value })}
            placeholder="Notes on depth, spinal posture, hamstring tension..."
            className="mt-1 min-h-[80px]"
          />
        </div>
      </div>
    </div>
  );
};

export default HingeStep;


