import { NEW_CAPACITY_TIERS, type PackageTrack } from '@/constants/pricing';

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

// Identity data (Step 0) - name and email only; password collected at account creation step
export interface IdentityData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
}

// Business profile data (Step 2) - name, type, coaching role, and billing region
export interface BusinessProfileData {
  name: string;
  type: BusinessType;
  /** Does the admin also coach clients directly? Auto-true for solo_coach. */
  isActiveCoach?: boolean;
  /** Billing region for pricing (GB, US, KW) */
  region?: Region;
}

// Equipment config (Step 3) - what physical equipment the gym has
export interface EquipmentConfig {
  scanner: boolean; // BIA Scanner
  treadmill: boolean; // Cardio Equipment
  dynamometer: boolean; // Grip strength
  // Mapped to OrgSettings.equipmentConfig format when saving
  bodyCompositionMethod?: 'bioimpedance' | 'dexa' | 'bodpod' | 'skinfold' | 'measurements' | 'none';
  skinfoldMethod?: 'jackson-pollock-7' | 'jackson-pollock-3' | 'durnin-womersley-4';
  gripStrengthEnabled?: boolean;
  gripStrengthMethod?: 'dynamometer' | 'none';
}

import type { Region } from '@/constants/pricing';

// Branding config - deferred to Settings, not part of onboarding flow
export interface BrandingConfig {
  gradientId: string; // References gradient system - maps to brand color
  clientSeats: number; // Number of client seats needed (from plan step)
  /** GB checkout track selected on plan step */
  packageTrack?: PackageTrack;
  logoFile?: File; // Logo file for upload (optional - added later in Settings)
}

// Full onboarding data (simplified 5-step flow)
export interface OnboardingData {
  identity: IdentityData;
  businessProfile: BusinessProfileData;
  equipment: EquipmentConfig;
  /** Gym / studio: coach names (one per line) before plan step */
  teamRoster?: string;
  branding: BrandingConfig; // Only clientSeats used during onboarding; gradientId gets a default
}

// Onboarding session (for mid-flow persistence)
export interface OnboardingSession {
  userId: string;
  organizationId: string;
  currentStep: number;
  completedSteps: string[];
  data: Partial<OnboardingData>;
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionPlanKind = 'solo_free' | 'gym_trial' | 'paid' | 'pending_onboarding';

// Subscription data
export interface Subscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  /** Product billing segment — drives caps and paywall */
  planKind?: SubscriptionPlanKind;
  trialEndsAt?: Date;
  /** Effective max active clients (Firestore rules + UI) */
  clientCap?: number;
  /** During gym_trial: soft cap (typically 100) */
  trialClientCap?: number;
  billingEmail: string;
  clientSeats: number; // How many client slots (legacy)
  region?: Region;
  currency?: string;
  clientCount?: number; // Seat block (5, 10, 20, 35, 50, 75, 100, 150, 250, 300+)
  amountCents?: number; // Amount in smallest unit (pence/cents/fils)
  capacityTierId?: string;
  packageTrack?: PackageTrack;
  monthlyAiCredits?: number;
}

// Organization data (extended)
export interface OrganizationProfile {
  id: string;
  name: string;
  type: BusinessType;
  subscription: Subscription;
  onboardingCompletedAt?: Date;
  createdAt: Date;
  // Location, branding, logo etc. are optional — configured in Settings
  address?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  gradientId?: string;
}

// Body composition methods - simplified to match actual app
export const BODY_COMPOSITION_METHODS = [
  { value: 'bioimpedance', label: 'Bio-Impedance Analyser', description: 'Bioelectrical impedance body composition analyzer (InBody, Evolt, Tanita, smart scales)' },
  { value: 'dexa', label: 'DEXA Scan', description: 'Dual-energy X-ray absorptiometry' },
  { value: 'bodpod', label: 'BodPod', description: 'Air displacement plethysmography' },
  { value: 'skinfold', label: 'Skinfold Calipers', description: 'Manual body fat measurement' },
  { value: 'measurements', label: 'Tape Measurements Only', description: 'Circumference measurements only' },
  { value: 'none', label: 'Skip Body Composition', description: 'I don\'t offer body composition testing' },
] as const;

// Skinfold methods
export const SKINFOLD_METHODS = [
  { value: 'jackson-pollock-7', label: 'Jackson-Pollock 7-Site' },
  { value: 'jackson-pollock-3', label: 'Jackson-Pollock 3-Site' },
  { value: 'durnin-womersley-4', label: 'Durnin-Womersley 4-Site' },
] as const;

// Client capacity tiers (GBP monthly — solo track for branding step defaults)
export const CLIENT_SEAT_TIERS = NEW_CAPACITY_TIERS.filter((t) => t.packageTrack === 'solo').map(
  (t, i) => ({
    seats: t.clientLimit,
    label: `Up to ${t.clientLimit} clients`,
    price: t.monthlyPriceGbp,
    included: i === 0,
  }),
) as readonly { seats: number; label: string; price: number; included?: boolean }[];

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

/** Ordered steps matching `useOnboarding` flow indices (0–5); gyms insert Team at index 4 before Plan at 5. */
export const ONBOARDING_FLOW_STEPS = [
  { id: 'identity', label: 'You', description: 'Tell us about yourself' },
  { id: 'business', label: 'Business', description: 'Your facility or practice' },
  { id: 'account', label: 'Account', description: 'Create your account and verify email' },
  { id: 'equipment', label: 'Equipment', description: 'Configure your protocols' },
  { id: 'team', label: 'Team', description: 'Coach names (gyms and studios)' },
  { id: 'plan', label: 'Plan', description: 'Confirm or choose your plan' },
] as const;

export type OnboardingFlowStepMeta = (typeof ONBOARDING_FLOW_STEPS)[number];

/** @deprecated Use ONBOARDING_FLOW_STEPS */
export const ONBOARDING_STEPS = ONBOARDING_FLOW_STEPS;

export function getOnboardingProgressState(
  flowStep: number,
  businessType: BusinessType | undefined,
): { steps: readonly OnboardingFlowStepMeta[]; activeIndex: number } {
  const isGym = businessType === 'gym' || businessType === 'gym_chain';
  const full = ONBOARDING_FLOW_STEPS;
  if (isGym) {
    const idx = Math.min(Math.max(0, flowStep), full.length - 1);
    return { steps: full, activeIndex: idx };
  }
  const soloSteps = full.filter((s) => s.id !== 'team');
  if (flowStep <= 3) return { steps: soloSteps, activeIndex: flowStep };
  if (flowStep === 4) return { steps: soloSteps, activeIndex: 4 };
  if (flowStep >= 5) return { steps: soloSteps, activeIndex: 4 };
  return { steps: soloSteps, activeIndex: 0 };
}
