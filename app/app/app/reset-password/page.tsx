"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button, Input, Card, CardContent } from "@/components/ui";
import { confirmPasswordReset } from "@/lib/api";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must be at least 8 characters and include a letter and a number.");
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(token, password);
      setDone(true);
      setTimeout(() => router.replace("/app/login"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo-horizontal.png" alt="BaseCenter.ai" width={200} height={54} />
          <p className="text-sm text-neutral-500 mt-3">Set a new password</p>
        </div>

        <Card variant="elevated">
          <CardContent className="p-8">
            {done ? (
              <>
                <h1 className="text-2xl font-bold text-ink mb-3">Password updated</h1>
                <p className="text-sm text-neutral-600">
                  Your password has been updated. Redirecting you to sign in…
                </p>
                <p className="text-sm text-neutral-500 mt-6">
                  <Link href="/app/login" className="text-secondary font-medium hover:underline">
                    Go to sign in
                  </Link>
                </p>
              </>
            ) : !token ? (
              <>
                <h1 className="text-2xl font-bold text-ink mb-3">Invalid link</h1>
                <p className="text-sm text-neutral-600">
                  This reset link is missing its token. Please request a new one.
                </p>
                <p className="text-sm text-neutral-500 mt-6">
                  <Link
                    href="/app/forgot-password"
                    className="text-secondary font-medium hover:underline"
                  >
                    Request a new link
                  </Link>
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-ink mb-2">Choose a new password</h1>
                <p className="text-sm text-neutral-500 mb-6">
                  Must be at least 8 characters and include a letter and a number.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="New password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
                    required
                  />
                  <Input
                    label="Confirm password"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
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
                    {loading ? "Updating..." : "Update password"}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-neutral-500">
          Loading…
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
