# Data Protection Impact Assessment

**One Assess — DPIA for Fitness Assessment Platform**
**Version 1.0 | April 2026**
**Prepared by:** Michael **[REVIEW: full name]**, Founder, One Assess Ltd
**Status:** Draft — requires solicitor review and formal sign-off before launch

> **Statutory basis:** This DPIA is prepared in compliance with UK GDPR Article 35 and the Data Protection Act 2018. Processing of biometric data, health data, and automated profiling using personal data each independently trigger the DPIA requirement under UK GDPR Article 35(3) and ICO guidance. All three triggers apply to the One Assess platform.

---

## PART 1 — OVERVIEW AND CONTEXT

### 1.1 What is being assessed?

This DPIA covers the processing of personal data — including Special Category Data — carried out by the One Assess fitness assessment platform in connection with the following core features:

1. **Posture assessment** — coaches capture photographs of clients from multiple angles; the platform processes those photographs using computer vision (MediaPipe landmark detection) and an AI model (Google Gemini via Vertex AI) to generate structured posture observations
2. **Health screening** — coaches record client responses to PAR-Q health questionnaires, medication disclosures, and lifestyle data via the platform
3. **Body composition data** — coaches record body measurements including weight, body fat percentage, BMI, and skeletal muscle mass
4. **Client report generation** — the platform aggregates the above data into a structured report, an AXIS Score™, and an ARC™ plan visible to the coach and, via a secure link, to the client
5. **AI assistant** — coaches query an AI assistant that has access to client assessment data, scores, and health flags to support coaching decisions

### 1.2 Who is conducting this assessment?

| Role | Name | Date |
|---|---|---|
| Data Controller | One Assess Ltd | April 2026 |
| Prepared by | **[REVIEW: full name, role]** | April 2026 |
| DPO consulted | **[REVIEW: DPO name if appointed, or N/A with justification]** | |
| Legal review | **[REVIEW: solicitor name and firm]** | |
| Sign-off | **[REVIEW: director/founder signature]** | |

### 1.3 Why is a DPIA required?

A DPIA is mandatory where processing is "likely to result in a high risk to the rights and freedoms of natural persons" (UK GDPR Article 35(1)). Three independent triggers are present:

| Trigger | Basis | Present? |
|---|---|---|
| Processing of biometric data | UK GDPR Article 35(3)(b); ICO screening criteria | **Yes** — posture photographs processed via computer vision to extract anatomical landmarks |
| Processing of data concerning health | UK GDPR Article 35(3)(b); ICO screening criteria | **Yes** — PAR-Q responses, medication disclosures, and body composition data |
| Systematic evaluation using automated processing | UK GDPR Article 35(3)(a); ICO screening criteria | **Yes** — AI-generated posture observations and AXIS Score™ produced by automated processing |

---

## PART 2 — DESCRIPTION OF PROCESSING

### 2.1 Data flows

**Step 1 — Data capture (coach-side)**
- Coach opens the One Assess platform authenticated via Firebase Authentication
- Coach captures client posture photographs using the device camera (in-app) or the client uploads photographs via a token-authenticated remote assessment link
- Coach records body measurements, PAR-Q responses, movement screen results, and lifestyle data via structured form fields

**Step 2 — Posture processing**
- MediaPipe (client-side, runs in the browser) extracts 33 anatomical landmarks (x, y, z coordinates + visibility score) from each photograph
- Landmark coordinates are passed to Google Gemini API (via Firebase AI / Vertex AI) which generates descriptive posture observations in structured JSON format
- Photographs (full resolution) are stored in Firebase Storage at `organizations/{orgId}/clients/{clientId}/sessions/{sessionId}/{view}_full.jpg`
- Landmarks and analysis results are stored in Firebase Firestore under the relevant organisation's data path

**Step 3 — Score generation and report**
- The platform's scoring engine aggregates assessment data to produce an AXIS Score™ (0–100 composite across five pillars) and per-pillar scores
- A structured report is generated combining posture observations, scores, movement screen results, and body composition data
- The report is accessible to the coach within the authenticated dashboard
- The coach may share a report with the client via a unique, unguessable share token (no client account required)

**Step 4 — AI assistant**
- Coaches may query an AI assistant (Google Gemini) that receives a payload including the client's scores, health flags, posture findings, and assessment history
- When `parqFlagged: true`, the assistant refuses to generate exercise programming and directs the coach to obtain physician clearance

**Step 5 — Retention and deletion**
- Data is retained for the duration of the coach's subscription plus any statutory retention period
- Clients may request erasure via a link in their report; coaches may execute erasure from the admin panel
- Erasure Cloud Function performs cascading deletion across Firestore and Firebase Storage

### 2.2 Data inventory

| Category | Data Elements | Special Category? | Legal Basis |
|---|---|---|---|
| Identity | Name, email, date of birth, gender | No | Contract performance (coach subscription); legitimate interests (client reporting) |
| Contact | Phone number, email address | No | Contract performance |
| Biometric | Posture photographs; anatomical landmark coordinates extracted from photographs | **Yes — Article 9** | Explicit consent obtained at point of capture |
| Health | PAR-Q responses; medication disclosures; health flags | **Yes — Article 9** | Explicit consent obtained at point of assessment |
| Body composition | Weight, body fat %, BMI, skeletal muscle mass, body measurements | Arguably Article 9 (data concerning health) | Explicit consent |
| Assessment scores | AXIS Score™; pillar scores; movement screen results | No | Contract performance / legitimate interests |
| Lifestyle | Activity level, sleep, stress, nutrition, hydration, steps | No | Legitimate interests |
| Device/technical | IP address, browser type, session identifiers | No | Legitimate interests (security, fraud prevention) |

### 2.3 Parties involved in processing

| Party | Role | Basis |
|---|---|---|
| One Assess Ltd | Data processor (for client data); data controller (for coach/account data) | Article 28 DPA executed with coaches |
| Coach / Gym | Data controller (for client data) | Responsible for obtaining client consent and providing fair processing notice |
| Client | Data subject | Recipient of services; has right of access, erasure, portability |
| Google Cloud Platform | Sub-processor | Article 28-equivalent data processing terms with Google |
| Google Gemini API | Sub-processor | Processes posture metrics and health-adjacent data for AI descriptions |
| Resend | Sub-processor | Processes coach email addresses for lifecycle communications |
| Stripe | Sub-processor | Processes coach payment and billing data |

---

## PART 3 — NECESSITY AND PROPORTIONALITY

### 3.1 Is the processing necessary for the stated purpose?

| Processing activity | Necessary? | Justification |
|---|---|---|
| Posture photographs | Yes | The core product proposition requires visual posture capture; manual observation alone cannot generate the structured positional data that underpins the AXIS Score™ and report |
| Anatomical landmark extraction | Yes | Required to produce objective positional measurements; raw photographs alone are insufficient without structured data extraction |
| AI-generated descriptions | Yes | Converts numerical landmark data into coaching-relevant observations; the alternative (raw numbers) is not meaningful to coaches or clients |
| Health screening data | Yes | PAR-Q data is required to identify contraindications that affect safe exercise programming; processing is proportionate to the safety purpose |
| Body composition data | Yes | Core fitness assessment pillar; cannot be replaced with a proxy measure |
| AXIS Score™ | Yes | The scoring output is the primary value delivered to coaches and clients; it requires aggregating the above data points |
| AI assistant with health flags | Yes | The assistant provides coaching support; access to health flags is required to enforce the PAR-Q hard stop and avoid generating unsafe programming advice |

### 3.2 Proportionality and data minimisation

- **Data minimised at source:** Coaches are guided by the platform to collect only the data needed for the assessment type selected (posture, lifestyle, body comp, movement, or combinations)
- **Access controls enforced at database level:** Coaches access only clients assigned to them; org admins access only their organisation's data; platform staff access is gated behind explicit `dataAccessPermission` flags
- **Landmark data not shared with clients:** Raw anatomical coordinates (x, y, z) are stored internally and not exposed in client-facing reports; only the human-readable descriptions are shared
- **Photographs retained at minimum required resolution:** Full-resolution photographs are retained in Firebase Storage for ongoing posture trend comparison; compressed previews used where resolution is not needed
- **AI descriptions only — images not retained by Gemini:** Posture photographs are transmitted to the Gemini API for processing but Google's data processing terms state that data submitted via Vertex AI is not used to train models **[REVIEW: confirm current Google Vertex AI data use terms]**

### 3.3 Retention

| Data type | Retention period | Basis |
|---|---|---|
| Client assessment data | Duration of coach subscription + 12 months post-termination | Operational continuity; allows data recovery within reasonable period |
| Posture photographs | Duration of coach subscription + 12 months post-termination | Required for trend analysis across assessments |
| Erasure request records | 3 years from erasure completion | Legal compliance evidence; ICO audit readiness |
| AI usage logs | 24 months (anonymised cost records only) | Financial reconciliation; no PII retained |
| Anonymised analytics data | Indefinite (aggregate only; no individual identifiable) | Platform improvement; public benchmarking research |

---

## PART 4 — RISK IDENTIFICATION AND ASSESSMENT

Risks are rated on a combined likelihood × severity matrix: **Low / Medium / High / Critical.**

### Risk 1 — Misuse of posture data for unintended medical purposes

**Description:** Coaches or clients may rely on posture observations as medical diagnoses rather than fitness coaching observations, particularly if the language used implies clinical precision.

**Likelihood:** Medium (without controls); Low (with controls in place)
**Severity:** High (potential physical harm from incorrect reliance; potential regulatory action under UK MDR 2002)
**Inherent risk:** High

**Mitigations in place:**
- All posture output uses non-diagnostic language (positional descriptions, not clinical pathology names)
- Persistent disclaimer on all posture output views: "These observations are for fitness coaching context only. They are not a clinical or medical assessment."
- Terms of Service and Main Agreement explicitly state the Service is not a medical device
- AI posture system prompt explicitly prohibits diagnostic language
- MHRA scoping opinion to be obtained before launch to confirm product falls below medical device threshold

**Residual risk:** Low-Medium

---

### Risk 2 — Inadequate consent for Special Category Data

**Description:** Posture photographs and health screening data are Special Category Data under UK GDPR Article 9. If explicit consent is not obtained before collection, the processing lacks a valid legal basis.

**Likelihood:** Low (with controls in place)
**Severity:** High (ICO enforcement action; maximum fine 4% of global turnover or £17.5m)
**Inherent risk:** High

**Mitigations in place:**
- In-app camera capture: explicit consent gate displayed before camera initialises for posture mode; requires active button press to proceed
- Remote assessment (client-uploaded photos): explicit consent checkbox required before photo upload fields are accessible
- Consent event recorded in Firestore with timestamp and version number
- Privacy Notice Banner displayed to clients on first report view
- Terms require coaches to obtain client consent before collecting data; coach attestation recorded at point of assessment save

**Gaps and actions:**
- **[ACTION]** DPA template must be executed with every coach/gym before first data processing — currently not enforced at signup
- **[ACTION]** Consent mechanism should record the specific version of the consent notice shown, to allow audit if consent language changes
- **[ACTION]** Consent should be re-obtained if the consent notice materially changes

**Residual risk:** Low (once DPA and consent versioning are implemented)

---

### Risk 3 — Unauthorised access to client data

**Description:** A data breach or misconfigured access control could expose client photographs, health data, and personal details to unauthorised parties.

**Likelihood:** Low
**Severity:** High
**Inherent risk:** Medium-High

**Mitigations in place:**
- Firebase Firestore security rules enforce coach-to-own-clients scoping at database level (not just application level)
- Firebase Storage access restricted to authenticated organisation members
- Firebase App Check enforced in production on all Cloud Functions
- All data in transit encrypted via TLS; all data at rest encrypted via AES-256 (Google Cloud Platform)
- Client reports accessible via unguessable share tokens (128-bit entropy); no client account required; token not logged in analytics
- Platform admin access requires explicit `dataAccessPermission` flag in Firestore

**Gaps and actions:**
- **[ACTION]** Confirm App Check is enforced in production (checklist item L1 in LAUNCH_CHECKLIST.md)
- **[ACTION]** Periodic review of Firestore security rules following any schema change

**Residual risk:** Low

---

### Risk 4 — Data breach notification failure

**Description:** A data breach affecting client Special Category Data may not be detected or reported to the ICO within the 72-hour window required by UK GDPR Article 33.

**Likelihood:** Low-Medium
**Severity:** High
**Inherent risk:** Medium

**Mitigations in place:**
- Sentry error monitoring with alerting for application-layer anomalies
- Slack-based operational alerts for unusual activity patterns
- Firebase Security Rules prevent bulk exfiltration by design (no unauthenticated list queries)

**Gaps and actions:**
- **[ACTION]** Prepare and document a breach response procedure (who is notified, in what order, within what timeframe)
- **[ACTION]** Document the threshold for ICO notification vs. internal-only response
- **[ACTION]** Confirm Google Cloud Platform breach notification obligations under the processor agreement

**Residual risk:** Low-Medium (pending breach response procedure)

---

### Risk 5 — International data transfers without adequate safeguards

**Description:** Google Gemini API (Vertex AI) processes posture data in the United States. Without an appropriate transfer mechanism, this constitutes a restricted transfer under UK GDPR.

**Likelihood:** Medium (without controls); Low (with controls)
**Severity:** High
**Inherent risk:** High

**Mitigations in place:**
- Google Cloud / Vertex AI covered by UK adequacy decision for EU transfers and by IDTA for US transfers **[REVIEW: confirm current UK adequacy status and applicable IDTA documentation with Google]**
- Sub-processor list maintained in Schedule 1 of DPA with transfer mechanisms noted

**Gaps and actions:**
- **[ACTION]** Obtain and retain copies of the relevant IDTA or UK Addendum executed with Google for Vertex AI processing
- **[ACTION]** Review transfer mechanism documentation if Google changes data centre configuration

**Residual risk:** Low (once IDTA documentation obtained)

---

### Risk 6 — Erasure requests not fulfilled within statutory period

**Description:** UK GDPR Article 17 requires erasure of personal data without undue delay when a valid request is made. Currently, erasure is a manual process dependent on an administrator executing a Cloud Function.

**Likelihood:** Medium
**Severity:** Medium
**Inherent risk:** Medium

**Mitigations in place:**
- Client-facing erasure request flow accessible from every report page
- Erasure Cloud Function performs cascading deletion across all Firestore subcollections and Firebase Storage objects
- Erasure request stored with `status: 'pending'` pending admin action
- 30-day processing window disclosed to clients at time of request

**Gaps and actions:**
- **[ACTION]** Implement automated alert (Slack / email) when erasure requests are older than 25 days without `completedAt` timestamp (LAUNCH_CHECKLIST.md item L8)
- **[ACTION]** Confirm Firebase Storage `deleteObject()` calls are included in the erasure function — verify that Storage files, not just Firestore references, are deleted
- **[ACTION]** Consider whether the 30-day window can be reduced — "without undue delay" under UK GDPR is generally interpreted as within one month, but sooner where technically feasible

**Residual risk:** Low (once automated alerting implemented)

---

### Risk 7 — AI assistant generating harmful advice for health-flagged clients

**Description:** If the AI assistant generates exercise programming for a client with PAR-Q concerns or undisclosed medication interactions, the coach may rely on that advice without applying professional judgment, potentially causing client harm.

**Likelihood:** Low (with controls in place)
**Severity:** High
**Inherent risk:** High

**Mitigations in place:**
- PAR-Q hard stop implemented in AI assistant system prompt: when `parqFlagged: true`, the assistant refuses exercise programming with a fixed response directing the coach to obtain physician clearance
- Medications flag triggers a mandatory advisory note before any programming suggestion
- Terms require coaches to exercise independent professional judgment; AI outputs are explicitly non-binding

**Residual risk:** Low

---

### Risk 8 — Children's data processed without parental consent

**Description:** Coaches may use the platform to assess clients under 18. UK GDPR requires parental/guardian consent for processing children's data, particularly Special Category Data.

**Likelihood:** Medium
**Severity:** High
**Inherent risk:** High

**Mitigations in place:**
- Terms of Service require coaches to obtain explicit written parental or guardian consent before collecting or storing any personal or health information of minors
- No age verification is technically enforced at the platform level

**Gaps and actions:**
- **[ACTION]** Consider adding a checkbox or explicit acknowledgement step when adding a client with a date of birth indicating they are under 18
- **[ACTION]** Add guidance in the coach onboarding flow about the parental consent requirement for under-18 clients

**Residual risk:** Medium (pending technical enforcement of minor client consent flow)

---

## PART 5 — OVERALL RISK ASSESSMENT

| Risk | Inherent | Residual | Status |
|---|---|---|---|
| 1. Misuse for medical purposes | High | Low-Medium | Controls in place; MHRA opinion pending |
| 2. Inadequate consent | High | Low | DPA and consent versioning action required |
| 3. Unauthorised access | Medium-High | Low | Controls in place; App Check confirmation required |
| 4. Breach notification failure | Medium | Low-Medium | Breach response procedure action required |
| 5. International transfers | High | Low | IDTA documentation action required |
| 6. Erasure not fulfilled | Medium | Low | Automated alerting action required |
| 7. AI harmful advice | High | Low | PAR-Q hard stop implemented |
| 8. Children's data | High | Medium | Technical enforcement action required |

**Overall assessment:** The residual risk profile is acceptable for launch, subject to the completion of the open actions identified above. The most material open action is execution of a signed DPA with each coach/gym customer before first data processing. All other open actions are operational and technical in nature and should be completed within 30 days of launch.

---

## PART 6 — ACTIONS REQUIRED BEFORE LAUNCH

| # | Action | Owner | Target date |
|---|---|---|---|
| A1 | DPA template finalised, reviewed by solicitor, and implemented at signup | Michael | Before first paying customer |
| A2 | Consent notice versioning implemented (record version number alongside consent timestamp in Firestore) | Engineering | Before launch |
| A3 | App Check confirmed enforced in production | Engineering | Before launch |
| A4 | MHRA regulatory scoping opinion obtained | Michael | Before launch |
| A5 | IDTA documentation obtained from Google for Vertex AI processing | Michael | Before launch |
| A6 | Automated 30-day erasure deadline alert implemented | Engineering | Before launch |
| A7 | Firebase Storage deletion confirmed in erasure Cloud Function | Engineering | Before launch |
| A8 | Breach response procedure documented | Michael | Before launch |
| A9 | Minor client consent flow (under-18 checkbox) added | Engineering | Before launch |
| A10 | ICO registration confirmed for One Assess Ltd | Michael | Before launch |
| A11 | PT insurer endorsements obtained | Michael | Before launch |

---

## PART 7 — CONSULTATION AND SIGN-OFF

### 7.1 DPO consultation

**[REVIEW: If a DPO has been appointed, their consultation and any recommendations must be recorded here. If no DPO is appointed, document the justification — under UK GDPR, a DPO is mandatory where an organisation's core activities require large-scale systematic monitoring of individuals or large-scale processing of Special Category Data. A small SaaS platform may not meet the threshold, but legal advice should confirm this.]**

DPO appointed: Yes / No **[REVIEW]**
If No, justification: **[REVIEW]**
If Yes, DPO consulted on: **[date]** and their recommendations: **[summary]**

### 7.2 ICO prior consultation

Under UK GDPR Article 36, prior consultation with the ICO is required where residual risk remains high after mitigation. Based on the assessment above, residual risks are Low or Medium following the implementation of identified controls. **Prior ICO consultation is not currently considered necessary**, but this assessment should be reviewed if:
- The scale of processing increases materially (e.g., processing data of more than 10,000 data subjects)
- New processing activities are added that involve clinical or medical contexts
- Any Risk is reassessed as High residual following implementation review

### 7.3 Sign-off

| Signatory | Role | Date | Signature |
|---|---|---|---|
| **[REVIEW: Name]** | Founder / Director, One Assess Ltd | | |
| **[REVIEW: Name]** | Legal adviser / Solicitor | | |

---

## PART 8 — REVIEW SCHEDULE

This DPIA must be reviewed:
- Annually from the date of sign-off
- When a new processing activity is added that materially changes the risk profile
- When a significant change is made to the platform architecture, AI models used, or sub-processors
- In the event of a data breach or ICO investigation
- When applicable law or ICO guidance materially changes

**Next scheduled review date:** April 2027

---

*This document is a working draft and requires solicitor review and formal sign-off before it can be relied upon for regulatory compliance purposes. Last updated: April 2026.*
