/**
 * Platform Admin Service - Core Admin CRUD
 *
 * Handles platform admin user management:
 * - Admin lookup and verification
 * - Admin creation and migration
 * - Login tracking
 */

import {
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  type DocumentData,
  type DocumentSnapshot,
} from 'firebase/firestore';
import type { PlatformAdmin, PlatformPermission } from '@/types/platform';
import { logger } from '@/lib/utils/logger';
import {
  getPlatformAdminsCollection,
  getPlatformAdminDoc,
  getPlatformAdminLookupDoc,
  getPlatformAdminLegacyLookupDoc,
  mirrorPlatformAdminLookupWrite,
} from '@/lib/database/collections';

const PLATFORM_ADMIN_QUERY_LIMIT = 1;

async function getPlatformAdminLookupSnapshot(
  email: string,
): Promise<DocumentSnapshot | null> {
  const canonicalSnap = await getDoc(getPlatformAdminLookupDoc(email));
  if (canonicalSnap.exists()) return canonicalSnap;
  const legacySnap = await getDoc(getPlatformAdminLegacyLookupDoc(email));
  if (legacySnap.exists()) return legacySnap;
  return null;
}

/**
 * Check if a user is a platform admin by email
 */
export async function isPlatformAdmin(email: string): Promise<boolean> {
  try {
    const lookupSnap = await getPlatformAdminLookupSnapshot(email);
    if (lookupSnap) return true;

    // Fallback to query (for backwards compatibility)
    const adminQuery = query(
      getPlatformAdminsCollection(),
      where('email', '==', email.toLowerCase()),
      firestoreLimit(PLATFORM_ADMIN_QUERY_LIMIT)
    );
    const snapshot = await getDocs(adminQuery);
    return !snapshot.empty;
  } catch (error) {
    // If it's a permission error, we want the caller to know so it can decide to proceed anyway
    if (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied') {
      logger.warn('Permission denied checking admin status - likely unauthenticated');
      throw error;
    }
    logger.error('Error checking platform admin status:', error);
    return false;
  }
}

/**
 * Get platform admin by email
 */
export async function getPlatformAdminByEmail(email: string): Promise<PlatformAdmin | null> {
  try {
    const lookupSnap = await getPlatformAdminLookupSnapshot(email);

    if (lookupSnap) {
      const lookupData = lookupSnap.data();
      const linkedUid = lookupData?.uid;
      if (typeof linkedUid !== 'string' || linkedUid.length === 0) {
        return null;
      }
      const adminRef = getPlatformAdminDoc(linkedUid);
      const adminSnap = await getDoc(adminRef);

      if (adminSnap.exists()) {
        return { uid: adminSnap.id, ...adminSnap.data() } as PlatformAdmin;
      }
    }

    // Fallback to query
    const adminQuery = query(
      getPlatformAdminsCollection(),
      where('email', '==', email.toLowerCase()),
      firestoreLimit(PLATFORM_ADMIN_QUERY_LIMIT)
    );
    const snapshot = await getDocs(adminQuery);

    if (snapshot.empty) return null;

    const adminDoc = snapshot.docs[0];
    return { uid: adminDoc.id, ...adminDoc.data() } as PlatformAdmin;
  } catch (error) {
    logger.error('Error fetching platform admin:', error);
    return null;
  }
}

/**
 * Get platform admin by UID
 */
export async function getPlatformAdmin(uid: string): Promise<PlatformAdmin | null> {
  try {
    const docRef = getPlatformAdminDoc(uid);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    return { uid: snapshot.id, ...snapshot.data() } as PlatformAdmin;
  } catch (error) {
    logger.error('Error fetching platform admin:', error);
    return null;
  }
}

/**
 * Create platform admin record (called after Firebase Auth account is created)
 */
export async function createPlatformAdmin(
  uid: string,
  email: string,
  displayName: string
): Promise<void> {
  const normalizedEmail = email.toLowerCase();

  // First, check if there's a pending admin record we need to migrate
  const existingAdmin = await getPlatformAdminByEmail(normalizedEmail);

  if (existingAdmin && existingAdmin.uid.startsWith('pending_')) {
    // Migrate the pending record to the real UID
    const oldAdminData = existingAdmin;

    // Create new record with real UID
    const admin: DocumentData = {
      email: normalizedEmail,
      displayName: oldAdminData.displayName || displayName,
      permissions: oldAdminData.permissions,
      isPasswordSet: true,
      createdAt: oldAdminData.createdAt,
      lastLoginAt: serverTimestamp(),
    };

    await setDoc(getPlatformAdminDoc(uid), admin);

    await mirrorPlatformAdminLookupWrite(
      normalizedEmail,
      {
        uid,
        email: normalizedEmail,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    try {
      await deleteDoc(getPlatformAdminDoc(existingAdmin.uid));
    } catch (cleanupErr) {
      logger.warn('Could not remove pending platform admin doc (non-critical)', cleanupErr);
    }

    logger.info('Platform admin migrated from pending to real UID:', email);
    return;
  }

  // Create new admin record
  const admin: DocumentData = {
    email: normalizedEmail,
    displayName,
    permissions: ['view_metrics', 'view_organizations', 'view_ai_costs', 'manage_organizations', 'manage_admins'],
    isPasswordSet: false,
    createdAt: serverTimestamp(),
  };

  await setDoc(getPlatformAdminDoc(uid), admin);

  await mirrorPlatformAdminLookupWrite(normalizedEmail, {
    uid,
    email: normalizedEmail,
    createdAt: serverTimestamp(),
  });

  logger.info('Platform admin created:', email);
}

/**
 * Mark password as set for platform admin
 */
export async function markPasswordSet(uid: string): Promise<void> {
  await setDoc(
    getPlatformAdminDoc(uid),
    { isPasswordSet: true, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Update last login timestamp for platform admin
 */
export async function updateLastLogin(uid: string): Promise<void> {
  await setDoc(
    getPlatformAdminDoc(uid),
    { lastLoginAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Seed initial platform admin (one-time setup)
 * This creates the platform admin record if it doesn't exist
 */
export async function seedPlatformAdmin(email: string, displayName: string): Promise<void> {
  const existing = await getPlatformAdminByEmail(email);
  if (existing) {
    logger.info('Platform admin already exists:', email);
    return;
  }

  // Create a placeholder record - UID will be updated when they first log in
  const placeholderUid = `pending_${Date.now()}`;
  await createPlatformAdmin(placeholderUid, email, displayName);
  logger.info('Platform admin seeded:', email);
}

/**
 * List all platform admins (for admin management UI)
 */
export async function listPlatformAdmins(): Promise<PlatformAdmin[]> {
  try {
    const adminQuery = query(
      getPlatformAdminsCollection(),
      orderBy('createdAt', 'asc'),
      firestoreLimit(100)
    );
    const snapshot = await getDocs(adminQuery);
    return snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        uid: doc.id,
        email: d.email ?? '',
        displayName: d.displayName ?? '',
        permissions: d.permissions ?? [],
        isPasswordSet: d.isPasswordSet ?? false,
        createdAt: d.createdAt?.toDate?.() ?? new Date(),
        lastLoginAt: d.lastLoginAt?.toDate?.(),
      } as PlatformAdmin;
    });
  } catch (error) {
    logger.error('Error listing platform admins:', error);
    return [];
  }
}

/**
 * Remove a platform admin (requires manage_admins permission - enforced by caller)
 */
export async function removePlatformAdmin(uid: string): Promise<void> {
  try {
    const docRef = getPlatformAdminDoc(uid);
    await deleteDoc(docRef);
    logger.info('Platform admin removed:', uid);
  } catch (error) {
    logger.error('Error removing platform admin:', error);
    throw error;
  }
}

/**
 * Update platform admin permissions
 */
export async function updatePlatformAdminPermissions(
  uid: string,
  permissions: PlatformPermission[]
): Promise<void> {
  try {
    const docRef = getPlatformAdminDoc(uid);
    await updateDoc(docRef, {
      permissions,
      updatedAt: serverTimestamp(),
    });
    logger.info('Platform admin permissions updated:', uid);
  } catch (error) {
    logger.error('Error updating platform admin permissions:', error);
    throw error;
  }
}
