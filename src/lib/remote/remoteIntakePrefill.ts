import type { BasicInfoState } from '@/components/remote/steps/RemoteBasicInfoStep';
import type { RemoteAssessmentClientIntake } from '@/services/remoteAssessmentClient';

/** Must match `BASIC_INFO_KEYS` in `functions/src/remoteAssessment.ts`. */
export const REMOTE_BASIC_INFO_FIELDS: (keyof BasicInfoState)[] = [
  'fullName',
  'email',
  'phone',
  'dateOfBirth',
  'gender',
  'heightCm',
  'trainingHistory',
  'recentActivity',
];

export type RemoteBasicInfoPrefill = Partial<Record<keyof BasicInfoState, string>>;

export function pickRemoteBasicPrefill(source: Record<string, unknown> | undefined): RemoteBasicInfoPrefill {
  if (!source) return {};
  const out: RemoteBasicInfoPrefill = {};
  for (const key of REMOTE_BASIC_INFO_FIELDS) {
    const raw = source[key];
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed) out[key] = trimmed;
    } else if (key === 'heightCm' && typeof raw === 'number' && Number.isFinite(raw)) {
      out.heightCm = String(raw);
    }
  }
  return out;
}

export function mergeRemoteBasicPrefill(...sources: RemoteBasicInfoPrefill[]): RemoteBasicInfoPrefill {
  const out: RemoteBasicInfoPrefill = {};
  for (const source of sources) {
    for (const key of REMOTE_BASIC_INFO_FIELDS) {
      const v = source[key]?.trim();
      if (v && !out[key]) out[key] = v;
    }
  }
  return out;
}

export function intakePayloadFromBasicPrefill(
  prefill: RemoteBasicInfoPrefill,
): RemoteAssessmentClientIntake {
  const intake: RemoteAssessmentClientIntake = {};
  for (const key of REMOTE_BASIC_INFO_FIELDS) {
    const v = prefill[key]?.trim();
    if (v) intake[key] = v;
  }
  return intake;
}

/** Coach assessment form (P0) → token intake metadata. */
export function intakePayloadFromFormData(formData: Record<string, unknown>): RemoteAssessmentClientIntake {
  return intakePayloadFromBasicPrefill(pickRemoteBasicPrefill(formData));
}

export function initialBasicFromPrefill(prefill: RemoteBasicInfoPrefill): BasicInfoState {
  return {
    fullName: prefill.fullName?.trim() ?? '',
    email: prefill.email?.trim() ?? '',
    phone: prefill.phone?.trim() ?? '',
    dateOfBirth: prefill.dateOfBirth?.trim() ?? '',
    gender: prefill.gender?.trim() ?? '',
    heightCm: prefill.heightCm?.trim() ?? '',
    trainingHistory: prefill.trainingHistory?.trim() ?? '',
    recentActivity: prefill.recentActivity?.trim() ?? '',
  };
}

export function basicFieldNeedsClientInput(
  field: keyof BasicInfoState,
  prefill: RemoteBasicInfoPrefill,
): boolean {
  const v = prefill[field]?.trim() ?? '';
  if (field === 'fullName') return v.length < 2;
  if (field === 'email') return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  return v.length === 0;
}

export function hasRemoteBasicPrefill(prefill: RemoteBasicInfoPrefill): boolean {
  return REMOTE_BASIC_INFO_FIELDS.some((key) => (prefill[key]?.trim() ?? '').length > 0);
}
