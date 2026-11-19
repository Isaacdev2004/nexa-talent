# NexaTalent roadmap

## Phase 2 — Public website & marketplace
- [x] Homepage, job directory, job details, registration/login (candidate + employer), application form
- [x] Job filters (type, arrangement, country)
- [x] Real public content pages + contact/employer enquiry form

## Phase 3 — Candidate portal & recruitment CRM
- [x] Candidate profile, dashboard, application tracking
- [x] Resume library page
- [x] Staff area: dashboard, job management + publishing workflow, application pipeline
- [x] Candidate database, outreach records, opportunities (private JD sharing + candidate interest)

## Phase 4 — Assessment & specialist marketplace
- [ ] Resume assessment requests and staff-written reports — implemented; signed-in verification awaits a test account
- [ ] Specialist profiles and staff approval — implemented; signed-in verification awaits a test account
- [ ] Referrals, quotations, candidate acceptance, orders and secure delivery — implemented; signed-in end-to-end verification blocked until a candidate/specialist session is available; paid delivery waits on Phase 5 payment integration

## Phase 5 — Employer, recruiter & finance
- [x] Employer workspace: dashboard, company, vacancies (approval-gated), applicants + access controls
- [x] Recruiter dashboard/assignments
- [x] Payments, commissions, payouts, refunds — Stripe checkout; live charges need STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET

## Phase 6 — Automation & hardening
- [x] Email notifications — queued from in-app notices and sent when RESEND_API_KEY and EMAIL_FROM are set
- [x] AI-assisted assessment, job recommendations, finance reporting — scoring needs OPENAI_API_KEY; custom domain and SSL are set on the host via SITE_URL
