/** Mirrors `RemoteAssessmentScope` in Cloud Functions `remoteAssessment.ts`. */
export type RemoteAssessmentScope = 'lifestyle' | 'lifestyle_posture' | 'posture';

export type RemotePostureView = 'front' | 'back' | 'side-left' | 'side-right';

export type RemoteSessionResult =
  | { ok: true; scope: RemoteAssessmentScope; allowedKeys: string[] }
  | { ok: false };
