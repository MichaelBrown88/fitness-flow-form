import { useFormContext } from '@/contexts/FormContext';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const Step7 = () => {
  const { formData, setCurrentStep } = useFormContext();

  const sections = [
    {
      title: 'Client Information',
      step: 1,
      data: [
        { label: 'Full Name', value: formData.fullName },
        { label: 'Age', value: formData.age },
        { label: 'Gender', value: formData.gender },
        { label: 'Assigned Coach', value: formData.assignedCoach },
        { label: 'Contact Email', value: formData.contactEmail },
        { label: 'Client Goals', value: formData.clientGoals?.join(', ') },
      ],
    },
    {
      title: 'Body Composition',
      step: 2,
      data: [
        { label: 'Height', value: formData.height ? `${formData.height} cm` : '' },
        { label: 'Weight', value: formData.weight ? `${formData.weight} kg` : '' },
        { label: 'Body Fat %', value: formData.bodyFat ? `${formData.bodyFat}%` : '' },
        { label: 'Skeletal Muscle Mass', value: formData.skeletalMuscleMass ? `${formData.skeletalMuscleMass} kg` : '' },
        { label: 'Visceral Fat Rating', value: formData.visceralFat },
        { label: 'Segmental Distribution', value: formData.segmentalDistribution },
      ],
    },
    {
      title: 'Posture Analysis',
      step: 3,
      data: [
        { label: 'Forward Head Posture', value: formData.forwardHeadPosture ? 'Yes' : 'No' },
        { label: 'Rounded Shoulders', value: formData.roundedShoulders ? 'Yes' : 'No' },
        { label: 'Anterior Pelvic Tilt', value: formData.anteriorPelvicTilt ? 'Yes' : 'No' },
        { label: 'Kyphosis/Lordosis', value: formData.kyphosisLordosis ? 'Yes' : 'No' },
        { label: 'Knee Alignment', value: formData.kneeAlignment },
        { label: 'Foot Position', value: formData.footPosition },
      ],
    },
    {
      title: 'Movement & Mobility',
      step: 4,
      data: [
        { label: 'Overhead Squat Issues', value: formData.overheadSquatIssues?.join(', ') },
        { label: 'Lunge Test - Left', value: formData.lungeTestLeft },
        { label: 'Lunge Test - Right', value: formData.lungeTestRight },
        { label: 'Overhead Reach', value: formData.overheadReach },
        { label: 'Shoulder Mobility Notes', value: formData.shoulderMobilityNotes },
        { label: 'Ankle Mobility Notes', value: formData.ankleMobilityNotes },
      ],
    },
    {
      title: 'Strength & Endurance',
      step: 5,
      data: [
        { label: 'Push-up Reps', value: formData.pushupReps },
        { label: 'Plank Hold', value: formData.plankHold ? `${formData.plankHold} sec` : '' },
        { label: 'Wall-Sit', value: formData.wallSit ? `${formData.wallSit} sec` : '' },
        { label: 'Additional Notes', value: formData.strengthNotes },
      ],
    },
    {
      title: 'Cardio Fitness',
      step: 6,
      data: [
        { label: 'Test Type', value: formData.cardioTestType },
        { label: 'Test Result', value: formData.testResult },
        { label: 'Heart Rate Recovery', value: formData.heartRateRecovery ? `${formData.heartRateRecovery} bpm` : '' },
        { label: 'Notes', value: formData.cardioNotes },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Review & Submit</h2>
        <p className="text-muted-foreground">Review all information before submission</p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.step} className="p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">{section.title}</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentStep(section.step)}
              >
                Edit
              </Button>
            </div>
            <div className="space-y-2">
              {section.data.map((item, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2">
                  <Label className="text-muted-foreground font-normal">{item.label}:</Label>
                  <span className="col-span-2 text-foreground">
                    {item.value || <span className="text-muted-foreground italic">Not provided</span>}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Step7;
