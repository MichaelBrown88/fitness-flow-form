import { describe, expect, it } from 'vitest';
import { validateOrganizationId } from '@/lib/utils/validateOrganizationId';
import type { UserProfile } from '@/types/auth';

describe('validateOrganizationId', () => {
  it('returns explicit orgId when provided', () => {
    const profile: UserProfile = {
      uid: 'u1',
      organizationId: 'org-from-profile',
      role: 'org_admin',
      displayName: 'Coach',
    };
    expect(validateOrganizationId('org-explicit', profile)).toBe('org-explicit');
  });

  it('falls back to profile.organizationId', () => {
    const profile: UserProfile = {
      uid: 'u1',
      organizationId: 'org-fallback',
      role: 'coach',
      displayName: 'Coach',
    };
    expect(validateOrganizationId(undefined, profile)).toBe('org-fallback');
  });

  it('throws when org cannot be resolved', () => {
    expect(() => validateOrganizationId(undefined, null)).toThrow(/Organization ID is required/);
    expect(() => validateOrganizationId(undefined, { uid: 'x', organizationId: '', role: 'coach', displayName: 'A' } as UserProfile)).toThrow(
      /Organization ID is required/,
    );
  });
});
