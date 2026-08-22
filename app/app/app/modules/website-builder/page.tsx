"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import TenantShell from "@/components/tenant/TenantShell";
import { Button, Card, CardContent, Input } from "@/components/ui";
import {
  listWebsites,
  createWebsite,
  deleteWebsite,
  type Website,
} from "@/lib/api";

export default function WebsiteBuilderPage() {
  const [sites, setSites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setSites(await listWebsites());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load websites");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      await createWebsite({ name: newName.trim() });
      setNewName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create website");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this website and all its content? This cannot be undone."))
      return;
    setBusyId(id);
    try {
      await deleteWebsite(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete website");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <TenantShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Website Builder</h1>
        <p className="text-neutral-500 mt-1">
          Build and publish simple websites for your business.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive-50 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <Card className="mb-8">
        <CardContent className="py-5">
          <form onSubmit={handleCreate} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                New website name
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Acme Landing Page"
              />
            </div>
            <Button type="submit" variant="primary" disabled={creating}>
              {creating ? "Creating..." : "Create site"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-neutral-500">Loading websites...</p>
      ) : sites.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-neutral-500">
            No websites yet. Create your first one above.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sites.map((s) => (
            <Card key={s.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{s.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.published
                          ? "bg-constructive-50 text-constructive"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {s.published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-400 mt-0.5">/{s.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  {s.published && (
                    <a
                      href={`/site/${s.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-secondary hover:underline"
                    >
                      View
                    </a>
                  )}
                  <Link href={`/app/modules/website-builder/${s.id}`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={busyId === s.id}
                    onClick={() => handleDelete(s.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </TenantShell>
  );
}
