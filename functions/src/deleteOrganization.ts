/**
 * Hard Delete Organization Cloud Function
 *
 * Fully removes an org and its associated Firebase Auth users.
 * Requires platform admin with manage_organizations permission.
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import type { CallableRequest } from 'firebase-functions/v2/https';

export interface DeleteOrganizationRequest {
  orgId: string;
  deleteAuthUsers?: boolean;
}

function getDb() {
  return admin.firestore();
}

async function assertPlatformAdminWithManageOrgs(uid: string): Promise<void> {
  const adminDoc = await getDb().doc(`platform_admins/${uid}`).get();
  if (!adminDoc.exists) {
    throw new Error('Only platform admins can permanently delete organizations.');
  }
  const permissions = adminDoc.data()?.permissions as string[] | undefined;
  if (!Array.isArray(permissions) || !permissions.includes('manage_organizations')) {
    throw new Error('manage_organizations permission required.');
  }
}

/**
 * Recursively delete a Firestore collection
 */
async function deleteCollection(ref: admin.firestore.CollectionReference): Promise<number> {
  const batchSize = 500;
  let totalDeleted = 0;

  let snapshot = await ref.limit(batchSize).get();
  while (!snapshot.empty) {
    const batch = getDb().batch();
    snapshot.docs.forEach((d) => {
      batch.delete(d.ref);
      totalDeleted++;
    });
    await batch.commit();
    snapshot = await ref.limit(batchSize).get();
  }
  return totalDeleted;
}

/**
 * Delete org document and all subcollections
 */
async function deleteOrgAndSubcollections(orgId: string): Promise<void> {
  const db = getDb();
  const orgRef = db.collection('organizations').doc(orgId);

  // Delete flat subcollections (v1 legacy paths — may be empty post-migration, safe to attempt)
  const flatSubcollections = ['assessments', 'roadmaps', 'assessmentDrafts', 'assessmentHistory', 'coaches', 'usage', 'settings', 'clientLookup', 'erasureRequests'];
  for (const sub of flatSubcollections) {
    const subRef = orgRef.collection(sub);
    const snap = await subRef.limit(1).get();
    if (!snap.empty) {
      await deleteCollection(subRef);
    }
  }

  // clients/{clientId} — delete all v2 nested subcollections, then the client doc
  const clientsRef = orgRef.collection('clients');
  const clientsSnap = await clientsRef.get();
  for (const clientDoc of clientsSnap.docs) {
    const v2NestedCols = ['current', 'sessions', 'roadmap', 'achievements', 'assessmentDrafts', 'consents'];
    for (const nestedCol of v2NestedCols) {
      try {
        const nestedRef = clientsRef.doc(clientDoc.id).collection(nestedCol);
        const nestedSnap = await nestedRef.limit(1).get();
        if (!nestedSnap.empty) {
          await deleteCollection(nestedRef);
        }
      } catch {
        // Subcollection might not exist
      }
    }
    await clientDoc.ref.delete();
  }

  // clientSubmissions has nested structure: clientSubmissions/{clientUid}/items
  const clientSubmissionsRef = orgRef.collection('clientSubmissions');
  const clientSubmissionsSnap = await clientSubmissionsRef.get();
  for (const clientDoc of clientSubmissionsSnap.docs) {
    try {
      const itemsRef = clientSubmissionsRef.doc(clientDoc.id).collection('items');
      const itemsSnap = await itemsRef.limit(1).get();
      if (!itemsSnap.empty) {
        await deleteCollection(itemsRef);
      }
    } catch {
      // Subcollection might not exist
    }
    await clientDoc.ref.delete();
  }

  await orgRef.delete();
}

export async function handleDeleteOrganization(
  request: CallableRequest<DeleteOrganizationRequest>,
): Promise<{ success: boolean; message: string }> {
  if (!request.auth?.uid) {
    throw new Error('Authentication required.');
  }

  const { orgId, deleteAuthUsers = true } = request.data || {};
  if (!orgId || typeof orgId !== 'string') {
    throw new Error('orgId is required.');
  }

  await assertPlatformAdminWithManageOrgs(request.auth.uid);

  const db = getDb();

  // Get org members (userProfiles with organizationId === orgId)
  const profilesSnap = await db
    .collection('userProfiles')
    .where('organizationId', '==', orgId)
    .get();

  const uidsToDeleteAuth: string[] = [];
  if (deleteAuthUsers) {
    profilesSnap.docs.forEach((d) => {
      uidsToDeleteAuth.push(d.id);
    });
  }

  // Delete userProfiles
  const batch = db.batch();
  profilesSnap.docs.forEach((d) => batch.delete(d.ref));
  if (!profilesSnap.empty) {
    await batch.commit();
  }

  // Delete org and subcollections
  await deleteOrgAndSubcollections(orgId);

  // Delete Firebase Auth users
  for (const uid of uidsToDeleteAuth) {
    try {
      await admin.auth().deleteUser(uid);
    } catch (err) {
      logger.warn(`Failed to delete Auth user ${uid}`, err);
      // Continue - profile and org data are already removed
    }
  }

  return {
    success: true,
    message: `Organization ${orgId} permanently deleted. Removed ${profilesSnap.size} user profiles and ${uidsToDeleteAuth.length} Auth users.`,
  };
}
