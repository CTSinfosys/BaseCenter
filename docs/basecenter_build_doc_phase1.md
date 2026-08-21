# BaseCenter.ai — Primary System Build Document (Phase 1)
**Document Version:** 1.0.0  
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

## 6. Implementation Technical Stack

* **Frontend Framework:** Next.js 14+ (App Router), React, Tailwind CSS, Lucide Icons.
* **Backend Framework:** FastAPI (Python 3.11+) asynchronous micro-services.
* **Database & Cache:** PostgreSQL with Row-Level Security (RLS) + Redis for session caching.
* **Billing Gateway:** Stripe API (SetupIntents, Subscriptions, Webhooks).
* **AI Orchestration:** Abacus.ai RouteLLM APIs with domain-specific system prompts.
* **Hosting & Edge Infrastructure:** Abacus.ai Cloud hosting with automated SSL termination.
