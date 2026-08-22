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

// ---- Phase 1D: Tenant management & analytics ----
export interface TenantOwner {
  id: number;
  email: string;
  full_name: string | null;
}

export interface TenantSummary {
  id: number;
  name: string;
  subdomain: string | null;
  status: string;
  is_active: boolean;
  seats_allocated: number;
  seats_used: number;
  active_module_count: number;
  owner: TenantOwner | null;
  created_at: string | null;
}

export interface TenantModuleSubscription {
  module_id: number;
  module_name: string;
  module_slug: string;
  monthly_price: number;
  is_free_module: boolean;
  subscription_id: number | null;
  status: string;
  seats: number;
  stripe_subscription_id: string | null;
  enabled: boolean;
}

export interface TenantDetail extends TenantSummary {
  users: TenantOwner[];
  modules: TenantModuleSubscription[];
}

export async function listTenants(
  search?: string,
  status?: string
): Promise<TenantSummary[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  const qs = params.toString();
  return apiFetch<TenantSummary[]>(`/admin/tenants${qs ? `?${qs}` : ""}`);
}

export async function getTenant(id: number): Promise<TenantDetail> {
  return apiFetch<TenantDetail>(`/admin/tenants/${id}`);
}

export async function createTenant(payload: {
  name: string;
  subdomain?: string;
  seats_allocated?: number;
  owner_email?: string;
  owner_full_name?: string;
  owner_password?: string;
}): Promise<TenantDetail> {
  return apiFetch<TenantDetail>("/admin/tenants", { method: "POST", body: payload });
}

export async function updateTenant(
  id: number,
  payload: Partial<{
    name: string;
    subdomain: string;
    seats_allocated: number;
    owner_id: number;
  }>
): Promise<TenantDetail> {
  return apiFetch<TenantDetail>(`/admin/tenants/${id}`, { method: "PUT", body: payload });
}

export async function suspendTenant(id: number): Promise<TenantDetail> {
  return apiFetch<TenantDetail>(`/admin/tenants/${id}/suspend`, { method: "POST" });
}

export async function reactivateTenant(id: number): Promise<TenantDetail> {
  return apiFetch<TenantDetail>(`/admin/tenants/${id}/reactivate`, { method: "POST" });
}

export async function updateTenantSeats(
  id: number,
  seats_allocated: number
): Promise<TenantDetail> {
  return apiFetch<TenantDetail>(`/admin/tenants/${id}/seats`, {
    method: "PUT",
    body: { seats_allocated },
  });
}

export async function enableTenantModule(
  tenantId: number,
  moduleId: number,
  seats = 1
): Promise<TenantDetail> {
  return apiFetch<TenantDetail>(
    `/admin/tenants/${tenantId}/modules/${moduleId}/enable`,
    { method: "POST", body: { seats } }
  );
}

export async function disableTenantModule(
  tenantId: number,
  moduleId: number
): Promise<TenantDetail> {
  return apiFetch<TenantDetail>(
    `/admin/tenants/${tenantId}/modules/${moduleId}/disable`,
    { method: "POST" }
  );
}

export interface ModuleAdoption {
  module_id: number;
  module_name: string;
  monthly_price: number;
  tenant_count: number;
  mrr: number;
}

export interface AnalyticsOverview {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  total_users: number;
  total_seats_allocated: number;
  total_seats_used: number;
  active_subscriptions: number;
  mrr_cents: number;
  module_adoption: ModuleAdoption[];
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  return apiFetch<AnalyticsOverview>("/admin/analytics/overview");
}
