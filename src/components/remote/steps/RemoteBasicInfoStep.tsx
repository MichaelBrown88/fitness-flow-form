import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ASSESSMENT_LABELS, ASSESSMENT_OPTIONS, ASSESSMENT_PLACEHOLDERS } from '@/constants/assessment';

export type BasicInfoState = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  heightCm: string;
  trainingHistory: string;
  recentActivity: string;
};

export const INITIAL_BASIC_INFO: BasicInfoState = {
  fullName: '', email: '', phone: '', dateOfBirth: '',
  gender: '', heightCm: '', trainingHistory: '', recentActivity: '',
};

export function isBasicInfoValid(v: BasicInfoState): boolean {
  return (
    v.fullName.trim().length >= 2 &&
    v.email.trim().length > 0 &&
    v.phone.trim().length > 0 &&
    v.dateOfBirth.trim().length > 0 &&
    v.gender.trim().length > 0 &&
    v.heightCm.trim().length > 0 &&
    v.trainingHistory.trim().length > 0 &&
    v.recentActivity.trim().length > 0
  );
}

const L = ASSESSMENT_LABELS.P0;
const PH = ASSESSMENT_PLACEHOLDERS.P0;

interface RemoteBasicInfoStepProps {
  value: BasicInfoState;
  onChange: (next: BasicInfoState) => void;
}

export function RemoteBasicInfoStep({ value, onChange }: RemoteBasicInfoStepProps) {
  const patch = (partial: Partial<BasicInfoState>) => onChange({ ...value, ...partial });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Your coach sent you this private link. Please fill in your details below — this information is only visible to your coach.
      </p>

      <div className="space-y-2">
        <Label>{L.fullName}</Label>
        <Input
          value={value.fullName}
          onChange={(e) => patch({ fullName: e.target.value })}
          placeholder={PH.fullName}
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <Label>{L.email}</Label>
        <Input
          type="email"
          value={value.email}
          onChange={(e) => patch({ email: e.target.value })}
          placeholder={PH.email}
          autoComplete="email"
          inputMode="email"
        />
      </div>

      <div className="space-y-2">
        <Label>{L.phone}</Label>
        <Input
          type="tel"
          value={value.phone}
          onChange={(e) => patch({ phone: e.target.value })}
          placeholder={PH.phone}
          autoComplete="tel"
          inputMode="tel"
        />
      </div>

      <div className="space-y-2">
        <Label>{L.dateOfBirth}</Label>
        <Input
          type="date"
          value={value.dateOfBirth}
          onChange={(e) => patch({ dateOfBirth: e.target.value })}
          autoComplete="bday"
        />
      </div>

      <div className="space-y-2">
        <Label>{L.gender}</Label>
        <Select value={value.gender} onValueChange={(v) => patch({ gender: v })}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {ASSESSMENT_OPTIONS.gender.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Height (cm)</Label>
        <Input
          type="number"
          inputMode="numeric"
          value={value.heightCm}
          onChange={(e) => patch({ heightCm: e.target.value })}
          placeholder="e.g., 175"
        />
      </div>

      <div className="space-y-2">
        <Label>{L.trainingHistory}</Label>
        <Select value={value.trainingHistory} onValueChange={(v) => patch({ trainingHistory: v })}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {ASSESSMENT_OPTIONS.trainingHistory.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{L.recentActivity}</Label>
        <Select value={value.recentActivity} onValueChange={(v) => patch({ recentActivity: v })}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {ASSESSMENT_OPTIONS.recentActivity.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
