"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui";
import {
  getTenant,
  updateTenant,
  updateTenantSeats,
  suspendTenant,
  reactivateTenant,
  enableTenantModule,
  disableTenantModule,
  type TenantDetail,
} from "@/lib/api";

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function ModuleStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-constructive-50 text-constructive",
    past_due: "bg-warning-50 text-warning",
    canceled: "bg-neutral-100 text-neutral-500",
    none: "bg-neutral-100 text-neutral-400",
  };
  const label: Record<string, string> = {
    active: "Active",
    past_due: "Past due",
    canceled: "Canceled",
    none: "Not enabled",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || map.none}`}>
      {label[status] || status}
    </span>
  );
}

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = Number(params.id);

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [seats, setSeats] = useState(5);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = await getTenant(tenantId);
      setTenant(t);
      setName(t.name);
      setSubdomain(t.subdomain || "");
      setSeats(t.seats_allocated);
    } catch (e) {
      setBanner({ type: "err", msg: e instanceof Error ? e.message : "Failed to load" });
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) load();
  }, [tenantId, load]);

  async function run(fn: () => Promise<TenantDetail>, okMsg: string) {
    setBusy(true);
    setBanner(null);
    try {
      const t = await fn();
      setTenant(t);
      setName(t.name);
      setSubdomain(t.subdomain || "");
      setSeats(t.seats_allocated);
      setBanner({ type: "ok", msg: okMsg });
    } catch (e) {
      setBanner({ type: "err", msg: e instanceof Error ? e.message : "Action failed" });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <AdminShell>
        <p className="text-neutral-500">Loading…</p>
      </AdminShell>
    );
  }

  if (!tenant) {
    return (
      <AdminShell>
        <p className="text-destructive">Tenant not found.</p>
        <Link href="/admin/tenants" className="text-primary hover:underline">
          ← Back to tenants
        </Link>
      </AdminShell>
    );
  }

  const suspended = tenant.status !== "active";

  return (
    <AdminShell>
      <div className="mb-6">
        <Link href="/admin/tenants" className="text-sm text-primary hover:underline">
          ← Back to tenants
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink">{tenant.name}</h1>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                suspended
                  ? "bg-destructive-50 text-destructive"
                  : "bg-constructive-50 text-constructive"
              }`}
            >
              ● {suspended ? "Suspended" : "Active"}
            </span>
          </div>
          <p className="text-neutral-500 mt-1">
            {tenant.owner ? `Owner: ${tenant.owner.email}` : "No owner assigned"} ·{" "}
            {tenant.seats_used}/{tenant.seats_allocated} seats used
          </p>
        </div>
        {suspended ? (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => run(() => reactivateTenant(tenant.id), "Tenant reactivated.")}
          >
            Reactivate
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => run(() => suspendTenant(tenant.id), "Tenant suspended.")}
          >
            Suspend
          </Button>
        )}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Tenant details */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Organization name and subdomain.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              label="Subdomain"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
            />
            <Button
              disabled={busy}
              onClick={() =>
                run(
                  () => updateTenant(tenant.id, { name, subdomain }),
                  "Details saved."
                )
              }
            >
              Save Details
            </Button>
          </CardContent>
        </Card>

        {/* Seat management */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Seats</CardTitle>
            <CardDescription>
              {tenant.seats_used} used of {tenant.seats_allocated} allocated.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full bg-neutral-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    (tenant.seats_used / Math.max(1, tenant.seats_allocated)) * 100
                  )}%`,
                  backgroundColor: "#4F7FFF",
                }}
              />
            </div>
            <Input
              label="Allocated Seats"
              type="number"
              min={1}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
            />
            <Button
              disabled={busy}
              onClick={() =>
                run(() => updateTenantSeats(tenant.id, seats), "Seats updated.")
              }
            >
              Update Seats
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Module subscriptions */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Module Subscriptions</CardTitle>
          <CardDescription>
            Enable or disable modules for this tenant. Status reflects Stripe where
            connected.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-neutral-500">
                <th className="px-5 py-3 font-medium">Module</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Seats</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {tenant.modules.map((m) => (
                <tr key={m.module_id} className="border-b border-hairline last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">{m.module_name}</td>
                  <td className="px-5 py-3 text-neutral-600">
                    {m.monthly_price === 0 ? "Free" : `${money(m.monthly_price)}/mo`}
                  </td>
                  <td className="px-5 py-3">
                    <ModuleStatusBadge status={m.status} />
                  </td>
                  <td className="px-5 py-3 text-neutral-600">
                    {m.enabled ? m.seats : "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {m.enabled ? (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => disableTenantModule(tenant.id, m.module_id),
                            `${m.module_name} disabled.`
                          )
                        }
                      >
                        Disable
                      </Button>
                    ) : (
                      <Button
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => enableTenantModule(tenant.id, m.module_id, 1),
                            `${m.module_name} enabled.`
                          )
                        }
                      >
                        Enable
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
