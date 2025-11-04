import { useFormContext } from '@/contexts/FormContext';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Step3 = () => {
  const { formData, updateFormData } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Posture Analysis</h2>
        <p className="text-muted-foreground">Assessment of postural alignment and issues</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="mb-3 block">Postural Issues</Label>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="forwardHeadPosture"
                checked={formData.forwardHeadPosture}
                onCheckedChange={(checked) =>
                  updateFormData({ forwardHeadPosture: checked as boolean })
                }
              />
              <Label htmlFor="forwardHeadPosture" className="font-normal cursor-pointer">
                Forward Head Posture
              </Label>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              Head positioned forward of shoulders when viewed from the side.
            </p>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="roundedShoulders"
                checked={formData.roundedShoulders}
                onCheckedChange={(checked) =>
                  updateFormData({ roundedShoulders: checked as boolean })
                }
              />
              <Label htmlFor="roundedShoulders" className="font-normal cursor-pointer">
                Rounded Shoulders
              </Label>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              Shoulders roll forward, upper back looks hunched.
            </p>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="anteriorPelvicTilt"
                checked={formData.anteriorPelvicTilt}
                onCheckedChange={(checked) =>
                  updateFormData({ anteriorPelvicTilt: checked as boolean })
                }
              />
              <Label htmlFor="anteriorPelvicTilt" className="font-normal cursor-pointer">
                Anterior Pelvic Tilt
              </Label>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              Pelvis tilts forward, creating an exaggerated lower back arch.
            </p>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="kyphosisLordosis"
                checked={formData.kyphosisLordosis}
                onCheckedChange={(checked) =>
                  updateFormData({ kyphosisLordosis: checked as boolean })
                }
              />
              <Label htmlFor="kyphosisLordosis" className="font-normal cursor-pointer">
                Kyphosis/Lordosis
              </Label>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              Excessive upper back rounding (kyphosis) and/or lower back curve (lordosis).
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="kneeAlignment">Knee Alignment Issues</Label>
            <Select
              value={formData.kneeAlignment}
              onValueChange={(value) => updateFormData({ kneeAlignment: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select issue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="valgus">Valgus (knock-knees)</SelectItem>
                <SelectItem value="varus">Varus (bow-legged)</SelectItem>
                <SelectItem value="hyperextension">Hyperextension</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Valgus = knees collapsing inward toward each other. Varus = knees bowing outward. Hyperextension = knees pushed back too far.
            </p>
          </div>

          <div>
            <Label htmlFor="footPosition">Foot Position Issues</Label>
            <Select
              value={formData.footPosition}
              onValueChange={(value) => updateFormData({ footPosition: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select issue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="overpronation">Overpronation</SelectItem>
                <SelectItem value="underpronation">Underpronation (Supination)</SelectItem>
                <SelectItem value="flat-feet">Flat Feet</SelectItem>
                <SelectItem value="high-arch">High Arch</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Overpronation = foot rolls inward excessively. Underpronation/supination = weight stays on outer edge of foot.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step3;
