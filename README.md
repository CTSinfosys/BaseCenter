# BaseCenter

Ultimate AI-driven Business SaaS — a modular platform where each tenant activates
only the business modules they need.

## Stack
- **Backend:** FastAPI + SQLAlchemy + Alembic, PostgreSQL
- **Frontend:** Next.js (App Router) + Tailwind
- **Payments:** Stripe (keys managed by Super Admin, encrypted at rest)

## Brand palette
Blue `#4F7FFF` (primary) · Violet `#7B68EE` (secondary) · Yellow `#E4F222`
(financial CTAs).

## Progress
- **Phase 1A/1B** — Foundation: auth (JWT), users, tenants, modules,
  subscriptions; `/admin` login + `AdminShell` with auth guard.
- **Phase 1C** — Stripe integration: encrypted platform settings, SA Stripe
  settings UI, connection test, module→Stripe product/price sync, webhooks.
  See [`docs/phase1c-completion.md`](docs/phase1c-completion.md).
- **Phase 1D** — Full Super Admin portal: tenant management, seat &
  subscription administration, and platform usage analytics dashboard.
  See [`docs/phase1d-completion.md`](docs/phase1d-completion.md).
- **Phase 1E** — Tenant Admin (customer-facing) self-service portal at `/app`:
  public signup & onboarding, tenant dashboard, self-service module activation
  with Stripe Checkout (graceful when unconfigured), and tenant-side user & seat
  management with seat-limit enforcement.
  See [`docs/phase1e-completion.md`](docs/phase1e-completion.md).
- **Phase 1F** — Website Builder module + the reusable module pattern: a
  tenant-scoped module (`websites` + `website_blocks`) with a guarded API, an
  editor at `/app/modules/website-builder` (create/edit/reorder/publish blocks),
  and a public read-only preview at `/site/{slug}`. Establishes the reusable
  `require_active_module(slug)` guard (403 when inactive), tenant data isolation,
  and a dynamic `MODULE_NAV` registry so active modules appear in the nav
  automatically. See [`docs/phase1f-completion.md`](docs/phase1f-completion.md).
- **Phase 1G** — Billing lifecycle & Stripe Customer Portal: tenant-admin
  billing page at `/app/billing` with subscription statuses, cancel
  (cancel-at-period-end — access continues until the period ends) and reactivate
  controls, a live read-only invoices list (hosted URL + PDF), and a "Manage
  billing" button that opens the Stripe Customer Portal. Adds dunning via
  expanded, idempotent webhooks (`invoice.payment_failed` → `past_due` denies
  access; `invoice.paid` → `active` restores it; `customer.subscription.deleted`
  → `canceled`), a past-due banner, a `cancel_at_period_end` column and a
  `webhook_events` idempotency table. Degrades gracefully when Stripe is
  unconfigured. See [`docs/phase1g-completion.md`](docs/phase1g-completion.md).
- **Phase 1H** — Hardening & production readiness: transactional email
  (`email_service` sending via encrypted SMTP settings, or logging the link when
  unconfigured) wired into email verification, password reset, and user
  invitations with signed expiring tokens; new SA **Email Settings**
  (`/admin/settings/email`, with a test send) and **Audit Log**
  (`/admin/audit`, paginated & filterable) pages; tenant portal
  verify-email / forgot-password / reset-password flows; a fail-safe
  `audit_logs` trail of security-relevant actions; `slowapi` rate limiting on
  login / signup / password-reset / test-email (env-configurable, HTTP 429);
  and security hardening — security headers (CSP `frame-ancestors` that
  **preserves iframe embedding**, no restrictive `X-Frame-Options`), explicit
  CORS, and password-strength enforcement. Degrades gracefully when SMTP is
  unconfigured. See [`docs/phase1h-completion.md`](docs/phase1h-completion.md).
- **Customizable sidebar labels** — Super Admins can rename the sidebar
  navigation items for both access levels (Super Admin and Tenant portals) from
  `/admin/settings/sidebar`. Stored as a non-secret platform setting; routes are
  unchanged and shells fall back to defaults if the label fetch fails.
  See [`docs/sidebar-labels.md`](docs/sidebar-labels.md).

## Local development
```bash
# PostgreSQL running on localhost:5432 (db basecenter_db / user basecenter)

# Backend
cd backend
pip install -r requirements.txt
alembic upgrade head
python -m app.db.seed          # seeds modules + super admin
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend
cd app
npm install
npm run dev                    # http://localhost:3000
```

**Super Admin portal:** http://localhost:3000/admin
(`admin@basecenter.ai` / `changeme123`)

**Tenant portal:** http://localhost:3000/app
(sign up at `/app/signup`, log in at `/app/login`)

## Repository layout
```
backend/    FastAPI app (app/), Alembic migrations
app/        Next.js frontend
docs/       Build & phase-completion documentation
assets/     Branding assets
```
