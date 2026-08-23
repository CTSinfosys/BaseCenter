"use client";

// Phase 2A — reusable theme manager for a single scope (website | splash | app).
// Full CRUD: list, create, edit (colors/typography/shape/logo), duplicate,
// delete (guarding the default), set-as-default, plus a live preview panel.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui";
import {
  listThemes,
  createTheme,
  updateTheme,
  deleteTheme,
  duplicateTheme,
  setDefaultTheme,
  type Theme,
  type ThemeScope,
  type ThemeTokens,
} from "@/lib/api";
import { clearThemeCache } from "@/components/ThemeManager";

const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: "Inter", value: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif" },
  { label: "Montserrat", value: "'Montserrat', 'Inter', ui-sans-serif, system-ui, sans-serif" },
  { label: "Roboto", value: "'Roboto', ui-sans-serif, system-ui, sans-serif" },
  { label: "Poppins", value: "'Poppins', 'Inter', ui-sans-serif, system-ui, sans-serif" },
  { label: "System", value: "ui-sans-serif, system-ui, -apple-system, sans-serif" },
];

const COLOR_FIELDS: { key: string; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "primary_hover", label: "Primary (hover)" },
  { key: "secondary", label: "Secondary" },
  { key: "secondary_hover", label: "Secondary (hover)" },
  { key: "accent", label: "Accent" },
  { key: "background", label: "Surface / cards" },
  { key: "page_bg", label: "Page background" },
  { key: "surface_muted", label: "Muted surface" },
  { key: "text", label: "Text" },
  { key: "text_muted", label: "Muted text" },
  { key: "border", label: "Border" },
  { key: "success", label: "Success" },
  { key: "warning", label: "Warning" },
  { key: "error", label: "Error" },
];

function str(tokens: ThemeTokens, key: string, fallback = ""): string {
  const v = tokens[key];
  return typeof v === "string" ? v : fallback;
}

type Banner = { type: "ok" | "err"; msg: string } | null;

export default function ThemeEditor({ scope }: { scope: ThemeScope }) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Theme | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  const refresh = useCallback(
    async (keepId?: number) => {
      setLoading(true);
      try {
        const list = await listThemes(scope);
        setThemes(list);
        const target =
          (keepId && list.find((t) => t.id === keepId)) ||
          list.find((t) => t.is_default) ||
          list[0] ||
          null;
        setSelectedId(target ? target.id : null);
        setDraft(target ? { ...target, tokens: { ...target.tokens } } : null);
      } catch (e) {
        setBanner({ type: "err", msg: e instanceof Error ? e.message : "Failed to load" });
      } finally {
        setLoading(false);
      }
    },
    [scope]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  function selectTheme(id: number) {
    const t = themes.find((x) => x.id === id);
    if (t) {
      setSelectedId(id);
      setDraft({ ...t, tokens: { ...t.tokens } });
      setBanner(null);
    }
  }

  function setToken(key: string, value: string) {
    setDraft((d) => (d ? { ...d, tokens: { ...d.tokens, [key]: value } } : d));
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setBanner(null);
    try {
      await updateTheme(draft.id, { name: draft.name, tokens: draft.tokens });
      clearThemeCache(scope);
      setBanner({ type: "ok", msg: "Saved. Changes apply live on next page load." });
      await refresh(draft.id);
    } catch (e) {
      setBanner({ type: "err", msg: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    setSaving(true);
    setBanner(null);
    try {
      const base = draft?.tokens || {};
      const created = await createTheme({
        scope,
        name: "New Theme",
        tokens: { ...base },
      });
      await refresh(created.id);
      setBanner({ type: "ok", msg: "Theme created." });
    } catch (e) {
      setBanner({ type: "err", msg: e instanceof Error ? e.message : "Create failed" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicate() {
    if (!draft) return;
    setSaving(true);
    setBanner(null);
    try {
      const copy = await duplicateTheme(draft.id);
      await refresh(copy.id);
      setBanner({ type: "ok", msg: "Duplicated." });
    } catch (e) {
      setBanner({ type: "err", msg: e instanceof Error ? e.message : "Duplicate failed" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!draft) return;
    if (draft.is_default) {
      setBanner({ type: "err", msg: "Cannot delete the default theme." });
      return;
    }
    if (!confirm(`Delete theme "${draft.name}"?`)) return;
    setSaving(true);
    setBanner(null);
    try {
      await deleteTheme(draft.id);
      await refresh();
      setBanner({ type: "ok", msg: "Deleted." });
    } catch (e) {
      setBanner({ type: "err", msg: e instanceof Error ? e.message : "Delete failed" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault() {
    if (!draft) return;
    setSaving(true);
    setBanner(null);
    try {
      await setDefaultTheme(draft.id);
      clearThemeCache(scope);
      await refresh(draft.id);
      setBanner({ type: "ok", msg: "Set as default. Live on next page load." });
    } catch (e) {
      setBanner({ type: "err", msg: e instanceof Error ? e.message : "Failed" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-neutral-500 py-8">Loading themes…</div>;
  }

  return (
    <div className="space-y-4">
      {banner && (
        <div
          className={`rounded-md px-4 py-2 text-sm ${
            banner.type === "ok"
              ? "bg-constructive-50 text-constructive"
              : "bg-destructive-50 text-destructive"
          }`}
        >
          {banner.msg}
        </div>
      )}

      {/* Theme selector row */}
      <div className="flex flex-wrap items-center gap-2">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => selectTheme(t.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
              t.id === selectedId
                ? "border-primary bg-primary-50 text-primary-700"
                : "border-hairline text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {t.name}
            {t.is_default && (
              <span className="ml-1.5 text-[10px] uppercase tracking-wide text-constructive">
                ● default
              </span>
            )}
          </button>
        ))}
        <Button size="sm" variant="outline" onClick={handleCreate} disabled={saving}>
          + New
        </Button>
      </div>

      {draft && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Theme name
              </label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full rounded-md border border-hairline px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Mode
              </label>
              <select
                value={str(draft.tokens, "base_mode", "light")}
                onChange={(e) => setToken("base_mode", e.target.value)}
                className="w-full rounded-md border border-hairline px-3 py-2 text-sm bg-background"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            {/* Colors */}
            <div>
              <p className="text-xs font-semibold text-neutral-500 mb-2">Colors</p>
              <div className="grid grid-cols-2 gap-2">
                {COLOR_FIELDS.map((f) => (
                  <div key={f.key} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={str(draft.tokens, f.key, "#000000")}
                      onChange={(e) => setToken(f.key, e.target.value)}
                      className="h-8 w-9 rounded border border-hairline shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-neutral-500 truncate">{f.label}</div>
                      <input
                        type="text"
                        value={str(draft.tokens, f.key)}
                        onChange={(e) => setToken(f.key, e.target.value)}
                        className="w-full rounded border border-hairline px-1.5 py-0.5 text-[11px] font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography */}
            <div>
              <p className="text-xs font-semibold text-neutral-500 mb-2">Typography</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-neutral-500">
                  Heading font
                  <select
                    value={str(draft.tokens, "font_heading")}
                    onChange={(e) => setToken("font_heading", e.target.value)}
                    className="mt-0.5 w-full rounded border border-hairline px-2 py-1 text-xs bg-background"
                  >
                    {FONT_OPTIONS.map((o) => (
                      <option key={o.label} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] text-neutral-500">
                  Body font
                  <select
                    value={str(draft.tokens, "font_body")}
                    onChange={(e) => setToken("font_body", e.target.value)}
                    className="mt-0.5 w-full rounded border border-hairline px-2 py-1 text-xs bg-background"
                  >
                    {FONT_OPTIONS.map((o) => (
                      <option key={o.label} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] text-neutral-500">
                  Base size
                  <input
                    type="text"
                    value={str(draft.tokens, "font_size_base", "16px")}
                    onChange={(e) => setToken("font_size_base", e.target.value)}
                    className="mt-0.5 w-full rounded border border-hairline px-2 py-1 text-xs"
                  />
                </label>
                <label className="text-[11px] text-neutral-500">
                  Heading weight
                  <select
                    value={str(draft.tokens, "heading_weight", "700")}
                    onChange={(e) => setToken("heading_weight", e.target.value)}
                    className="mt-0.5 w-full rounded border border-hairline px-2 py-1 text-xs bg-background"
                  >
                    {["400", "500", "600", "700", "800", "900"].map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Shape */}
            <div>
              <p className="text-xs font-semibold text-neutral-500 mb-2">Shape &amp; density</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-neutral-500">
                  Corner radius
                  <input
                    type="text"
                    value={str(draft.tokens, "radius_base", "10px")}
                    onChange={(e) => setToken("radius_base", e.target.value)}
                    className="mt-0.5 w-full rounded border border-hairline px-2 py-1 text-xs"
                  />
                </label>
                <label className="text-[11px] text-neutral-500">
                  Button radius
                  <input
                    type="text"
                    value={str(draft.tokens, "button_radius", "8px")}
                    onChange={(e) => setToken("button_radius", e.target.value)}
                    className="mt-0.5 w-full rounded border border-hairline px-2 py-1 text-xs"
                  />
                </label>
                <label className="text-[11px] text-neutral-500">
                  Button style
                  <select
                    value={str(draft.tokens, "button_style", "solid")}
                    onChange={(e) => setToken("button_style", e.target.value)}
                    className="mt-0.5 w-full rounded border border-hairline px-2 py-1 text-xs bg-background"
                  >
                    <option value="solid">Solid</option>
                    <option value="outline">Outline</option>
                  </select>
                </label>
                <label className="text-[11px] text-neutral-500">
                  Button text
                  <select
                    value={str(draft.tokens, "button_text_transform", "none")}
                    onChange={(e) => setToken("button_text_transform", e.target.value)}
                    className="mt-0.5 w-full rounded border border-hairline px-2 py-1 text-xs bg-background"
                  >
                    <option value="none">Normal</option>
                    <option value="uppercase">UPPERCASE</option>
                  </select>
                </label>
                <label className="text-[11px] text-neutral-500">
                  Density
                  <select
                    value={str(draft.tokens, "density", "comfortable")}
                    onChange={(e) => setToken("density", e.target.value)}
                    className="mt-0.5 w-full rounded border border-hairline px-2 py-1 text-xs bg-background"
                  >
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </select>
                </label>
                <label className="text-[11px] text-neutral-500">
                  Shadow
                  <select
                    value={str(draft.tokens, "shadow_level", "sm")}
                    onChange={(e) => setToken("shadow_level", e.target.value)}
                    className="mt-0.5 w-full rounded border border-hairline px-2 py-1 text-xs bg-background"
                  >
                    {["none", "sm", "md", "lg"].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Logo */}
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1">
                Logo URL (optional)
              </label>
              <input
                type="text"
                value={str(draft.tokens, "logo_url")}
                onChange={(e) => setToken("logo_url", e.target.value)}
                placeholder="https://…"
                className="w-full rounded-md border border-hairline px-3 py-2 text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-hairline">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                Save changes
              </Button>
              <Button size="sm" variant="outline" onClick={handleSetDefault} disabled={saving || draft.is_default}>
                {draft.is_default ? "Is default" : "Set as default"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleDuplicate} disabled={saving}>
                Duplicate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDelete}
                disabled={saving || draft.is_default}
              >
                Delete
              </Button>
            </div>
          </div>

          {/* Live preview */}
          <ThemePreview tokens={draft.tokens} />
        </div>
      )}
    </div>
  );
}

function ThemePreview({ tokens }: { tokens: ThemeTokens }) {
  const t = useMemo(() => tokens, [tokens]);
  const bg = str(t, "background", "#fff");
  const pageBg = str(t, "page_bg", "#f6f7f9");
  const text = str(t, "text", "#0a0a0a");
  const textMuted = str(t, "text_muted", "#5b6472");
  const border = str(t, "border", "#e3e7ed");
  const primary = str(t, "primary", "#0075dd");
  const primaryContrast = str(t, "primary_contrast", "#ffffff");
  const accent = str(t, "accent", "#00a870");
  const radius = str(t, "radius_base", "10px");
  const btnRadius = str(t, "button_radius", "8px");
  const fontHeading = str(t, "font_heading", "Inter, sans-serif");
  const fontBody = str(t, "font_body", "Inter, sans-serif");
  const headingWeight = str(t, "heading_weight", "700");
  const btnStyle = str(t, "button_style", "solid");
  const btnTransform = str(t, "button_text_transform", "none");
  const shadow =
    str(t, "shadow_level", "sm") === "none"
      ? "none"
      : str(t, "shadow_level") === "lg"
      ? "0 10px 25px rgba(0,0,0,0.15)"
      : str(t, "shadow_level") === "md"
      ? "0 4px 12px rgba(0,0,0,0.10)"
      : "0 1px 3px rgba(0,0,0,0.08)";

  return (
    <div>
      <p className="text-xs font-semibold text-neutral-500 mb-2">Live preview</p>
      <div
        style={{
          background: pageBg,
          padding: 20,
          borderRadius: 12,
          border: `1px solid ${border}`,
          fontFamily: fontBody,
        }}
      >
        <div
          style={{
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: radius,
            padding: 20,
            boxShadow: shadow,
          }}
        >
          <div
            style={{
              fontFamily: fontHeading,
              fontWeight: headingWeight as unknown as number,
              color: text,
              fontSize: 22,
              marginBottom: 6,
            }}
          >
            Sample heading
          </div>
          <p style={{ color: textMuted, fontSize: 14, marginBottom: 16 }}>
            This is body copy showing how text and muted text look on the surface
            color.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <button
              style={{
                background: btnStyle === "outline" ? "transparent" : primary,
                color: btnStyle === "outline" ? primary : primaryContrast,
                border: `2px solid ${primary}`,
                borderRadius: btnRadius,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                textTransform: btnTransform as React.CSSProperties["textTransform"],
              }}
            >
              Primary action
            </button>
            <button
              style={{
                background: accent,
                color: "#fff",
                border: "none",
                borderRadius: btnRadius,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                textTransform: btnTransform as React.CSSProperties["textTransform"],
              }}
            >
              Accent
            </button>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
            }}
          >
            {[primary, accent, str(t, "success", "#10b981"), str(t, "warning", "#f59e0b"), str(t, "error", "#ef4444")].map(
              (c, i) => (
                <span
                  key={i}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: c,
                    border: `1px solid ${border}`,
                  }}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
