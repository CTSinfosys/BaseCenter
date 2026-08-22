# Phase 1E — Tenant Admin (Customer-Facing) Self-Service Portal

Phase 1E delivers the **customer-facing** self-service portal for BaseCenter.ai,
served under `/app` and completely separate from the Super Admin portal
(`/admin`). Prospective customers can sign up, land in a dashboard, activate the
business modules they need (free or paid via Stripe Checkout), and manage their
own team members within their seat allowance. It reuses the existing JWT auth,
Stripe, and webhook infrastructure from Phases 1A–1D — no duplication.

The commercial model follows the build doc's **"1 Free Core Module + Free
Website"** acquisition strategy:

- Every tenant gets the **Website** module free for all, plus **one core
  business module 100% free** (5-year introductory offer).
- Each module includes **10 seats**.
- Additional paid modules are **$5/mo** each.
- Additional seats are **+$5/mo per 10 seats**.

---

## 1. Tenant Signup & Onboarding
- **Public signup** (`/app/signup`) creates a **Tenant** + owner **User** with
  the `tenant_admin` role in a single step, with sensible defaults
  (10 seats, active status, owner linked).
- The free **Website** module is auto-activated on signup (`is_free_module`,
  10 seats) so a new tenant lands with a working module immediately.
- **Tenant login** (`/app/login`) issues a JWT scoped to the tenant/user,
  stored under a **separate token key** (`bc_tenant_token`) so tenant sessions
  never collide with Super Admin sessions (`bc_access_token`).

## 2. Tenant Dashboard
- After login (`/app`): shows **active modules**, **seat usage** (used vs.
  allocated), and **subscription / billing status**.
- Surfaces a clear banner when Stripe is not yet configured so tenants
  understand why paid upgrades are unavailable.

## 3. Self-Service Module Activation (Stripe Checkout)
- **Module catalog** (`/app/modules`) lists every module with its state
  (active / available) and price.
- **Free modules** and the tenant's **one free core module** activate directly
  (no payment) — the UI confirms "activated free of charge".
- **Paid modules** ($5/mo) start a **Stripe Checkout** session and return the
  tenant to `/app/modules` with a status message.
- **Graceful degradation:** when Stripe is not configured (or a module has not
  been synced to a Stripe price), activation fails softly with a clear,
  user-friendly message instead of an error — an explicit acceptance criterion.
- Completed checkouts flow through the existing Stripe **webhook**
  (`checkout.session.completed`, keyed by `tenant_id` + `module_id` metadata),
  so self-service purchases activate automatically.

## 4. Tenant-Side User & Seat Management
- **Team page** (`/app/team`, tenant-admin only): invite/add users, list them,
  and deactivate/reactivate members.
- **Seat limit enforced** — adding a user beyond the allocated seats is
  rejected with a clear "Seat limit reached (N/N)" message.
- The **owner** cannot be deactivated. Deactivating a member frees a seat that
  can be reused.

---

## Backend Changes

### Models (`backend/app/models/`)
- `user.py`: added `role` (`String`, NOT NULL, default `member`) to distinguish
  `tenant_admin` (owner) from `member`.

### Migration
- `c1a2b3d4e5f6_phase1e_user_role.py` (down-revision `b879cb709462`). Adds the
  `role` column with a server default so it applies cleanly to existing rows,
  and backfills existing tenant owners to `tenant_admin`.

### Schemas (`backend/app/schemas/`)
- `tenant_portal.py`: `TenantSignup`, `TenantLogin`, `TenantAuthResponse`,
  `TenantMe`, `DashboardResponse`, `ModuleCatalogItem`, `ActivateModuleRequest`,
  `ActivateModuleResponse`, `TenantUserCreate`, `TenantUserOut`, and supporting
  message/response models.
- `user.py`: `UserInDB` exposes `role`.

### Services (`backend/app/services/`)
- `tenant_portal_service.py`: `signup_tenant`, `dashboard`, `catalog`,
  `activate_module` / `deactivate_module`, and user management with
  **seat-limit enforcement**. `DEFAULT_SEATS = 10`. Detects whether the tenant's
  free core-module slot is used and auto-activates the free Website module on
  signup.
- `stripe_service.py`: `create_checkout_session` now accepts
  `success_path` / `cancel_path` so the tenant portal returns to `/app/modules`
  (Super Admin still defaults to `/admin/billing`).

### API (`backend/app/api/v1/tenant.py`)
- New router mounted at `/api/v1/tenant` with `get_current_tenant_user` and
  `get_current_tenant_admin` dependencies. Endpoints:
  - `POST /signup`, `POST /login`, `GET /me`
  - `GET /dashboard`
  - `GET /modules`, `POST /modules/activate`,
    `POST /modules/{sub_id}/deactivate`
  - `GET /users`, `POST /users`, `POST /users/{id}/deactivate`,
    `POST /users/{id}/activate`
- `main.py`: imports and includes the tenant router.

---

## Frontend Changes (`app/`)

### Tenant portal (`app/app/app/…` → routes under `/app`)
- `components/tenant/TenantShell.tsx` — sidebar shell with its own tenant-token
  auth guard and violet accent; nav: Dashboard, Modules, Team & Seats
  (Team is tenant-admin only).
- `app/app/app/page.tsx` — dashboard (`/app`).
- `app/app/app/signup/page.tsx` — signup (`/app/signup`).
- `app/app/app/login/page.tsx` — login (`/app/login`).
- `app/app/app/modules/page.tsx` — module catalog with Stripe return handling
  (Suspense + `useSearchParams`).
- `app/app/app/team/page.tsx` — team & seat management.
- `app/app/register/page.tsx` and `app/app/login/page.tsx` — redirect the
  marketing-site CTAs to `/app/signup` and `/app/login`.

### Shared
- `lib/api.ts` — `bc_tenant_token` key + get/set/clear helpers; `apiFetch`
  supports a `tenant` option to select the correct token; tenant client
  functions and types for all endpoints above.
- `components/layout/Navigation.tsx` and `Footer.tsx` — hidden on `/admin` and
  `/app` routes so the marketing chrome doesn't leak into either portal.

---

## Verification
- PostgreSQL running; `alembic upgrade head` applies cleanly (head
  `c1a2b3d4e5f6`); `role` column verified NOT NULL default `member`.
- Backend (`:8000`) imports and registers all `/api/v1/tenant/*` routes.
- `npx tsc --noEmit` and `npm run build` both pass; all `/app*` routes build.
- End-to-end smoke test (API + browser):
  - Signup creates tenant + owner, auto-activates free Website module, lands on
    dashboard (seat 1/10).
  - Activating a free core module confirms "activated free of charge";
    subsequent modules flip to "$5/mo".
  - Subscribing to a paid module with Stripe unconfigured degrades gracefully
    with a clear message.
  - Team page adds a member (seats 1/10 → 2/10); **11th user rejected with
    "Seat limit reached (10/10)"**; deactivating frees a seat; owner cannot be
    deactivated.

---

## Portal Separation Summary
| | Super Admin | Tenant Admin |
|---|---|---|
| Route | `/admin` | `/app` |
| Identity | `is_superuser` | `tenant_id` + `role` |
| Token key | `bc_access_token` | `bc_tenant_token` |
| Access | platform-wide | own tenant only |
