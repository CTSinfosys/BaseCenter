"use client";

// Phase 2A — SA "Appearance" area. Three scopes, each fully themeable:
//   • Public Website  (/ and public pages)
//   • Intro / Splash  (/modules)
//   • Internal App     (/admin and /app)  — also embeds sidebar label editing.

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import ThemeEditor from "@/components/admin/ThemeEditor";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui";
import {
  getSidebarLabels,
  updateSidebarLabels,
  type SidebarLabelsConfig,
  type ThemeScope,
} from "@/lib/api";

const TABS: { scope: ThemeScope; label: string; hint: string }[] = [
  { scope: "website", label: "Public Website", hint: "The marketing site at / and public pages." },
  { scope: "splash", label: "Intro / Splash", hint: "The module selection screen at /modules." },
  { scope: "app", label: "Internal App", hint: "The Super Admin (/admin) and customer (/app) portals." },
];

export default function AppearancePage() {
  const [active, setActive] = useState<ThemeScope>("website");

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Appearance</h1>
        <p className="text-neutral-500 mt-1">
          Manage themes for each surface. The <strong>default</strong> theme of a
          scope is applied live — no redeploy needed.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-hairline mb-6">
        {TABS.map((t) => (
          <button
            key={t.scope}
            onClick={() => setActive(t.scope)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active === t.scope
                ? "border-primary text-primary-700"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {TABS.map((t) =>
        t.scope === active ? (
          <div key={t.scope} className="space-y-6">
            <p className="text-sm text-neutral-500">{t.hint}</p>
            <ThemeEditor scope={t.scope} />
            {t.scope === "app" && <SidebarLabelsPanel />}
          </div>
        ) : null
      )}
    </AdminShell>
  );
}

// --- Sidebar labels editor embedded in the Internal App tab ---
const ADMIN_ITEMS = [
  { key: "dashboard", default: "Dashboard" },
  { key: "tenants", default: "Tenants" },
  { key: "settings", default: "Stripe Settings" },
  { key: "email", default: "Email Settings" },
  { key: "sidebar", default: "Sidebar Labels" },
  { key: "appearance", default: "Appearance" },
  { key: "audit", default: "Audit Log" },
];
const TENANT_ITEMS = [
  { key: "dashboard", default: "Dashboard" },
  { key: "modules", default: "Modules" },
  { key: "team", default: "Team & Seats" },
];

function SidebarLabelsPanel() {
  const [values, setValues] = useState<SidebarLabelsConfig>({ admin: {}, tenant: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  useEffect(() => {
    getSidebarLabels()
      .then((cfg) => setValues({ admin: cfg.admin || {}, tenant: cfg.tenant || {} }))
      .catch((e) =>
        setBanner({ type: "err", msg: e instanceof Error ? e.message : "Failed to load" })
      )
      .finally(() => setLoading(false));
  }, []);

  function setField(level: "admin" | "tenant", key: string, val: string) {
    setValues((prev) => ({ ...prev, [level]: { ...prev[level], [key]: val } }));
  }

  async function save() {
    setSaving(true);
    setBanner(null);
    try {
      const cfg = await updateSidebarLabels({ admin: values.admin, tenant: values.tenant });
      setValues({ admin: cfg.admin || {}, tenant: cfg.tenant || {} });
      setBanner({ type: "ok", msg: "Sidebar labels saved." });
    } catch (e) {
      setBanner({ type: "err", msg: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sidebar navigation labels</CardTitle>
        <CardDescription>
          Rename the navigation items shown in the internal portals. Blank fields
          fall back to the default label.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
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
        {loading ? (
          <div className="text-neutral-500">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-primary-700 mb-2">
                Super Admin portal (/admin)
              </p>
              <div className="space-y-2">
                {ADMIN_ITEMS.map((it) => (
                  <div key={it.key} className="flex items-center gap-2">
                    <span className="w-28 text-xs text-neutral-500 shrink-0">
                      {it.default}
                    </span>
                    <input
                      type="text"
                      value={values.admin[it.key] ?? ""}
                      placeholder={it.default}
                      onChange={(e) => setField("admin", it.key, e.target.value)}
                      className="flex-1 rounded-md border border-hairline px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-secondary mb-2">
                Customer portal (/app)
              </p>
              <div className="space-y-2">
                {TENANT_ITEMS.map((it) => (
                  <div key={it.key} className="flex items-center gap-2">
                    <span className="w-28 text-xs text-neutral-500 shrink-0">
                      {it.default}
                    </span>
                    <input
                      type="text"
                      value={values.tenant[it.key] ?? ""}
                      placeholder={it.default}
                      onChange={(e) => setField("tenant", it.key, e.target.value)}
                      className="flex-1 rounded-md border border-hairline px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <div>
          <Button size="sm" onClick={save} disabled={saving || loading}>
            Save labels
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
