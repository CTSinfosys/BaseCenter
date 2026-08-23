"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  getToken,
  getMe,
  clearToken,
  getPublicSidebarLabels,
  type CurrentUser,
} from "@/lib/api";

// `key` is the stable nav key used for label overrides; `label` is the default.
const NAV = [
  { href: "/admin/dashboard", key: "dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin/tenants", key: "tenants", label: "Tenants", icon: "🏢" },
  { href: "/admin/settings", key: "settings", label: "Stripe Settings", icon: "⚙️" },
  { href: "/admin/settings/email", key: "email", label: "Email Settings", icon: "✉️" },
  { href: "/admin/settings/sidebar", key: "sidebar", label: "Sidebar Labels", icon: "🏷️" },
  { href: "/admin/appearance", key: "appearance", label: "Appearance", icon: "🎨" },
  { href: "/admin/audit", key: "audit", label: "Audit Log", icon: "📋" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    // Effective labels — fall back to NAV defaults if the fetch fails.
    getPublicSidebarLabels()
      .then((cfg) => setLabels(cfg.admin || {}))
      .catch(() => setLabels({}));
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/admin");
      return;
    }
    getMe()
      .then((u) => {
        if (!u.is_superuser) {
          clearToken();
          router.replace("/admin");
          return;
        }
        setUser(u);
      })
      .catch(() => {
        clearToken();
        router.replace("/admin");
      })
      .finally(() => setChecking(false));
  }, [router]);

  function handleLogout() {
    clearToken();
    router.replace("/admin");
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-neutral-50">
      {/* Sidebar */}
      <aside className="w-64 bg-background border-r border-hairline flex flex-col">
        <div className="p-6 border-b border-hairline">
          <Image src="/logo-horizontal.png" alt="BaseCenter.ai" width={170} height={46} />
          <p className="text-xs text-neutral-400 mt-2 font-medium tracking-wide uppercase">
            Super Admin
          </p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((item) => {
            // Pick the most specific (longest) matching href so nested routes
            // like /admin/settings/sidebar don't also highlight /admin/settings.
            const activeHref = NAV.filter(
              (i) => pathname === i.href || pathname.startsWith(i.href + "/")
            ).sort((a, b) => b.href.length - a.href.length)[0]?.href;
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary-50 text-primary-700"
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
          <p className="text-xs text-neutral-500 mb-2 truncate">{user?.email}</p>
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
