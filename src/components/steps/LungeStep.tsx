import { useFormContext } from '@/contexts/FormContext';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const LungeStep = () => {
  const { formData, updateFormData } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Lunge Test</h2>
        <p className="text-muted-foreground">
          Forward lunge for 5 reps per side. Observe knee alignment, balance, and torso posture.
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-medium text-sm uppercase text-muted-foreground">Left Side</h3>

            <div>
              <Label htmlFor="lungeLeftKneeAlignment">Front Knee Alignment</Label>
              <Select
                value={formData.lungeLeftKneeAlignment}
                onValueChange={(value) => updateFormData({ lungeLeftKneeAlignment: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select alignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tracks-center">Tracks over middle toes</SelectItem>
                  <SelectItem value="caves-inward">Caves inward</SelectItem>
                  <SelectItem value="pushes-out">Pushes out</SelectItem>
                  <SelectItem value="wobbles">Wobbles in and out</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="lungeLeftBalance">Balance / Stability</Label>
              <Select
                value={formData.lungeLeftBalance}
                onValueChange={(value) => updateFormData({ lungeLeftBalance: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select balance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stable">Stable – no wobble</SelectItem>
                  <SelectItem value="slight-wobble">Slight wobble</SelectItem>
                  <SelectItem value="unstable">Very unstable / loss of balance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="lungeLeftTorso">Torso Posture</Label>
              <Select
                value={formData.lungeLeftTorso}
                onValueChange={(value) => updateFormData({ lungeLeftTorso: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select torso posture" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upright">Upright torso</SelectItem>
                  <SelectItem value="mild-lean">Mild forward lean</SelectItem>
                  <SelectItem value="excessive-lean">Excessive forward lean / rounding</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-sm uppercase text-muted-foreground">Right Side</h3>

            <div>
              <Label htmlFor="lungeRightKneeAlignment">Front Knee Alignment</Label>
              <Select
                value={formData.lungeRightKneeAlignment}
                onValueChange={(value) => updateFormData({ lungeRightKneeAlignment: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select alignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tracks-center">Tracks over middle toes</SelectItem>
                  <SelectItem value="caves-inward">Caves inward</SelectItem>
                  <SelectItem value="pushes-out">Pushes out</SelectItem>
                  <SelectItem value="wobbles">Wobbles in and out</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="lungeRightBalance">Balance / Stability</Label>
              <Select
                value={formData.lungeRightBalance}
                onValueChange={(value) => updateFormData({ lungeRightBalance: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select balance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stable">Stable – no wobble</SelectItem>
                  <SelectItem value="slight-wobble">Slight wobble</SelectItem>
                  <SelectItem value="unstable">Very unstable / loss of balance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="lungeRightTorso">Torso Posture</Label>
              <Select
                value={formData.lungeRightTorso}
                onValueChange={(value) => updateFormData({ lungeRightTorso: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select torso posture" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upright">Upright torso</SelectItem>
                  <SelectItem value="mild-lean">Mild forward lean</SelectItem>
                  <SelectItem value="excessive-lean">Excessive forward lean / rounding</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
          <div>
            <Label htmlFor="lungeHasPain">Pain or Discomfort?</Label>
            <Select
              value={formData.lungeHasPain}
              onValueChange={(value) => updateFormData({ lungeHasPain: value })}
            >
              <SelectTrigger className="mt-1 border-rose-200 focus:ring-rose-500">
                <SelectValue placeholder="Is there any pain?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No pain – movement is comfortable</SelectItem>
                <SelectItem value="yes">Yes – client reported pain or discomfort</SelectItem>
              </SelectContent>
            </Select>
            {formData.lungeHasPain === 'yes' && (
              <p className="mt-1.5 text-xs font-bold text-rose-600 flex items-center gap-1 animate-pulse">
                <span>⚠️</span> Safety Flag: Do not load this movement pattern.
              </p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="lungeTestNotes">Coach Notes (optional)</Label>
          <Textarea
            id="lungeTestNotes"
            value={formData.lungeTestNotes}
            onChange={(e) => updateFormData({ lungeTestNotes: e.target.value })}
            placeholder="Side-to-side differences or pain reported..."
            className="mt-1 min-h-[80px]"
          />
        </div>
      </div>
    </div>
  );
};

export default LungeStep;


