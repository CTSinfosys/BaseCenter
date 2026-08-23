"""
Canonical design-token schema + the four seeded themes (Phase 2A).

`DEFAULT_TOKENS` is the baseline token set (the FreshBooks-style look). Every
theme's `tokens` blob is `DEFAULT_TOKENS` merged with its own overrides, so new
token keys added here automatically get a sane default on existing themes when
merged by `theme_service.effective_tokens`.

The same four themes are seeded for each of the three scopes
(`website`, `splash`, `app`). They are independent rows and can be edited per
scope afterward.
"""
from copy import deepcopy
from typing import Dict, Any

# --------------------------------------------------------------------------
# Baseline token set — the "BaseCenter Default" (FreshBooks-style) values.
# Keep this GENEROUS and flexible; unknown keys are preserved on save.
# --------------------------------------------------------------------------
DEFAULT_TOKENS: Dict[str, Any] = {
    "base_mode": "light",  # "light" | "dark"

    # Brand colors
    "primary": "#0075DD",           # Science Blue
    "primary_hover": "#005FB3",
    "primary_contrast": "#FFFFFF",  # text/icons on primary fills
    "secondary": "#0A2540",
    "secondary_hover": "#081B30",
    "secondary_contrast": "#FFFFFF",
    "accent": "#00A870",

    # Surfaces & text
    "background": "#FFFFFF",     # cards, nav, sidebar
    "page_bg": "#F6F7F9",        # app/page backdrop
    "surface_muted": "#EEF1F5",  # hover / subtle fills
    "text": "#0A0A0A",
    "text_muted": "#5B6472",
    "border": "#E3E7ED",

    # Semantic
    "success": "#10B981",
    "warning": "#F59E0B",
    "error": "#EF4444",

    # Typography
    "font_heading": "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    "font_body": "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
    "font_size_base": "16px",
    "heading_weight": "700",
    "body_weight": "400",

    # Shape / density
    "radius_base": "10px",
    "button_radius": "8px",
    "button_style": "solid",           # "solid" | "outline"
    "button_text_transform": "none",   # "none" | "uppercase"
    "density": "comfortable",          # "comfortable" | "compact"
    "shadow_level": "sm",              # "none" | "sm" | "md" | "lg"

    # Extensibility (Batch 2 content editing hooks)
    "section_backgrounds": {},         # {sectionKey: color}
    "logo_url": "",                    # optional per-theme logo override
}


def _theme(overrides: Dict[str, Any]) -> Dict[str, Any]:
    """Return DEFAULT_TOKENS deep-merged with the given overrides."""
    tokens = deepcopy(DEFAULT_TOKENS)
    tokens.update(overrides)
    return tokens


# --------------------------------------------------------------------------
# The four themes (name, is_default, tokens). Seeded per scope.
# --------------------------------------------------------------------------
SEED_THEMES = [
    {
        "name": "BaseCenter Default",
        "is_default": True,
        "tokens": _theme({}),  # the FreshBooks baseline
    },
    {
        "name": "Light",
        "is_default": False,
        "tokens": _theme({
            "base_mode": "light",
            "primary": "#2563EB",
            "primary_hover": "#1D4ED8",
            "primary_contrast": "#FFFFFF",
            "secondary": "#334155",
            "secondary_hover": "#1E293B",
            "accent": "#0EA5E9",
            "background": "#FFFFFF",
            "page_bg": "#F1F5F9",
            "surface_muted": "#E2E8F0",
            "text": "#0F172A",
            "text_muted": "#64748B",
            "border": "#E2E8F0",
            "success": "#16A34A",
            "warning": "#D97706",
            "error": "#DC2626",
            "radius_base": "12px",
            "button_radius": "10px",
            "shadow_level": "sm",
        }),
    },
    {
        "name": "Dark",
        "is_default": False,
        "tokens": _theme({
            "base_mode": "dark",
            "primary": "#3B82F6",
            "primary_hover": "#60A5FA",
            "primary_contrast": "#0B1120",
            "secondary": "#94A3B8",
            "secondary_hover": "#CBD5E1",
            "secondary_contrast": "#0B1120",
            "accent": "#22D3EE",
            "background": "#161B22",
            "page_bg": "#0D1117",
            "surface_muted": "#21262D",
            "text": "#E6EDF3",
            "text_muted": "#9DA7B3",
            "border": "#2D333B",
            "success": "#34D399",
            "warning": "#FBBF24",
            "error": "#F87171",
            "radius_base": "10px",
            "button_radius": "8px",
            "shadow_level": "md",
        }),
    },
    {
        "name": "Bold Contrast",
        "is_default": False,
        "tokens": _theme({
            "base_mode": "light",
            "primary": "#7C3AED",
            "primary_hover": "#6D28D9",
            "primary_contrast": "#FFFFFF",
            "secondary": "#111827",
            "secondary_hover": "#000000",
            "secondary_contrast": "#FFFFFF",
            "accent": "#EC4899",
            "background": "#FFFFFF",
            "page_bg": "#FBF5FF",
            "surface_muted": "#F3E8FF",
            "text": "#0A0A0A",
            "text_muted": "#4B5563",
            "border": "#E9D5FF",
            "success": "#059669",
            "warning": "#D97706",
            "error": "#E11D48",
            "font_heading": "'Montserrat', 'Inter', ui-sans-serif, system-ui, sans-serif",
            "font_body": "'Inter', ui-sans-serif, system-ui, sans-serif",
            "heading_weight": "800",
            "radius_base": "4px",
            "button_radius": "4px",
            "button_style": "solid",
            "button_text_transform": "uppercase",
            "shadow_level": "lg",
        }),
    },
]
