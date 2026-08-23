"""
Content service (Phase 2B — lightweight CMS).

Business logic for SA-managed page content. Each page (``website`` | ``splash``)
is an ordered list of :class:`PageSection` rows. This module owns:

  * default content factories per section type (used when a section is added),
  * section type metadata (for the editor's "Add section" picker),
  * CRUD + reorder + duplicate,
  * idempotent seeding of the current landing / splash content.
"""
from copy import deepcopy
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.content import PageSection, CONTENT_PAGES, SECTION_TYPES


class ContentError(Exception):
    """Raised on invalid content operations (bad page/type, missing id)."""


# --------------------------------------------------------------------------
# Section type metadata (drives the editor "Add section" picker)
# --------------------------------------------------------------------------
SECTION_TYPE_INFO: List[Dict[str, str]] = [
    {"type": "hero", "label": "Hero", "description": "Headline, subheadline, background image and up to two call-to-action buttons."},
    {"type": "rich_text", "label": "Text", "description": "A heading with a multi-paragraph body of text."},
    {"type": "feature_grid", "label": "Feature grid", "description": "A grid of feature cards (icon, title, text, optional link)."},
    {"type": "modules_grid", "label": "Modules grid", "description": "The catalog of all modules with the free one badged (splash)."},
    {"type": "image", "label": "Image", "description": "A single image with an optional caption."},
    {"type": "image_text", "label": "Image + text", "description": "An image beside a block of text (side configurable)."},
    {"type": "cta_banner", "label": "CTA banner", "description": "A call-to-action banner with heading, text and a button."},
    {"type": "steps", "label": "Steps / How it works", "description": "An ordered list of steps (number, title, text)."},
    {"type": "pricing", "label": "Pricing", "description": "Pricing tiers (name, price, features)."},
    {"type": "faq", "label": "FAQ", "description": "A list of question / answer pairs."},
    {"type": "html", "label": "Custom HTML", "description": "A raw HTML block (sanitized on render)."},
]


# --------------------------------------------------------------------------
# Default content per type (used when creating a fresh section)
# --------------------------------------------------------------------------
def default_content(section_type: str) -> Dict[str, Any]:
    if section_type not in SECTION_TYPES:
        raise ContentError(f"Unknown section type '{section_type}'.")
    factory = _DEFAULTS.get(section_type)
    return deepcopy(factory) if factory else {}


_DEFAULTS: Dict[str, Dict[str, Any]] = {
    "hero": {
        "headline": "Your headline here",
        "subheadline": "A short supporting sentence that explains the value.",
        "background_image": "",
        "primary_cta_text": "Get Started",
        "primary_cta_link": "/modules",
        "secondary_cta_text": "",
        "secondary_cta_link": "",
        "note": "",
    },
    "rich_text": {
        "heading": "Section heading",
        "body": "Write your content here. Use blank lines to separate paragraphs.",
        "align": "center",
    },
    "feature_grid": {
        "heading": "",
        "intro": "",
        "columns": 3,
        "items": [
            {"icon": "✨", "title": "Feature one", "text": "Describe the feature.", "link": ""},
            {"icon": "🚀", "title": "Feature two", "text": "Describe the feature.", "link": ""},
            {"icon": "🎯", "title": "Feature three", "text": "Describe the feature.", "link": ""},
        ],
    },
    "modules_grid": {
        "heading": "Choose your modules",
        "intro": "Start with one core module free — add any others for just $5/month each.",
    },
    "image": {
        "image": "",
        "caption": "",
        "max_width": "large",  # small | medium | large | full
    },
    "image_text": {
        "image": "",
        "image_side": "left",  # left | right
        "heading": "Heading",
        "body": "Supporting text beside the image.",
        "cta_text": "",
        "cta_link": "",
    },
    "cta_banner": {
        "heading": "Ready to get started?",
        "text": "A short line encouraging the visitor to act.",
        "cta_text": "Get Started Free",
        "cta_link": "/modules",
        "note": "",
    },
    "steps": {
        "heading": "How It Works",
        "intro": "",
        "steps": [
            {"title": "Step one", "text": "Describe the first step."},
            {"title": "Step two", "text": "Describe the second step."},
            {"title": "Step three", "text": "Describe the third step."},
        ],
    },
    "pricing": {
        "heading": "Simple, honest pricing",
        "intro": "",
        "tiers": [
            {"name": "First Module", "price": "$0", "period": "/forever", "highlight": False,
             "features": ["Your choice of any module", "10 seats included", "Full feature access", "5-year guarantee"]},
            {"name": "Additional Modules", "price": "$5", "period": "/month each", "highlight": True,
             "features": ["10 seats per module", "Full feature access", "Seamless integration", "Cancel anytime"]},
            {"name": "Extra Seats", "price": "$5", "period": "/month", "highlight": False,
             "features": ["Per 10 additional seats", "Any module", "Same features", "Scale as needed"]},
        ],
        "note": "",
    },
    "faq": {
        "heading": "Frequently asked questions",
        "items": [
            {"q": "A common question?", "a": "A helpful answer."},
        ],
    },
    "html": {
        "html": "<p>Custom HTML content.</p>",
    },
}


# --------------------------------------------------------------------------
# Validation helpers
# --------------------------------------------------------------------------
def validate_page(page: str) -> None:
    if page not in CONTENT_PAGES:
        raise ContentError(f"Invalid page '{page}'. Must be one of {', '.join(CONTENT_PAGES)}.")


def validate_type(section_type: str) -> None:
    if section_type not in SECTION_TYPES:
        raise ContentError(f"Invalid section type '{section_type}'.")


# --------------------------------------------------------------------------
# Reads
# --------------------------------------------------------------------------
def list_sections(db: Session, page: str) -> List[PageSection]:
    """All sections (incl. hidden), ordered — for the editor."""
    validate_page(page)
    return (
        db.query(PageSection)
        .filter(PageSection.page == page)
        .order_by(PageSection.position.asc(), PageSection.id.asc())
        .all()
    )


def list_visible(db: Session, page: str) -> List[PageSection]:
    """Visible sections only, ordered — for public render."""
    validate_page(page)
    return (
        db.query(PageSection)
        .filter(PageSection.page == page, PageSection.is_visible.is_(True))
        .order_by(PageSection.position.asc(), PageSection.id.asc())
        .all()
    )


def get_section(db: Session, section_id: int) -> PageSection:
    sec = db.query(PageSection).filter(PageSection.id == section_id).first()
    if not sec:
        raise ContentError("Section not found.")
    return sec


def _next_position(db: Session, page: str) -> int:
    last = (
        db.query(PageSection)
        .filter(PageSection.page == page)
        .order_by(PageSection.position.desc())
        .first()
    )
    return (last.position + 1) if last else 0


# --------------------------------------------------------------------------
# Writes
# --------------------------------------------------------------------------
def create_section(
    db: Session,
    page: str,
    section_type: str,
    content: Optional[Dict[str, Any]] = None,
    is_visible: bool = True,
    position: Optional[int] = None,
) -> PageSection:
    validate_page(page)
    validate_type(section_type)
    merged = default_content(section_type)
    if content:
        merged.update(content)
    pos = position if position is not None else _next_position(db, page)
    sec = PageSection(
        page=page,
        type=section_type,
        content=merged,
        is_visible=is_visible,
        position=pos,
    )
    db.add(sec)
    db.commit()
    db.refresh(sec)
    return sec


def update_section(
    db: Session,
    section_id: int,
    content: Optional[Dict[str, Any]] = None,
    section_type: Optional[str] = None,
) -> PageSection:
    sec = get_section(db, section_id)
    if section_type is not None:
        validate_type(section_type)
        sec.type = section_type
    if content is not None:
        # Full replace of the content blob (editor sends the whole object).
        sec.content = content
    db.commit()
    db.refresh(sec)
    return sec


def set_visibility(db: Session, section_id: int, is_visible: bool) -> PageSection:
    sec = get_section(db, section_id)
    sec.is_visible = is_visible
    db.commit()
    db.refresh(sec)
    return sec


def delete_section(db: Session, section_id: int) -> None:
    sec = get_section(db, section_id)
    db.delete(sec)
    db.commit()


def duplicate_section(db: Session, section_id: int) -> PageSection:
    sec = get_section(db, section_id)
    clone = PageSection(
        page=sec.page,
        type=sec.type,
        content=deepcopy(sec.content),
        is_visible=sec.is_visible,
        position=_next_position(db, sec.page),
    )
    db.add(clone)
    db.commit()
    db.refresh(clone)
    return clone


def reorder(db: Session, page: str, section_ids: List[int]) -> List[PageSection]:
    """Persist a new order. ``section_ids`` is the desired top-to-bottom order.

    Any sections of the page not present in the list keep their relative order
    and are appended after the provided ones.
    """
    validate_page(page)
    sections = {s.id: s for s in list_sections(db, page)}
    pos = 0
    for sid in section_ids:
        sec = sections.pop(sid, None)
        if sec is not None:
            sec.position = pos
            pos += 1
    # Remaining (not referenced) keep order after.
    for sec in sections.values():
        sec.position = pos
        pos += 1
    db.commit()
    return list_sections(db, page)


# --------------------------------------------------------------------------
# Seeding (idempotent) — reproduces the current landing + splash content
# --------------------------------------------------------------------------
def seed_content(db: Session) -> Dict[str, int]:
    """Insert the initial sections for each page IFF that page has none.

    Idempotent: running again on a page that already has sections is a no-op for
    that page, so it never clobbers SA edits.
    """
    created = {"website": 0, "splash": 0}

    if not db.query(PageSection).filter(PageSection.page == "website").first():
        for i, (stype, content) in enumerate(_WEBSITE_SEED):
            db.add(PageSection(page="website", type=stype, content=content, position=i, is_visible=True))
            created["website"] += 1

    if not db.query(PageSection).filter(PageSection.page == "splash").first():
        for i, (stype, content) in enumerate(_SPLASH_SEED):
            db.add(PageSection(page="splash", type=stype, content=content, position=i, is_visible=True))
            created["splash"] += 1

    db.commit()
    return created


_WEBSITE_SEED = [
    ("hero", {
        "headline": "Run your entire business from one intelligent platform",
        "subheadline": "BaseCenter.ai combines 10 powerful business tools with AI customization. Start with one module free forever, add what you need for just $5/month each.",
        "background_image": "",
        "primary_cta_text": "Get Started Free",
        "primary_cta_link": "/modules",
        "secondary_cta_text": "Explore Modules",
        "secondary_cta_link": "#modules",
        "note": "No credit card required • Cancel anytime • 5-year free module guarantee",
    }),
    ("rich_text", {
        "heading": "Tired of juggling multiple subscriptions and disconnected tools?",
        "body": "Most businesses waste hours switching between invoicing software, project managers, CRMs, and accounting tools—each with its own login, its own way of working, and its own monthly fee. BaseCenter.ai brings it all together in one intelligent platform that actually talks to itself.",
        "align": "center",
    }),
    ("feature_grid", {
        "heading": "One platform. Ten powerful modules. Infinite possibilities.",
        "intro": "From invoicing to project management, from customer relationships to team training—BaseCenter.ai has everything you need to run and grow your business. And with our AI customization engine, every tool adapts to your unique workflow.",
        "columns": 3,
        "items": [
            {"icon": "🎯", "title": "10 Full-Featured Modules", "text": "Everything from invoicing to project management, all seamlessly integrated", "link": ""},
            {"icon": "🤖", "title": "AI Customization", "text": "Each module adapts to your specific business needs automatically", "link": ""},
            {"icon": "✨", "title": "One Free Forever", "text": "Choose any module, 100% free for 5 years with 10 seats included", "link": ""},
        ],
    }),
    ("steps", {
        "heading": "How It Works",
        "intro": "Get started in three simple steps",
        "steps": [
            {"title": "Choose Your Free Module", "text": "Pick any of our 10 business modules to start completely free (10 seats included)"},
            {"title": "Let AI Customize It", "text": "Our intelligent assistant adapts the module to your specific industry and workflow"},
            {"title": "Add More As You Grow", "text": "Activate additional modules for just $5/month each, all seamlessly connected"},
        ],
    }),
    ("modules_grid", {
        "heading": "Choose Your Free Module",
        "intro": "Start with any module free forever, add more for just $5/month",
    }),
    ("pricing", {
        "heading": "Simple, honest pricing. No surprises.",
        "intro": "Transparent pricing that scales with your business",
        "tiers": [
            {"name": "First Module", "price": "$0", "period": "/forever", "highlight": False,
             "features": ["Your choice of any module", "10 seats included", "Full feature access", "5-year guarantee"]},
            {"name": "Additional Modules", "price": "$5", "period": "/month each", "highlight": True,
             "features": ["10 seats per module", "Full feature access", "Seamless integration", "Cancel anytime"]},
            {"name": "Extra Seats", "price": "$5", "period": "/month", "highlight": False,
             "features": ["Per 10 additional seats", "Any module", "Same features", "Scale as needed"]},
        ],
        "note": "Bonus: Website builder included free with every account • One-time free module switch available",
    }),
    ("feature_grid", {
        "heading": "Loved by teams that ship",
        "intro": "",
        "columns": 2,
        "items": [
            {"icon": "★★★★★", "title": "Sarah Chen — Creative Director, Bright Studios", "text": "\"BaseCenter.ai replaced 6 different subscriptions for our agency. The best part? Everything just works together.\"", "link": ""},
            {"icon": "★★★★★", "title": "Marcus Johnson — Contractor", "text": "\"I was up and running in under 10 minutes. The AI setup wizard knew exactly what I needed.\"", "link": ""},
        ],
    }),
    ("cta_banner", {
        "heading": "Ready to transform how you run your business?",
        "text": "Join thousands of entrepreneurs who've simplified their business operations with BaseCenter.ai. Start with any module free, forever.",
        "cta_text": "Start Your Free Module",
        "cta_link": "/modules",
        "note": "No credit card required • 10 seats included • 5-year free guarantee",
    }),
]


_SPLASH_SEED = [
    ("rich_text", {
        "heading": "Choose your modules",
        "body": "Start with one core module free for 5 years — add any others for just $5/month each. The Website Builder is always free and included.",
        "align": "center",
    }),
    ("modules_grid", {
        "heading": "",
        "intro": "",
    }),
    ("feature_grid", {
        "heading": "",
        "intro": "",
        "columns": 3,
        "items": [
            {"icon": "💳", "title": "", "text": "No card required to start your free module.", "link": ""},
            {"icon": "🤖", "title": "", "text": "AI tailors each module to your business.", "link": ""},
            {"icon": "🚀", "title": "", "text": "Be up and running in minutes.", "link": ""},
        ],
    }),
]
