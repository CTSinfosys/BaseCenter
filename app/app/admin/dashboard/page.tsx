"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui";
import { getAnalyticsOverview, type AnalyticsOverview } from "@/lib/api";

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function StatCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string;
  accent: string;
  sub?: string;
}) {
  return (
    <Card variant="elevated">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: accent }}
          />
          <p className="text-sm text-neutral-500">{label}</p>
        </div>
        <p className="text-3xl font-bold text-ink">{value}</p>
        {sub && <p className="text-xs text-neutral-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAnalyticsOverview()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const maxAdoption =
    data && data.module_adoption.length
      ? Math.max(1, ...data.module_adoption.map((m) => m.tenant_count))
      : 1;

  return (
    <AdminShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Platform Dashboard</h1>
        <p className="text-neutral-500 mt-1">
          Usage analytics across all tenants, seats, and module subscriptions.
        </p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-md text-sm bg-destructive-50 text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-neutral-500">Loading…</p>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total Tenants"
              value={String(data.total_tenants)}
              accent="#4F7FFF"
              sub={`${data.active_tenants} active · ${data.suspended_tenants} suspended`}
            />
            <StatCard
              label="Users / Seats Used"
              value={`${data.total_seats_used}`}
              accent="#7B68EE"
              sub={`of ${data.total_seats_allocated} seats allocated`}
            />
            <StatCard
              label="Active Subscriptions"
              value={String(data.active_subscriptions)}
              accent="#7B68EE"
              sub="across all modules"
            />
            {/* MRR — financial highlight */}
            <Card variant="elevated" className="border-2" style={{ borderColor: "#E4F222" }}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: "#E4F222" }}
                  />
                  <p className="text-sm text-neutral-500">Est. MRR</p>
                </div>
                <p className="text-3xl font-bold text-ink">{money(data.mrr_cents)}</p>
                <p className="text-xs text-neutral-400 mt-1">
                  from active module subscriptions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Module adoption chart */}
          <Card variant="elevated">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-ink mb-1">Module Adoption</h2>
              <p className="text-sm text-neutral-500 mb-5">
                Tenants subscribed per module and monthly recurring revenue.
              </p>
              <div className="space-y-3">
                {data.module_adoption.map((m) => (
                  <div key={m.module_id} className="flex items-center gap-3">
                    <div className="w-44 shrink-0 text-sm text-ink truncate">
                      {m.module_name}
                    </div>
                    <div className="flex-1 bg-neutral-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-6 rounded-full flex items-center justify-end pr-2 text-xs font-medium text-white transition-all"
                        style={{
                          width: `${(m.tenant_count / maxAdoption) * 100}%`,
                          minWidth: m.tenant_count > 0 ? "2rem" : "0",
                          backgroundColor:
                            m.monthly_price === 0 ? "#7B68EE" : "#4F7FFF",
                        }}
                      >
                        {m.tenant_count > 0 ? m.tenant_count : ""}
                      </div>
                    </div>
                    <div className="w-24 shrink-0 text-right text-sm font-medium text-ink">
                      {m.monthly_price === 0 ? (
                        <span className="text-secondary">Free</span>
                      ) : (
                        money(m.mrr)
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </AdminShell>
  );
}
