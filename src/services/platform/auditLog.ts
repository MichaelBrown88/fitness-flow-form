/**
 * Platform Audit Log Service
 *
 * Logs admin actions for compliance and security. Used for feature toggles,
 * maintenance mode, data access grants/revokes, subscription changes, etc.
 */

import { addDoc, getDocs, query, orderBy, limit, startAfter, serverTimestamp } from 'firebase/firestore';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { getPlatformAuditLogsCollection } from '@/lib/database/collections';
import { logger } from '@/lib/utils/logger';

export type AuditAction =
  | 'feature_toggle'
  | 'maintenance_mode'
  | 'data_access_grant'
  | 'data_access_revoke'
  | 'subscription_pause'
  | 'subscription_cancel'
  | 'subscription_reactivate'
  | 'demo_autofill_toggle'
  | 'impersonation_start'
  | 'impersonation_end';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  adminUid: string;
  action: AuditAction;
  target?: string;
  details?: Record<string, unknown>;
}

const AUDIT_LOG_LIMIT = 50;

/**
 * Log an admin action to the audit log
 */
export async function logAdminAction(
  adminUid: string,
  action: AuditAction,
  target?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const coll = getPlatformAuditLogsCollection();
    await addDoc(coll, {
      timestamp: serverTimestamp(),
      adminUid,
      action,
      ...(target && { target }),
      ...(details && Object.keys(details).length > 0 && { details }),
    });
  } catch (error) {
    logger.error('Failed to write audit log:', error);
  }
}

/**
 * Fetch recent audit logs with pagination
 */
export async function getAuditLogs(
  pageLimit: number = AUDIT_LOG_LIMIT,
  cursor?: QueryDocumentSnapshot<DocumentData>
): Promise<{
  entries: AuditLogEntry[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | undefined;
  hasMore: boolean;
}> {
  try {
    const coll = getPlatformAuditLogsCollection();
    const q = cursor
      ? query(
          coll,
          orderBy('timestamp', 'desc'),
          limit(pageLimit),
          startAfter(cursor)
        )
      : query(coll, orderBy('timestamp', 'desc'), limit(pageLimit));

    const snapshot = await getDocs(q);
    const entries: AuditLogEntry[] = snapshot.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        timestamp: d.timestamp?.toDate?.() ?? new Date(d.timestamp),
        adminUid: d.adminUid ?? '',
        action: d.action ?? 'feature_toggle',
        target: d.target,
        details: d.details,
      };
    });

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const hasMore = snapshot.docs.length === pageLimit && !!lastDoc;

    return { entries, lastDoc, hasMore };
  } catch (error) {
    logger.error('Failed to fetch audit logs:', error);
    return { entries: [], lastDoc: undefined, hasMore: false };
  }
}
