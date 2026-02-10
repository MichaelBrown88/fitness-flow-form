export type UserRole = 'org_admin' | 'coach' | 'client';

/** Roles that belong to the coach/admin staff */
export type StaffRole = 'org_admin' | 'coach';

export interface UserProfile {
  uid: string;
  organizationId: string;
  role: UserRole;
  displayName: string;
  onboardingCompleted?: boolean;
  /** Set to true after the coach completes their very first assessment save */
  firstAssessmentCompleted?: boolean;
  /** org_admin only: does this admin also coach clients directly? */
  isActiveCoach?: boolean;
  /** client only: the coach assigned to this client */
  assignedCoachUid?: string;
  /** client only: maps to the client record in the assessments collection */
  clientProfileName?: string;
}

/** Type guard: check if a role is staff (org_admin or coach) */
export function isStaffRole(role: UserRole): role is StaffRole {
  return role === 'org_admin' || role === 'coach';
}
