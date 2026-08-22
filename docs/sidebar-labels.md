# Customizable Sidebar Labels

Super Admins can rename the sidebar navigation items shown in **both** access
levels — the Super Admin portal (`/admin`) and the Tenant Admin portal (`/app`)
— without changing any routes. Only the visible label text changes.

## How it works
- Each nav item has a **stable key** (e.g. `dashboard`, `tenants`, `settings`,
  `sidebar` for admin; `dashboard`, `modules`, `team` for tenant) plus an
  overridable display label. Defaults mirror the built-in labels.
- Overrides are stored as a **non-secret** JSON platform setting
  (`sidebar_labels`) via the existing `settings_service` / `PlatformSetting`
  pattern — **not encrypted**. No schema change / migration is required.
- Clearing a field (or setting it back to the default) removes the override, so
  that item falls back to its default label.

## Editing
Open **Sidebar Labels** in the Super Admin sidebar (`/admin/settings/sidebar`).
Labels are grouped by access level, each field shows its default as placeholder
and a per-field **Reset** control, and a single **Save Labels** button persists
all changes.

## Backend
- `services/settings_service.py` — `DEFAULT_SIDEBAR_LABELS`,
  `get_sidebar_labels(db, level=None)` (defaults merged with overrides) and
  `set_sidebar_labels(db, overrides)` (stores only non-default values; writes
  `{}` so a full reset persists).
- `schemas/settings.py` — `SidebarLabelsConfig`, `SidebarLabelsUpdate`.
- `api/v1/admin.py`:
  - `GET /api/v1/admin/settings/sidebar` — SA-protected, full effective config.
  - `PUT /api/v1/admin/settings/sidebar` — SA-protected, save overrides.
  - `GET /api/v1/admin/sidebar-labels` — **public**, lightweight (labels only,
    no secrets) so each shell can fetch its effective labels without SA auth.

## Frontend
- `lib/api.ts` — `getSidebarLabels`, `updateSidebarLabels` (SA) and
  `getPublicSidebarLabels` (public).
- `app/admin/settings/sidebar/page.tsx` — the editor page.
- `components/admin/AdminShell.tsx` and `components/tenant/TenantShell.tsx` fetch
  the public labels and render nav using overrides, **falling back to defaults**
  while loading or if the fetch fails so navigation never breaks.
