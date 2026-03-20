# ONE ASSESS — NORTH STAR DOCUMENT
*The single source of truth for every decision, every agent, every line of code.*
*Version 1.0 — March 2026*

---

## THE MISSION

**Eliminate the assessment admin burden for fitness coaches forever.**

Every coach who uses One Assess gets back 2-3 hours per client assessment. They deliver more professional, clinical-grade results. Their clients see better outcomes. Their business grows. This is the mission.

---

## THE PRODUCT

**One Assess** is an AI-powered fitness assessment platform that combines:
- **AI posture analysis** — MediaPipe running locally in the browser (zero cost per analysis)
- **8-phase clinical assessment engine** — PAR-Q through to programme design
- **Automated report generation** — professional coach + client reports with radar charts, PDF export, shareable links
- **Roadmap builder** — structured client journey with trackable milestones
- **Multi-tenant organisation management** — studios with multiple coaches

### What makes it different
1. **Zero AI cost per assessment** — MediaPipe runs in the browser. No external API calls. No per-analysis fees. Competitors using cloud vision APIs pay every time a client is analysed. We don't.
2. **Clinical depth** — 8-phase assessment with a decision table engine. Not a form with a PDF. An actual clinical logic system.
3. **Built by a coach** — Michael Brown is a working PT with a real studio. This was built for his own workflow first. That authenticity is the brand.
4. **Multi-tenant from day one** — solo coaches AND studio owners with teams. Most competitors serve one or the other.

---

## THE FOUNDER

**Michael Brown**
- Working personal trainer and PT studio owner (One Fitness Studio)
- Based in Kuwait, UK-registered business
- Solo founder, bootstrapped
- Built this to solve his own problem — then realised every coach has the same problem
- Business email: michael@one-assess.com
- Domain: one-assess.com

---

## THE CUSTOMER

### Primary: Independent Personal Trainers (UK)
- Work alone or in small studios
- Charge £50-100/hour
- Do 5-20 assessments per month
- Currently use: paper forms, basic PDFs, Word templates, nothing
- Pain: admin takes too long, reports look unprofessional, no posture analysis without expensive equipment
- Where they are: Instagram, fitness forums, PT communities, LinkedIn

### Secondary: PT Studio Owners (UK)
- 2-10 coaches
- Need consistent assessment quality across their team
- Need client data in one place
- Currently using: TrueCoach, PTminder, spreadsheets, or nothing

### NOT targeting (yet)
- Physiotherapists (different regulatory requirements)
- Large gym chains (procurement cycles too long)
- US market (focus UK first, prove model)

---

## THE COMPETITION

| Competitor | Weakness | Our Advantage |
|---|---|---|
| TrueCoach | No posture AI, £147/mo | Posture AI + cheaper |
| PTminder | No AI, dated UI | Modern + AI-native |
| Mindbody | Overkill for solo coaches | Simple + focused |
| PostureScreen | Posture only, no coaching tools | Full platform |
| Everfit | No clinical depth | Clinical logic engine |

**The gap we own:** AI posture analysis + clinical assessment depth + modern UX at a price solo coaches can afford.

---

## THE BUSINESS

### Stage
Pre-launch. Product ~87% complete. Infrastructure complete. No paying customers yet.

### Model
Subscription SaaS — monthly or annual billing via Stripe.

### Pricing (to be finalised — recommended)
| Tier | Price | Includes |
|---|---|---|
| Solo Coach | £49/mo | 1 coach, unlimited clients, all features |
| Studio | £129/mo | Up to 5 coaches, org management, team analytics |
| Enterprise | Custom | 5+ coaches, white label, API access |

Annual discount: 20% (improves cash flow, reduces churn)
Free trial: 14 days, no card required

### Unit Economics (targets)
- CAC target: under £50
- LTV target (solo): £49 × 18 months = £882
- Payback period: under 2 months
- Target MRR at 6 months: £5,000 (≈100 solo coaches)
- Target MRR at 12 months: £25,000

---

## THE TECH STACK

### Frontend
- React 18 + Vite + TypeScript
- Tailwind CSS + shadcn/ui
- Lucide React icons
- MediaPipe WASM (bundled — no CDN dependency)
- PWA with offline sync

### Backend
- Firebase Firestore (database)
- Firebase Auth (authentication)
- Firebase Cloud Functions (TypeScript) — 48 functions deployed
- Firebase Hosting

### AI & Analysis
- MediaPipe Pose (local WASM — zero server cost)
- Claude API (via Anthropic) for narrative generation
- OCR engine for data extraction

### Payments
- Stripe (configured, needs live key testing)

### Email
- Resend (configured, domain verified, live)
- noreply@one-assess.com

### Infrastructure
- GitHub: MichaelBrown88/fitness-flow-form
- Domain: one-assess.com (Google Workspace)
- Firebase project: assessment-engine-8f633
- APEX OS: os.one-assess.com (Vercel)

---

## THE ARCHITECTURE PRINCIPLES

These are non-negotiable. Every line of code must respect them.

1. **Zero unnecessary AI cost** — MediaPipe stays local. No cloud vision APIs for posture. Ever.
2. **Multi-tenant by default** — every data access checks organizationId. No exceptions.
3. **Server-side for sensitive operations** — PDFs, emails, billing logic live in Cloud Functions only.
4. **Analytics-ready from first write** — every new feature writes pre-computed summaries. No backfilling.
5. **Air-gap public views** — public routes never render coach/admin components behind flags. Dedicated viewer components only.
6. **No unbounded Firestore queries** — every list query has a limit(). Pagination for anything over 20 items.
7. **TypeScript strict** — no `any`. Use `unknown` or specific interfaces. No exceptions.

---

## THE LAUNCH CHECKLIST

### Blockers (must be done before charging anyone)
- [ ] Stripe live keys configured and tested end-to-end
- [ ] Stripe webhooks verified (subscription created, payment failed, cancelled)
- [ ] Pricing decision finalised
- [ ] Pricing page updated with real prices

### High priority (week of launch)
- [ ] Replace placeholder testimonials with real assessment screenshots
- [ ] SandboxTrial page linked from landing page CTA
- [ ] 10 coaches reached out to for beta access
- [ ] Blog: first 3 SEO posts published

### Done ✓
- [x] Firebase admin migrated to michael@one-assess.com
- [x] Email infrastructure: Resend live, domain verified, noreply@one-assess.com
- [x] All 48 Cloud Functions deployed
- [x] Google Workspace live at one-assess.com
- [x] Slack HQ configured with GitHub integration
- [x] APEX OS live at os.one-assess.com
- [x] Codebase cleaned of personal/studio references

---

## THE NORTH STAR METRIC

**Before launch:** Days to first paying customer.
**After launch:** Monthly Recurring Revenue (MRR).
**Always:** Does this decision get us closer to a coach paying for One Assess?

---

## AGENT OPERATING PRINCIPLES

Every APEX OS agent must apply these when responding:

1. **Revenue first** — always ask if this moves us closer to a paying customer
2. **Solo founder reality** — Michael has limited time. Prioritise ruthlessly.
3. **Coaches trust coaches** — the founder story is the marketing. Use it.
4. **Build in public** — real assessments, real results, real studio = social proof
5. **Ship then improve** — a working product at £49/mo beats a perfect product at £0
6. **UK market focus** — language, pricing in £, GDPR compliance, UK PT culture

---

*This document is the source of truth. When in doubt, return to the mission: eliminate the assessment admin burden for fitness coaches forever.*
