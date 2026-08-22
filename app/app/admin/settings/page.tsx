"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui";
import {
  getStripeConfig,
  updateStripeConfig,
  testStripeConnection,
  listAdminModules,
  syncModulesToStripe,
  type StripeConfig,
  type AdminModule,
} from "@/lib/api";

export default function StripeSettingsPage() {
  const [config, setConfig] = useState<StripeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Form fields (secret fields left blank => unchanged)
  const [publishableKey, setPublishableKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [mode, setMode] = useState("test");

  const [banner, setBanner] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [modules, setModules] = useState<AdminModule[]>([]);

  async function refresh() {
    setLoading(true);
    try {
      const cfg = await getStripeConfig();
      setConfig(cfg);
      setPublishableKey(cfg.stripe_publishable_key || "");
      setMode(cfg.stripe_mode || "test");
      const mods = await listAdminModules();
      setModules(mods);
    } catch (e) {
      setBanner({ type: "err", msg: e instanceof Error ? e.message : "Failed to load" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    try {
      const payload: Record<string, string> = {
        stripe_publishable_key: publishableKey,
        stripe_mode: mode,
      };
      if (secretKey.trim()) payload.stripe_secret_key = secretKey.trim();
      if (webhookSecret.trim()) payload.stripe_webhook_secret = webhookSecret.trim();
      const updated = await updateStripeConfig(payload);
      setConfig(updated);
      setSecretKey("");
      setWebhookSecret("");
      setBanner({ type: "ok", msg: "Settings saved successfully." });
    } catch (e) {
      setBanner({ type: "err", msg: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setBanner(null);
    try {
      const res = await testStripeConnection();
      setBanner({
        type: res.success ? "ok" : "err",
        msg: res.success
          ? `${res.message} ${res.account_name ? `(${res.account_name})` : ""}`
          : res.message,
      });
    } catch (e) {
      setBanner({ type: "err", msg: e instanceof Error ? e.message : "Test failed" });
    } finally {
      setTesting(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setBanner(null);
    try {
      const res = await syncModulesToStripe();
      setBanner({
        type: "ok",
        msg: `Synced ${res.synced_count} module(s) to Stripe.`,
      });
      await refresh();
    } catch (e) {
      setBanner({ type: "err", msg: e instanceof Error ? e.message : "Sync failed" });
    } finally {
      setSyncing(false);
    }
  }

  const syncedCount = modules.filter((m) => m.stripe_price_id).length;
  const payableCount = modules.filter((m) => m.monthly_price > 0).length;

  return (
    <AdminShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Stripe Settings</h1>
        <p className="text-neutral-500 mt-1">
          Enter your Stripe API keys to enable payments. Secret keys are encrypted at rest
          and never displayed again after saving.
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
        <>
          {/* Status card */}
          <Card className="mb-6">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500">Connection status</p>
                <p className="font-semibold text-ink">
                  {config?.is_configured ? (
                    <span className="text-constructive">● Configured ({config.stripe_mode} mode)</span>
                  ) : (
                    <span className="text-warning">● Not configured</span>
                  )}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing || !config?.is_configured}
              >
                {testing ? "Testing…" : "Test Connection"}
              </Button>
            </CardContent>
          </Card>

          {/* Settings form */}
          <Card variant="elevated" className="mb-6">
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Find these in your Stripe Dashboard → Developers → API keys.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full rounded-md border border-hairline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="test">Test</option>
                    <option value="live">Live</option>
                  </select>
                </div>

                <Input
                  label="Publishable Key"
                  value={publishableKey}
                  onChange={(e) => setPublishableKey(e.target.value)}
                  placeholder="pk_test_..."
                  helperText="Safe to expose in the browser."
                />

                <Input
                  label="Secret Key"
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder={
                    config?.stripe_secret_key
                      ? `Saved (${config.stripe_secret_key}) — leave blank to keep`
                      : "sk_test_..."
                  }
                  helperText="Encrypted at rest. Leave blank to keep the existing key."
                />

                <Input
                  label="Webhook Signing Secret"
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder={
                    config?.stripe_webhook_secret
                      ? `Saved (${config.stripe_webhook_secret}) — leave blank to keep`
                      : "whsec_..."
                  }
                  helperText="From Stripe → Developers → Webhooks. Leave blank to keep existing."
                />
              </CardContent>
              <CardFooter className="flex justify-end gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save Settings"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Module sync */}
          <Card>
            <CardHeader>
              <CardTitle>Module Products</CardTitle>
              <CardDescription>
                Create Stripe products &amp; prices for the paid modules so customers can
                subscribe. {syncedCount}/{payableCount} paid modules synced.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-hairline text-sm">
                {modules.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2">
                    <span className="text-ink">{m.name}</span>
                    <span className="text-neutral-500">
                      {m.monthly_price === 0 ? (
                        "Free"
                      ) : m.stripe_price_id ? (
                        <span className="text-constructive">✓ Synced</span>
                      ) : (
                        <span className="text-warning">Not synced</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                variant="secondary"
                onClick={handleSync}
                disabled={syncing || !config?.is_configured}
              >
                {syncing ? "Syncing…" : "Sync Modules to Stripe"}
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </AdminShell>
  );
}
