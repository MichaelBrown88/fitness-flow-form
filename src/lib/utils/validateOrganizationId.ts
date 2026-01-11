import type { UserProfile } from '@/types/auth';

/**
 * Validates and returns a valid organizationId
 * @param orgId - Optional organizationId from function parameter
 * @param profile - User profile which may contain organizationId
 * @returns Valid organizationId string
 * @throws Error if organizationId cannot be determined
 */
export function validateOrganizationId(
  orgId: string | undefined,
  profile: UserProfile | null | undefined
): string {
  // If provided explicitly, use it
  if (orgId) {
    return orgId;
  }

  // Fall back to profile's organizationId
  if (profile?.organizationId) {
    return profile.organizationId;
  }

  // If neither available, throw error
  throw new Error(
    'Organization ID is required. Please ensure you are logged in and belong to an organization.'
  );
}
