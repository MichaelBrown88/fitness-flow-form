/**
 * Platform Admin Impersonation Service
 * 
 * Allows platform admins to view the app as if they were an org admin.
 * All impersonation events are logged for security audit trails.
 * 
 * SECURITY NOTES:
 * - Impersonation is read-only by default
 * - All actions are logged with timestamp, admin ID, and target org
 * - Impersonation sessions have a maximum duration
 * - Clear visual indicators show when impersonation is active
 */

import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { getPlatformAdmin } from './platformAdmin';
import { logAdminAction } from './auditLog';
import { logger } from '@/lib/utils/logger';
import { PLATFORM } from '@/lib/database/paths';

/** Firestore path for active impersonation markers (used by security rules) */
const ACTIVE_IMPERSONATION_PATH = 'platform/active_impersonations/sessions';

/** Impersonation session data */
export interface ImpersonationSession {
  /** Platform admin who initiated impersonation */
  adminUid: string;
  adminEmail: string;
  /** Organization being impersonated */
  targetOrgId: string;
  targetOrgName: string;
  /** Session timing */
  startedAt: Date;
  expiresAt: Date;
  /** Reason for impersonation (support ticket, debugging, etc.) */
  reason?: string;
  /** Whether write actions are allowed (default: false for safety) */
  allowWrites: boolean;
}

/** Audit log entry for impersonation events */
export interface ImpersonationAuditLog {
  id: string;
  eventType: 'session_start' | 'session_end' | 'action_taken' | 'session_expired';
  adminUid: string;
  adminEmail: string;
  targetOrgId: string;
  targetOrgName: string;
  timestamp: Date;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

/** Session storage key */
const IMPERSONATION_SESSION_KEY = 'fitflow_impersonation_session';

/** Maximum impersonation session duration (4 hours) */
const MAX_SESSION_DURATION_MS = 4 * 60 * 60 * 1000;

/**
 * Start an impersonation session
 */
export async function startImpersonation(
  adminUid: string,
  adminEmail: string,
  targetOrgId: string,
  targetOrgName: string,
  reason?: string
): Promise<ImpersonationSession> {
  const adminRecord = await getPlatformAdmin(adminUid);
  if (!adminRecord) {
    logger.error('[Impersonation] Non-admin attempted impersonation', { adminUid });
    throw new Error('Only platform administrators can use impersonation mode');
  }

  // Create session
  const now = new Date();
  const session: ImpersonationSession = {
    adminUid,
    adminEmail,
    targetOrgId,
    targetOrgName,
    startedAt: now,
    expiresAt: new Date(now.getTime() + MAX_SESSION_DURATION_MS),
    reason,
    allowWrites: false, // Read-only by default for safety
  };

  // Write active impersonation marker to Firestore (enforces read-only in security rules)
  const db = getDb();
  const impersonationMarkerRef = doc(db, ACTIVE_IMPERSONATION_PATH, adminUid);
  await setDoc(impersonationMarkerRef, {
    adminUid,
    targetOrgId,
    startedAt: serverTimestamp(),
    expiresAt: session.expiresAt.toISOString(),
  });

  // Log to Firestore audit trail (detailed subcollection)
  await logImpersonationEvent({
    eventType: 'session_start',
    adminUid,
    adminEmail,
    targetOrgId,
    targetOrgName,
    details: reason || 'No reason provided',
  });

  // Log to main audit log for unified UI
  await logAdminAction(adminUid, 'impersonation_start', targetOrgId, { targetOrgName, reason });

  // Store in session storage (not localStorage for security)
  sessionStorage.setItem(IMPERSONATION_SESSION_KEY, JSON.stringify({
    ...session,
    startedAt: session.startedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  }));

  logger.info('[Impersonation] Session started', { 
    admin: adminEmail, 
    org: targetOrgName,
    expiresAt: session.expiresAt 
  });

  return session;
}

/**
 * End the current impersonation session
 */
export async function endImpersonation(): Promise<void> {
  const session = getImpersonationSession();
  
  if (!session) {
    logger.debug('[Impersonation] No active session to end');
    return;
  }

  // Remove active impersonation marker from Firestore (re-enables write access)
  try {
    const db = getDb();
    const impersonationMarkerRef = doc(db, ACTIVE_IMPERSONATION_PATH, session.adminUid);
    await deleteDoc(impersonationMarkerRef);
  } catch (err) {
    logger.warn('[Impersonation] Failed to remove impersonation marker:', err);
  }

  // Log session end
  await logImpersonationEvent({
    eventType: 'session_end',
    adminUid: session.adminUid,
    adminEmail: session.adminEmail,
    targetOrgId: session.targetOrgId,
    targetOrgName: session.targetOrgName,
    details: `Session duration: ${Math.round((Date.now() - session.startedAt.getTime()) / 1000 / 60)} minutes`,
  });

  // Log to main audit log for unified UI
  await logAdminAction(session.adminUid, 'impersonation_end', session.targetOrgId, { targetOrgName: session.targetOrgName });

  // Clear session storage
  sessionStorage.removeItem(IMPERSONATION_SESSION_KEY);

  logger.info('[Impersonation] Session ended', { 
    admin: session.adminEmail, 
    org: session.targetOrgName 
  });
}

/**
 * Get the current impersonation session (if any)
 */
export function getImpersonationSession(): ImpersonationSession | null {
  try {
    const stored = sessionStorage.getItem(IMPERSONATION_SESSION_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    const session: ImpersonationSession = {
      ...parsed,
      startedAt: new Date(parsed.startedAt),
      expiresAt: new Date(parsed.expiresAt),
    };

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      logger.info('[Impersonation] Session expired, clearing');
      sessionStorage.removeItem(IMPERSONATION_SESSION_KEY);
      
      // Clean up Firestore marker (fire and forget)
      try {
        const db = getDb();
        const markerRef = doc(db, ACTIVE_IMPERSONATION_PATH, session.adminUid);
        deleteDoc(markerRef).catch(err => logger.warn('[Impersonation] Failed to remove expired marker:', err));
      } catch { /* ignore */ }
      
      // Log expiration (fire and forget)
      logImpersonationEvent({
        eventType: 'session_expired',
        adminUid: session.adminUid,
        adminEmail: session.adminEmail,
        targetOrgId: session.targetOrgId,
        targetOrgName: session.targetOrgName,
        details: 'Session auto-expired after maximum duration',
      }).catch(err => logger.warn('[Impersonation] Failed to log expiration:', err));
      
      return null;
    }

    return session;
  } catch (error) {
    logger.error('[Impersonation] Error reading session:', error);
    sessionStorage.removeItem(IMPERSONATION_SESSION_KEY);
    return null;
  }
}

/**
 * Check if currently in impersonation mode
 */
export function isImpersonating(): boolean {
  return getImpersonationSession() !== null;
}

/**
 * Get the organization ID to use for data access
 * Returns impersonated org ID if in impersonation mode, otherwise null
 */
export function getImpersonatedOrgId(): string | null {
  const session = getImpersonationSession();
  return session?.targetOrgId || null;
}

/**
 * Log an impersonation event to Firestore
 */
async function logImpersonationEvent(event: Omit<ImpersonationAuditLog, 'id' | 'timestamp'>): Promise<void> {
  try {
    const db = getDb();
    const logId = `${event.adminUid}_${Date.now()}`;
    const logRef = doc(db, PLATFORM.auditLogs.impersonation.doc(logId));

    await setDoc(logRef, {
      ...event,
      id: logId,
      timestamp: serverTimestamp(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    });

    logger.debug('[Impersonation] Audit log created', { eventType: event.eventType });
  } catch (error) {
    // Don't throw - audit logging failure shouldn't break the app
    // But do log it prominently
    logger.error('[Impersonation] CRITICAL: Failed to create audit log', { 
      error, 
      event 
    });
  }
}

/**
 * Log an action taken during impersonation
 */
export async function logImpersonationAction(
  action: string,
  details?: string
): Promise<void> {
  const session = getImpersonationSession();
  if (!session) return;

  await logImpersonationEvent({
    eventType: 'action_taken',
    adminUid: session.adminUid,
    adminEmail: session.adminEmail,
    targetOrgId: session.targetOrgId,
    targetOrgName: session.targetOrgName,
    details: `Action: ${action}${details ? ` - ${details}` : ''}`,
  });
}
