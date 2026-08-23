# BaseCenter.ai Documentation

## Build Documentation

- [Phase 1 Build Document](basecenter_build_doc_phase1.md) — System foundation, Website Module, SA Portal & Intro Screen specification.

## Completion Reports

- [Phase 1A Completion](phase1a-completion.md) — Foundation: branding, design system, Next.js frontend, landing pages.
- [Phase 1B Completion](phase1b-completion.md) — Core Infrastructure: FastAPI backend, PostgreSQL, JWT authentication, API endpoints.
- [Phase 1C Completion](phase1c-completion.md) — Stripe Billing & Super Admin Settings: encrypted key storage, billing API, webhooks, module seeding, admin console.
- [Phase 2A Theming](phase2a-theming.md) — DB-driven, Super Admin managed theming applied live via CSS variables: three independent scopes (website, splash, app) with full CRUD, a JSON token model, `/admin/appearance` editor, public active-theme endpoint, and a rebuilt `/modules` grid.
- [Phase 2B Content Editor](phase2b-content-editor.md) — DB-driven, Super Admin managed CMS for the public site (`/`) and intro-splash (`/modules`): a `page_sections` model with eleven section types, idempotent seed of the live copy, SA image uploads, an `/admin/content` drag-and-drop editor (reorder, show/hide, add, duplicate, delete, edit), public read endpoint, and fallback rendering so pages are never blank.

## Marketing Materials

- [Marketing Copy](marketing-copy.md) — Landing page content, module descriptions, SEO keywords, messaging frameworks.
