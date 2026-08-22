"use client";

import { useEffect, useState, useCallback } from "react";
import TenantShell from "@/components/tenant/TenantShell";
import { Button, Card, CardContent } from "@/components/ui";
import {
  getTenantBilling,
  getTenantInvoices,
  cancelTenantSubscription,
  reactivateTenantSubscription,
  createBillingPortalSession,
  type BillingOverview,
  type BillingSubscription,
  type InvoiceOut,
} from "@/lib/api";

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function StatusBadge({ sub }: { sub: BillingSubscription }) {
  let label = sub.status;
  let cls = "bg-neutral-100 text-neutral-600";
  if (sub.status === "active" && sub.cancel_at_period_end) {
    label = "Cancels at period end";
    cls = "bg-warning-50 text-ink border border-warning";
  } else if (sub.status === "active") {
    label = "Active";
    cls = "bg-constructive-50 text-ink border border-constructive";
  } else if (sub.status === "past_due") {
    label = "Past due";
    cls = "bg-destructive-50 text-destructive border border-destructive";
  } else if (sub.status === "canceled") {
    label = "Canceled";
    cls = "bg-neutral-100 text-neutral-500";
  } else if (sub.status === "incomplete") {
    label = "Incomplete";
    cls = "bg-warning-50 text-ink border border-warning";
  }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

export default function TenantBillingPage() {
  const [data, setData] = useState<BillingOverview | null>(null);
  const [invoices, setInvoices] = useState<InvoiceOut[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [overview, inv] = await Promise.all([
        getTenantBilling(),
        getTenantInvoices().catch(() => [] as InvoiceOut[]),
      ]);
      setData(overview);
      setInvoices(inv);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load billing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCancel(sub: BillingSubscription) {
    if (
      !window.confirm(
        `Cancel "${sub.name}"? Access continues until the end of the current billing period.`
      )
    )
      return;
    setError("");
    setNotice("");
    setBusyId(sub.subscription_id);
    try {
      const res = await cancelTenantSubscription(sub.subscription_id);
      setNotice(res.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel subscription");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReactivate(sub: BillingSubscription) {
    setError("");
    setNotice("");
    setBusyId(sub.subscription_id);
    try {
      const res = await reactivateTenantSubscription(sub.subscription_id);
      setNotice(res.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reactivate subscription");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePortal() {
    setError("");
    setPortalBusy(true);
    try {
      const { url } = await createBillingPortalSession();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open billing portal");
      setPortalBusy(false);
    }
  }

  return (
    <TenantShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Billing</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Manage your subscriptions, payment method, and invoices.
            </p>
          </div>
          {data?.stripe_configured && (
            <Button
              variant="financial"
              onClick={handlePortal}
              disabled={portalBusy}
            >
              {portalBusy ? "Opening…" : "Manage billing"}
            </Button>
          )}
        </div>

        {/* Past-due banner */}
        {data?.any_past_due && (
          <div className="rounded-card border border-destructive bg-destructive-50 px-4 py-3 text-sm text-destructive">
            <strong>Payment past due — action required.</strong> One or more of
            your subscriptions has a failed payment. Update your payment method to
            restore access.
            {data.stripe_configured && (
              <button
                onClick={handlePortal}
                className="ml-2 underline font-medium"
                disabled={portalBusy}
              >
                Update payment method
              </button>
            )}
          </div>
        )}

        {notice && (
          <div className="rounded-card border border-constructive bg-constructive-50 px-4 py-3 text-sm text-ink">
            {notice}
          </div>
        )}
        {error && (
          <div className="rounded-card border border-destructive bg-destructive-50 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading && <p className="text-sm text-neutral-500">Loading…</p>}

        {!loading && data && !data.stripe_configured && (
          <Card variant="outlined">
            <CardContent className="p-6">
              <p className="text-sm text-neutral-600">
                Billing is not yet configured for this platform. Your active
                modules are shown below; paid billing controls and invoices will
                appear once your administrator connects a payment provider.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Subscriptions */}
        {!loading && data && (
          <Card variant="outlined">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-ink">Subscriptions</h2>
                <div className="text-right">
                  <p className="text-lg font-bold text-ink">
                    {money(data.monthly_total_cents)}
                    <span className="text-sm text-neutral-400"> / mo</span>
                  </p>
                  <p className="text-xs text-neutral-500">current recurring total</p>
                </div>
              </div>

              {data.subscriptions.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  You have no subscriptions yet.
                </p>
              ) : (
                <div className="divide-y divide-hairline">
                  {data.subscriptions.map((sub) => (
                    <div
                      key={sub.subscription_id}
                      className="flex items-center justify-between py-4 gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{sub.icon || "🧩"}</span>
                          <span className="font-medium text-ink truncate">
                            {sub.name}
                          </span>
                          <StatusBadge sub={sub} />
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          {sub.is_free_module
                            ? "Free module"
                            : `${money(sub.monthly_price)} / mo`}
                          {sub.current_period_end &&
                            ` · ${
                              sub.cancel_at_period_end ? "Ends" : "Renews"
                            } ${fmtDate(sub.current_period_end)}`}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {sub.status === "canceled" ? (
                          <span className="text-xs text-neutral-400">—</span>
                        ) : sub.cancel_at_period_end && sub.has_stripe ? (
                          <Button
                            variant="financial"
                            size="sm"
                            onClick={() => handleReactivate(sub)}
                            disabled={busyId === sub.subscription_id}
                          >
                            {busyId === sub.subscription_id
                              ? "…"
                              : "Reactivate"}
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancel(sub)}
                            disabled={busyId === sub.subscription_id}
                          >
                            {busyId === sub.subscription_id ? "…" : "Cancel"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Invoices */}
        {!loading && data?.stripe_configured && (
          <Card variant="outlined">
            <CardContent className="p-6">
              <h2 className="font-semibold text-ink mb-4">Invoices</h2>
              {invoices.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  No invoices yet. Invoices will appear here after your first
                  payment.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-neutral-500 border-b border-hairline">
                        <th className="py-2 pr-4 font-medium">Invoice</th>
                        <th className="py-2 pr-4 font-medium">Date</th>
                        <th className="py-2 pr-4 font-medium">Amount</th>
                        <th className="py-2 pr-4 font-medium">Status</th>
                        <th className="py-2 font-medium text-right">Links</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv, i) => (
                        <tr
                          key={inv.id || i}
                          className="border-b border-hairline last:border-0"
                        >
                          <td className="py-3 pr-4 text-ink">
                            {inv.number || "—"}
                          </td>
                          <td className="py-3 pr-4 text-neutral-600">
                            {fmtDate(inv.created)}
                          </td>
                          <td className="py-3 pr-4 text-ink">
                            {money(inv.amount_cents)} {inv.currency}
                          </td>
                          <td className="py-3 pr-4 text-neutral-600 capitalize">
                            {inv.status || "—"}
                          </td>
                          <td className="py-3 text-right space-x-3">
                            {inv.hosted_invoice_url && (
                              <a
                                href={inv.hosted_invoice_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-700 underline"
                              >
                                View
                              </a>
                            )}
                            {inv.invoice_pdf && (
                              <a
                                href={inv.invoice_pdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-700 underline"
                              >
                                PDF
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TenantShell>
  );
}
