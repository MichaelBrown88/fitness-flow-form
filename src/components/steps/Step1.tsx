import { useFormContext } from '@/contexts/FormContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const Step1 = () => {
  const { formData, updateFormData } = useFormContext();

  const goalOptions = [
    { id: 'weight-loss', label: 'Weight Loss' },
    { id: 'muscle-gain', label: 'Muscle Gain' },
    { id: 'improve-mobility', label: 'Improve Mobility' },
    { id: 'general-fitness', label: 'General Fitness' },
  ];

  const toggleGoal = (goalId: string) => {
    const currentGoals = formData.clientGoals || [];
    const newGoals = currentGoals.includes(goalId)
      ? currentGoals.filter((g) => g !== goalId)
      : [...currentGoals, goalId];
    updateFormData({ clientGoals: newGoals });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Client Information</h2>
        <p className="text-muted-foreground">Basic information about the client</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            value={formData.fullName}
            onChange={(e) => updateFormData({ fullName: e.target.value })}
            placeholder="Enter full name"
            className="mt-1"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="age">Age *</Label>
            <Input
              id="age"
              type="number"
              value={formData.age}
              onChange={(e) => updateFormData({ age: e.target.value })}
              placeholder="Enter age"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="gender">Gender *</Label>
            <Select value={formData.gender} onValueChange={(value) => updateFormData({ gender: value })}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="assignedCoach">Assigned Coach *</Label>
          <Select
            value={formData.assignedCoach}
            onValueChange={(value) => updateFormData({ assignedCoach: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select coach" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Coach Mike">Coach Mike</SelectItem>
              <SelectItem value="Coach Selina">Coach Selina</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="contactEmail">Contact Email *</Label>
          <Input
            id="contactEmail"
            type="email"
            value={formData.contactEmail}
            onChange={(e) => updateFormData({ contactEmail: e.target.value })}
            placeholder="email@example.com"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="mb-3 block">Client Goals *</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {goalOptions.map((goal) => (
              <label key={goal.id} htmlFor={goal.id} className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  id={goal.id}
                  checked={formData.clientGoals?.includes(goal.id)}
                  onCheckedChange={() => toggleGoal(goal.id)}
                />
                <span className="text-sm">{goal.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Sessions per Week input removed; selection happens on results page only */}
      </div>
    </div>
  );
};

export default Step1;
