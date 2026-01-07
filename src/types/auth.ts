export type UserRole = 'org_admin' | 'coach';

export interface UserProfile {
  uid: string;
  organizationId: string;
  role: UserRole;
  displayName: string;
}
