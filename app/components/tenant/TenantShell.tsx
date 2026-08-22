"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  getTenantToken,
  getTenantMe,
  clearTenantToken,
  getPublicSidebarLabels,
  type TenantCurrentUser,
} from "@/lib/api";

// `key` is the stable nav key used for label overrides; `label` is the default.
const NAV = [
  { href: "/app", key: "dashboard", label: "Dashboard", icon: "📊" },
  { href: "/app/modules", key: "modules", label: "Modules", icon: "🧩" },
  { href: "/app/team", key: "team", label: "Team & Seats", icon: "👥" },
];

export default function TenantShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<TenantCurrentUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    // Effective tenant labels — fall back to NAV defaults if the fetch fails.
    getPublicSidebarLabels()
      .then((cfg) => setLabels(cfg.tenant || {}))
      .catch(() => setLabels({}));
  }, []);

  useEffect(() => {
    if (!getTenantToken()) {
      router.replace("/app/login");
      return;
    }
    getTenantMe()
      .then((u) => {
        if (!u.tenant_id) {
          clearTenantToken();
          router.replace("/app/login");
          return;
        }
        setUser(u);
      })
      .catch(() => {
        clearTenantToken();
        router.replace("/app/login");
      })
      .finally(() => setChecking(false));
  }, [router]);

  function handleLogout() {
    clearTenantToken();
    router.replace("/app/login");
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-500">
        Loading…
      </div>
    );
  }

  const isAdmin = user?.role === "tenant_admin";

  return (
    <div className="min-h-screen flex bg-neutral-50">
      {/* Sidebar — violet accent distinguishes the tenant portal from Super Admin */}
      <aside className="w-64 bg-white border-r border-hairline flex flex-col">
        <div className="p-6 border-b border-hairline">
          <Image src="/logo-horizontal.png" alt="BaseCenter.ai" width={170} height={46} />
          <p className="text-xs text-secondary mt-2 font-semibold tracking-wide uppercase">
            Workspace
          </p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((item) => {
            // Team & Seats is admin-only
            if (item.href === "/app/team" && !isAdmin) return null;
            const active =
              item.href === "/app"
                ? pathname === "/app"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-secondary-50 text-secondary"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <span>{item.icon}</span>
                {labels[item.key] || item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-hairline">
          <p className="text-xs font-medium text-neutral-700 truncate">
            {user?.full_name || user?.email}
          </p>
          <p className="text-xs text-neutral-400 mb-2 truncate capitalize">
            {user?.role?.replace("_", " ")}
          </p>
          <button
            onClick={handleLogout}
            className="text-sm text-neutral-600 hover:text-destructive font-medium"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
