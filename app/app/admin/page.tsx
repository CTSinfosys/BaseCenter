"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button, Input, Card, CardContent } from "@/components/ui";
import { login, getMe, getToken, clearToken } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in as super admin, skip to settings
  useEffect(() => {
    if (getToken()) {
      getMe()
        .then((u) => {
          if (u.is_superuser) router.replace("/admin/dashboard");
          else clearToken();
        })
        .catch(() => clearToken());
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      const me = await getMe();
      if (!me.is_superuser) {
        clearToken();
        setError("This account does not have Super Admin access.");
        return;
      }
      router.replace("/admin/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Image
            src="/logo-horizontal.png"
            alt="BaseCenter.ai"
            width={220}
            height={60}
            priority
          />
        </div>
        <Card variant="elevated">
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold text-ink mb-1">Super Admin</h1>
            <p className="text-neutral-500 mb-6 text-sm">
              Sign in to manage platform settings.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@basecenter.ai"
                required
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              {error && (
                <p className="text-sm text-destructive bg-destructive-50 px-3 py-2 rounded-md">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
