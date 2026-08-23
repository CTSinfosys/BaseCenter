"use client";

// Phase 2A — live theming. Picks the theme scope from the current path,
// fetches that scope's active (default) theme tokens, and applies them as CSS
// custom properties on <html>. Runs on route changes so navigating between
// public site / splash / internal app swaps themes without a reload.
//
// Fetch failures are non-fatal: the baked-in globals.css baseline (BaseCenter
// Default) remains in effect.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getActiveTheme, type ThemeScope } from "@/lib/api";
import { applyTokens, scopeForPath } from "@/lib/theme";

// In-memory cache so re-navigating a scope doesn't refetch within a session.
const cache = new Map<ThemeScope, Record<string, unknown>>();

export default function ThemeManager() {
  const pathname = usePathname();

  useEffect(() => {
    const scope = scopeForPath(pathname || "/");
    if (!scope) return; // tenant public sites keep the baseline
    let cancelled = false;

    const apply = (tokens: Record<string, unknown>) => {
      if (!cancelled) applyTokens(document.documentElement, tokens);
    };

    const cached = cache.get(scope);
    if (cached) {
      apply(cached);
      return;
    }

    getActiveTheme(scope)
      .then((res) => {
        cache.set(scope, res.tokens as Record<string, unknown>);
        apply(res.tokens as Record<string, unknown>);
      })
      .catch(() => {
        /* keep baked-in baseline */
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}

// Allow other UI (e.g. the Appearance editor after Set-as-Default) to bust the
// cache so the next navigation re-fetches.
export function clearThemeCache(scope?: ThemeScope) {
  if (scope) cache.delete(scope);
  else cache.clear();
}
