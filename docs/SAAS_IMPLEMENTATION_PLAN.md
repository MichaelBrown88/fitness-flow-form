# SaaS Landing Page & Onboarding Flow - Implementation Plan

## 🎯 Objective

Transform the fitness assessment platform into a multi-tenant SaaS product with a professional landing page and streamlined onboarding flow for new gyms and coaches.

---

## 📋 User Review Required

> **IMPORTANT: Multi-Tenancy Considerations**
> - Each gym will be a separate organization with isolated data
> - Pricing model needs to be defined (per gym, per coach, per assessment?)
> - Payment integration required (Stripe recommended)
> - Email verification and domain verification for gym owners

> **WARNING: Breaking Changes**
> - New authentication flow for gym signup vs coach login
> - Database schema additions for organization management

> **ROLE STRUCTURE (Using Existing Roles)**
> - `org_admin` - The account owner (solo coach, gym owner, or chain manager)
> - `coach` - Team members invited by the org_admin
> - **Subscription tier** (not role) determines features:
>   - **Starter** (Solo Coach): 1 admin, no additional coaches
>   - **Professional** (Gym): 1 admin + unlimited coaches, single location
>   - **Enterprise** (Gym Chain): Multiple admins, multiple locations, white-label

---

## 🏗️ Proposed Changes

### Phase 1: Landing Page & Marketing Site

#### `[NEW]` src/pages/Landing.tsx

**Purpose:** Public-facing marketing page for the SaaS platform

**Sections:**

1. **Hero Section**
   - Compelling headline: "Transform Your Gym's Assessment Process"
   - Subheadline: Value proposition
   - Primary CTA: "Start Free Trial" / "Book Demo"
   - Secondary CTA: "See How It Works"
   - Hero image/video: Platform in action

2. **Features Section**
   - AI-powered posture analysis
   - Comprehensive movement assessments
   - Automated client reports
   - Coach collaboration tools
   - Progress tracking & analytics

3. **Benefits Section**
   - Save time on assessments (quantify: "90% faster")
   - Increase client retention
   - Professional branded reports
   - Data-driven programming

4. **Social Proof**
   - Testimonials from existing gyms
   - Logo wall of gym clients
   - Success metrics/case studies

5. **Pricing Section**
   - Tiered pricing (Starter, Professional, Enterprise)
   - Feature comparison table
   - "Most Popular" badge
   - Annual discount option

6. **FAQ Section**
   - Common questions about setup, pricing, support
   - Technical requirements
   - Data security & privacy

7. **Footer**
   - Links: About, Privacy Policy, Terms of Service, Contact
   - Social media links
   - Copyright notice

**Design Notes:**
- Use existing Apple design system with glassmorphism
- Mobile-first responsive design
- Fast loading (optimize images, lazy load)
- SEO optimized (meta tags, structured data)

#### `[NEW]` src/components/landing/

**Purpose:** Reusable landing page components

**Components to create:**
- `HeroSection.tsx` - Hero with CTA
- `FeatureCard.tsx` - Feature highlights
- `TestimonialCard.tsx` - Customer testimonials
- `PricingCard.tsx` - Pricing tier cards
- `FAQAccordion.tsx` - Expandable FAQ items
- `CTASection.tsx` - Call-to-action sections
- `DemoVideo.tsx` - Product demo video player

---

### Phase 2: Gym Onboarding Flow

#### `[NEW]` src/pages/SignUp.tsx

**Purpose:** Public signup page for new account creation (Step 1 of the journey)

**Flow:** Landing → SignUp → Email Verification → Onboarding

**Form Fields:**
- Full name
- Email address
- Password (with strength indicator)
- Confirm password
- Accept Terms of Service checkbox
- "Create Account" CTA

**Features:**
- Social login options (Google, optional)
- Link to existing login page
- Password requirements displayed
- Real-time validation
- Redirect to email verification after signup

**Post-Signup:**
- Create Firebase Auth user
- Create initial `userProfiles` document with `role: 'org_admin'`
- Create initial `organizations` document with `subscription.status: 'trial'`
- Send verification email
- Redirect to `/onboarding` (or email verification prompt)

---

#### `[NEW]` src/pages/Onboarding.tsx

**Purpose:** Multi-step onboarding wizard for authenticated users to complete their profile

**Prerequisites:** User must be authenticated (account created via SignUp)

**Steps:**

1. **Business Information (Step 1/4)**
   - Business name (gym name, studio name, or "Your Name Coaching")
   - Business type: Solo Coach / Gym / Gym Chain
   - Address (with Google Places autocomplete)
   - Phone number
   - Website (optional)
   - Logo upload

2. **Branding Setup (Step 2/4)**
   - Primary brand color picker
   - Preview of branded reports
   - Custom domain (optional, enterprise tier)

3. **Equipment Configuration (Step 3/4)**
   - Body composition method (InBody, DEXA, Skinfold, etc.)
   - Grip strength equipment (Dynamometer, Deadhang, etc.)
   - Available assessment tools
   - Custom equipment notes

4. **Team Setup (Step 4/4)** - *Professional/Enterprise only*
   - Invite coaches (email list)
   - Set default permissions
   - Skip option (can add later)
   - *Starter tier*: Shows upgrade prompt instead

**Post-Onboarding:**
- Welcome email with getting started guide
- Redirect to dashboard with onboarding checklist
- Optional: Schedule onboarding call

#### `[NEW]` src/components/onboarding/

**Purpose:** Onboarding-specific components

**Components to create:**
- `OnboardingLayout.tsx` - Wrapper with progress indicator
- `StepIndicator.tsx` - Visual progress bar
- `BusinessInfoStep.tsx` - Step 1 form (name, type, address, logo)
- `BrandingStep.tsx` - Step 2 form with color picker
- `EquipmentStep.tsx` - Step 3 form
- `TeamSetupStep.tsx` - Step 4 form (or upgrade prompt for Starter)
- `OnboardingSuccess.tsx` - Completion screen

---

### Phase 3: Authentication & User Management

#### `[MODIFY]` src/contexts/AuthContext.tsx

**Changes:**
- Add `signUpGym()` function for gym owner registration
- Add `verifyEmail()` function
- Add `completeOnboarding()` function to update user profile
- Handle onboarding state in auth context

#### `[NEW]` src/services/onboarding.ts

**Purpose:** Service layer for onboarding operations

**Functions:**
- `createGymAccount(data)` - Create organization and owner account
- `updateGymProfile(orgId, data)` - Update gym information
- `uploadGymLogo(orgId, file)` - Upload logo to Firebase Storage
- `setBrandingConfig(orgId, config)` - Save branding settings
- `setEquipmentConfig(orgId, config)` - Save equipment configuration
- `inviteCoaches(orgId, emails)` - Send coach invitation emails
- `getOnboardingStatus(orgId)` - Check completion status

#### `[NEW]` src/types/onboarding.ts

**Purpose:** TypeScript types for onboarding

```typescript
// Subscription tiers (determines features, not roles)
type SubscriptionPlan = 'starter' | 'professional' | 'enterprise';
type SubscriptionStatus = 'trial' | 'active' | 'cancelled' | 'past_due';

// Business type selection during onboarding
type BusinessType = 'solo_coach' | 'gym' | 'gym_chain';

interface SignUpData {
  fullName: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
}

interface BusinessProfileData {
  name: string;
  type: BusinessType;
  address: string;
  phone: string;
  website?: string;
  logoUrl?: string;
}

interface BrandingConfig {
  primaryColor: string;
  logoUrl?: string;
  customDomain?: string; // Enterprise only
}

interface OnboardingStatus {
  currentStep: number;
  businessInfoCompleted: boolean;
  brandingCompleted: boolean;
  equipmentCompleted: boolean;
  teamSetupCompleted: boolean; // or skipped
  completedAt?: Date;
}
```

---

### Phase 4: Database Schema Updates

#### `[MODIFY]` Firestore Collections

**New Collection: `onboarding_sessions`**
```
onboarding_sessions/{sessionId}
  - userId: string
  - organizationId: string
  - currentStep: number
  - completedSteps: string[]
  - data: object (partial onboarding data)
  - createdAt: timestamp
  - updatedAt: timestamp
```

**Update Collection: `organizations`**
```
organizations/{orgId}
  - name: string
  - address: string
  - phone: string
  - website: string (optional)
  - logoUrl: string (optional)
  - brandColor: string
  - customDomain: string (optional)
  - subscription: {
      plan: 'starter' | 'professional' | 'enterprise'
      status: 'trial' | 'active' | 'cancelled'
      trialEndsAt: timestamp
      billingEmail: string
    }
  - onboardingCompletedAt: timestamp
  - createdAt: timestamp
```

**Update Collection: `userProfiles`** (existing collection)
```
userProfiles/{userId}
  - uid: string
  - organizationId: string
  - role: 'org_admin' | 'coach'  // Using existing roles
  - displayName: string
  - onboardingCompleted: boolean (NEW)
  - invitedBy: string (userId, optional) (NEW)
  - inviteAcceptedAt: timestamp (optional) (NEW)
```

---

### Phase 5: Routing & Navigation

#### `[MODIFY]` src/App.tsx

**Changes:**
- Add route: `/` → Landing (public, marketing page)
- Add route: `/signup` → SignUp (public, creates account)
- Add route: `/onboarding` → Onboarding (authenticated, requires account)
- Update route guards to check onboarding status
- Redirect incomplete onboarding to `/onboarding`

**Route Flow:**
```
New User:     Landing → /signup → /onboarding → /dashboard
Returning:    Landing → /login → /dashboard
Incomplete:   /login → auto-redirect → /onboarding → /dashboard
```

---

### Phase 6: Email Templates & Notifications

#### `[NEW]` Firebase Functions for Emails

**Functions to create:**
- `sendWelcomeEmail` - Triggered on gym signup
- `sendEmailVerification` - Email verification link
- `sendCoachInvitation` - Invite coaches to join
- `sendOnboardingReminder` - If onboarding incomplete after 24h
- `sendTrialEndingReminder` - 3 days before trial ends

**Email Service:** Use SendGrid (already configured in functions)

---

### Phase 7: Analytics & Tracking

#### `[NEW]` src/lib/analytics.ts

**Purpose:** Track user behavior and conversion metrics

**Events to track:**
- Landing page views
- CTA clicks
- Signup started
- Onboarding step completed
- Onboarding abandoned (step)
- Onboarding completed
- First assessment created
- Trial conversion

**Tool:** Google Analytics 4 or Mixpanel

---

## 🧪 Verification Plan

### Automated Tests

**Unit Tests:**
- Onboarding service functions
- Form validation logic
- Auth flow functions

**Integration Tests:**
- Complete onboarding flow
- Email verification
- Coach invitation flow

**E2E Tests (Playwright/Cypress):**
- Landing page → Signup → Complete onboarding
- Coach invitation → Accept → Login
- Gym owner → Invite coach → Coach creates assessment

### Manual Verification

**Landing Page:**
- [ ] Responsive on mobile, tablet, desktop
- [ ] All CTAs functional
- [ ] Forms validate correctly
- [ ] SEO meta tags present
- [ ] Page load time < 3s

**Onboarding Flow:**
- [ ] Can complete all 5 steps
- [ ] Can go back/forward between steps
- [ ] Data persists between steps
- [ ] Email verification works
- [ ] Logo upload works
- [ ] Color picker updates preview
- [ ] Coach invitations sent

**Post-Onboarding:**
- [ ] Redirected to dashboard
- [ ] Organization settings populated
- [ ] Branding applied to reports
- [ ] Equipment config affects assessments
- [ ] Invited coaches can sign up

### Performance Testing
- [ ] Landing page Lighthouse score > 90
- [ ] Onboarding flow completes in < 5 minutes
- [ ] No memory leaks during multi-step form

---

## 📅 Implementation Timeline

### Week 1: Landing Page
- **Day 1-2:** Landing page components
- **Day 3-4:** Content, copy, and design polish
- **Day 5:** SEO optimization and testing

### Week 2: Onboarding Flow
- **Day 1-2:** Onboarding wizard UI
- **Day 3-4:** Backend services and database
- **Day 5:** Email templates and notifications

### Week 3: Integration & Testing
- **Day 1-2:** Connect all pieces
- **Day 3-4:** Testing and bug fixes
- **Day 5:** Deploy to staging for review

---

## 🚀 Deployment Strategy

### Staging Environment
- Deploy to Firebase Hosting preview channel
- Test with real data (separate Firebase project)
- Get feedback from beta testers

### Production Rollout
- Feature flag for landing page (show to new visitors only)
- Gradual rollout of onboarding (existing users unaffected)
- Monitor analytics and error rates

### Rollback Plan
- Keep main branch stable
- Can revert to previous deployment instantly
- Database migrations are backward compatible

---

## 💡 Additional Considerations

### Payment Integration (Future Phase)
- Stripe Checkout for subscriptions
- Webhook handlers for subscription events
- Billing portal for plan management

### Legal & Compliance
- Privacy Policy page
- Terms of Service page
- GDPR compliance (data export, deletion)
- Cookie consent banner

### Support & Documentation
- Help center / Knowledge base
- Video tutorials for onboarding
- In-app tooltips and guidance
- Support chat widget (Intercom/Crisp)

### Marketing Automation
- Drip email campaigns for trials
- Retargeting for abandoned signups
- Referral program for existing gyms

---

## ✅ Task Checklist

### Phase 1: Landing Page
- [ ] Create landing page components directory
- [ ] Build HeroSection component
- [ ] Build FeatureCard component
- [ ] Build TestimonialCard component
- [ ] Build PricingCard component
- [ ] Build FAQAccordion component
- [ ] Create Landing.tsx page
- [ ] Add SEO meta tags
- [ ] Optimize images and performance
- [ ] Test responsive design

### Phase 2: Onboarding Flow
- [ ] Create onboarding components directory
- [ ] Build SignUp.tsx page (public, account creation)
- [ ] Build OnboardingLayout with progress indicator
- [ ] Build BusinessInfoStep (Step 1)
- [ ] Build BrandingStep with color picker (Step 2)
- [ ] Build EquipmentStep (Step 3)
- [ ] Build TeamSetupStep (Step 4, or upgrade prompt)
- [ ] Build OnboardingSuccess completion screen
- [ ] Create Onboarding.tsx page
- [ ] Add form validation

### Phase 3: Backend Services
- [ ] Create onboarding.ts service
- [ ] Implement createGymAccount()
- [ ] Implement updateGymProfile()
- [ ] Implement uploadGymLogo()
- [ ] Implement setBrandingConfig()
- [ ] Implement setEquipmentConfig()
- [ ] Implement inviteCoaches()
- [ ] Create onboarding types
- [ ] Update AuthContext for gym signup

### Phase 4: Database Schema
- [ ] Create onboarding_sessions collection
- [ ] Update organizations collection schema (subscription, branding)
- [ ] Update userProfiles collection (onboardingCompleted, invitedBy)
- [ ] Add Firestore security rules
- [ ] Create database indexes

### Phase 5: Routing & Navigation
- [ ] Add `/` route for Landing page
- [ ] Add `/onboarding` route
- [ ] Add `/signup` route
- [ ] Update route guards for onboarding status
- [ ] Add redirect logic for incomplete onboarding

### Phase 6: Email & Notifications
- [ ] Create welcome email template
- [ ] Create email verification template
- [ ] Create coach invitation template
- [ ] Implement sendWelcomeEmail function
- [ ] Implement sendEmailVerification function
- [ ] Implement sendCoachInvitation function
- [ ] Test email delivery

### Phase 7: Testing & Deployment
- [ ] Write unit tests for services
- [ ] Write integration tests for onboarding flow
- [ ] Manual testing on mobile/tablet/desktop
- [ ] Performance testing (Lighthouse)
- [ ] Deploy to staging
- [ ] Get user feedback
- [ ] Deploy to production

