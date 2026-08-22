"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button, Input, Card, CardContent } from "@/components/ui";
import { tenantLogin, getTenantMe, getTenantToken, clearTenantToken } from "@/lib/api";

export default function TenantLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Skip login if already authenticated as a tenant user.
  useEffect(() => {
    if (getTenantToken()) {
      getTenantMe()
        .then((u) => {
          if (u.tenant_id) router.replace("/app");
          else clearTenantToken();
        })
        .catch(() => clearTenantToken());
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await tenantLogin(email, password);
      router.replace("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo-horizontal.png" alt="BaseCenter.ai" width={200} height={54} />
          <p className="text-sm text-neutral-500 mt-3">Sign in to your workspace</p>
        </div>

        <Card variant="elevated">
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold text-ink mb-6">Welcome back</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Work email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@acme.com"
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
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <p className="text-sm text-neutral-500 text-center mt-6">
              New to BaseCenter?{" "}
              <Link href="/app/signup" className="text-secondary font-medium hover:underline">
                Create a workspace
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
