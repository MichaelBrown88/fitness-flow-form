import { useFormContext } from '@/contexts/FormContext';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const OverheadReachStep = () => {
  const { formData, updateFormData } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Overhead Reach</h2>
        <p className="text-muted-foreground">
          Stand tall, keep ribs and lower back still, and slowly raise both arms overhead.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="overheadReachResult">Result</Label>
          <Select
            value={formData.overheadReachResult}
            onValueChange={(value) => updateFormData({ overheadReachResult: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full-range">Full range – arms in line with ears, no compensation</SelectItem>
              <SelectItem value="limited-range">Limited range – arms stay in front of ears</SelectItem>
              <SelectItem value="limited-with-arch">Limited range with low-back arch</SelectItem>
              <SelectItem value="pain-reported">Pain or discomfort reported</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="shoulderMobilityRating">Shoulder Mobility</Label>
          <Select
            value={formData.shoulderMobilityRating}
            onValueChange={(value) => updateFormData({ shoulderMobilityRating: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="ok">OK – some restriction</SelectItem>
              <SelectItem value="poor">Poor – very restricted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="overheadReachNotes">Coach Notes (optional)</Label>
          <Textarea
            id="overheadReachNotes"
            value={formData.overheadReachNotes}
            onChange={(e) => updateFormData({ overheadReachNotes: e.target.value })}
            placeholder="Details about restriction or pain location..."
            className="mt-1 min-h-[80px]"
          />
        </div>
      </div>
    </div>
  );
};

export default OverheadReachStep;


