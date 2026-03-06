export const COLLECTIONS = {
  ORGANIZATIONS: 'organizations',
  USER_PROFILES: 'userProfiles',
  COACHES: 'coaches',
  CLIENTS: 'clients',
  ASSESSMENTS: 'assessments',
  PUBLIC_REPORTS: 'publicReports',
  /** Subcollection under publicReports/{token} */
  ACHIEVEMENTS: 'achievements',
  /** Subcollection under publicReports/{token} */
  NOTIFICATIONS: 'notifications',
  /** Subcollection under publicReports/{token} */
  PUBLIC_REPORT_SNAPSHOTS: 'snapshots',
  /** Subcollection under publicReports/{token} — client self-service lifestyle check-ins */
  LIFESTYLE_CHECKINS: 'lifestyleCheckins',
  PLATFORM_ADMINS: 'platform_admins',
  SYSTEM_STATS: 'system_stats',
  AI_USAGE_LOGS: 'ai_usage_logs',
  LIVE_SESSIONS: 'live_sessions',
  LEARNED_OCR_PATTERNS: 'learned_ocr_patterns',
  ROADMAPS: 'roadmaps',
} as const;
