"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TenantShell from "@/components/tenant/TenantShell";
import { Button, Card, CardContent } from "@/components/ui";
import { getTenantDashboard, type TenantDashboardData } from "@/lib/api";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function TenantDashboardPage() {
  const [data, setData] = useState<TenantDashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTenantDashboard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <TenantShell>
      {loading ? (
        <p className="text-neutral-500">Loading dashboard…</p>
      ) : error ? (
        <p className="text-destructive">{error}</p>
      ) : data ? (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-ink">{data.tenant_name}</h1>
              <p className="text-sm text-neutral-500 capitalize">
                Workspace status: {data.status}
              </p>
            </div>
            <Link href="/app/modules">
              <Button variant="primary">Browse modules</Button>
            </Link>
          </div>

          {/* Past-due banner */}
          {data.active_modules.some((m) => m.status === "past_due") && (
            <div className="rounded-card border border-destructive bg-destructive-50 px-4 py-3 text-sm text-destructive">
              <strong>Payment past due — action required.</strong> One or more of
              your subscriptions has a failed payment.{" "}
              <Link href="/app/billing" className="underline font-medium">
                Go to Billing
              </Link>{" "}
              to update your payment method and restore access.
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card variant="outlined">
              <CardContent className="p-6">
                <p className="text-xs uppercase tracking-wide text-neutral-400 font-semibold">
                  Seat usage
                </p>
                <p className="text-3xl font-bold text-ink mt-2">
                  {data.seats.used}
                  <span className="text-lg text-neutral-400">
                    {" "}/ {data.seats.allocated}
                  </span>
                </p>
                <p className="text-sm text-neutral-500 mt-1">
                  {data.seats.available} seat{data.seats.available === 1 ? "" : "s"} available
                </p>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent className="p-6">
                <p className="text-xs uppercase tracking-wide text-neutral-400 font-semibold">
                  Active modules
                </p>
                <p className="text-3xl font-bold text-ink mt-2">
                  {data.active_modules.length}
                </p>
                <p className="text-sm text-neutral-500 mt-1">
                  {data.billing.active_paid_modules} paid ·{" "}
                  {data.active_modules.length - data.billing.active_paid_modules} free
                </p>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent className="p-6">
                <p className="text-xs uppercase tracking-wide text-neutral-400 font-semibold">
                  Monthly total
                </p>
                <p className="text-3xl font-bold text-ink mt-2">
                  {money(data.billing.monthly_total_cents)}
                </p>
                <p className="text-sm text-neutral-500 mt-1">
                  {data.billing.stripe_configured
                    ? "Billed via Stripe"
                    : "Billing not yet configured"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Billing status banner */}
          {!data.billing.stripe_configured && (
            <div className="rounded-card border border-warning bg-warning-50 px-4 py-3 text-sm text-ink">
              Online payments are not enabled yet. You can still activate your free
              modules — paid module checkout will become available once the platform
              administrator configures Stripe.
            </div>
          )}

          {/* Active modules list */}
          <div>
            <h2 className="text-lg font-semibold text-ink mb-3">Your modules</h2>
            {data.active_modules.length === 0 ? (
              <Card variant="outlined">
                <CardContent className="p-6 text-center text-neutral-500">
                  No modules activated yet.{" "}
                  <Link href="/app/modules" className="text-secondary font-medium">
                    Activate your first module
                  </Link>
                  .
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.active_modules.map((m) => (
                  <Card key={m.subscription_id} variant="outlined">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-ink">{m.name}</p>
                        <p className="text-sm text-neutral-500 capitalize">{m.status}</p>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          m.is_free_module
                            ? "bg-constructive-50 text-constructive"
                            : "bg-secondary-50 text-secondary"
                        }`}
                      >
                        {m.is_free_module ? "Free" : `${money(m.monthly_price)}/mo`}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </TenantShell>
  );
}
