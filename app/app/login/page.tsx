"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button, Input, Card, CardContent } from "@/components/ui";
import {
  login,
  getMe,
  clearToken,
  tenantLogin,
  getTenantMe,
} from "@/lib/api";

/**
 * Unified public login page.
 *
 * A single email + password form that works for BOTH Super Admins and tenant
 * users. It reuses the existing backend login endpoints (no security change):
 *   1. Authenticate against the platform auth endpoint (/auth/login) to obtain
 *      the user's identity.
 *   2. If the account is a superuser -> keep the SA token and go to /admin/dashboard.
 *   3. Otherwise it is a tenant user -> discard the SA token, obtain a proper
 *      tenant token via /tenant/login (stored under bc_tenant_token) and go to /app.
 *
 * Token storage stays exactly as the two portals expect, so both keep working.
 */
export default function UnifiedLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Step 1: authenticate & identify the account (stores SA token).
      await login(email, password);
      const me = await getMe();

      if (me.is_superuser) {
        // Super Admin -> SA portal.
        router.replace("/admin/dashboard");
        return;
      }

      // Not a superuser: this is a tenant user. Drop the SA token and mint a
      // dedicated tenant token so the tenant portal works as usual.
      clearToken();
      await tenantLogin(email, password);
      // Sanity check the tenant session before routing.
      await getTenantMe();
      router.replace("/app");
    } catch (err) {
      clearToken();
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo-horizontal.png" alt="BaseCenter.ai" width={200} height={54} />
          <p className="text-sm text-neutral-500 mt-3">Sign in to your account</p>
        </div>

        <Card variant="elevated">
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold text-ink mb-6">Welcome back</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
              />

              <div className="flex justify-end -mt-2">
                <Link
                  href="/app/forgot-password"
                  className="text-sm text-secondary font-medium hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive-50 rounded-medium px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Login"}
              </Button>
            </form>

            <p className="text-sm text-neutral-500 text-center mt-6">
              New to BaseCenter?{" "}
              <Link href="/modules" className="text-secondary font-medium hover:underline">
                Choose a module to get started
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
