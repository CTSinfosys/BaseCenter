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

// Tenant portal (Phase 1E) uses a SEPARATE token so the customer /app session
// and the Super Admin /admin session never clobber each other.
const TENANT_TOKEN_KEY = "bc_tenant_token";

export function getTenantToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TENANT_TOKEN_KEY);
}

export function setTenantToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem(TENANT_TOKEN_KEY, token);
}

export function clearTenantToken() {
  if (typeof window !== "undefined") localStorage.removeItem(TENANT_TOKEN_KEY);
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  form?: boolean;
  tenant?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  { method = "GET", body, auth = true, form = false, tenant = false }: ApiOptions = {}
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
    const token = tenant ? getTenantToken() : getToken();
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

// ---- Email / SMTP settings (Phase 1H) ----
export interface EmailConfig {
  from_name: string | null;
  from_address: string | null;
  smtp_host: string | null;
  smtp_port: string | null;
  smtp_user: string | null;
  smtp_password: string | null; // masked in responses
  smtp_use_tls: string | null;
  is_configured: boolean;
}

export async function getEmailConfig(): Promise<EmailConfig> {
  return apiFetch<EmailConfig>("/admin/settings/email");
}

export async function updateEmailConfig(
  payload: Partial<{
    from_name: string;
    from_address: string;
    smtp_host: string;
    smtp_port: string;
    smtp_user: string;
    smtp_password: string;
    smtp_use_tls: string;
  }>
): Promise<EmailConfig> {
  return apiFetch<EmailConfig>("/admin/settings/email", {
    method: "PUT",
    body: payload,
  });
}

export interface EmailTestResult {
  sent: boolean;
  logged: boolean;
  detail: string;
}

export async function testEmail(to: string): Promise<EmailTestResult> {
  return apiFetch<EmailTestResult>("/admin/settings/email/test", {
    method: "POST",
    body: { to },
  });
}

// ---- Audit log (Phase 1H) ----
export interface AuditLogEntry {
  id: number;
  actor_user_id: number | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  meta: string | null;
  ip_address: string | null;
  created_at: string | null;
}

export interface AuditLogList {
  items: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export async function getAuditLogs(
  filters: Partial<{
    actor: string;
    action: string;
    date_from: string;
    date_to: string;
    limit: number;
    offset: number;
  }> = {}
): Promise<AuditLogList> {
  const qs = new URLSearchParams();
  if (filters.actor) qs.set("actor", filters.actor);
  if (filters.action) qs.set("action", filters.action);
  if (filters.date_from) qs.set("date_from", filters.date_from);
  if (filters.date_to) qs.set("date_to", filters.date_to);
  if (filters.limit != null) qs.set("limit", String(filters.limit));
  if (filters.offset != null) qs.set("offset", String(filters.offset));
  const q = qs.toString();
  return apiFetch<AuditLogList>(`/admin/audit${q ? `?${q}` : ""}`);
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

// ---- Sidebar navigation labels ----
export interface SidebarLabelsConfig {
  admin: Record<string, string>;
  tenant: Record<string, string>;
}

// SA-protected: full config (defaults merged with overrides) for the editor.
export async function getSidebarLabels(): Promise<SidebarLabelsConfig> {
  return apiFetch<SidebarLabelsConfig>("/admin/settings/sidebar");
}

// SA-protected: save overrides. Blank labels reset to default server-side.
export async function updateSidebarLabels(payload: {
  admin?: Record<string, string>;
  tenant?: Record<string, string>;
}): Promise<SidebarLabelsConfig> {
  return apiFetch<SidebarLabelsConfig>("/admin/settings/sidebar", {
    method: "PUT",
    body: payload,
  });
}

// PUBLIC: effective labels only (no secrets) — used by both shells to render nav.
export async function getPublicSidebarLabels(): Promise<SidebarLabelsConfig> {
  return apiFetch<SidebarLabelsConfig>("/admin/sidebar-labels", { auth: false });
}

// ---- Public module catalog ----
export interface PublicModule {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  monthly_price: number; // cents
  is_active: boolean;
  is_free_eligible: boolean;
  display_order: number;
}

export async function getPublicModules(): Promise<PublicModule[]> {
  return apiFetch<PublicModule[]>("/modules", { auth: false });
}

// ---- Phase 2A: Theming ----
export type ThemeScope = "website" | "splash" | "app";

export type ThemeTokens = Record<string, unknown>;

export interface Theme {
  id: number;
  scope: ThemeScope;
  name: string;
  is_default: boolean;
  tokens: ThemeTokens;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ActiveTheme {
  scope: string;
  tokens: ThemeTokens;
}

// PUBLIC: active (default) theme tokens for a scope — applied live by ThemeManager.
export async function getActiveTheme(scope: ThemeScope): Promise<ActiveTheme> {
  return apiFetch<ActiveTheme>(`/themes/active?scope=${scope}`, { auth: false });
}

// SA-protected theme CRUD.
export async function listThemes(scope: ThemeScope): Promise<Theme[]> {
  return apiFetch<Theme[]>(`/admin/themes?scope=${scope}`);
}

export async function getTheme(id: number): Promise<Theme> {
  return apiFetch<Theme>(`/admin/themes/${id}`);
}

export async function createTheme(payload: {
  scope: ThemeScope;
  name: string;
  tokens: ThemeTokens;
  is_default?: boolean;
}): Promise<Theme> {
  return apiFetch<Theme>("/admin/themes", { method: "POST", body: payload });
}

export async function updateTheme(
  id: number,
  payload: { name?: string; tokens?: ThemeTokens }
): Promise<Theme> {
  return apiFetch<Theme>(`/admin/themes/${id}`, { method: "PUT", body: payload });
}

export async function deleteTheme(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/themes/${id}`, { method: "DELETE" });
}

export async function duplicateTheme(
  id: number,
  name?: string
): Promise<Theme> {
  return apiFetch<Theme>(`/admin/themes/${id}/duplicate`, {
    method: "POST",
    body: { name },
  });
}

export async function setDefaultTheme(id: number): Promise<Theme> {
  return apiFetch<Theme>(`/admin/themes/${id}/set-default`, { method: "POST" });
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


// ===========================================================================
// Phase 1E: Tenant self-service portal (/app)
// ===========================================================================

export interface TenantCurrentUser {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  role: string;
  tenant_id: number | null;
}

export interface TenantSignupResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  tenant_id: number;
  tenant_name: string;
}

export async function tenantSignup(payload: {
  company_name: string;
  full_name?: string;
  email: string;
  password: string;
}): Promise<TenantSignupResponse> {
  const data = await apiFetch<TenantSignupResponse>("/tenant/signup", {
    method: "POST",
    auth: false,
    body: payload,
  });
  setTenantToken(data.access_token);
  return data;
}

export async function tenantLogin(email: string, password: string): Promise<string> {
  const data = await apiFetch<{ access_token: string }>("/tenant/login", {
    method: "POST",
    form: true,
    auth: false,
    body: { username: email, password },
  });
  setTenantToken(data.access_token);
  return data.access_token;
}

export async function getTenantMe(): Promise<TenantCurrentUser> {
  return apiFetch<TenantCurrentUser>("/tenant/me", { tenant: true });
}

export interface SeatUsage {
  allocated: number;
  used: number;
  available: number;
}

export interface TenantBillingStatus {
  stripe_configured: boolean;
  stripe_customer_id: string | null;
  active_paid_modules: number;
  monthly_total_cents: number;
}

export interface ActiveModuleInfo {
  subscription_id: number;
  module_id: number;
  name: string;
  slug: string;
  icon: string | null;
  is_free_module: boolean;
  status: string;
  monthly_price: number;
}

export interface TenantDashboardData {
  tenant_id: number;
  tenant_name: string;
  status: string;
  seats: SeatUsage;
  billing: TenantBillingStatus;
  active_modules: ActiveModuleInfo[];
}

export async function getTenantDashboard(): Promise<TenantDashboardData> {
  return apiFetch<TenantDashboardData>("/tenant/dashboard", { tenant: true });
}

export interface CatalogModule {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  monthly_price: number;
  is_free_eligible: boolean;
  is_activated: boolean;
  subscription_status: string | null;
  subscription_id: number | null;
  stripe_ready: boolean;
}

export async function getTenantCatalog(): Promise<CatalogModule[]> {
  return apiFetch<CatalogModule[]>("/tenant/modules", { tenant: true });
}

export interface ActivateModuleResponse {
  activated: boolean;
  requires_checkout: boolean;
  checkout_url: string | null;
  message: string;
}

export async function activateTenantModule(
  moduleId: number
): Promise<ActivateModuleResponse> {
  return apiFetch<ActivateModuleResponse>("/tenant/modules/activate", {
    method: "POST",
    tenant: true,
    body: { module_id: moduleId },
  });
}

export async function deactivateTenantModule(
  subscriptionId: number
): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/tenant/modules/${subscriptionId}/deactivate`, {
    method: "POST",
    tenant: true,
  });
}

export interface TenantTeamUser {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  is_owner: boolean;
  created_at: string;
  // Phase 1H — populated on invite responses
  invited?: boolean | null;
  invite_link?: string | null;
}

export interface TenantUserList {
  users: TenantTeamUser[];
  seats: SeatUsage;
}

export async function listTenantUsers(): Promise<TenantUserList> {
  return apiFetch<TenantUserList>("/tenant/users", { tenant: true });
}

export async function addTenantUser(payload: {
  email: string;
  full_name?: string;
  // Optional (Phase 1H): omit to send an email invite instead of setting a password.
  password?: string;
  role?: string;
}): Promise<TenantTeamUser> {
  return apiFetch<TenantTeamUser>("/tenant/users", {
    method: "POST",
    tenant: true,
    body: payload,
  });
}

// ---------------------------------------------------------------------------
// Phase 1H — password reset & email verification (public tenant flows)
// ---------------------------------------------------------------------------
export async function requestPasswordReset(email: string): Promise<{ detail: string }> {
  return apiFetch("/tenant/password-reset/request", {
    method: "POST",
    auth: false,
    body: { email },
  });
}

export async function confirmPasswordReset(
  token: string,
  newPassword: string
): Promise<{ detail: string }> {
  return apiFetch("/tenant/password-reset/confirm", {
    method: "POST",
    auth: false,
    body: { token, new_password: newPassword },
  });
}

export async function verifyEmail(token: string): Promise<{ detail: string }> {
  return apiFetch("/tenant/verify-email", {
    method: "POST",
    auth: false,
    body: { token },
  });
}

export async function resendVerification(email: string): Promise<{ detail: string }> {
  return apiFetch("/tenant/resend-verification", {
    method: "POST",
    auth: false,
    body: { email },
  });
}

export async function deactivateTenantUser(userId: number): Promise<TenantTeamUser> {
  return apiFetch<TenantTeamUser>(`/tenant/users/${userId}/deactivate`, {
    method: "POST",
    tenant: true,
  });
}

export async function activateTenantUser(userId: number): Promise<TenantTeamUser> {
  return apiFetch<TenantTeamUser>(`/tenant/users/${userId}/activate`, {
    method: "POST",
    tenant: true,
  });
}

// ---------------------------------------------------------------------------
// Website Builder module (Phase 1F)
// ---------------------------------------------------------------------------
export type BlockType = "heading" | "text" | "image" | "button";

export interface WebsiteBlock {
  id: number;
  website_id: number;
  block_type: BlockType;
  content: Record<string, unknown>;
  position: number;
}

export interface Website {
  id: number;
  tenant_id: number;
  name: string;
  slug: string;
  published: boolean;
  settings: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface WebsiteDetail extends Website {
  blocks: WebsiteBlock[];
}

export interface PublicWebsite {
  name: string;
  slug: string;
  settings: Record<string, unknown> | null;
  blocks: WebsiteBlock[];
}

export async function listWebsites(): Promise<Website[]> {
  return apiFetch<Website[]>("/tenant/website-builder/websites", { tenant: true });
}

export async function createWebsite(payload: {
  name: string;
  slug?: string;
  settings?: Record<string, unknown>;
}): Promise<WebsiteDetail> {
  return apiFetch<WebsiteDetail>("/tenant/website-builder/websites", {
    method: "POST",
    tenant: true,
    body: payload,
  });
}

export async function getWebsite(id: number): Promise<WebsiteDetail> {
  return apiFetch<WebsiteDetail>(`/tenant/website-builder/websites/${id}`, {
    tenant: true,
  });
}

export async function updateWebsite(
  id: number,
  payload: { name?: string; slug?: string; settings?: Record<string, unknown> }
): Promise<WebsiteDetail> {
  return apiFetch<WebsiteDetail>(`/tenant/website-builder/websites/${id}`, {
    method: "PUT",
    tenant: true,
    body: payload,
  });
}

export async function deleteWebsite(id: number): Promise<void> {
  await apiFetch(`/tenant/website-builder/websites/${id}`, {
    method: "DELETE",
    tenant: true,
  });
}

export async function setWebsitePublished(
  id: number,
  published: boolean
): Promise<WebsiteDetail> {
  return apiFetch<WebsiteDetail>(`/tenant/website-builder/websites/${id}/publish`, {
    method: "POST",
    tenant: true,
    body: { published },
  });
}

export async function addWebsiteBlock(
  websiteId: number,
  payload: { block_type: BlockType; content: Record<string, unknown> }
): Promise<WebsiteBlock> {
  return apiFetch<WebsiteBlock>(
    `/tenant/website-builder/websites/${websiteId}/blocks`,
    { method: "POST", tenant: true, body: payload }
  );
}

export async function updateWebsiteBlock(
  websiteId: number,
  blockId: number,
  payload: { block_type?: BlockType; content?: Record<string, unknown> }
): Promise<WebsiteBlock> {
  return apiFetch<WebsiteBlock>(
    `/tenant/website-builder/websites/${websiteId}/blocks/${blockId}`,
    { method: "PUT", tenant: true, body: payload }
  );
}

export async function deleteWebsiteBlock(
  websiteId: number,
  blockId: number
): Promise<void> {
  await apiFetch(
    `/tenant/website-builder/websites/${websiteId}/blocks/${blockId}`,
    { method: "DELETE", tenant: true }
  );
}

export async function reorderWebsiteBlocks(
  websiteId: number,
  items: { id: number; position: number }[]
): Promise<WebsiteBlock[]> {
  return apiFetch<WebsiteBlock[]>(
    `/tenant/website-builder/websites/${websiteId}/blocks/reorder`,
    { method: "POST", tenant: true, body: { items } }
  );
}

// Public (no auth) — published sites only.
export async function getPublicSite(slug: string): Promise<PublicWebsite> {
  return apiFetch<PublicWebsite>(`/public/sites/${slug}`, { auth: false });
}



// ---------------------------------------------------------------------------
// Billing lifecycle & Stripe Customer Portal (Phase 1G) — tenant portal
// ---------------------------------------------------------------------------
export interface BillingSubscription {
  subscription_id: number;
  module_id: number;
  name: string;
  slug: string;
  icon: string | null;
  is_free_module: boolean;
  status: string;
  monthly_price: number;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  has_stripe: boolean;
}

export interface BillingOverview {
  stripe_configured: boolean;
  has_customer: boolean;
  subscriptions: BillingSubscription[];
  monthly_total_cents: number;
  any_past_due: boolean;
}

export interface InvoiceOut {
  id: string | null;
  number: string | null;
  created: string | null;
  amount_cents: number;
  currency: string;
  status: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

export async function getTenantBilling(): Promise<BillingOverview> {
  return apiFetch<BillingOverview>("/tenant/billing", { tenant: true });
}

export async function getTenantInvoices(): Promise<InvoiceOut[]> {
  const res = await apiFetch<{ invoices: InvoiceOut[] }>(
    "/tenant/billing/invoices",
    { tenant: true }
  );
  return res.invoices;
}

export async function cancelTenantSubscription(
  subscriptionId: number
): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/tenant/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    tenant: true,
  });
}

export async function reactivateTenantSubscription(
  subscriptionId: number
): Promise<{ success: boolean; message: string }> {
  return apiFetch(`/tenant/billing/subscriptions/${subscriptionId}/reactivate`, {
    method: "POST",
    tenant: true,
  });
}

export async function createBillingPortalSession(): Promise<{ url: string }> {
  return apiFetch<{ url: string }>("/tenant/billing/portal", {
    method: "POST",
    tenant: true,
  });
}



// ============================================================================
// Phase 2B: Content editor (lightweight CMS)
// ============================================================================
export type ContentPage = "website" | "splash";

export interface PageSection {
  id: number;
  page: ContentPage;
  type: string;
  position: number;
  is_visible: boolean;
  content: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PublicSection {
  id: number;
  type: string;
  content: Record<string, unknown>;
}

export interface SectionTypeInfo {
  type: string;
  label: string;
  description: string;
}

export interface MediaUpload {
  url: string;
  filename: string;
  size: number;
  content_type: string;
}

// PUBLIC: visible, ordered sections for a managed page (rendered on / and /modules).
export async function getPublicContent(page: ContentPage): Promise<PublicSection[]> {
  return apiFetch<PublicSection[]>(`/content/${page}`, { auth: false });
}

// SA-protected content CRUD.
export async function getSectionTypes(): Promise<SectionTypeInfo[]> {
  return apiFetch<SectionTypeInfo[]>("/admin/content/section-types");
}

export async function getAdminContent(page: ContentPage): Promise<PageSection[]> {
  return apiFetch<PageSection[]>(`/admin/content/${page}`);
}

export async function addSection(
  page: ContentPage,
  type: string,
  content?: Record<string, unknown>
): Promise<PageSection> {
  return apiFetch<PageSection>(`/admin/content/${page}/sections`, {
    method: "POST",
    body: { type, content: content ?? null },
  });
}

export async function updateSection(
  id: number,
  content: Record<string, unknown>
): Promise<PageSection> {
  return apiFetch<PageSection>(`/admin/content/sections/${id}`, {
    method: "PUT",
    body: { content },
  });
}

export async function setSectionVisibility(
  id: number,
  is_visible: boolean
): Promise<PageSection> {
  return apiFetch<PageSection>(`/admin/content/sections/${id}/visibility`, {
    method: "PATCH",
    body: { is_visible },
  });
}

export async function duplicateSection(id: number): Promise<PageSection> {
  return apiFetch<PageSection>(`/admin/content/sections/${id}/duplicate`, {
    method: "POST",
  });
}

export async function deleteSection(
  id: number
): Promise<{ success: boolean; message: string }> {
  return apiFetch<{ success: boolean; message: string }>(
    `/admin/content/sections/${id}`,
    { method: "DELETE" }
  );
}

export async function reorderSections(
  page: ContentPage,
  section_ids: number[]
): Promise<PageSection[]> {
  return apiFetch<PageSection[]>(`/admin/content/${page}/reorder`, {
    method: "PUT",
    body: { section_ids },
  });
}

// Multipart image upload — do NOT set Content-Type (browser sets the boundary).
export async function uploadMedia(file: File): Promise<MediaUpload> {
  const fd = new FormData();
  fd.append("file", file);
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}/admin/media`, {
    method: "POST",
    headers,
    body: fd,
  });
  if (!res.ok) {
    let detail = `Upload failed (${res.status})`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as MediaUpload;
}
