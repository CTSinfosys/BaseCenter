"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui";
import {
  getSidebarLabels,
  updateSidebarLabels,
  type SidebarLabelsConfig,
} from "@/lib/api";

type Level = "admin" | "tenant";

// Default labels (mirror the backend) + display order per access level.
const GROUPS: {
  level: Level;
  title: string;
  description: string;
  accent: string; // heading accent color
  items: { key: string; default: string }[];
}[] = [
  {
    level: "admin",
    title: "Super Admin sidebar",
    description: "Navigation labels shown in the Super Admin portal (/admin).",
    accent: "text-primary-700",
    items: [
      { key: "dashboard", default: "Dashboard" },
      { key: "tenants", default: "Tenants" },
      { key: "settings", default: "Stripe Settings" },
      { key: "sidebar", default: "Sidebar Labels" },
    ],
  },
  {
    level: "tenant",
    title: "Tenant Admin sidebar",
    description: "Navigation labels shown in the customer portal (/app).",
    accent: "text-secondary",
    items: [
      { key: "dashboard", default: "Dashboard" },
      { key: "modules", default: "Modules" },
      { key: "team", default: "Team & Seats" },
    ],
  },
];

const EMPTY: SidebarLabelsConfig = { admin: {}, tenant: {} };

export default function SidebarLabelsPage() {
  const [values, setValues] = useState<SidebarLabelsConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const cfg = await getSidebarLabels();
      setValues({ admin: cfg.admin || {}, tenant: cfg.tenant || {} });
    } catch (e) {
      setBanner({ type: "err", msg: e instanceof Error ? e.message : "Failed to load" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function setField(level: Level, key: string, val: string) {
    setValues((prev) => ({ ...prev, [level]: { ...prev[level], [key]: val } }));
  }

  function resetField(level: Level, key: string, def: string) {
    // Setting the value back to the default drops the override on save.
    setField(level, key, def);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    try {
      const updated = await updateSidebarLabels({
        admin: values.admin,
        tenant: values.tenant,
      });
      setValues({ admin: updated.admin || {}, tenant: updated.tenant || {} });
      setBanner({ type: "ok", msg: "Sidebar labels saved. Reload a portal to see the change." });
    } catch (e) {
      setBanner({ type: "err", msg: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Sidebar Labels</h1>
        <p className="text-neutral-500 mt-1">
          Rename the navigation items shown in each portal&apos;s sidebar. Routes stay the
          same — only the visible text changes. Leave a field as its default (or reset it)
          to fall back to the standard label.
        </p>
      </div>

      {banner && (
        <div
          className={`mb-6 px-4 py-3 rounded-md text-sm ${
            banner.type === "ok"
              ? "bg-constructive-50 text-constructive"
              : "bg-destructive-50 text-destructive"
          }`}
        >
          {banner.msg}
        </div>
      )}

      {loading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : (
        <form onSubmit={handleSave}>
          <div className="space-y-6">
            {GROUPS.map((group) => (
              <Card key={group.level} variant="elevated">
                <CardHeader>
                  <CardTitle className={group.accent}>{group.title}</CardTitle>
                  <CardDescription>{group.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {group.items.map((item) => {
                    const current = values[group.level][item.key] ?? "";
                    const isOverridden =
                      current.trim() !== "" && current.trim() !== item.default;
                    return (
                      <div
                        key={item.key}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                      >
                        <div className="sm:w-48 shrink-0">
                          <p className="text-sm font-medium text-ink capitalize">
                            {item.key.replace("_", " ")}
                          </p>
                          <p className="text-xs text-neutral-400">
                            Default: {item.default}
                          </p>
                        </div>
                        <input
                          value={current}
                          onChange={(e) => setField(group.level, item.key, e.target.value)}
                          placeholder={item.default}
                          className="flex-1 rounded-md border border-hairline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() => resetField(group.level, item.key, item.default)}
                          disabled={!isOverridden}
                          className="text-xs font-medium text-neutral-500 hover:text-primary-700 disabled:opacity-40 disabled:hover:text-neutral-500 sm:w-16 text-left sm:text-center"
                        >
                          Reset
                        </button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={refresh} disabled={saving}>
              Discard changes
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Labels"}
            </Button>
          </div>
        </form>
      )}
    </AdminShell>
  );
}
