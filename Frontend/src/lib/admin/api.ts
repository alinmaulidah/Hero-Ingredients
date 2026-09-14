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
  customerId: number | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingName: string | null;
  shippingPhone: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingProvince: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
  courierName: string | null;
  shippingCost: number | null;
  voucherCode: string | null;
  discountAmount: number | null;
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

export interface PaymentSyncResult {
  orderId: string;
  transactionStatus: string;
  orderStatus: string;
}

/** Tarik status pembayaran terbaru order langsung dari Midtrans. */
export function syncPaymentStatus(orderId: string): Promise<PaymentSyncResult> {
  return apiFetch<PaymentSyncResult>('/api/payment/sync', {
    method: 'POST',
    body: { orderId }
  });
}

/* =========================================
   UPLOAD GAMBAR PRODUK
========================================= */

export interface UploadedImageDto {
  url: string;
}

/** Unggah satu file gambar produk (multipart/form-data). */
export async function uploadProductImage(file: File): Promise<UploadedImageDto> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const form = new FormData();
  form.append('image', file);

  // Content-Type tidak diisi manual agar browser menambahkan boundary multipart.
  const res = await fetch(`${API_BASE}/api/uploads/image`, {
    method: 'POST',
    headers,
    body: form
  });

  let json: ApiEnvelope<UploadedImageDto> | null = null;
  try {
    json = (await res.json()) as ApiEnvelope<UploadedImageDto>;
  } catch {
    json = null;
  }

  if (!res.ok || !json?.success || !json.data) {
    if (res.status === 401) {
      clearAuth();
      if (!window.location.pathname.startsWith('/admin/login')) {
        window.location.replace('/admin/login');
      }
    }
    throw new ApiError(json?.message || `Gagal mengunggah gambar (HTTP ${res.status})`, res.status);
  }

  return json.data;
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

/* =========================================
   VOUCHER / DISKON
========================================= */

export interface VoucherDto {
  id: number;
  code: string;
  description: string | null;
  type: 'percent' | 'nominal';
  value: number;
  minSubtotal: number | null;
  maxUses: number | null;
  usedCount: number;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherPayload {
  code: string;
  description?: string | null;
  type: 'percent' | 'nominal';
  value: number;
  minSubtotal?: number | null;
  maxUses?: number | null;
  validUntil?: string | null;
  isActive: boolean;
}

export function fetchVouchers(): Promise<VoucherDto[]> {
  return apiFetch<VoucherDto[]>('/api/vouchers');
}

export function createVoucher(payload: VoucherPayload): Promise<VoucherDto> {
  return apiFetch<VoucherDto>('/api/vouchers', { method: 'POST', body: payload });
}

export function updateVoucher(id: number, payload: VoucherPayload): Promise<VoucherDto> {
  return apiFetch<VoucherDto>(`/api/vouchers/${id}`, { method: 'PUT', body: payload });
}

export function deleteVoucher(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/vouchers/${id}`, { method: 'DELETE' });
}

/* =========================================
   KURIR / ONGKIR
========================================= */

export interface ShippingOptionDto {
  id: number;
  name: string;
  description: string | null;
  priceIdr: number;
  isActive: boolean;
  sortOrder: number;
}

export interface ShippingOptionPayload {
  name: string;
  description?: string | null;
  priceIdr: number;
  isActive: boolean;
  sortOrder?: number;
}

export function fetchAllShippingOptions(): Promise<ShippingOptionDto[]> {
  return apiFetch<ShippingOptionDto[]>('/api/shipping-options/all');
}

export function createShippingOption(payload: ShippingOptionPayload): Promise<ShippingOptionDto> {
  return apiFetch<ShippingOptionDto>('/api/shipping-options', { method: 'POST', body: payload });
}

export function updateShippingOption(id: number, payload: ShippingOptionPayload): Promise<ShippingOptionDto> {
  return apiFetch<ShippingOptionDto>(`/api/shipping-options/${id}`, { method: 'PUT', body: payload });
}

export function deleteShippingOption(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/shipping-options/${id}`, { method: 'DELETE' });
}

/* =========================================
   PESAN KONTAK (formulir halaman kontak)
========================================= */

export interface ContactMessageDto {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  market: 'Lokal' | 'Export';
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function fetchContactMessages(): Promise<ContactMessageDto[]> {
  return apiFetch<ContactMessageDto[]>('/api/contact');
}

export function updateContactMessage(id: number, isRead: boolean): Promise<ContactMessageDto> {
  return apiFetch<ContactMessageDto>(`/api/contact/${id}`, {
    method: 'PATCH',
    body: { isRead }
  });
}

export function deleteContactMessage(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/contact/${id}`, { method: 'DELETE' });
}
