"""
Seed script — populates the 10 business modules, the free Website module,
and the first Super Admin account.

Run with:  python -m app.db.seed
"""
from app.db.database import SessionLocal
from app.models.module import Module
from app.models.user import User
from app.core.security import get_password_hash
from app.core.config import settings

# (name, slug, description, icon, monthly_price_cents, is_free_eligible, order)
MODULES = [
    ("Invoice & Milestones", "invoice-milestones",
     "Generate professional scopes of work, track milestones, and create invoices automatically. Connect to Stripe, Square, and more for instant payments.",
     "receipt", 500, True, 1),
    ("Contracting", "contracting",
     "Create, send, and e-sign contracts with automated reminders and version tracking. Turn agreements into action.",
     "file-signature", 500, True, 2),
    ("Help Ticket", "help-ticket",
     "A complete support desk with smart routing, SLA tracking, and AI-suggested responses to resolve issues faster.",
     "life-buoy", 500, True, 3),
    ("Knowledge Base", "knowledge-base",
     "AI generates comprehensive how-to articles based on your activated modules and actual usage patterns. Always up-to-date.",
     "book-open", 500, True, 4),
    ("Data Collection", "data-collection",
     "Build smart forms and surveys that not only gather responses but understand them and take action automatically.",
     "clipboard-list", 500, True, 5),
    ("Project Management", "project-management",
     "The best of every PM tool you love, plus an AI teammate that helps you ship faster. Boards, timelines, and automation.",
     "kanban", 500, True, 6),
    ("File Management", "file-management",
     "Secure, organized file storage with smart tagging, sharing controls, and deep integration across your modules.",
     "folder", 500, True, 7),
    ("Training LMS", "training-lms",
     "Create courses, track progress, and certify your team with an AI-assisted learning management system.",
     "graduation-cap", 500, True, 8),
    ("Accounting", "accounting",
     "Track income, expenses, and cash flow with real-time reporting and seamless invoice sync. Financial clarity, simplified.",
     "calculator", 500, True, 9),
    ("CRM Plus", "crm-plus",
     "A modern CRM that manages contacts, deals, and pipelines while your AI assistant surfaces the next best action.",
     "users", 500, True, 10),
    # Free bonus website module — not eligible as the 'free-forever' pick because it's always free
    ("Website Builder", "website-builder",
     "A professional website builder included free with every account. Launch a polished site in minutes.",
     "globe", 0, False, 11),
]


def seed_modules(db):
    created = 0
    for name, slug, desc, icon, price, free_eligible, order in MODULES:
        existing = db.query(Module).filter(Module.slug == slug).first()
        if existing:
            # Keep data fresh but preserve Stripe linkage
            existing.name = name
            existing.description = desc
            existing.icon = icon
            existing.monthly_price = price
            existing.is_free_eligible = free_eligible
            existing.display_order = order
        else:
            db.add(Module(
                name=name, slug=slug, description=desc, icon=icon,
                monthly_price=price, is_free_eligible=free_eligible,
                is_active=True, display_order=order,
            ))
            created += 1
    db.commit()
    print(f"Modules: {created} created, {len(MODULES) - created} updated.")


def seed_superadmin(db):
    email = settings.FIRST_SUPERUSER_EMAIL
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        if not existing.is_superuser:
            existing.is_superuser = True
            db.commit()
        print(f"Super admin already exists: {email}")
        return
    db.add(User(
        email=email,
        hashed_password=get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
        full_name="Platform Super Admin",
        is_active=True,
        is_superuser=True,
    ))
    db.commit()
    print(f"Super admin created: {email}")


def main():
    db = SessionLocal()
    try:
        seed_modules(db)
        seed_superadmin(db)
        from app.services.theme_service import seed_themes
        created = seed_themes(db)
        print(f"Seeded {created} theme(s).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
