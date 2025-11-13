import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export type PostureValues = {
  forwardHeadPosture: boolean;
  roundedShoulders: boolean;
  anteriorPelvicTilt: boolean;
  kyphosisLordosis: boolean;
  kneeAlignment: string;
  footPosition: string;
};

export default function PostureModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: PostureValues;
  onClose: () => void;
  onSave: (values: PostureValues) => void;
}) {
  const [values, setValues] = useState<PostureValues>(initial);

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? undefined : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Posture Assessment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="forwardHeadPosture"
                checked={values.forwardHeadPosture}
                onCheckedChange={(c) => setValues((p) => ({ ...p, forwardHeadPosture: Boolean(c) }))}
              />
              <Label htmlFor="forwardHeadPosture">Forward head posture</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="roundedShoulders"
                checked={values.roundedShoulders}
                onCheckedChange={(c) => setValues((p) => ({ ...p, roundedShoulders: Boolean(c) }))}
              />
              <Label htmlFor="roundedShoulders">Rounded shoulders</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="anteriorPelvicTilt"
                checked={values.anteriorPelvicTilt}
                onCheckedChange={(c) => setValues((p) => ({ ...p, anteriorPelvicTilt: Boolean(c) }))}
              />
              <Label htmlFor="anteriorPelvicTilt">Anterior pelvic tilt</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="kyphosisLordosis"
                checked={values.kyphosisLordosis}
                onCheckedChange={(c) => setValues((p) => ({ ...p, kyphosisLordosis: Boolean(c) }))}
              />
              <Label htmlFor="kyphosisLordosis">Kyphosis/Lordosis</Label>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="kneeAlignment">Knee alignment</Label>
              <Select value={values.kneeAlignment} onValueChange={(v) => setValues((p) => ({ ...p, kneeAlignment: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="valgus">Valgus</SelectItem>
                  <SelectItem value="varus">Varus</SelectItem>
                  <SelectItem value="hyperextension">Hyperextension</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="footPosition">Foot position</Label>
              <Select value={values.footPosition} onValueChange={(v) => setValues((p) => ({ ...p, footPosition: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="overpronation">Overpronation</SelectItem>
                  <SelectItem value="underpronation">Underpronation (Supination)</SelectItem>
                  <SelectItem value="flat-feet">Flat Feet</SelectItem>
                  <SelectItem value="high-arch">High Arch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(values)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



