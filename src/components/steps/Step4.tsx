import { useFormContext } from '@/contexts/FormContext';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const Step4 = () => {
  const { formData, updateFormData } = useFormContext();

  const squatIssues = [
    { id: 'knees-cave', label: 'Knees cave in' },
    { id: 'arms-fall', label: 'Arms fall forward' },
    { id: 'forward-lean', label: 'Forward lean' },
    { id: 'hip-shift', label: 'Hip shift' },
    { id: 'depth-limit', label: 'Limited depth' },
  ];

  const toggleSquatIssue = (issueId: string) => {
    const currentIssues = formData.overheadSquatIssues || [];
    const newIssues = currentIssues.includes(issueId)
      ? currentIssues.filter((i) => i !== issueId)
      : [...currentIssues, issueId];
    updateFormData({ overheadSquatIssues: newIssues });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Movement & Mobility</h2>
        <p className="text-muted-foreground">Functional movement screening and mobility tests</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="mb-3 block">Overhead Squat Issues</Label>
          <div className="space-y-3">
            {squatIssues.map((issue) => (
              <div key={issue.id} className="flex items-center space-x-2">
                <Checkbox
                  id={issue.id}
                  checked={formData.overheadSquatIssues?.includes(issue.id)}
                  onCheckedChange={() => toggleSquatIssue(issue.id)}
                />
                <Label htmlFor={issue.id} className="font-normal cursor-pointer">
                  {issue.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="lungeTestLeft">Lunge Test - Left Side</Label>
            <Select
              value={formData.lungeTestLeft}
              onValueChange={(value) => updateFormData({ lungeTestLeft: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="wobble">Wobble/instability</SelectItem>
                <SelectItem value="torso-lean">Torso lean</SelectItem>
                <SelectItem value="knee-cave">Knee cave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="lungeTestRight">Lunge Test - Right Side</Label>
            <Select
              value={formData.lungeTestRight}
              onValueChange={(value) => updateFormData({ lungeTestRight: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="wobble">Wobble/instability</SelectItem>
                <SelectItem value="torso-lean">Torso lean</SelectItem>
                <SelectItem value="knee-cave">Knee cave</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="overheadReach">Overhead Reach Test</Label>
          <Select
            value={formData.overheadReach}
            onValueChange={(value) => updateFormData({ overheadReach: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pass">Pass</SelectItem>
              <SelectItem value="fail">Fail</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="shoulderMobilityNotes">Shoulder Mobility Notes</Label>
          <Textarea
            id="shoulderMobilityNotes"
            value={formData.shoulderMobilityNotes}
            onChange={(e) => updateFormData({ shoulderMobilityNotes: e.target.value })}
            placeholder="Additional observations about shoulder mobility..."
            className="mt-1 min-h-[80px]"
          />
        </div>

        <div>
          <Label htmlFor="ankleMobilityNotes">Ankle Mobility Notes</Label>
          <Textarea
            id="ankleMobilityNotes"
            value={formData.ankleMobilityNotes}
            onChange={(e) => updateFormData({ ankleMobilityNotes: e.target.value })}
            placeholder="Additional observations about ankle mobility..."
            className="mt-1 min-h-[80px]"
          />
        </div>
      </div>
    </div>
  );
};

export default Step4;
