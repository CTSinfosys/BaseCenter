"use client";

import { useEffect, useState, useCallback } from "react";
import TenantShell from "@/components/tenant/TenantShell";
import { Button, Input, Card, CardContent } from "@/components/ui";
import {
  listTenantUsers,
  addTenantUser,
  deactivateTenantUser,
  activateTenantUser,
  type TenantUserList,
} from "@/lib/api";

export default function TenantTeamPage() {
  const [data, setData] = useState<TenantUserList | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Add-user form
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("member");
  const [sendInvite, setSendInvite] = useState(true);
  const [adding, setAdding] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await listTenantUsers();
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const seatsFull = data ? data.seats.available <= 0 : false;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setInviteLink("");
    setAdding(true);
    try {
      const created = await addTenantUser({
        email,
        full_name: fullName || undefined,
        password: sendInvite ? undefined : password,
        role,
      });
      if (created.invited) {
        setNotice(
          `Invitation sent to ${email}. They can set their own password using the link in the email.`
        );
        if (created.invite_link) setInviteLink(created.invite_link);
      } else {
        setNotice(`${email} added to your team.`);
      }
      setEmail("");
      setFullName("");
      setPassword("");
      setRole("member");
      setSendInvite(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add user");
    } finally {
      setAdding(false);
    }
  }

  async function toggleActive(userId: number, currentlyActive: boolean) {
    setError("");
    setNotice("");
    setBusyId(userId);
    try {
      if (currentlyActive) await deactivateTenantUser(userId);
      else await activateTenantUser(userId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <TenantShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Team &amp; Seats</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Invite teammates up to your allocated seat count.
            </p>
          </div>
          {data && (
            <div className="text-right">
              <p className="text-2xl font-bold text-ink">
                {data.seats.used}
                <span className="text-base text-neutral-400">
                  {" "}/ {data.seats.allocated}
                </span>
              </p>
              <p className="text-xs text-neutral-500">seats used</p>
            </div>
          )}
        </div>

        {notice && (
          <div className="rounded-card border border-constructive bg-constructive-50 px-4 py-3 text-sm text-ink">
            <p>{notice}</p>
            {inviteLink && (
              <p className="mt-2 text-xs text-neutral-600 break-all">
                Email delivery isn&apos;t configured yet, so share this invitation link
                directly:{" "}
                <span className="font-mono text-secondary">{inviteLink}</span>
              </p>
            )}
          </div>
        )}
        {error && (
          <div className="rounded-card border border-destructive bg-destructive-50 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Add user */}
        <Card variant="outlined">
          <CardContent className="p-6">
            <h2 className="font-semibold text-ink mb-4">Add a team member</h2>
            {seatsFull && (
              <div className="rounded-medium border border-warning bg-warning-50 px-3 py-2 text-sm text-ink mb-4">
                You&apos;ve reached your seat limit. Deactivate a member to free a
                seat before adding another.
              </div>
            )}
            <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@acme.com"
                required
                disabled={seatsFull}
              />
              <Input
                label="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Smith"
                disabled={seatsFull}
              />
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={seatsFull}
                  className="w-full px-4 py-2.5 bg-background text-ink border border-hairline rounded-medium focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  <option value="member">Member</option>
                  <option value="tenant_admin">Administrator</option>
                </select>
              </div>
              {!sendInvite && (
                <Input
                  label="Temporary password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters, incl. a letter & number"
                  minLength={8}
                  required
                  disabled={seatsFull}
                />
              )}
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={sendInvite}
                    onChange={(e) => setSendInvite(e.target.checked)}
                    disabled={seatsFull}
                    className="rounded border-hairline text-primary focus:ring-primary"
                  />
                  Send an invitation email so they can set their own password
                </label>
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={adding || seatsFull}
                >
                  {adding ? "Adding…" : sendInvite ? "Send invitation" : "Add member"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* User list */}
        <Card variant="outlined">
          <CardContent className="p-0">
            {loading ? (
              <p className="text-neutral-500 p-6">Loading team…</p>
            ) : data && data.users.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hairline text-left text-neutral-400 uppercase text-xs">
                    <th className="px-6 py-3 font-semibold">Name</th>
                    <th className="px-6 py-3 font-semibold">Email</th>
                    <th className="px-6 py-3 font-semibold">Role</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id} className="border-b border-hairline last:border-0">
                      <td className="px-6 py-3 text-ink font-medium">
                        {u.full_name || "—"}
                        {u.is_owner && (
                          <span className="ml-2 text-xs text-secondary font-semibold">
                            Owner
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-neutral-600">{u.email}</td>
                      <td className="px-6 py-3 text-neutral-600 capitalize">
                        {u.role.replace("_", " ")}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            u.is_active
                              ? "bg-constructive-50 text-constructive"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {u.is_owner ? (
                          <span className="text-neutral-300">—</span>
                        ) : (
                          <button
                            onClick={() => toggleActive(u.id, u.is_active)}
                            disabled={busyId === u.id}
                            className={`text-sm font-medium disabled:opacity-50 ${
                              u.is_active
                                ? "text-neutral-500 hover:text-destructive"
                                : "text-secondary hover:underline"
                            }`}
                          >
                            {busyId === u.id
                              ? "…"
                              : u.is_active
                              ? "Deactivate"
                              : "Reactivate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-neutral-500 p-6">No team members yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </TenantShell>
  );
}
