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

const PLATFORM_ADMIN_EMAIL_QUERY_LIMIT = 20;

/**
 * Firestore flag used only for first-time platform login UX.
 * - Missing field: treat as true (legacy rows created before the flag existed).
 * - Explicit false on the lookup doc but true on another row with the same email: treat as true (duplicate/stale rows after Auth UID changes).
 */
async function resolveIsPasswordSet(
  normalizedEmail: string,
  primaryData: DocumentData,
): Promise<boolean> {
  const raw = primaryData.isPasswordSet;
  if (raw === true) return true;
  if (raw !== false) return true;

  try {
    const dupQuery = query(
      getPlatformAdminsCollection(),
      where('email', '==', normalizedEmail),
      firestoreLimit(PLATFORM_ADMIN_EMAIL_QUERY_LIMIT),
    );
    const snapshot = await getDocs(dupQuery);
    return snapshot.docs.some((d) => d.data()?.isPasswordSet === true);
  } catch {
    return false;
  }
}

function platformAdminFromDoc(
  docSnap: { id: string; data: () => DocumentData },
  normalizedEmail: string,
  isPasswordSet: boolean,
): PlatformAdmin {
  const d = docSnap.data();
  return {
    uid: docSnap.id,
    ...d,
    isPasswordSet,
  } as PlatformAdmin;
}

const DEFAULT_PLATFORM_ADMIN_PERMISSIONS: PlatformPermission[] = [
  'view_metrics',
  'view_organizations',
  'view_ai_costs',
  'manage_organizations',
  'manage_admins',
];

/**
 * Removes extra platform_admins docs for the same email (orphans after Auth account recreation).
 * Keeps canonicalUid; deletes pending_* and any other doc with the same email field.
 */
async function deleteOrphanPlatformAdminDocsForEmail(
  normalizedEmail: string,
  canonicalUid: string,
): Promise<void> {
  try {
    const adminQuery = query(
      getPlatformAdminsCollection(),
      where('email', '==', normalizedEmail),
      firestoreLimit(20),
    );
    const snapshot = await getDocs(adminQuery);
    for (const d of snapshot.docs) {
      if (d.id === canonicalUid) continue;
      try {
        await deleteDoc(d.ref);
        logger.info('Removed orphan/stale platform_admins doc', {
          docId: d.id,
          email: normalizedEmail,
        });
      } catch (err) {
        logger.warn('Could not delete orphan platform_admins doc', { docId: d.id, err });
      }
    }
  } catch (err) {
    logger.warn('Orphan platform admin cleanup skipped', err);
  }
}

async function clearPlatformAdminLookupIfPointsToUid(
  normalizedEmail: string,
  uid: string,
): Promise<void> {
  const refs = [
    getPlatformAdminLookupDoc(normalizedEmail),
    getPlatformAdminLegacyLookupDoc(normalizedEmail),
  ];
  const seen = new Set<string>();
  for (const ref of refs) {
    if (seen.has(ref.path)) continue;
    seen.add(ref.path);
    try {
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data()?.uid === uid) {
        await deleteDoc(ref);
        logger.info('Cleared platform_admin_lookup after admin removal', {
          path: ref.path,
          uid,
        });
      }
    } catch (err) {
      logger.warn('Could not clear platform admin lookup', { path: ref.path, err });
    }
  }
}

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
        const data = adminSnap.data();
        const isPasswordSet = await resolveIsPasswordSet(email.toLowerCase(), data);
        return platformAdminFromDoc(adminSnap, email.toLowerCase(), isPasswordSet);
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
    const data = adminDoc.data();
    const isPasswordSet = await resolveIsPasswordSet(email.toLowerCase(), data);
    return platformAdminFromDoc(adminDoc, email.toLowerCase(), isPasswordSet);
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

    const data = snapshot.data();
    const em =
      typeof data.email === 'string' ? data.email.toLowerCase().trim() : '';
    const isPasswordSet = em
      ? await resolveIsPasswordSet(em, data)
      : data.isPasswordSet === true;
    return platformAdminFromDoc(snapshot, em, isPasswordSet);
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
  const trimmedDisplay = displayName.trim();

  const existingAdmin = await getPlatformAdminByEmail(normalizedEmail);

  // Brand-new admin (no lookup / no doc for this email)
  if (!existingAdmin) {
    const selfRef = getPlatformAdminDoc(uid);
    const selfSnap = await getDoc(selfRef);
    if (selfSnap.exists()) {
      await setDoc(
        selfRef,
        {
          email: normalizedEmail,
          ...(trimmedDisplay ? { displayName: trimmedDisplay } : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      await mirrorPlatformAdminLookupWrite(
        normalizedEmail,
        {
          uid,
          email: normalizedEmail,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      await deleteOrphanPlatformAdminDocsForEmail(normalizedEmail, uid);
      logger.info('Platform admin reconciled: doc exists at UID but lookup/email miss', {
        email: normalizedEmail,
      });
      return;
    }

    const admin: DocumentData = {
      email: normalizedEmail,
      displayName: trimmedDisplay || 'Admin',
      permissions: DEFAULT_PLATFORM_ADMIN_PERMISSIONS,
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
    return;
  }

  // Same Auth user hitting first-login / sign-in again: never reset isPasswordSet or permissions
  if (existingAdmin.uid === uid) {
    await setDoc(
      getPlatformAdminDoc(uid),
      {
        email: normalizedEmail,
        ...(trimmedDisplay ? { displayName: trimmedDisplay } : {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    await mirrorPlatformAdminLookupWrite(
      normalizedEmail,
      {
        uid,
        email: normalizedEmail,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    await deleteOrphanPlatformAdminDocsForEmail(normalizedEmail, uid);
    logger.info('Platform admin record reconciled (same UID):', email);
    return;
  }

  // Pending placeholder → real UID
  if (existingAdmin.uid.startsWith('pending_')) {
    const oldAdminData = existingAdmin;

    const admin: DocumentData = {
      email: normalizedEmail,
      displayName: oldAdminData.displayName || trimmedDisplay || 'Admin',
      permissions:
        oldAdminData.permissions?.length > 0
          ? oldAdminData.permissions
          : DEFAULT_PLATFORM_ADMIN_PERMISSIONS,
      isPasswordSet: true,
      createdAt: oldAdminData.createdAt,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
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

    await deleteOrphanPlatformAdminDocsForEmail(normalizedEmail, uid);
    logger.info('Platform admin migrated from pending to real UID:', email);
    return;
  }

  // Lookup still pointed at a previous Firebase Auth UID (e.g. new workspace account, same email)
  const oldRef = getPlatformAdminDoc(existingAdmin.uid);
  const oldSnap = await getDoc(oldRef);
  const oldData: DocumentData = oldSnap.exists() ? (oldSnap.data() as DocumentData) : {};

  const oldPerms = Array.isArray(oldData.permissions)
    ? (oldData.permissions as PlatformPermission[])
    : [];
  const permissions =
    oldPerms.length > 0 ? oldPerms : DEFAULT_PLATFORM_ADMIN_PERMISSIONS;

  const oldDisplay =
    typeof oldData.displayName === 'string' ? oldData.displayName.trim() : '';
  const mergedDisplayName = oldDisplay || trimmedDisplay || 'Admin';

  const admin: DocumentData = {
    email: normalizedEmail,
    displayName: mergedDisplayName,
    permissions,
    isPasswordSet: true,
    createdAt: oldData.createdAt ?? serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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
    await deleteDoc(oldRef);
  } catch (cleanupErr) {
    logger.warn('Could not remove stale platform admin doc after UID migration', cleanupErr);
  }

  await deleteOrphanPlatformAdminDocsForEmail(normalizedEmail, uid);
  logger.info('Platform admin migrated from stale Auth UID to current UID:', email);
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
  const snap = await getDoc(getPlatformAdminDoc(uid));
  const emailRaw = snap.data()?.email;
  if (typeof emailRaw !== 'string' || emailRaw.trim() === '') {
    return;
  }
  const normalizedEmail = emailRaw.toLowerCase().trim();
  const lookupSnap = await getPlatformAdminLookupSnapshot(normalizedEmail);
  const linkedUid = lookupSnap?.data()?.uid;
  // Only strip duplicate docs when this user is the canonical admin for the email (avoid deleting the real doc if a stale UID still has the same email field).
  if (typeof linkedUid === 'string' && linkedUid === uid) {
    await deleteOrphanPlatformAdminDocsForEmail(normalizedEmail, uid);
  }
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
    const snap = await getDoc(docRef);
    const emailRaw = snap.data()?.email;
    const normalizedEmail =
      typeof emailRaw === 'string' ? emailRaw.toLowerCase().trim() : '';

    await deleteDoc(docRef);

    if (normalizedEmail) {
      await clearPlatformAdminLookupIfPointsToUid(normalizedEmail, uid);
    }

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
