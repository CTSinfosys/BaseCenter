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
