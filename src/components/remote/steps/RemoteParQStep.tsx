import ParQQuestionnaire from '@/components/ParQQuestionnaire';

interface RemoteParQStepProps {
  value: Record<string, string>;
  onChange: (patch: Record<string, string>) => void;
  gender: string;
}

export function RemoteParQStep({ value, onChange, gender }: RemoteParQStepProps) {
  const PARQ_MEDICAL_IDS = ['parq1','parq2','parq3','parq4','parq5','parq6','parq7'];
  const hasFlagged = PARQ_MEDICAL_IDS.some((id) => value[id] === 'yes');

  return (
    <div className="space-y-4">
      {hasFlagged && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 space-y-1">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Medical clearance required
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
            One or more of your answers requires you to seek advice from a doctor before starting physical training. Please consult your doctor before your in-studio session. You can still complete and submit this form -- physical assessments will only proceed once written confirmation is in place that it is safe for you to exercise.
          </p>
        </div>
      )}
      <ParQQuestionnaire
        value={value}
        onChange={onChange}
        gender={gender}
      />
    </div>
  );
}
