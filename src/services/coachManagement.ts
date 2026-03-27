/**
 * Coach Management Service
 * 
 * Functions for organization admins to manage coaches:
 * - Add/invite coaches to organizations
 * - Remove coaches from organizations
 * - Track coach activity and seats
 */

import { doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, collection, serverTimestamp, limit } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDb } from '@/services/firebase';
import { getUserProfilesCollection, getOrgCoachesCollection } from '@/lib/database/collections';
import { resolveStaffRosterDisplayName } from '@/lib/utils/staffDisplayName';
import { logger } from '@/lib/utils/logger';
import type { UserProfile } from '@/types/auth';
import { COLLECTIONS } from '@/constants/collections';
import { ORG_COACHES_SUBCOLLECTION_LIMIT } from '@/constants/firestoreQueryLimits';

/** Roles that should have a row under organizations/{orgId}/coaches/{uid}. */
function shouldSyncCoachRosterRole(role: string | undefined): boolean {
  return role === 'org_admin' || role === 'coach' || role === 'owner' || role === 'admin';
}

function coachesSubcollectionRole(profileRole: string): string {
  if (profileRole === 'org_admin') return 'org_admin';
  if (profileRole === 'owner') return 'owner';
  if (profileRole === 'admin') return 'admin';
  return 'coach';
}

/**
 * Keep organizations/{orgId}/coaches/{uid} displayName/email aligned with userProfiles
 * so Team metrics and Firestore rules stay consistent.
 */
export async function syncCoachRosterFromProfile(params: {
  organizationId: string;
  uid: string;
  displayName: string;
  email: string | null | undefined;
  profileRole: string;
}): Promise<void> {
  const { organizationId, uid, displayName, email, profileRole } = params;
  const db = getDb();
  const ref = doc(db, `organizations/${organizationId}/coaches/${uid}`);
  await setDoc(
    ref,
    {
      uid,
      displayName: displayName.trim() || 'Coach',
      email: email ?? null,
      role: coachesSubcollectionRole(profileRole),
    },
    { merge: true },
  );
}

export { shouldSyncCoachRosterRole };

/**
 * Add a coach to an organization by email
 * Creates a user profile with role 'coach' if the user exists in Firebase Auth
 * Note: The user must already have a Firebase Auth account - this just links them to the org
 * For full invitation flow, we'd need to send invitation emails (future enhancement)
 */
export async function addCoachToOrganization(
  orgId: string,
  coachEmail: string,
  coachName?: string
): Promise<{ success: boolean; coachUid?: string; error?: string }> {
  try {
    // For now, we assume the user already exists in Firebase Auth
    // In the future, we'd send an invitation email and create the profile when they accept
    
    // Check if a user profile already exists with this email
    const userProfilesRef = getUserProfilesCollection();
    const emailQuery = query(
      userProfilesRef,
      where('email', '==', coachEmail.toLowerCase()),
      limit(5),
    );
    const emailSnapshot = await getDocs(emailQuery);
    
    if (!emailSnapshot.empty) {
      // User already exists - update their organizationId and role
      const existingProfile = emailSnapshot.docs[0];
      const existingData = existingProfile.data();
      
      // Check if they're already in this org
      if (existingData.organizationId === orgId) {
        return { success: false, error: 'Coach is already in this organization' };
      }
      
      // Check if they're in another org
      if (existingData.organizationId && existingData.organizationId !== orgId) {
        return { success: false, error: 'Coach is already assigned to another organization' };
      }
      
      // Update to add to this org
      await updateDoc(doc(getDb(), COLLECTIONS.USER_PROFILES, existingProfile.id), {
        organizationId: orgId,
        role: 'coach',
        updatedAt: serverTimestamp(),
      });
      
      logger.info(`Added existing coach ${coachEmail} to org ${orgId}`);
      return { success: true, coachUid: existingProfile.id };
    }
    
    // User doesn't exist yet - create a placeholder profile
    // In a real system, we'd send an invitation email and create the profile when they accept
    // For now, we create a minimal profile that will be updated when they sign up
    // Note: We can't create Firebase Auth users from the client side for security reasons
    
    logger.warn(`Coach ${coachEmail} does not exist yet. Use sendCoachInviteEmail to send an invitation.`);
    return {
      success: false,
      error: 'COACH_NOT_FOUND', // Caller can use this to trigger email invite
    };
  } catch (error) {
    logger.error('Error adding coach to organization:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error adding coach' 
    };
  }
}

/**
 * Remove a coach from an organization
 * Sets their organizationId to null and role to null (they become an orphaned user)
 * In production, you might want to delete their profile or archive their data
 */
export async function removeCoachFromOrganization(
  orgId: string,
  coachUid: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const coachProfileRef = doc(getDb(), COLLECTIONS.USER_PROFILES, coachUid);
    const coachProfileSnap = await getDoc(coachProfileRef);
    
    if (!coachProfileSnap.exists()) {
      return { success: false, error: 'Coach profile not found' };
    }
    
    const coachData = coachProfileSnap.data();
    
    // Verify they're in this org
    if (coachData.organizationId !== orgId) {
      return { success: false, error: 'Coach is not in this organization' };
    }
    
    // Verify they're not an org admin (admins can't be removed this way)
    if (coachData.role === 'org_admin') {
      return { success: false, error: 'Cannot remove organization admin. Transfer admin role first.' };
    }
    
    // Remove from organization (set to null/empty)
    await updateDoc(coachProfileRef, {
      organizationId: null,
      role: null,
      updatedAt: serverTimestamp(),
    });
    
    logger.info(`Removed coach ${coachUid} from org ${orgId}`);
    return { success: true };
  } catch (error) {
    logger.error('Error removing coach from organization:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error removing coach' 
    };
  }
}

/**
 * Send a coach invitation email via Cloud Function.
 * Recipient gets a link to onboarding?invite={token}; on sign-up they are assigned to the org.
 * Requires a transactional email provider configured in Functions.
 */
export async function sendCoachInviteEmail(params: {
  email: string;
  organizationId: string;
  organizationName: string;
  invitedBy: string;
}): Promise<void> {
  const functions = getFunctions();
  const sendInvite = httpsCallable<
    { email: string; organizationId: string; organizationName: string; invitedBy: string },
    { success: boolean }
  >(functions, 'sendCoachInvite');
  await sendInvite(params);
}

/**
 * Create a smart invitation link for a coach
 * Stores the invitation in Firestore and returns a shareable link
 */
export async function createCoachInvitationLink(
  orgId: string,
  coachEmail: string
): Promise<string> {
  try {
    const db = getDb();
    const invitationsRef = collection(db, 'coachInvitations');
    
    // Create invitation document
    const invitationId = `${orgId}_${coachEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const invitationDoc = {
      orgId,
      coachEmail: coachEmail.toLowerCase(),
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt,
    };
    
    await setDoc(doc(db, 'coachInvitations', invitationId), invitationDoc);
    
    // Generate invitation link
    const baseUrl = window.location.origin;
    const inviteLink = `${baseUrl}/invite/coach/${invitationId}`;
    
    logger.info(`Created invitation link for ${coachEmail} to org ${orgId}`);
    return inviteLink;
  } catch (error) {
    logger.error('Error creating coach invitation link:', error);
    throw error;
  }
}

/**
 * Get all coaches in an organization with their stats
 * Reads from organizations/{orgId}/coaches/{uid} for pre-aggregated stats
 */
export async function getOrgCoaches(orgId: string): Promise<Array<{
  uid: string;
  displayName: string;
  email?: string;
  role: string;
  clientCount: number;
  assessmentCount: number;
}>> {
  try {
    // First, get coaches from the organization's coaches collection (with stats)
    const orgCoachesRef = getOrgCoachesCollection(orgId);
    const orgCoachesSnapshot = await getDocs(
      query(orgCoachesRef, limit(ORG_COACHES_SUBCOLLECTION_LIMIT)),
    );

    const coachesFromOrg: Array<{
      uid: string;
      displayName: string;
      email?: string;
      role: string;
      clientCount: number;
      assessmentCount: number;
    }> = [];

    orgCoachesSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      coachesFromOrg.push({
        uid: docSnap.id,
        displayName: resolveStaffRosterDisplayName(data.displayName, data.email),
        email: data.email,
        role: data.role || 'coach',
        clientCount: data.stats?.clientCount || 0,
        assessmentCount: data.stats?.assessmentCount || 0,
      });
    });

    // If we have coaches from the org collection, use those
    if (coachesFromOrg.length > 0) {
      return coachesFromOrg.sort((a, b) => b.assessmentCount - a.assessmentCount);
    }

    // Fallback: query userProfiles for coaches in this org
    const userProfilesRef = getUserProfilesCollection();
    const orgQuery = query(
      userProfilesRef,
      where('organizationId', '==', orgId),
      limit(ORG_COACHES_SUBCOLLECTION_LIMIT),
    );
    const snapshot = await getDocs(orgQuery);

    const coaches: Array<{
      uid: string;
      displayName: string;
      email?: string;
      role: string;
      clientCount: number;
      assessmentCount: number;
    }> = [];

    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (data.role === 'coach' || data.role === 'org_admin') {
        coaches.push({
          uid: docSnap.id,
          displayName: resolveStaffRosterDisplayName(data.displayName, data.email as string | undefined),
          email: data.email,
          role: data.role,
          clientCount: 0,
          assessmentCount: 0,
        });
      }
    });

    return coaches.sort((a, b) => b.assessmentCount - a.assessmentCount);
  } catch (error) {
    logger.error('Error fetching organization coaches:', error);
    throw error;
  }
}
