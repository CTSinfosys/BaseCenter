// BaseCenter.ai API client
// Talks to the FastAPI backend. Base URL is configurable via NEXT_PUBLIC_API_URL.

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const TOKEN_KEY = "bc_access_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  form?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  { method = "GET", body, auth = true, form = false }: ApiOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  let payload: BodyInit | undefined;

  if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    payload = new URLSearchParams(body as Record<string, string>).toString();
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: payload,
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---- Auth helpers ----
export async function login(email: string, password: string): Promise<string> {
  const data = await apiFetch<{ access_token: string }>("/auth/login", {
    method: "POST",
    form: true,
    auth: false,
    body: { username: email, password },
  });
  setToken(data.access_token);
  return data.access_token;
}

export interface CurrentUser {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  tenant_id: number | null;
}

export async function getMe(): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/auth/me");
}

// ---- Stripe settings ----
export interface StripeConfig {
  stripe_publishable_key: string | null;
  stripe_secret_key: string | null;
  stripe_webhook_secret: string | null;
  stripe_mode: string;
  is_configured: boolean;
}

export async function getStripeConfig(): Promise<StripeConfig> {
  return apiFetch<StripeConfig>("/admin/settings/stripe");
}

export async function updateStripeConfig(
  payload: Partial<{
    stripe_publishable_key: string;
    stripe_secret_key: string;
    stripe_webhook_secret: string;
    stripe_mode: string;
  }>
): Promise<StripeConfig> {
  return apiFetch<StripeConfig>("/admin/settings/stripe", {
    method: "PUT",
    body: payload,
  });
}

export interface StripeTestResult {
  success: boolean;
  message: string;
  account_name: string | null;
  mode: string | null;
}

export async function testStripeConnection(): Promise<StripeTestResult> {
  return apiFetch<StripeTestResult>("/admin/settings/stripe/test", {
    method: "POST",
  });
}

export interface AdminModule {
  id: number;
  name: string;
  slug: string;
  monthly_price: number;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
}

export async function listAdminModules(): Promise<AdminModule[]> {
  return apiFetch<AdminModule[]>("/admin/modules");
}

export async function syncModulesToStripe(): Promise<{
  success: boolean;
  synced_count: number;
}> {
  return apiFetch("/admin/modules/sync-stripe", { method: "POST" });
}
