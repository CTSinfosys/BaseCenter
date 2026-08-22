"use client";

import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/admin/AdminShell";
import {
  Button,
  Input,
  Card,
  CardContent,
} from "@/components/ui";
import { getAuditLogs, type AuditLogEntry } from "@/lib/api";

const PAGE_SIZE = 50;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: "err"; msg: string } | null>(null);

  // Filter inputs (draft) vs applied filters
  const [actorDraft, setActorDraft] = useState("");
  const [actionDraft, setActionDraft] = useState("");
  const [fromDraft, setFromDraft] = useState("");
  const [toDraft, setToDraft] = useState("");
  const [filters, setFilters] = useState<{
    actor: string;
    action: string;
    date_from: string;
    date_to: string;
  }>({ actor: "", action: "", date_from: "", date_to: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setBanner(null);
    try {
      const res = await getAuditLogs({
        actor: filters.actor || undefined,
        action: filters.action || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setBanner({ type: "err", msg: e instanceof Error ? e.message : "Failed to load audit log" });
    } finally {
      setLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => {
    load();
  }, [load]);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    setFilters({
      actor: actorDraft.trim(),
      action: actionDraft.trim(),
      date_from: fromDraft,
      date_to: toDraft,
    });
  }

  function clearFilters() {
    setActorDraft("");
    setActionDraft("");
    setFromDraft("");
    setToDraft("");
    setOffset(0);
    setFilters({ actor: "", action: "", date_from: "", date_to: "" });
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink">Audit Log</h1>
        <p className="text-neutral-500 mt-1">
          A record of security-relevant actions across the platform — logins, tenant
          changes, seat and module updates, and settings changes.
        </p>
      </div>

      {banner && (
        <div className="mb-6 px-4 py-3 rounded-md text-sm bg-destructive-50 text-destructive">
          {banner.msg}
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <form onSubmit={applyFilters} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <Input
              label="Actor email"
              value={actorDraft}
              onChange={(e) => setActorDraft(e.target.value)}
              placeholder="user@example.com"
            />
            <Input
              label="Action"
              value={actionDraft}
              onChange={(e) => setActionDraft(e.target.value)}
              placeholder="tenant.create"
            />
            <Input
              label="From"
              type="date"
              value={fromDraft}
              onChange={(e) => setFromDraft(e.target.value)}
            />
            <Input
              label="To"
              type="date"
              value={toDraft}
              onChange={(e) => setToDraft(e.target.value)}
            />
            <div className="flex gap-2">
              <Button type="submit">Filter</Button>
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-neutral-500 p-5">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-neutral-500 p-5">No audit entries match your filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline text-left text-neutral-500">
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Actor</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Target</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                    <th className="px-4 py-3 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} className="border-b border-hairline last:border-0 align-top">
                      <td className="px-4 py-3 whitespace-nowrap text-neutral-600">
                        {formatDate(it.created_at)}
                      </td>
                      <td className="px-4 py-3 text-ink">{it.actor_email || "—"}</td>
                      <td className="px-4 py-3 text-neutral-600">{it.actor_role || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded bg-primary-50 text-primary-700 px-2 py-0.5 text-xs font-medium">
                          {it.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {it.target_type ? `${it.target_type}${it.target_id ? ` #${it.target_id}` : ""}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 max-w-xs break-words">
                        {it.meta || "—"}
                      </td>
                      <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">
                        {it.ip_address || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-neutral-500">
          {total} {total === 1 ? "entry" : "entries"} · Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={offset === 0 || loading}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={offset + PAGE_SIZE >= total || loading}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      </div>
    </AdminShell>
  );
}
