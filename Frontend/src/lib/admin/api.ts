/**
 * ============================================================
 * CLIENT API UNTUK HALAMAN ADMIN
 * ============================================================
 * - Semua request dikirim dengan token JWT dari localStorage.
 * - Respon 401 otomatis logout (hapus token) & arahkan ke /admin/login.
 * - PUBLIC_API_BASE boleh kosong (same-origin saat satu server).
 */

const API_BASE = (import.meta.env.PUBLIC_API_BASE || '').replace(/\/$/, '');

export const TOKEN_KEY = 'hero_admin_token';
export const USER_KEY = 'hero_admin_user';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface LoginResult {
  token: string;
  user: AdminUser;
}

export interface ProductVariantDto {
  id: number;
  size: string;
  priceIDR: number;
  priceUSD: number | null;
  priceAED: number | null;
  priceEUR: number | null;
}

export interface ProductOptionDto {
  id: number;
  slug: string;
  name: string;
  spec: string | null;
  grade: string | null;
  category: string | null;
  imageUrl: string | null;
  variants: ProductVariantDto[];
}

export interface ProductGroupDto {
  id: number;
  slug: string;
  name: string;
  options: ProductOptionDto[];
}

export interface OrderItemDto {
  id: number;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderDto {
  id: number;
  orderId: string;
  grossAmount: number;
  currency: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  transactionStatus: string;
  orderStatus: string;
  paymentType: string | null;
  createdAt: string;
  items: OrderItemDto[];
}

export interface StatsDto {
  groups: number;
  options: number;
  variants: number;
  orders: number;
  transactionBreakdown: Record<string, number>;
  paidRevenue: number;
  recentOrders: OrderDto[];
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/* =========================================
   AUTH LOCAL
========================================= */

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AdminUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

export function saveAuth(token: string, user: AdminUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return Boolean(getToken());
}

/** Hapus sesi lalu arahkan ke halaman login. */
export function logout(): void {
  clearAuth();
  window.location.replace('/admin/login');
}

/* =========================================
   FETCH WRAPPER
========================================= */

interface ApiRequestOptions {
  method?: string;
  body?: unknown;
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  let json: ApiEnvelope<T> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<T>;
  } catch {
    json = null;
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearAuth();
      if (!window.location.pathname.startsWith('/admin/login')) {
        window.location.replace('/admin/login');
      }
    }
    throw new ApiError(json?.message || `Permintaan gagal (HTTP ${res.status})`, res.status);
  }

  return json?.data as T;
}

/* =========================================
   AUTH
========================================= */

export function login(email: string, password: string): Promise<LoginResult> {
  return apiFetch<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: { email, password }
  });
}

/* =========================================
   DASHBOARD
========================================= */

export function fetchStats(): Promise<StatsDto> {
  return apiFetch<StatsDto>('/api/stats');
}

/* =========================================
   ORDERS
========================================= */

export function fetchOrders(filters?: { status?: string; payment?: string }): Promise<OrderDto[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.payment) params.set('payment', filters.payment);
  const qs = params.toString();
  return apiFetch<OrderDto[]>(`/api/orders${qs ? `?${qs}` : ''}`);
}

export function updateOrderStatus(id: number, status: string): Promise<OrderDto> {
  return apiFetch<OrderDto>(`/api/orders/${id}/status`, {
    method: 'PATCH',
    body: { status }
  });
}

/* =========================================
   PRODUCTS (grup → opsi → varian)
========================================= */

export function fetchProducts(): Promise<ProductGroupDto[]> {
  return apiFetch<ProductGroupDto[]>('/api/products');
}

export interface GroupPayload {
  name: string;
  slug?: string;
  sortOrder?: number;
}

export function createGroup(payload: GroupPayload): Promise<ProductGroupDto> {
  return apiFetch<ProductGroupDto>('/api/products', { method: 'POST', body: payload });
}

export function updateGroup(id: number, payload: GroupPayload): Promise<ProductGroupDto> {
  return apiFetch<ProductGroupDto>(`/api/products/${id}`, { method: 'PUT', body: payload });
}

export function deleteGroup(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/products/${id}`, { method: 'DELETE' });
}

export interface OptionPayload {
  name: string;
  slug?: string;
  spec?: string | null;
  grade?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
}

export function createOption(groupId: number, payload: OptionPayload): Promise<ProductOptionDto> {
  return apiFetch<ProductOptionDto>(`/api/products/${groupId}/options`, {
    method: 'POST',
    body: payload
  });
}

export function updateOption(groupId: number, optionId: number, payload: OptionPayload): Promise<ProductOptionDto> {
  return apiFetch<ProductOptionDto>(`/api/products/${groupId}/options/${optionId}`, {
    method: 'PUT',
    body: payload
  });
}

export function deleteOption(groupId: number, optionId: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/products/${groupId}/options/${optionId}`, {
    method: 'DELETE'
  });
}

export interface VariantPayload {
  size: string;
  priceIDR: number;
  priceUSD?: number | null;
  priceAED?: number | null;
  priceEUR?: number | null;
}

export function createVariant(groupId: number, optionId: number, payload: VariantPayload): Promise<ProductVariantDto> {
  return apiFetch<ProductVariantDto>(
    `/api/products/${groupId}/options/${optionId}/variants`,
    { method: 'POST', body: payload }
  );
}

export function updateVariant(
  groupId: number,
  optionId: number,
  variantId: number,
  payload: VariantPayload
): Promise<ProductVariantDto> {
  return apiFetch<ProductVariantDto>(
    `/api/products/${groupId}/options/${optionId}/variants/${variantId}`,
    { method: 'PUT', body: payload }
  );
}

export function deleteVariant(groupId: number, optionId: number, variantId: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    `/api/products/${groupId}/options/${optionId}/variants/${variantId}`,
    { method: 'DELETE' }
  );
}
