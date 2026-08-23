"""
Theme service (Phase 2A — DB-driven theming).

Business logic for the three-scoped theming system. Enforces the core
invariant: **exactly one default theme per scope**. The default theme's
effective tokens are what each surface applies live via CSS variables.
"""
from copy import deepcopy
from typing import Dict, Any, List, Optional

from sqlalchemy.orm import Session

from app.models.theme import Theme, THEME_SCOPES
from app.services.theme_defaults import DEFAULT_TOKENS, SEED_THEMES


class ThemeError(Exception):
    """Raised on invalid theming operations (bad scope, deleting default, etc.)."""


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def _validate_scope(scope: str) -> None:
    if scope not in THEME_SCOPES:
        raise ThemeError(
            f"Invalid scope '{scope}'. Must be one of {', '.join(THEME_SCOPES)}."
        )


def effective_tokens(theme: Optional[Theme]) -> Dict[str, Any]:
    """DEFAULT_TOKENS merged with the theme's own token overrides.

    New keys added to DEFAULT_TOKENS therefore appear on every theme even if
    the stored blob predates them. Falls back to the pure baseline when no
    theme is given.
    """
    merged = deepcopy(DEFAULT_TOKENS)
    if theme and isinstance(theme.tokens, dict):
        merged.update(theme.tokens)
    return merged


# --------------------------------------------------------------------------
# Reads
# --------------------------------------------------------------------------
def list_themes(db: Session, scope: str) -> List[Theme]:
    _validate_scope(scope)
    return (
        db.query(Theme)
        .filter(Theme.scope == scope)
        .order_by(Theme.is_default.desc(), Theme.name.asc())
        .all()
    )


def get_theme(db: Session, theme_id: int) -> Optional[Theme]:
    return db.query(Theme).filter(Theme.id == theme_id).first()


def get_default_theme(db: Session, scope: str) -> Optional[Theme]:
    _validate_scope(scope)
    return (
        db.query(Theme)
        .filter(Theme.scope == scope, Theme.is_default == True)  # noqa: E712
        .first()
    )


def get_active_tokens(db: Session, scope: str) -> Dict[str, Any]:
    """Effective tokens of the scope's default theme.

    Falls back gracefully to the baked-in DEFAULT_TOKENS if the scope has no
    default (or no themes at all), so the public endpoint can never 500.
    """
    try:
        _validate_scope(scope)
    except ThemeError:
        return deepcopy(DEFAULT_TOKENS)
    theme = get_default_theme(db, scope)
    if not theme:
        # Fall back to any theme in the scope, else the baseline.
        theme = db.query(Theme).filter(Theme.scope == scope).first()
    return effective_tokens(theme)


# --------------------------------------------------------------------------
# Writes
# --------------------------------------------------------------------------
def create_theme(
    db: Session,
    scope: str,
    name: str,
    tokens: Optional[Dict[str, Any]] = None,
    is_default: bool = False,
) -> Theme:
    _validate_scope(scope)
    if not name or not name.strip():
        raise ThemeError("Theme name is required.")

    # First theme in a scope is always the default.
    existing_count = db.query(Theme).filter(Theme.scope == scope).count()
    if existing_count == 0:
        is_default = True

    theme = Theme(
        scope=scope,
        name=name.strip(),
        tokens=tokens or {},
        is_default=False,
    )
    db.add(theme)
    db.flush()  # assign id

    if is_default:
        _make_default(db, theme)
    else:
        db.commit()
        db.refresh(theme)
    return theme


def update_theme(
    db: Session,
    theme: Theme,
    name: Optional[str] = None,
    tokens: Optional[Dict[str, Any]] = None,
) -> Theme:
    if name is not None:
        if not name.strip():
            raise ThemeError("Theme name cannot be empty.")
        theme.name = name.strip()
    if tokens is not None:
        # Replace the stored blob wholesale (UI always sends the full set).
        theme.tokens = tokens
    db.commit()
    db.refresh(theme)
    return theme


def duplicate_theme(db: Session, theme: Theme, new_name: Optional[str] = None) -> Theme:
    name = (new_name or f"{theme.name} (Copy)").strip()
    copy = Theme(
        scope=theme.scope,
        name=name,
        tokens=deepcopy(theme.tokens) if isinstance(theme.tokens, dict) else {},
        is_default=False,  # duplicates never steal default status
    )
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return copy


def delete_theme(db: Session, theme: Theme) -> None:
    if theme.is_default:
        raise ThemeError(
            "Cannot delete the default theme. Set another theme as default first."
        )
    db.delete(theme)
    db.commit()


def set_default(db: Session, theme: Theme) -> Theme:
    _make_default(db, theme)
    return theme


def _make_default(db: Session, theme: Theme) -> None:
    """Set ``theme`` as the sole default for its scope."""
    db.query(Theme).filter(
        Theme.scope == theme.scope, Theme.id != theme.id
    ).update({Theme.is_default: False}, synchronize_session=False)
    theme.is_default = True
    db.commit()
    db.refresh(theme)


# --------------------------------------------------------------------------
# Seeding (idempotent) — called from app.db.seed
# --------------------------------------------------------------------------
def seed_themes(db: Session) -> int:
    """Create the four canonical themes for each scope if missing.

    Idempotent: upserts by (scope, name). Ensures exactly one default per
    scope. Returns the number of themes created.
    """
    created = 0
    for scope in THEME_SCOPES:
        for spec in SEED_THEMES:
            existing = (
                db.query(Theme)
                .filter(Theme.scope == scope, Theme.name == spec["name"])
                .first()
            )
            if existing:
                # Keep name; leave user edits to tokens intact. Do not clobber.
                continue
            theme = Theme(
                scope=scope,
                name=spec["name"],
                tokens=spec["tokens"],
                is_default=False,
            )
            db.add(theme)
            created += 1
        db.flush()

        # Ensure exactly one default in this scope.
        defaults = (
            db.query(Theme)
            .filter(Theme.scope == scope, Theme.is_default == True)  # noqa: E712
            .all()
        )
        if len(defaults) == 0:
            # Prefer the seed default ("BaseCenter Default"), else first.
            target = (
                db.query(Theme)
                .filter(Theme.scope == scope, Theme.name == "BaseCenter Default")
                .first()
            ) or db.query(Theme).filter(Theme.scope == scope).first()
            if target:
                target.is_default = True
        elif len(defaults) > 1:
            # Collapse to a single default (keep the first).
            for extra in defaults[1:]:
                extra.is_default = False
    db.commit()
    return created
