// Phase 2A — token → CSS variable application.
// Shared by ThemeManager (applies to <html> live) and the Appearance live
// preview panel (applies to a scoped container).

export type Tokens = Record<string, unknown>;

function s(tokens: Tokens, key: string, fallback = ""): string {
  const v = tokens[key];
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

// --- hex helpers (for deriving tints/shades) ---
function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function toHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((c) => clamp(c).toString(16).padStart(2, "0"))
      .join("")
  );
}

// Mix a color toward white (amount 0..1) → lighter tint.
function tint(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  return toHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount
  );
}

// Mix a color toward black (amount 0..1) → darker shade.
function shade(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  return toHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

function numPx(v: string, fallback: number): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

// Neutral properties we may override for dark mode (so we can clear them in light).
const NEUTRAL_KEYS = [
  "--color-neutral-50",
  "--color-neutral-100",
  "--color-neutral-200",
  "--color-neutral-300",
  "--color-neutral-400",
  "--color-neutral-500",
  "--color-neutral-600",
  "--color-neutral-700",
  "--color-neutral-800",
  "--color-neutral-900",
  "--color-white",
];

/**
 * Apply theme tokens as CSS custom properties on the given element.
 * Pass document.documentElement for a live global theme, or a container
 * element for a scoped preview.
 */
export function applyTokens(el: HTMLElement, tokens: Tokens): void {
  const set = (k: string, v: string) => {
    if (v) el.style.setProperty(k, v);
  };

  const primary = s(tokens, "primary", "#0075dd");
  const primaryHover = s(tokens, "primary_hover", shade(primary, 0.15));
  const secondary = s(tokens, "secondary", "#0a2540");
  const secondaryHover = s(tokens, "secondary_hover", shade(secondary, 0.2));
  const accent = s(tokens, "accent", "#00a870");
  const background = s(tokens, "background", "#ffffff");
  const pageBg = s(tokens, "page_bg", "#f6f7f9");
  const surfaceMuted = s(tokens, "surface_muted", "#eef1f5");
  const text = s(tokens, "text", "#0a0a0a");
  const textMuted = s(tokens, "text_muted", "#5b6472");
  const border = s(tokens, "border", "#e3e7ed");
  const success = s(tokens, "success", "#10b981");
  const warning = s(tokens, "warning", "#f59e0b");
  const error = s(tokens, "error", "#ef4444");
  const isDark = s(tokens, "base_mode", "light") === "dark";

  // Surfaces & text
  set("--background", background);
  set("--foreground", text);
  set("--ink", text);
  set("--obsidian", secondary);
  set("--hairline", border);
  set("--page-bg", pageBg);
  set("--surface-muted", surfaceMuted);

  // Primary
  set("--primary", primary);
  set("--primary-50", tint(primary, 0.9));
  set("--primary-100", tint(primary, 0.8));
  set("--primary-500", primaryHover);
  set("--primary-700", shade(primary, 0.35));

  // Secondary
  set("--secondary", secondary);
  set("--secondary-50", tint(secondary, 0.9));
  set("--secondary-100", tint(secondary, 0.8));
  set("--secondary-500", secondaryHover);
  set("--secondary-700", shade(secondary, 0.3));

  // Accent (financial)
  set("--financial", accent);
  set("--financial-50", tint(accent, 0.9));
  set("--financial-500", shade(accent, 0.15));

  // Semantic
  set("--constructive", success);
  set("--constructive-50", tint(success, 0.9));
  set("--destructive", error);
  set("--destructive-50", tint(error, 0.9));
  set("--warning", warning);
  set("--warning-50", tint(warning, 0.9));

  // Typography
  set("--font-heading", s(tokens, "font_heading"));
  set("--font-body", s(tokens, "font_body"));
  set("--font-size-base", s(tokens, "font_size_base", "16px"));
  set("--heading-weight", s(tokens, "heading_weight", "700"));
  set("--body-weight", s(tokens, "body_weight", "400"));

  // Shape — scale radius family from radius_base.
  const rb = numPx(s(tokens, "radius_base", "10px"), 10);
  set("--radius-base", `${rb}px`);
  set("--radius-small", `${Math.max(0, Math.round(rb * 0.6))}px`);
  set("--radius-medium", `${rb}px`);
  set("--radius-large", `${Math.round(rb * 1.2)}px`);
  set("--radius-card", `${Math.round(rb * 1.6)}px`);
  set("--button-radius", s(tokens, "button_radius", `${rb}px`));
  set("--button-text-transform", s(tokens, "button_text_transform", "none"));

  // Neutral scale — remap for dark mode so gray text/surfaces invert; clear in
  // light mode so Tailwind's built-in grays return.
  if (isDark) {
    el.style.setProperty("--color-neutral-50", pageBg);
    el.style.setProperty("--color-neutral-100", surfaceMuted);
    el.style.setProperty("--color-neutral-200", border);
    el.style.setProperty("--color-neutral-300", tint(border, 0.15));
    el.style.setProperty("--color-neutral-400", textMuted);
    el.style.setProperty("--color-neutral-500", textMuted);
    el.style.setProperty("--color-neutral-600", tint(textMuted, 0.15));
    el.style.setProperty("--color-neutral-700", tint(text, 0.15));
    el.style.setProperty("--color-neutral-800", text);
    el.style.setProperty("--color-neutral-900", text);
    // Keep white readable on light chips inside dark theme if needed.
  } else {
    for (const k of NEUTRAL_KEYS) el.style.removeProperty(k);
  }

  // Mark the surface for any CSS that keys off dark mode.
  el.setAttribute("data-theme-mode", isDark ? "dark" : "light");
}

// Scope resolution from pathname.
export function scopeForPath(pathname: string): "website" | "splash" | "app" | null {
  if (!pathname) return "website";
  if (pathname.startsWith("/site")) return null; // tenant public sites: baseline only
  if (pathname.startsWith("/admin") || pathname.startsWith("/app")) return "app";
  if (pathname.startsWith("/modules")) return "splash";
  return "website";
}
