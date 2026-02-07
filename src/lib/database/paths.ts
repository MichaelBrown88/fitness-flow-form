/**
 * Firestore Collection Paths
 * 
 * Centralized path configuration for the hierarchical database structure.
 * This is the single source of truth for all Firestore paths.
 * 
 * HIERARCHY:
 * - Platform level: /platform/*, /platform_admins/*
 * - Organization level: /organizations/{orgId}/*
 *   - Coaches: /organizations/{orgId}/coaches/{coachId}
 *   - Clients: /organizations/{orgId}/clients/{clientId}
 *   - Assessments: /organizations/{orgId}/assessments/{assessmentId}
 *   - Usage: /organizations/{orgId}/usage/{month}
 */

/**
 * Platform-level paths (for platform owner/admin)
 */
export const PLATFORM = {
  /** Platform configuration document */
  config: () => 'platform/config' as const,
  
  /** Platform metrics */
  metrics: {
    /** Current snapshot of platform metrics */
    current: () => 'platform/metrics/current' as const,
    /** Historical metrics by date (YYYY-MM-DD) */
    history: (date: string) => `platform/metrics/history/${date}` as const,
  },
  
  /** Platform administrators */
  admins: {
    /** Collection of platform admins */
    collection: () => 'platform_admins' as const,
    /** Specific admin document */
    doc: (uid: string) => `platform_admins/${uid}` as const,
    /** Email lookup collection */
    lookupCollection: () => 'platform_admin_lookup' as const,
    /** Email lookup key (normalized) */
    lookupKey: (email: string) => email.toLowerCase().replace(/[.@]/g, '_'),
  },
  
  /** Audit logs for compliance tracking */
  auditLogs: {
    /** Collection of all audit log entries */
    collection: () => 'platform_audit_logs' as const,
    /** Specific audit log document */
    doc: (logId: string) => `platform_audit_logs/${logId}` as const,
    /** Impersonation audit logs subcollection */
    impersonation: {
      collection: () => 'platform_audit_logs/impersonation/logs' as const,
      doc: (logId: string) => `platform_audit_logs/impersonation/logs/${logId}` as const,
    },
  },
} as const;

/**
 * Organization-level paths
 * All business data lives under an organization
 */
export const ORGANIZATION = {
  /** Organizations collection */
  collection: () => 'organizations' as const,
  
  /** Specific organization document */
  doc: (orgId: string) => `organizations/${orgId}` as const,
  
  /** Coaches within an organization */
  coaches: {
    collection: (orgId: string) => `organizations/${orgId}/coaches` as const,
    doc: (orgId: string, coachId: string) => `organizations/${orgId}/coaches/${coachId}` as const,
  },
  
  /** Clients within an organization */
  clients: {
    collection: (orgId: string) => `organizations/${orgId}/clients` as const,
    doc: (orgId: string, clientId: string) => `organizations/${orgId}/clients/${clientId}` as const,
    /** Generate client ID from name (lowercase, hyphenated) */
    generateId: (clientName: string) => clientName.toLowerCase().replace(/\s+/g, '-'),
  },
  
  /** Assessments within an organization */
  assessments: {
    collection: (orgId: string) => `organizations/${orgId}/assessments` as const,
    doc: (orgId: string, assessmentId: string) => `organizations/${orgId}/assessments/${assessmentId}` as const,
  },
  
  /** Usage and cost tracking within an organization */
  usage: {
    collection: (orgId: string) => `organizations/${orgId}/usage` as const,
    /** Monthly usage document (YYYY-MM format) */
    month: (orgId: string, month: string) => `organizations/${orgId}/usage/${month}` as const,
    /** Get current month key */
    currentMonth: () => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    },
  },
  
  /** Organization settings */
  settings: (orgId: string) => `organizations/${orgId}/settings/config` as const,

  /** Assessment history within an organization (deep structure for tracking changes) */
  assessmentHistory: {
    collection: (orgId: string) => `organizations/${orgId}/assessmentHistory` as const,
    current: (orgId: string, clientSlug: string) =>
      `organizations/${orgId}/assessmentHistory/${clientSlug}/current/data` as const,
    history: (orgId: string, clientSlug: string) =>
      `organizations/${orgId}/assessmentHistory/${clientSlug}/history` as const,
    snapshots: (orgId: string, clientSlug: string) =>
      `organizations/${orgId}/assessmentHistory/${clientSlug}/snapshots` as const,
  },
} as const;

/**
 * Legacy paths for backward compatibility
 * These paths are from the old flat structure.
 * Used for reading existing data during migration.
 */
export const LEGACY = {
  /** Old coaches collection (flat) */
  coaches: {
    collection: () => 'coaches' as const,
    doc: (uid: string) => `coaches/${uid}` as const,
    /** Clients subcollection under coach */
    clients: (uid: string) => `coaches/${uid}/clients` as const,
    clientDoc: (uid: string, clientId: string) => `coaches/${uid}/clients/${clientId}` as const,
    /** Assessments subcollection under coach */
    assessments: (uid: string) => `coaches/${uid}/assessments` as const,
  },
  
  /** Old userProfiles collection (flat) */
  userProfiles: {
    collection: () => 'userProfiles' as const,
    doc: (uid: string) => `userProfiles/${uid}` as const,
  },
  
  /** Old assessments (may be at root level) */
  assessments: {
    collection: () => 'assessments' as const,
    doc: (id: string) => `assessments/${id}` as const,
  },
} as const;

/**
 * Public/shared paths (no auth required for reading)
 */
export const PUBLIC = {
  /** Public shareable reports */
  reports: {
    collection: () => 'publicReports' as const,
    doc: (token: string) => `publicReports/${token}` as const,
  },
  
  /** Live camera sessions */
  sessions: {
    collection: () => 'live_sessions' as const,
    doc: (sessionId: string) => `live_sessions/${sessionId}` as const,
  },
} as const;

/**
 * AI usage logging
 */
export const AI_USAGE = {
  /** Global AI usage logs */
  logs: {
    collection: () => 'ai_usage_logs' as const,
    doc: (logId: string) => `ai_usage_logs/${logId}` as const,
  },
} as const;

/**
 * System stats - aggregated platform metrics
 */
export const SYSTEM_STATS = {
  /** System stats collection */
  collection: () => 'system_stats' as const,
  /** Global metrics document (single source of truth for platform KPIs) */
  globalMetrics: () => 'system_stats/global_metrics' as const,
} as const;
