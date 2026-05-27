/** Mirrors `RemoteAssessmentScope` in Cloud Functions `remoteAssessment.ts`. */
export type RemoteAssessmentScope = 'lifestyle' | 'lifestyle_posture' | 'posture' | 'full';

export type RemotePostureView = 'front' | 'back' | 'side-left' | 'side-right';

export type RemoteSessionPrefill = Partial<{
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  heightCm: string;
  trainingHistory: string;
  recentActivity: string;
}>;

export type RemoteSessionFailReason = 'invalid' | 'expired' | 'disabled' | 'network';

export type RemoteSessionResult =
  | { ok: true; scope: RemoteAssessmentScope; allowedKeys: string[]; prefill?: RemoteSessionPrefill }
  | { ok: false; reason: RemoteSessionFailReason };
