# BaseCenter.ai — Primary System Build Document (Phase 1)
**Document Version:** 1.1.0  
**Status:** Approved Architecture  
**Target Platform:** Abacus.ai Cloud Infrastructure / Next.js / FastAPI / PostgreSQL  
**Document Purpose:** Master blueprint for all autonomous development agents and engineers building the BaseCenter.ai platform.

---

## 1. Executive Summary & Core Business Logic

### 1.1 Product Vision
BaseCenter.ai is an **AI-customizable business operating system** designed for solo entrepreneurs, small businesses, contractors/trades, and growing enterprises. The platform is built on the core promise:
> *"Business software that adapts to how you work — not the other way around."*

### 1.2 Commercial & Packaging Engine
* **10 Core Paid Business Modules + 1 Optional Website Module:**
  1. *Invoice & Milestones* (SOW generator, milestone tracking, automated billing, payment gateways)
  2. *Contracting* (AI legal document generation, redlining, approval workflows)
  3. *Help Ticket* (AI-assisted customer & internal support desk)
  4. *Knowledge Base* (Dynamic context-aware documentation builder)
  5. *Data Collection* (Custom form builder with prompt-based processing pipelines)
  6. *Project Management* (Hybrid Kanban/Scrum with autonomous AI coordination)
  7. *File Management* (Cloud document suite with Google Docs / Dropbox parity)
  8. *Training LMS* (Autonomous course curriculum generator & scheduler)
  9. *Accounting* (Configurable ledger, invoicing sync, QuickBooks/Intuit export)
  10. *CRM Plus* (Customer lifecycle organizer, lead scoring, automated campaign engine)
  11. *Website Module* (Drag-and-drop block website builder, 10 business themes, free inclusion)
* **The "1 Free + Free Website" Acquisition Model:**
  * Every tenant selects **1 Core Business Module 100% Free** (5-year guaranteed introductory period).
  * The **Website Module is included at $0** with every account (optional activation).
  * The free module tier includes **10 full-featured user seats**.
* **Monetization & Add-On Unit Economics:**
  * Additional modules cost **$5.00 / month per module**.
  * Each activated module includes **10 seats**.
  * Additional seat expansion: **+$5.00 / month per 10 additional seats**.
  * Free Module Switch Policy: A customer may switch their free module **exactly once** via an automated token/coupon emailed to the Account POC.

---

## 2. Multi-Tenant Architecture & Routing Topology

### 2.1 Dynamic Subdomain & Edge Routing
```
                      ┌────────────────────────────────────────┐
                      │          Cloudflare / Edge DNS         │
                      └───────────────────┬────────────────────┘
                                          │
                  ┌───────────────────────┼──────────────────────┐
                  ▼                       ▼                      ▼
        [basecenter.ai]         [*.basecenter.ai]        [sa.basecenter.ai]
      Corporate Marketing        Dynamic Tenant           Super Admin (SA)
       Website & Intro Hub      Workspace & Sites             Portal
                  │                       │                      │
                  └───────────────────────┼──────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │       FastAPI / Next.js Core App       │
                      │   - JWT Auth & Dynamic Multi-Tenancy   │
                      │   - Stripe Webhook & Billing Engine    │
                      │   - AI Agent Orchestrator              │
                      └───────────────────┬────────────────────┘
                                          │
                  ┌───────────────────────┴──────────────────────┐
                  ▼                                              ▼
    ┌───────────────────────────┐                  ┌───────────────────────────┐
    │     PostgreSQL Engine     │                  │     Blob & File Storage   │
    │  - Tenant-Isolated Data   │                  │  - Custom Assets & Media  │
    │  - RBAC / Granular ACL    │                  │  - Themes & Invoices      │
    └───────────────────────────┘                  └───────────────────────────┘
```

* `basecenter.ai` / `www.basecenter.ai`: Corporate public marketing site, 10-module interactive selector, pricing calculator, and auth entry.
* `app.basecenter.ai` / `[tenant].basecenter.ai/app`: Authenticated tenant workspace console.
* `[tenant].basecenter.ai`: Public-facing tenant marketing website (rendered dynamically if the Website module is enabled).
* `sa.basecenter.ai`: Role-gated Super Admin control center.

---

## 3. Data Schemas & Access Control Layer (PostgreSQL)

```sql
-- Schema: Core Multi-Tenant Structure

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(64) UNIQUE NOT NULL, -- e.g., 'acme' -> acme.basecenter.ai
    status VARCHAR(32) DEFAULT 'pending_onboarding', -- 'pending_onboarding', 'active', 'delinquent', 'suspended'
    stripe_customer_id VARCHAR(128) UNIQUE,
    stripe_payment_method_id VARCHAR(128),
    billing_status VARCHAR(32) DEFAULT 'good_standing',
    has_website_activated BOOLEAN DEFAULT FALSE,
    website_domain VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL, -- 'super_admin', 'staff_admin', 'account_poc', 'account_admin', 'module_manager', 'user', 'public'
    is_poc BOOLEAN DEFAULT FALSE,
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE organization_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    module_code VARCHAR(32) NOT NULL, -- 'invoicing', 'contracting', 'help_ticket', 'knowledge_base', 'data_collection', 'project_mgmt', 'file_mgmt', 'lms', 'accounting', 'crm_plus', 'website'
    is_free_tier BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    seat_limit INT DEFAULT 10,
    additional_seats INT DEFAULT 0,
    stripe_subscription_item_id VARCHAR(128),
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_org_module UNIQUE (org_id, module_code)
);

CREATE TABLE free_module_switches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    original_module_code VARCHAR(32) NOT NULL,
    new_module_code VARCHAR(32),
    coupon_code VARCHAR(64) UNIQUE NOT NULL,
    is_redeemed BOOLEAN DEFAULT FALSE,
    redeemed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE custom_access_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_name VARCHAR(64) NOT NULL,
    module_code VARCHAR(32) NOT NULL,
    can_create BOOLEAN DEFAULT FALSE,
    can_read BOOLEAN DEFAULT TRUE,
    can_update BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    field_level_restrictions JSONB DEFAULT '{}'::jsonb
);
```

---

## 4. End-to-End Customer Onboarding & Provisioning Pipeline

```
 ┌────────────────┐     ┌───────────────────┐     ┌──────────────────┐
 │  Landing Page  │ ──► │  Register Account │ ──► │ 10-Module Screen │
 │ Explore Modules│     │ Name, Email, Org  │     │  Pick 1 for Free │
 └────────────────┘     └───────────────────┘     └────────┬─────────┘
                                                           │
 ┌────────────────┐     ┌───────────────────┐              │
 │ AI Provisioning│ ◄── │  Payment Gateway  │ ◄────────────┘
 │ & Config Wizard│     │ Card on File ($0) │
 └────────────────┘     └───────────────────┘
```

1. **Step 1: Registration Form**
   * Fields: `full_name`, `email`, `password`, `organization_name`.
   * Organization record created with `status = 'pending_onboarding'`. No cloud resources provisioned yet.
2. **Step 2: Interactive 10-Module Grid**
   * High-contrast cards for all 10 modules + Website module toggle.
   * Customer selects their 1 Free Core Module + optional Free Website Module.
3. **Step 3: Secure Payment Details Capture ($0 Upfront)**
   * Stripe Elements `SetupIntent` collects credit/debit card on file.
   * Clear Reassurance Banner: *"Your first module is free for 5 years with 10 seats included. You will not be charged today."*
4. **Step 4: Dynamic Tenant Provisioning & AI Wizard Execution**
   * Tenant status transitions to `active`.
   * Record inserted into `organization_modules` (`is_free_tier = TRUE`).
   * AI Module Customization Agent initializes interview session to adapt data fields, workflows, and templates.

---

## 5. Super Admin (SA) Portal Architecture

Accessible strictly at `sa.basecenter.ai` for `super_admin` and `staff_admin` roles.

### 5.1 The 5 Core Management Engines
1. **CRM (Tenant & Organization Management)**
   * Multi-tenant directory with filters for active modules, seat usage, and payment standing.
   * Secure, audit-logged **Tenant Impersonation ("Login-As")** engine.
   * Organization lifecycle controls (`Active`, `Delinquent`, `Suspended`, `Archived`).
2. **Analytics (Platform Metrics & Intelligence)**
   * Real-time MRR, Average Revenue Per Account (ARPA), and cohort retention.
   * Module distribution heatmap (most popular free selections vs. top $5 add-ons).
   * AI token consumption and compute metrics per tenant.
3. **Billing/Accounting (Subscription & Payment Hub)**
   * Stripe charge logs, dunning retries, and invoice reconciliation.
   * Coupon & Switch Token Generator for 1-time free module transfers.
   * Manual credit issuance, seat overrides, and refund tools.
4. **System Settings (Global Configurations & AI Prompts)**
   * Master React row/section website editor controls.
   * Global library manager for the 10 pre-built website themes.
   * System Prompt Engineering Console for cross-module AI agents.
5. **Security (Staff Administration, ACL & Audit Trails)**
   * Staff credential manager with mandatory MFA enforcement.
   * Platform-wide immutable audit trail (logs actor, IP, timestamp, target entity, and diff).

---

## 6. Design & UI Reference Framework

**Note:** These SaaS applications represent the general style and theme for BaseCenter.ai. The focus is on **in-app interface design patterns**, not marketing websites.

### 6.1 Design System Inspirations

#### Monday.com — Vibe Design System
* **Core Philosophy:** Open-source React component library built for consistency and native platform feel.
* **Key Patterns to Adopt:**
  * Comprehensive design token system (colors, shadows, dimensions, typography)
  * 50+ reusable components (buttons, popovers, navigation, inputs)
  * Responsive action feedback (0.5-1s response times with loading indicators)
  * Native integration patterns for settings, search bars, and filters
  * Tooltips, hints, and banners for contextual assistance
  * Welcome pages and onboarding for first-time module activation
  * Light and dark mode support
* **Technical Resources:**
  * Vibe Design System: https://vibe.monday.com/
  * Component Library: `@vibe/core`
  * Figma UI Kits available for prototyping
* **Implementation for BaseCenter.ai:**
  * Build a similar React component library for cross-module consistency
  * Ensure all modules share consistent interaction patterns
  * Implement comprehensive onboarding flows for each activated module

#### Trello — Kanban & Visual Task Management
* **Core Philosophy:** Clean, column-based layout with intuitive drag-and-drop for visual workflow tracking.
* **Key Patterns to Adopt:**
  * Horizontal scrollable board layout with vertical columns (lists)
  * Drag-and-drop interactivity with visual feedback (shadows, tilting during drag)
  * Card-based content containers with hover states for secondary actions
  * Contextual modals for detailed task views without leaving board context
  * Real-time collaboration with presence indicators
* **Technical Implementation:**
  * Use libraries like `@dnd-kit/core` for drag-and-drop
  * Card components with metadata (avatars, comments, reactions)
  * Minimal aesthetic with hover-revealed actions
* **Application to BaseCenter.ai:**
  * Direct application to **Project Management module** (Kanban boards)
  * Card-based UI patterns applicable to **Help Ticket**, **CRM Plus**, and **Data Collection** modules

#### Ramp.com — Editorial Minimalism
* **Core Philosophy:** "Black-and-white editorial" design with a single high-contrast accent color for financial actions.
* **Key Patterns to Adopt:**
  * Near-monochrome palette with strategic accent color (#e4f222 highlighter yellow)
  * **Color System:**
    * Primary Accent: Highlighter Yellow (#e4f222) for primary actions, live counters, active states
    * Neutrals: Ink (#0c0a08) for primary text, Obsidian (#1a1919) for inverted panels, Hairline (#e5e7eb) for borders
  * **Typography:** Single typeface (Lausanne at 400 weight), hierarchy through size and tracking
  * **Elevation:** 1px hairline borders instead of box-shadows for card surfaces
  * **Component Library ("Ryu"):**
    * Semantic props (e.g., `color='destructive'` or `color='constructive'`)
    * Constraint-based design to maintain uniformity
    * Isolated component library decoupled from business logic
  * **Layout:** Comfortable density with 4px base spacing unit, left-aligned within centered max-width (1200px) containers
  * **Border Radii:** 6px (buttons/tags), 10px (inputs), 12px (wash cards), 16px (content cards)
* **Application to BaseCenter.ai:**
  * Apply to **Accounting** and **Invoice & Milestones** modules for financial clarity
  * Use highlighter accent color for "money-moving" actions
  * Build semantic component library with constraint-based design

#### Attio.com — Modern Data-Driven CRM
* **Core Philosophy:** Flexible, data-driven interface with clean aesthetics and high information density.
* **Key Patterns to Adopt:**
  * **Color Palette:** Signature Teal (#3ABDAF) for primary actions and focus states
  * **Typography:** Inter typeface for high legibility
  * **Nature Palette:** Green tones (Mint to Sage to Hunter) for data categorization
  * **Core UI Components:**
    * Sophisticated table grids with sortable columns, custom filters, pagination, bulk actions
    * Side panels and modals to maintain workflow context
    * Well-designed empty states with zero-data screens and first-use prompts
    * Modular dashboards for analytics and metrics
    * Interactive onboarding with progress indicators
    * Extensive form and input patterns optimized for rapid data entry
* **Application to BaseCenter.ai:**
  * Direct application to **CRM Plus** module
  * Table/grid patterns applicable to **Accounting**, **Data Collection**, and **Help Ticket** modules
  * Side panel pattern for cross-module navigation consistency

#### QuickBooks Online — Professional Accounting Dashboard
* **Core Philosophy:** Clean, intuitive, modular dashboard with customizable widgets for financial oversight.
* **Key Patterns to Adopt (App Interface Only):**
  * **Widget-Based Dashboard:** Customizable layout with relocatable, add/remove widgets
  * **Core Functionality Tabs:** Home view for shortcuts, specialized views for cash flow, reports
  * **Visual Design:**
    * High-contrast visuals with clean, legible typography
    * Grid-based compositions with modular layouts
    * Light and dark mode support (dark mode optimized for reduced eye strain)
  * **Navigation Patterns:**
    * Streamlined menus with reduced steps to access tools
    * Smart search with custom filters for transactions, accounts, reports
    * Bookmarking for frequently used actions
  * **Mobile Consistency:** Mirror desktop experience on mobile with task-focused interfaces
* **Note:** We are **NOT** adopting the green color from the QuickBooks marketing website. Focus is on the clean dashboard UI patterns within the app.
* **Application to BaseCenter.ai:**
  * Primary reference for **Accounting** module dashboard
  * Widget customization pattern applicable to main **Dashboard** across all modules
  * Smart search and bookmarking patterns for platform-wide navigation

### 6.2 BaseCenter.ai Design System Synthesis

Based on the above references, the BaseCenter.ai design system will incorporate:

**Color Strategy:**
* Primary Accent: Teal (#3ABDAF) inspired by Attio for primary actions and focus states
* Financial Actions: Highlighter Yellow (#e4f222) inspired by Ramp for "money-moving" operations in Accounting and Invoicing modules
* Neutrals: High-contrast grayscale palette for text and surfaces
* Semantic Colors: `constructive` (green tones), `destructive` (red tones), `warning` (amber tones)

**Typography:**
* Primary Typeface: Inter (fallback to system fonts for performance)
* Hierarchy through size, weight, and letter-spacing
* Base weight: 400, Bold weight: 600-700 for emphasis

**Component Library ("BaseCore"):**
* React-based component library with TypeScript
* Semantic prop system for maintainability
* Constraint-based design to minimize design debt
* Support for light/dark modes
* Accessibility (WCAG 2.1 AA compliance)

**Layout & Spacing:**
* Base spacing unit: 4px (following 4px grid system)
* Max content width: 1200px centered
* Consistent border radii: 6px (small), 10px (medium), 12px (large), 16px (cards)
* 1px hairline borders for elevation instead of heavy shadows

**Interaction Patterns:**
* Response time targets: 0.5-1s for most actions with visual feedback
* Drag-and-drop with visual affordances (shadows, opacity, positioning feedback)
* Contextual modals and side panels to maintain workflow context
* Empty states with clear calls-to-action
* Progressive onboarding with step indicators

**Module-Specific Patterns:**
* **Project Management:** Kanban boards with Trello-inspired drag-and-drop
* **CRM Plus:** Attio-inspired data grids with advanced filtering
* **Accounting & Invoicing:** Ramp-inspired editorial minimalism with financial action highlights
* **All Modules:** Monday.com-inspired component consistency and onboarding flows
* **Dashboard:** QuickBooks-inspired customizable widget system

---

## 7. Implementation Technical Stack

* **Frontend Framework:** Next.js 14+ (App Router), React, Tailwind CSS, Lucide Icons.
* **Backend Framework:** FastAPI (Python 3.11+) asynchronous micro-services.
* **Database & Cache:** PostgreSQL with Row-Level Security (RLS) + Redis for session caching.
* **Billing Gateway:** Stripe API (SetupIntents, Subscriptions, Webhooks).
* **AI Orchestration:** Abacus.ai RouteLLM APIs with domain-specific system prompts.
* **Hosting & Edge Infrastructure:** Abacus.ai Cloud hosting with automated SSL termination.
