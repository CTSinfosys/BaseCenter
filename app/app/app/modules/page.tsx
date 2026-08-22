"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TenantShell from "@/components/tenant/TenantShell";
import { Button, Card, CardContent } from "@/components/ui";
import {
  getTenantCatalog,
  activateTenantModule,
  deactivateTenantModule,
  getTenantMe,
  type CatalogModule,
  type TenantCurrentUser,
} from "@/lib/api";

function money(cents: number) {
  return cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}/mo`;
}

function ModulesInner() {
  const searchParams = useSearchParams();
  const [modules, setModules] = useState<CatalogModule[]>([]);
  const [me, setMe] = useState<TenantCurrentUser | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [cat, user] = await Promise.all([getTenantCatalog(), getTenantMe()]);
      setModules(cat);
      setMe(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load modules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Handle Stripe checkout return.
    const status = searchParams.get("status");
    if (status === "success") {
      setNotice("Payment successful — your module is being activated.");
    } else if (status === "cancelled") {
      setNotice("Checkout cancelled. No changes were made.");
    }
  }, [load, searchParams]);

  const isAdmin = me?.role === "tenant_admin";
  const hasFreeCore = modules.some(
    (m) => m.is_activated && m.monthly_price > 0
  );

  async function handleActivate(m: CatalogModule) {
    setError("");
    setNotice("");
    setBusyId(m.id);
    try {
      const res = await activateTenantModule(m.id);
      if (res.requires_checkout && res.checkout_url) {
        window.location.href = res.checkout_url;
        return;
      }
      setNotice(res.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Activation failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeactivate(m: CatalogModule) {
    if (!m.subscription_id) return;
    setError("");
    setNotice("");
    setBusyId(m.id);
    try {
      const res = await deactivateTenantModule(m.subscription_id);
      setNotice(res.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deactivation failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Modules</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Your first core module is free for 5 years. Add more for $5/month each.
        </p>
      </div>

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
      {!isAdmin && (
        <div className="rounded-card border border-warning bg-warning-50 px-4 py-3 text-sm text-ink">
          Only workspace administrators can activate or deactivate modules.
        </div>
      )}

      {loading ? (
        <p className="text-neutral-500">Loading modules…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => {
            const isFreeModule = m.monthly_price === 0;
            const activatesFree = isFreeModule || (m.is_free_eligible && !hasFreeCore);
            return (
              <Card key={m.id} variant="outlined" className="flex flex-col">
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-ink">{m.name}</h3>
                    <span className="text-xs font-semibold text-neutral-500">
                      {money(m.monthly_price)}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500 mt-2 flex-1">
                    {m.description}
                  </p>

                  <div className="mt-4">
                    {m.is_activated ? (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-constructive-50 text-constructive">
                          Active
                        </span>
                        {isAdmin && !isFreeModule && (
                          <button
                            onClick={() => handleDeactivate(m)}
                            disabled={busyId === m.id}
                            className="text-sm text-neutral-500 hover:text-destructive font-medium disabled:opacity-50"
                          >
                            {busyId === m.id ? "…" : "Deactivate"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <Button
                        variant={activatesFree ? "primary" : "financial"}
                        size="sm"
                        className="w-full"
                        disabled={!isAdmin || busyId === m.id}
                        onClick={() => handleActivate(m)}
                      >
                        {busyId === m.id
                          ? "Working…"
                          : activatesFree
                          ? "Activate free"
                          : "Subscribe $5/mo"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TenantModulesPage() {
  return (
    <TenantShell>
      <Suspense fallback={<p className="text-neutral-500">Loading…</p>}>
        <ModulesInner />
      </Suspense>
    </TenantShell>
  );
}
