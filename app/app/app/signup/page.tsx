"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button, Input, Card, CardContent } from "@/components/ui";
import { tenantSignup } from "@/lib/api";

export default function TenantSignupPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await tenantSignup({
        company_name: companyName,
        full_name: fullName || undefined,
        email,
        password,
      });
      router.replace("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo-horizontal.png" alt="BaseCenter.ai" width={200} height={54} />
          <p className="text-sm text-neutral-500 mt-3">
            Create your workspace — free to start
          </p>
        </div>

        <Card variant="elevated">
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold text-ink mb-1">Start free</h1>
            <p className="text-sm text-neutral-500 mb-6">
              1 core module free for 5 years + a free website, 10 seats included.
              No card required.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Contracting"
                required
              />
              <Input
                label="Your name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
              />
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
                placeholder="At least 8 characters"
                minLength={8}
                required
              />

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
                {loading ? "Creating workspace…" : "Create workspace"}
              </Button>
            </form>

            <p className="text-sm text-neutral-500 text-center mt-6">
              Already have an account?{" "}
              <Link href="/app/login" className="text-secondary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
