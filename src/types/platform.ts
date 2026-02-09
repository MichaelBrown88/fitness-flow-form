/**
 * Platform Admin Types
 * 
 * These types are for platform-level administration, separate from
 * organization-level (gym/coach) administration.
 */

// Platform admin permissions
export type PlatformPermission = 
  | 'view_metrics'      // View business metrics dashboard
  | 'view_organizations' // View list of organizations
  | 'manage_organizations' // Enable/disable orgs, manage billing
  | 'view_ai_costs'     // View AI usage and costs
  | 'manage_admins';    // Add/remove other platform admins

// Platform admin profile
export interface PlatformAdmin {
  uid: string;
  email: string;
  displayName: string;
  permissions: PlatformPermission[];
  isPasswordSet: boolean; // For first-time login flow
  createdAt: Date;
  lastLoginAt?: Date;
}

// Platform metrics - current snapshot
export interface PlatformMetrics {
  // Organization metrics
  totalOrganizations: number;
  activeOrganizations: number;
  trialOrganizations: number;
  
  // User metrics
  totalUsers: number;
  totalCoaches: number;
  totalClients: number;
  
  // Financial metrics (in cents for precision)
  mrrCents: number;        // Monthly recurring revenue
  arrCents: number;        // Annual recurring revenue
  
  // AI costs (in cents)
  aiCostsMtdCents: number; // Month-to-date AI costs
  aiCostsLastMonthCents: number;
  
  // Assessment metrics
  totalAssessments: number;
  assessmentsThisMonth: number;
  
  // Timestamps
  updatedAt: Date;
}

// Historical metrics for charts
export interface PlatformMetricsHistory {
  date: string; // YYYY-MM-DD
  metrics: Partial<PlatformMetrics>;
}

// Data access permission for GDPR/HIPAA compliance
export interface DataAccessPermission {
  platformAdminAccess: boolean; // Platform admin can view assessment/client data
  grantedAt?: Date; // When permission was granted
  grantedBy?: string; // Who granted it (platform admin UID)
  reason?: string; // Reason for access (e.g., "Support ticket #12345")
}

// Support access toggle for organizations (GDPR/HIPAA compliance)
export interface SupportAccessSettings {
  /** Whether platform support can access org data (default: false for privacy) */
  supportAccessGranted: boolean;
  /** When support access was granted */
  supportAccessGrantedAt?: Date;
  /** UID of the org admin who granted access */
  supportAccessGrantedBy?: string;
  /** When support access automatically expires (typically 7 days after granting) */
  supportAccessExpiresAt?: Date;
  /** Optional reason for granting access */
  supportAccessReason?: string;
}

// Organization summary for platform admin view
export interface OrganizationSummary {
  id: string;
  name: string;
  type: 'solo_coach' | 'gym' | 'gym_chain';
  plan: 'starter' | 'professional' | 'enterprise' | 'free' | 'none';
  status: 'trial' | 'active' | 'cancelled' | 'past_due' | 'none';
  isComped?: boolean; // True if free/complimentary subscription (excluded from MRR)
  clientSeats?: number; // Number of client seats in subscription
  monthlyFeeKwd?: number; // Monthly subscription fee in KWD (calculated)
  coachCount: number;
  clientCount: number;
  assessmentCount: number;
  aiCostsMtdCents: number;
  createdAt: Date;
  trialEndsAt?: Date;
  lastActiveDate?: Date; // Last assessment date for activity tracking
  dataAccessPermission?: DataAccessPermission; // GDPR/HIPAA compliance
}

// Full organization details for management page
export interface OrganizationDetails extends OrganizationSummary {
  // Contact information (required for SaaS onboarding)
  adminEmail?: string; // Primary admin contact email
  phone?: string; // Organization phone number
  address?: string; // Physical address
  website?: string; // Organization website

  // Additional details
  logoUrl?: string; // Organization logo
  gradientId?: string; // Branding gradient
  equipmentConfig?: Record<string, unknown>;
  modules?: Record<string, boolean>;
  demoAutoFillEnabled?: boolean; // Platform admin controlled - demo persona auto-fill (for affiliates/sales)
  onboardingCompletedAt?: Date;
  metadata?: {
    isTest?: boolean;
    isDeleted?: boolean;
    migratedFromLegacy?: boolean;
    isInternal?: boolean; // True for owner's company (e.g., One Fitness)
  };

  // Support access settings for GDPR/HIPAA compliance
  supportAccess?: SupportAccessSettings;
}

// AI cost breakdown per organization
export interface AICostBreakdown {
  organizationId: string;
  organizationName: string;
  postureAnalysisCalls: number;
  postureAnalysisCostCents: number;
  reportGenerationCalls: number;
  reportGenerationCostCents: number;
  totalCostCents: number;
  period: string; // YYYY-MM
}

// Platform admin invitation (for adding new platform admins)
export interface PlatformAdminInvitation {
  email: string;
  permissions: PlatformPermission[];
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  token: string;
  used: boolean;
}

// System stats - aggregated counters (write-time aggregation)
export interface SystemStats {
  // Organization counts
  totalOrgs: number;
  activeOrgs: number;
  trialOrgs: number;
  
  // User counts
  totalCoaches: number;
  totalClients: number;
  
  // Assessment counts
  totalAssessments: number;
  
  // AI usage
  totalAiTokensUsed: number; // Total tokens consumed across all time
  totalAiCostsFils: number; // Total costs in fils (1 KWD = 1000 fils)
  
  // Revenue (in fils)
  monthlyRecurringRevenueFils: number; // MRR
  
  // Timestamps
  lastUpdated: Date;
  version: number; // Schema version for migrations
}

// Organization-level aggregated stats
export interface OrganizationStats {
  coachCount: number;
  clientCount: number;
  assessmentCount: number;
  aiCostsMtdFils: number; // Month-to-date AI costs
  totalAiCostsFils: number; // All-time AI costs
  lastAssessmentDate?: Date; // Last active date
  lastUpdated: Date;
}

// Platform configuration - feature flags and maintenance settings
export interface PlatformFeatureFlags {
  /** AI posture analysis feature */
  posture_enabled: boolean;
  /** InBody OCR scanning feature */
  ocr_enabled: boolean;
  /** AI report generation feature */
  report_generation_enabled: boolean;
}

export interface PlatformMaintenanceSettings {
  /** Global maintenance banner message (shown to all users) */
  message?: string;
  /** Which features are currently affected */
  affected_features?: (keyof PlatformFeatureFlags)[];
  /** Whether the entire platform is in maintenance mode */
  is_maintenance_mode?: boolean;
}

export interface PlatformConfig {
  /** Feature kill switches - disable AI features globally */
  features: PlatformFeatureFlags;
  /** Maintenance mode settings */
  maintenance: PlatformMaintenanceSettings;
  /** Last updated timestamp */
  updatedAt: Date;
  /** UID of the platform admin who made the change */
  updatedBy: string;
}

/**
 * Stripe Checkout Session — request/response types
 * for the createCheckoutSession Cloud Function
 */
export interface CreateCheckoutRequest {
  organizationId: string;
  plan: 'starter' | 'professional' | 'enterprise';
  seats: number;
}

export interface CreateCheckoutResponse {
  /** Stripe Checkout Session URL to redirect the user to */
  sessionUrl: string;
  /** Stripe Session ID for client-side confirmation */
  sessionId: string;
}

/**
 * Stripe subscription state stored on organization document.
 * Updated by the stripeWebhook Cloud Function.
 */
export interface StripeSubscriptionData {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  currentPeriodEnd: Date;
}

/** Default platform config - all features enabled, no maintenance */
export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  features: {
    posture_enabled: true,
    ocr_enabled: true,
    report_generation_enabled: true,
  },
  maintenance: {},
  updatedAt: new Date(),
  updatedBy: 'system',
};
