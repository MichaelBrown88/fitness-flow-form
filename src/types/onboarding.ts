// Subscription tiers (determines features, not roles)
export type SubscriptionPlan = 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'trial' | 'active' | 'cancelled' | 'past_due';

// Business type selection during onboarding
export type BusinessType = 'solo_coach' | 'gym' | 'gym_chain';

// SignUp form data
export interface SignUpData {
  fullName: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
}

// Business profile data (Step 1)
export interface BusinessProfileData {
  name: string;
  type: BusinessType;
  address: string;
  phone: string;
  website?: string;
  logoFile?: File; // File object for upload
}

// Branding config (Step 2)
export interface BrandingConfig {
  gradientId: string; // References gradient system
  clientSeats: number; // Number of client seats needed
}

// Equipment config (Step 3) - Matches OrgSettings.equipmentConfig
export interface EquipmentConfig {
  bodyCompositionMethod: 'inbody' | 'dexa' | 'bodpod' | 'skinfold' | 'bioimpedance' | 'measurements' | 'none';
  skinfoldMethod?: 'jackson-pollock-7' | 'jackson-pollock-3' | 'durnin-womersley-4';
  gripStrengthEnabled: boolean;
  gripStrengthMethod: 'dynamometer' | 'none';
}

// Team setup data (Step 4)
export interface TeamSetupData {
  coachEmails: string[];
  skipped: boolean;
}

// Full onboarding data
export interface OnboardingData {
  businessProfile: BusinessProfileData;
  branding: BrandingConfig;
  equipment: EquipmentConfig;
  teamSetup: TeamSetupData;
}

// Onboarding status tracking
export interface OnboardingStatus {
  currentStep: number;
  businessInfoCompleted: boolean;
  brandingCompleted: boolean;
  equipmentCompleted: boolean;
  teamSetupCompleted: boolean; // or skipped
  completedAt?: Date;
}

// Onboarding session (for persistence)
export interface OnboardingSession {
  userId: string;
  organizationId: string;
  currentStep: number;
  completedSteps: string[];
  data: Partial<OnboardingData>;
  createdAt: Date;
  updatedAt: Date;
}

// Subscription data
export interface Subscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialEndsAt?: Date;
  billingEmail: string;
  clientSeats: number; // How many client slots
}

// Organization data (extended)
export interface OrganizationProfile {
  id: string;
  name: string;
  type: BusinessType;
  address: string;
  phone: string;
  website?: string;
  logoUrl?: string;
  gradientId: string;
  subscription: Subscription;
  onboardingCompletedAt?: Date;
  createdAt: Date;
}

// Body composition methods - simplified to match actual app
export const BODY_COMPOSITION_METHODS = [
  { value: 'inbody', label: 'InBody Scanner', description: 'Bioelectrical impedance body composition analyzer' },
  { value: 'dexa', label: 'DEXA Scan', description: 'Dual-energy X-ray absorptiometry' },
  { value: 'bodpod', label: 'BodPod', description: 'Air displacement plethysmography' },
  { value: 'skinfold', label: 'Skinfold Calipers', description: 'Manual body fat measurement' },
  { value: 'bioimpedance', label: 'Basic Bioimpedance Scale', description: 'Consumer-grade smart scale' },
  { value: 'measurements', label: 'Tape Measurements Only', description: 'Circumference measurements only' },
  { value: 'none', label: 'Skip Body Composition', description: 'I don\'t offer body composition testing' },
] as const;

// Skinfold methods
export const SKINFOLD_METHODS = [
  { value: 'jackson-pollock-7', label: 'Jackson-Pollock 7-Site' },
  { value: 'jackson-pollock-3', label: 'Jackson-Pollock 3-Site' },
  { value: 'durnin-womersley-4', label: 'Durnin-Womersley 4-Site' },
] as const;

// Client seat tiers with pricing
export const CLIENT_SEAT_TIERS = [
  { seats: 10, label: '10 clients', price: 0, included: true },
  { seats: 25, label: '25 clients', price: 19 },
  { seats: 50, label: '50 clients', price: 39 },
  { seats: 100, label: '100 clients', price: 69 },
  { seats: 250, label: '250 clients', price: 99 },
  { seats: -1, label: 'Unlimited', price: 149 },
] as const;

// Business type configurations
export const BUSINESS_TYPES = [
  {
    value: 'solo_coach' as BusinessType,
    label: 'Solo Coach',
    description: 'Self-employed PT or coach working independently',
    details: 'Perfect for personal trainers running their own business. Single user account with full access.',
    maxCoaches: 1,
    recommendedPlan: 'starter' as SubscriptionPlan,
  },
  {
    value: 'gym' as BusinessType,
    label: 'Gym / Studio',
    description: 'Single location with multiple coaches',
    details: 'For fitness facilities with a team. Add 3-20+ coach accounts with role management.',
    maxCoaches: 50,
    recommendedPlan: 'professional' as SubscriptionPlan,
  },
  {
    value: 'gym_chain' as BusinessType,
    label: 'Gym Chain',
    description: 'Multiple locations with teams at each',
    details: 'Enterprise solution for gym chains. Multiple locations, unlimited coaches, custom integrations.',
    maxCoaches: -1, // Unlimited
    recommendedPlan: 'enterprise' as SubscriptionPlan,
  },
] as const;

// Onboarding steps configuration
export const ONBOARDING_STEPS = [
  { id: 'business', label: 'Business Info', description: 'Tell us about your business' },
  { id: 'branding', label: 'Branding', description: 'Customize your look' },
  { id: 'equipment', label: 'Equipment', description: 'Configure assessments' },
  { id: 'team', label: 'Team', description: 'Invite your coaches' },
] as const;
