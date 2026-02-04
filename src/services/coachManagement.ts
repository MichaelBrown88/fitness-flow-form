/**
 * Coach Management Service
 * 
 * Functions for organization admins to manage coaches:
 * - Add/invite coaches to organizations
 * - Remove coaches from organizations
 * - Track coach activity and seats
 */

import { doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, collection } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { getLegacyUserProfilesCollection } from '@/lib/database/collections';
import { logger } from '@/lib/utils/logger';
import type { UserProfile } from '@/types/auth';
import { COLLECTIONS } from '@/constants/collections';

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
    const userProfilesRef = getLegacyUserProfilesCollection();
    const emailQuery = query(userProfilesRef, where('email', '==', coachEmail.toLowerCase()));
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
        updatedAt: new Date(),
      });
      
      logger.info(`Added existing coach ${coachEmail} to org ${orgId}`);
      return { success: true, coachUid: existingProfile.id };
    }
    
    // User doesn't exist yet - create a placeholder profile
    // In a real system, we'd send an invitation email and create the profile when they accept
    // For now, we create a minimal profile that will be updated when they sign up
    // Note: We can't create Firebase Auth users from the client side for security reasons
    
    logger.warn(`Coach ${coachEmail} does not exist yet. Full invitation flow requires server-side email sending.`);
    return { 
      success: false, 
      error: 'Coach invitation system requires server-side implementation. Coach must sign up first, then you can assign them to your organization.' 
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
      updatedAt: new Date(),
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
    const invitationDoc = {
      orgId,
      coachEmail: coachEmail.toLowerCase(),
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
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
 * Note: Only returns users with role 'coach', not 'org_admin'
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
    const userProfilesRef = getLegacyUserProfilesCollection();
    const orgQuery = query(userProfilesRef, where('organizationId', '==', orgId));
    const snapshot = await getDocs(orgQuery);
    
    const coaches: Array<{ uid: string; displayName: string; email?: string; role: string }> = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      // Include both coaches and org_admins (admins can also perform assessments)
      if (data.role === 'coach' || data.role === 'org_admin') {
        coaches.push({
          uid: doc.id,
          displayName: data.displayName || data.email || 'Unknown',
          email: data.email,
          role: data.role,
        });
      }
    });
    
    // Get stats for each coach
    const db = getDb();
    const coachesWithStats = await Promise.all(
      coaches.map(async (coach) => {
        try {
          // Count assessments
          const assessmentsRef = collection(db, 'coaches', coach.uid, 'assessments');
          const assessmentsSnapshot = await getDocs(assessmentsRef);
          const assessmentCount = assessmentsSnapshot.size;
          
          // Count clients
          const clientsRef = collection(db, 'coaches', coach.uid, 'clients');
          const clientsSnapshot = await getDocs(clientsRef);
          const clientCount = clientsSnapshot.size;
          
          return {
            ...coach,
            assessmentCount,
            clientCount,
          };
        } catch (error) {
          logger.warn(`Error fetching stats for coach ${coach.uid}:`, error);
          return {
            ...coach,
            assessmentCount: 0,
            clientCount: 0,
          };
        }
      })
    );
    
    return coachesWithStats.sort((a, b) => b.assessmentCount - a.assessmentCount);
  } catch (error) {
    logger.error('Error fetching organization coaches:', error);
    throw error;
  }
}
