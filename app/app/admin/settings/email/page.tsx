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
  getEmailConfig,
  updateEmailConfig,
  testEmail,
  type EmailConfig,
} from "@/lib/api";

export default function EmailSettingsPage() {
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Form fields (password left blank => unchanged)
  const [fromName, setFromName] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpUseTls, setSmtpUseTls] = useState("true");
  const [testRecipient, setTestRecipient] = useState("");

  const [banner, setBanner] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const cfg = await getEmailConfig();
      setConfig(cfg);
      setFromName(cfg.from_name || "");
      setFromAddress(cfg.from_address || "");
      setSmtpHost(cfg.smtp_host || "");
      setSmtpPort(cfg.smtp_port || "");
      setSmtpUser(cfg.smtp_user || "");
      setSmtpUseTls(cfg.smtp_use_tls || "true");
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
        from_name: fromName,
        from_address: fromAddress,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_use_tls: smtpUseTls,
      };
      if (smtpPassword.trim()) payload.smtp_password = smtpPassword.trim();
      const updated = await updateEmailConfig(payload);
      setConfig(updated);
      setSmtpPassword("");
      setBanner({ type: "ok", msg: "Email settings saved successfully." });
    } catch (e) {
      setBanner({ type: "err", msg: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!testRecipient.trim()) {
      setBanner({ type: "err", msg: "Enter a recipient address to send a test email." });
      return;
    }
    setTesting(true);
    setBanner(null);
    try {
      const res = await testEmail(testRecipient.trim());
      setBanner({
        type: res.sent || res.logged ? "ok" : "err",
        msg: res.detail,
      });
    } catch (e) {
      setBanner({ type: "err", msg: e instanceof Error ? e.message : "Test failed" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <AdminShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Email Settings</h1>
        <p className="text-neutral-500 mt-1">
          Configure an SMTP server to send transactional emails (invitations, email
          verification, password resets). When no SMTP server is configured, links are
          written to the server log instead so the platform keeps working.
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
                <p className="text-sm text-neutral-500">Delivery status</p>
                <p className="font-semibold text-ink">
                  {config?.is_configured ? (
                    <span className="text-constructive">● SMTP configured — emails are sent</span>
                  ) : (
                    <span className="text-warning">
                      ● Not configured — links are logged to the server
                    </span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Settings form */}
          <Card variant="elevated" className="mb-6">
            <CardHeader>
              <CardTitle>SMTP Server</CardTitle>
              <CardDescription>
                Enter the credentials from your email provider (e.g. SendGrid, Mailgun,
                Amazon SES, Postmark, or your own SMTP relay).
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="From Name"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="BaseCenter"
                    helperText="Display name shown to recipients."
                  />
                  <Input
                    label="From Address"
                    type="email"
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                    placeholder="no-reply@yourdomain.com"
                    helperText="Sender email address."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="SMTP Host"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.sendgrid.net"
                  />
                  <Input
                    label="SMTP Port"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                    helperText="Usually 587 (STARTTLS) or 465 (SSL)."
                  />
                </div>

                <Input
                  label="SMTP Username"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="apikey"
                />

                <Input
                  label="SMTP Password"
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder={
                    config?.smtp_password
                      ? `Saved (${config.smtp_password}) — leave blank to keep`
                      : "Your SMTP password or API key"
                  }
                  helperText="Encrypted at rest. Leave blank to keep the existing password."
                />

                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">
                    Use TLS / STARTTLS
                  </label>
                  <select
                    value={smtpUseTls}
                    onChange={(e) => setSmtpUseTls(e.target.value)}
                    className="w-full rounded-md border border-hairline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="true">Enabled (recommended)</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save Settings"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Test email */}
          <Card>
            <CardHeader>
              <CardTitle>Send a Test Email</CardTitle>
              <CardDescription>
                Send a test message to confirm your configuration. If SMTP is not
                configured, the email content is written to the server log instead.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                label="Recipient"
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="you@yourdomain.com"
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="secondary" onClick={handleTest} disabled={testing}>
                {testing ? "Sending…" : "Send Test Email"}
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </AdminShell>
  );
}
