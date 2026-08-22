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
