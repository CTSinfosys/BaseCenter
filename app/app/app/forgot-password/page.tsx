"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button, Input, Card, CardContent } from "@/components/ui";
import { requestPasswordReset } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo-horizontal.png" alt="BaseCenter.ai" width={200} height={54} />
          <p className="text-sm text-neutral-500 mt-3">Reset your password</p>
        </div>

        <Card variant="elevated">
          <CardContent className="p-8">
            {submitted ? (
              <>
                <h1 className="text-2xl font-bold text-ink mb-3">Check your email</h1>
                <p className="text-sm text-neutral-600">
                  If an account exists for <span className="font-medium">{email}</span>, a
                  password reset link has been sent. The link expires shortly, so use it
                  soon.
                </p>
                <p className="text-sm text-neutral-500 mt-6">
                  <Link href="/app/login" className="text-secondary font-medium hover:underline">
                    ← Back to sign in
                  </Link>
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-ink mb-2">Forgot password?</h1>
                <p className="text-sm text-neutral-500 mb-6">
                  Enter your work email and we&apos;ll send you a link to reset your
                  password.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Work email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@acme.com"
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
                    {loading ? "Sending..." : "Send reset link"}
                  </Button>
                </form>

                <p className="text-sm text-neutral-500 text-center mt-6">
                  <Link href="/app/login" className="text-secondary font-medium hover:underline">
                    ← Back to sign in
                  </Link>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
