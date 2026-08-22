"""
Tenant billing schemas (customer-facing) — Phase 1G.

Power the /app/billing page: subscription lifecycle overview, live invoices,
cancel/reactivate responses, and Stripe Customer Portal sessions.
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class BillingSubscription(BaseModel):
    subscription_id: int
    module_id: int
    name: str
    slug: str
    icon: Optional[str] = None
    is_free_module: bool
    status: str
    monthly_price: int
    cancel_at_period_end: bool
    current_period_end: Optional[datetime] = None
    has_stripe: bool


class BillingOverview(BaseModel):
    stripe_configured: bool
    has_customer: bool
    subscriptions: List[BillingSubscription]
    monthly_total_cents: int
    any_past_due: bool


class InvoiceOut(BaseModel):
    id: Optional[str] = None
    number: Optional[str] = None
    created: Optional[datetime] = None
    amount_cents: int
    currency: str
    status: Optional[str] = None
    hosted_invoice_url: Optional[str] = None
    invoice_pdf: Optional[str] = None


class InvoiceList(BaseModel):
    invoices: List[InvoiceOut]


class PortalSessionResponse(BaseModel):
    url: str


class MessageResponse(BaseModel):
    success: bool
    message: str
