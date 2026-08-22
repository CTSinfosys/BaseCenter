"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui";
import {
  listTenants,
  createTenant,
  type TenantSummary,
} from "@/lib/api";

function StatusBadge({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        active
          ? "bg-constructive-50 text-constructive"
          : "bg-destructive-50 text-destructive"
      }`}
    >
      ● {active ? "Active" : "Suspended"}
    </span>
  );
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [banner, setBanner] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // create form
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    subdomain: "",
    seats_allocated: 5,
    owner_email: "",
    owner_full_name: "",
    owner_password: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listTenants(search || undefined, statusFilter || undefined);
      setTenants(rows);
    } catch (e) {
      setBanner({ type: "err", msg: e instanceof Error ? e.message : "Failed to load" });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setBanner(null);
    try {
      await createTenant({
        name: form.name,
        subdomain: form.subdomain || undefined,
        seats_allocated: Number(form.seats_allocated) || 5,
        owner_email: form.owner_email || undefined,
        owner_full_name: form.owner_full_name || undefined,
        owner_password: form.owner_password || undefined,
      });
      setBanner({ type: "ok", msg: "Tenant created." });
      setShowCreate(false);
      setForm({
        name: "",
        subdomain: "",
        seats_allocated: 5,
        owner_email: "",
        owner_full_name: "",
        owner_password: "",
      });
      await load();
    } catch (e) {
      setBanner({ type: "err", msg: e instanceof Error ? e.message : "Create failed" });
    } finally {
      setCreating(false);
    }
  }

  return (
    <AdminShell>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Tenants</h1>
          <p className="text-neutral-500 mt-1">
            Manage all organizations on the platform.
          </p>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancel" : "+ New Tenant"}
        </Button>
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

      {showCreate && (
        <Card variant="elevated" className="mb-6">
          <CardHeader>
            <CardTitle>Create Tenant</CardTitle>
          </CardHeader>
          <form onSubmit={handleCreate}>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Organization Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Acme Corp"
                required
              />
              <Input
                label="Subdomain"
                value={form.subdomain}
                onChange={(e) => setForm({ ...form, subdomain: e.target.value })}
                placeholder="acme"
              />
              <Input
                label="Seats Allocated"
                type="number"
                min={1}
                value={form.seats_allocated}
                onChange={(e) =>
                  setForm({ ...form, seats_allocated: Number(e.target.value) })
                }
              />
              <div />
              <Input
                label="Owner Email"
                type="email"
                value={form.owner_email}
                onChange={(e) => setForm({ ...form, owner_email: e.target.value })}
                placeholder="owner@acme.com"
                helperText="Optional — creates the owner account."
              />
              <Input
                label="Owner Name"
                value={form.owner_full_name}
                onChange={(e) =>
                  setForm({ ...form, owner_full_name: e.target.value })
                }
                placeholder="Jane Doe"
              />
              <Input
                label="Owner Password"
                type="password"
                value={form.owner_password}
                onChange={(e) =>
                  setForm({ ...form, owner_password: e.target.value })
                }
                placeholder="Leave blank for default"
                helperText="Defaults to changeme123 if blank."
              />
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={creating || !form.name}>
                {creating ? "Creating…" : "Create Tenant"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-[220px]">
          <Input
            placeholder="Search by name or subdomain…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-hairline px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-neutral-500 p-6">Loading…</p>
          ) : tenants.length === 0 ? (
            <p className="text-neutral-500 p-6">No tenants found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-neutral-500">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Seats</th>
                  <th className="px-5 py-3 font-medium">Modules</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="border-b border-hairline last:border-0 hover:bg-neutral-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-ink">{t.name}</div>
                      {t.subdomain && (
                        <div className="text-xs text-neutral-400">{t.subdomain}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-neutral-600">
                      {t.owner ? t.owner.email : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-5 py-3 text-neutral-600">
                      {t.seats_used}/{t.seats_allocated}
                    </td>
                    <td className="px-5 py-3 text-neutral-600">
                      {t.active_module_count}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/tenants/${t.id}`}
                        className="text-primary font-medium hover:underline"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
