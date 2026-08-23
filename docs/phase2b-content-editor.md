# Phase 2B — DB-driven Content / CMS (Batch 2)

A Super-Admin-managed, lightweight CMS for the two public surfaces — the
marketing site (`/`) and the intro / module-selection splash (`/modules`).
Both pages render their sections **from the database**, and a Super Admin can
reorder, show/hide, add, duplicate, delete and edit every section — plus upload
images — from a single editor at **`/admin/content`**. Changes apply **live**;
no redeploy is needed.

## Surfaces

| Page    | Route      | Rendered from                          |
|---------|------------|----------------------------------------|
| `website` | `/`      | ordered visible `page_sections` rows   |
| `splash`  | `/modules` | ordered visible `page_sections` rows |

Both pages ship a **baked-in fallback** (`app/components/content/defaults.ts`)
that is rendered during SSR and whenever the API is unreachable, so the pages
are **never blank**. The DB content hydrates on mount and replaces the fallback.

## Data model

`page_sections` table (migration `b2c3d4e5f6a7_phase2b_content`):

| column        | type        | notes                                        |
|---------------|-------------|----------------------------------------------|
| `id`          | int PK      |                                              |
| `page`        | string      | `website` \| `splash` (indexed)              |
| `type`        | string      | one of the section types below               |
| `position`    | int         | ordering within a page                       |
| `is_visible`  | bool        | hidden sections stay in the editor, drop from public |
| `content`     | JSON        | full per-section content blob                 |
| `created_at` / `updated_at` | timestamptz |                            |

A composite index `ix_page_sections_page_position` backs the ordered public
read. The `content` column is free-form JSON, so new section types or fields can
be added without a schema change.

## Section types

Eleven presentational types, each with a label + description (surfaced in the
"Add a section" dropdown) and a typed edit form:

`hero`, `rich_text`, `feature_grid`, `modules_grid`, `image`, `image_text`,
`cta_banner`, `steps`, `pricing`, `faq`, `html`.

- **modules_grid** replicates the interactive splash experience — all modules
  fetched from `GET /api/v1/modules` (with fallback), the Website Builder badged
  **Free • Included**, card selection revealing a sticky CTA into the signup
  path. It is used on both `/` and `/modules`.
- **html** is a raw-HTML escape hatch; `<script>` tags and `on*` inline
  handlers are stripped before render.

## Seed (idempotent)

`content_service.seed_content()` seeds the **current live copy** of both pages —
8 website sections and 3 splash sections — mirroring the pre-existing hard-coded
markup. Seeding is **per-page idempotent**: a page that already has any section
is skipped, so the seed is safe to re-run.

## API

Public read (no auth):

- `GET /api/v1/content/{page}` — ordered **visible** sections as
  `{id, type, content}`.

Super-Admin CRUD (all SA-protected and audit-logged, under `/api/v1/admin`):

- `GET  /content/section-types` — type catalog for the Add dropdown.
- `GET  /content/{page}` — all sections (incl. hidden) for the editor.
- `POST /content/{page}/sections` — add a section (appended to the end).
- `PUT  /content/sections/{id}` — replace a section's full content blob.
- `PATCH /content/sections/{id}/visibility` — show / hide.
- `POST /content/sections/{id}/duplicate` — clone a section.
- `DELETE /content/sections/{id}` — remove a section.
- `PUT  /content/{page}/reorder` — persist a new order (`section_ids`).

Media (SA-protected):

- `POST   /media` — multipart image upload, returns a public URL.
- `GET    /media` — list uploaded media.
- `DELETE /media/{filename}` — delete an upload.

## Media storage

No S3 bucket is attached to this VM, so uploads are stored on local disk at
`/home/ubuntu/basecenter_uploads/media/` (outside the repo) and served publicly
by nginx at `https://basecenter-api.abacusai.cloud/media/<file>`. Uploads are
validated by **magic bytes** (JPEG, PNG, GIF, WEBP, SVG), capped at **5 MB**,
and stored under a UUID filename. Deletes are basename-guarded against path
traversal.

## SA "Content" UI

At **`/admin/content`** (linked in the Super Admin sidebar). Two tabs — Public
Website / Intro-Splash — each a full section manager built on **dnd-kit**:

- **Drag-and-drop reorder** via a drag handle; the new order persists.
- Per-section **show/hide**, **duplicate**, **delete**, and inline **Edit**.
- **Add a section** dropdown listing all eleven types.
- Typed edit forms driven by a per-type schema (text, textarea, image,
  checkbox, select, repeatable item lists, string lists), including
  **drag-and-drop image upload** widgets that call `POST /media`.
- An **Open preview ↗** link to the live page.

## Deploy

- Migration `b2c3d4e5f6a7` applied to the production database; seed run
  (website = 8, splash = 3 sections).
- Backend (`basecenter-api`) gained the content + media routers and a
  `/media/` nginx alias; restarted.
- Frontend (`basecenter-web`) rebuilt and restarted with the new public pages,
  the `/admin/content` editor, and `@dnd-kit` dependencies.
- Live: `https://basecenter.abacusai.cloud/`,
  `https://basecenter.abacusai.cloud/modules`,
  `https://basecenter.abacusai.cloud/admin/content`.
