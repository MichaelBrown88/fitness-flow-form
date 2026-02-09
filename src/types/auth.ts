export type UserRole = 'org_admin' | 'coach';

export interface UserProfile {
  uid: string;
  organizationId: string;
  role: UserRole;
  displayName: string;
  onboardingCompleted?: boolean;
  /** Set to true after the coach completes their very first assessment save */
  firstAssessmentCompleted?: boolean;
}
