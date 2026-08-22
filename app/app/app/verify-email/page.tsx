"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui";
import { verifyEmail } from "@/lib/api";

type Status = "verifying" | "ok" | "error";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token.");
      return;
    }
    verifyEmail(token)
      .then((res) => {
        setStatus("ok");
        setMessage(res.detail || "Your email has been verified.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err instanceof Error ? err.message : "This verification link is invalid or expired."
        );
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo-horizontal.png" alt="BaseCenter.ai" width={200} height={54} />
          <p className="text-sm text-neutral-500 mt-3">Email verification</p>
        </div>

        <Card variant="elevated">
          <CardContent className="p-8 text-center">
            {status === "verifying" && (
              <>
                <h1 className="text-2xl font-bold text-ink mb-3">Verifying…</h1>
                <p className="text-sm text-neutral-600">
                  Please wait while we verify your email address.
                </p>
              </>
            )}
            {status === "ok" && (
              <>
                <div className="text-4xl mb-3">✅</div>
                <h1 className="text-2xl font-bold text-ink mb-3">Email verified</h1>
                <p className="text-sm text-neutral-600">{message}</p>
                <p className="text-sm text-neutral-500 mt-6">
                  <Link href="/app/login" className="text-secondary font-medium hover:underline">
                    Continue to sign in
                  </Link>
                </p>
              </>
            )}
            {status === "error" && (
              <>
                <div className="text-4xl mb-3">⚠️</div>
                <h1 className="text-2xl font-bold text-ink mb-3">Verification failed</h1>
                <p className="text-sm text-neutral-600">{message}</p>
                <p className="text-sm text-neutral-500 mt-6">
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

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-neutral-500">
          Loading…
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
