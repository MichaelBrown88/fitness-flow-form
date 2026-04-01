# ONE ASSESS — NORTH STAR DOCUMENT
*The single source of truth for every decision, every agent, every line of code.*
*Version 2.0 — April 2026*

---

## THE MISSION

**Eliminate the assessment admin burden for fitness coaches forever.**

Every coach who uses One Assess gets back 2-3 hours per client assessment. They deliver more professional, clinical-grade results. Their clients see better outcomes. Their business grows. This is the mission.

---

## THE NORTH STAR METRIC

**Before launch:** Days to first paying customer.
**After launch:** Monthly Recurring Revenue (MRR).
**Target:** £10,000 MRR.
**Always:** Does this decision get us closer to a coach paying for One Assess?

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
- Based in Kuwait; UK trading entity **ONE ASSESS LTD** (incorporated UK limited company, March 2026)
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

### Model
Subscription SaaS — monthly or annual billing via Stripe.

### Pricing — capacity-based (client seats)

**Free tier:** Up to 2 clients, 5 AI scans/month, no card required.

**Solo Coach (1 coach, up to 100 clients):**

| Clients | Monthly | Annual (~20% off) | AI scans/mo |
|---|---|---|---|
| 10 | £39 | £374 | 30 |
| 20 | £69 | £662 | 45 |
| 35 | £94 | £902 | 65 |
| 50 | £114 | £1,094 | 85 |
| 75 | £129 | £1,238 | 110 |
| 100 | £139 | £1,334 | 130 |

**Gym / Studio (multi-coach teams, 50–250 clients, 14-day trial):**

| Clients | Monthly | Annual (~20% off) | AI scans/mo |
|---|---|---|---|
| 50 | £149 | £1,430 | 150 |
| 100 | £199 | £1,910 | 200 |
| 150 | £239 | £2,294 | 260 |
| 200 | £269 | £2,582 | 300 |
| 250 | £289 | £2,774 | 350 |

Custom branding: £79 one-time add-on.
AI credit top-up: £9 for 20 credits (GB).
250+ clients: contact sales.

### Unit Economics (targets)
- CAC target: under £50
- LTV target (solo 10): £39 × 18 months = £702
- Payback period: under 2 months
- Target MRR at 6 months: £5,000
- Target MRR at 12 months: £10,000+

### Banking & Payments
- **Wise** — business banking (set up and live)
- **Stripe** — payment processing (configured, live keys pending)

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
- Firebase Cloud Functions (TypeScript)
- Firebase Hosting

### AI & Analysis
- MediaPipe Pose (local WASM — zero server cost)
- Claude API (via Anthropic) for narrative generation
- OCR engine for data extraction

### Payments
- Stripe

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

## AGENT OPERATING PRINCIPLES

Every APEX OS agent must apply these when responding:

1. **Revenue first** — always ask if this moves us closer to a paying customer
2. **Solo founder reality** — Michael has limited time. Prioritise ruthlessly.
3. **Coaches trust coaches** — the founder story is the marketing. Use it.
4. **Build in public** — real assessments, real results, real studio = social proof
5. **Ship then improve** — a working product at £39/mo beats a perfect product at £0
6. **UK market focus** — language, pricing in £, GDPR compliance, UK PT culture

---

*This document is the source of truth. When in doubt, return to the mission: eliminate the assessment admin burden for fitness coaches forever.*
