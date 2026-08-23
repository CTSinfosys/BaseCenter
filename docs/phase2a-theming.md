# Phase 2A — DB-driven Theming (Batch 1)

A Super-Admin-managed theming system with **three independent scopes**, each
fully CRUD-able and applied **live via CSS variables** — no redeploy is needed
to switch or edit a theme.

## Scopes

| Scope     | Surface                                    | Applied on                     |
|-----------|--------------------------------------------|--------------------------------|
| `website` | Public marketing site                      | `/` and public pages           |
| `splash`  | Intro / module-selection screen            | `/modules`                     |
| `app`     | Internal authenticated portals             | `/admin` and `/app`            |

Tenant public sites (`/site/[slug]`) intentionally keep the baked-in baseline.

## Data model

`themes` table (migration `a1b2c3d4e5f6_phase2a_themes`):

| column       | type      | notes                                        |
|--------------|-----------|----------------------------------------------|
| `id`         | int PK    |                                              |
| `scope`      | string    | `website` \| `splash` \| `app` (indexed)     |
| `name`       | string    |                                              |
| `is_default` | bool      | exactly one default per scope (service-enforced) |
| `tokens`     | JSON      | full design-token blob                        |
| `created_at` / `updated_at` | timestamptz |                            |

The token blob is flexible JSON so Batch 2 (per-section content editing) can
layer on top without a schema change. `theme_service.effective_tokens()` merges
each theme's stored tokens over `DEFAULT_TOKENS`, so new token keys get sane
defaults on existing rows automatically.

### Token keys

Colors: `primary`, `primary_hover`, `primary_contrast`, `secondary`,
`secondary_hover`, `secondary_contrast`, `accent`, `background`, `page_bg`,
`surface_muted`, `text`, `text_muted`, `border`, `success`, `warning`, `error`.
Typography: `font_heading`, `font_body`, `font_size_base`, `heading_weight`,
`body_weight`. Shape/density: `radius_base`, `button_radius`, `button_style`
(`solid`|`outline`), `button_text_transform` (`none`|`uppercase`), `density`,
`shadow_level`. Also `base_mode` (`light`|`dark`), `section_backgrounds`
(Batch 2 hook), `logo_url`.

## Seeded themes (idempotent)

Four themes are seeded **per scope** (12 rows total) by
`theme_service.seed_themes()`, called from `app.db.seed`:

1. **BaseCenter Default** — the default; FreshBooks-style (Science Blue
   `#0075DD`, white surfaces, near-black text, Inter, lightly rounded solid
   buttons).
2. **Light** — cooler slate/blue palette.
3. **Dark** — true dark (`base_mode: dark`, dark surfaces, light text).
4. **Bold Contrast** — dramatic (violet `#7C3AED`, pink accent, Montserrat
   headings, sharp 4px corners, uppercase buttons).

Seeding never clobbers edited tokens (upsert by `(scope, name)`), and always
guarantees exactly one default per scope.

## API

### Public (no auth)
- `GET /api/v1/themes/active?scope=<scope>` → `{ scope, tokens }` — the
  effective tokens of the scope's default theme. Falls back to the baked-in
  baseline for unknown/empty scopes (never 500s).

### Super Admin (`get_current_superuser`)
- `GET  /api/v1/admin/themes?scope=<scope>` — list themes in a scope.
- `POST /api/v1/admin/themes` — create.
- `GET  /api/v1/admin/themes/{id}` — fetch one.
- `PUT  /api/v1/admin/themes/{id}` — update name/tokens.
- `DELETE /api/v1/admin/themes/{id}` — delete (blocked for the default).
- `POST /api/v1/admin/themes/{id}/duplicate` — copy (never default).
- `POST /api/v1/admin/themes/{id}/set-default` — make sole default for scope.

All writes are audited via `audit_service` (`theme.create`, `theme.update`,
`theme.delete`, `theme.duplicate`, `theme.set_default`).

## Live application mechanism

`globals.css` declares the baseline as `:root` CSS custom properties, and
Tailwind v4's `@theme inline` compiles every utility to read those variables.
The client `ThemeManager` (mounted globally in `app/layout.tsx`):

1. Resolves the scope from the current path (`lib/theme.ts → scopeForPath`).
2. Fetches `GET /themes/active?scope=…` (cached per scope in memory).
3. Applies the tokens as CSS variables on `<html>` (`lib/theme.ts →
   applyTokens`), including primary/secondary tint & shade derivation, radius
   scaling, and — for dark themes — remapping the Tailwind `neutral-*` scale so
   gray text/surfaces invert.

Because utilities reference these variables, changing the default theme (or
editing tokens) is reflected on the **next page load** of any surface in that
scope, with **no rebuild**. If the fetch fails, the baked-in FreshBooks Default
baseline remains in effect (graceful fallback).

## SA "Appearance" UI

At **`/admin/appearance`** (linked in the Super Admin sidebar). Three tabs —
Public Website / Intro-Splash / Internal App — each a full theme manager:
theme list with default badge, color pickers, font/typography controls,
radius/density/button-style/shadow controls, light-dark toggle, logo URL, a
live preview panel, plus Duplicate, Delete (guards the default), Set-as-Default,
and New. The **Internal App** tab additionally embeds the sidebar navigation
label editor (same `/admin/settings/sidebar` endpoints), keeping internal theme
and nav labels in one place.

## `/modules` splash

Rebuilt as a responsive grid of **all modules** fetched from
`GET /api/v1/modules` (with a baked-in fallback catalog). Paid modules show
`$5/mo`; the Website Builder is badged **Free • Included**. Selecting a card
reveals a sticky CTA flowing into the existing signup path
(`/register` → `/app/signup`). The splash-scope theme is applied automatically
by `ThemeManager`.
