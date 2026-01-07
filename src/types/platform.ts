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

// Organization summary for platform admin view
export interface OrganizationSummary {
  id: string;
  name: string;
  type: 'solo_coach' | 'gym' | 'gym_chain';
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'trial' | 'active' | 'cancelled' | 'past_due';
  coachCount: number;
  clientCount: number;
  assessmentCount: number;
  aiCostsMtdCents: number;
  createdAt: Date;
  trialEndsAt?: Date;
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

