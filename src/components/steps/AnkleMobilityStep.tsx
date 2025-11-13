import { useFormContext } from '@/contexts/FormContext';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const AnkleMobilityStep = () => {
  const { formData, updateFormData } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Ankle / Lower-Limb Mobility</h2>
        <p className="text-muted-foreground">Rate overall ankle and lower-limb mobility.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="ankleMobilityRating">Ankle Mobility Rating</Label>
          <Select
            value={formData.ankleMobilityRating}
            onValueChange={(value) => updateFormData({ ankleMobilityRating: value })}
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
          <Label htmlFor="ankleMobilityNotes">Coach Notes (optional)</Label>
          <Textarea
            id="ankleMobilityNotes"
            value={formData.ankleMobilityNotes}
            onChange={(e) => updateFormData({ ankleMobilityNotes: e.target.value })}
            placeholder="Notes on calves, Achilles, knee-to-wall test, etc."
            className="mt-1 min-h-[80px]"
          />
        </div>
      </div>
    </div>
  );
};

export default AnkleMobilityStep;


