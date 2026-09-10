/**
 * ============================================================
 * CLIENT API UNTUK STOREFRONT (PELANGGAN)
 * ============================================================
 * - Terpisah dari lib/admin/api.ts: token disimpan di key yang berbeda
 *   (hero_customer_token) agar tidak tertukar dengan sesi admin.
 * - Semua request di bawah /checkout & /login memakai token pelanggan.
 * - Respon 401 otomatis logout (hapus token) & arahkan ke /login.
 */

const API_BASE = (import.meta.env.PUBLIC_API_BASE || '').replace(/\/$/, '');

export const TOKEN_KEY = 'hero_customer_token';
export const USER_KEY = 'hero_customer_user';

export interface CustomerUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
}

export interface AuthResult {
  token: string;
  user: CustomerUser;
}

export interface CustomerAddress {
  id: number;
  customerId: number;
  label: string | null;
  recipientName: string;
  phone: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface ShippingOption {
  id: number;
  name: string;
  description: string | null;
  priceIdr: number;
  isActive: boolean;
  sortOrder: number;
}

export interface VoucherCheckResult {
  code: string;
  description: string | null;
  type: 'percent' | 'nominal';
  discount: number;
}

export interface ChargeResult {
  orderId: string;
  token: string;
  redirectUrl?: string | null;
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
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): CustomerUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as CustomerUser) : null;
  } catch {
    return null;
  }
}

export function saveAuth(token: string, user: CustomerUser): void {
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

export function logout(redirectTo = '/login'): void {
  clearAuth();
  window.location.replace(redirectTo);
}

/* =========================================
   FETCH WRAPPER (dengan token pelanggan)
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

/** Redirect ke halaman login sambil mengingat halaman asal (kecuali sudah di /login). */
function redirectToLogin(): void {
  const current = window.location.pathname + window.location.search;
  const path = `/login?next=${encodeURIComponent(current)}`;
  if (!window.location.pathname.startsWith('/login')) {
    window.location.replace(path);
  }
}

async function requestJson(path: string, options: ApiRequestOptions = {}): Promise<{ status: number; json: any }> {
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

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { status: res.status, json };
}

/** Ambil data dari envelope; 401 → logout + arahkan ke login. */
export async function apiFetchCustomer<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { status, json } = await requestJson(path, options);

  if (!json || json.success === false) {
    if (status === 401) {
      clearAuth();
      redirectToLogin();
    }
    throw new ApiError(json?.message || `Permintaan gagal (HTTP ${status})`, status);
  }

  return json.data as T;
}

/* =========================================
   AUTH
========================================= */

export function register(payload: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<AuthResult> {
  return apiFetchCustomer<AuthResult>('/api/customers/register', {
    method: 'POST',
    body: payload
  });
}

export function loginCustomer(email: string, password: string): Promise<AuthResult> {
  return apiFetchCustomer<AuthResult>('/api/customers/login', {
    method: 'POST',
    body: { email, password }
  });
}

/** Masuk/daftar otomatis dengan Google (id_token dari Google Identity Services). */
export function loginWithGoogle(idToken: string): Promise<AuthResult & { isNew?: boolean }> {
  return apiFetchCustomer<AuthResult & { isNew?: boolean }>('/api/customers/google', {
    method: 'POST',
    body: { idToken }
  });
}

export function fetchMe(): Promise<CustomerUser> {
  return apiFetchCustomer<CustomerUser>('/api/customers/me');
}

/* =========================================
   BUKU ALAMAT
========================================= */

export function fetchAddresses(): Promise<CustomerAddress[]> {
  return apiFetchCustomer<CustomerAddress[]>('/api/customers/addresses');
}

export type AddressPayload = {
  label?: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
};

export function createAddress(payload: AddressPayload): Promise<CustomerAddress> {
  return apiFetchCustomer<CustomerAddress>('/api/customers/addresses', {
    method: 'POST',
    body: payload
  });
}

export function updateAddress(id: number, payload: AddressPayload): Promise<CustomerAddress> {
  return apiFetchCustomer<CustomerAddress>(`/api/customers/addresses/${id}`, {
    method: 'PUT',
    body: payload
  });
}

export function deleteAddress(id: number): Promise<{ message: string }> {
  return apiFetchCustomer<{ message: string }>(`/api/customers/addresses/${id}`, {
    method: 'DELETE'
  });
}

/* =========================================
   KURIR & VOUCHER
========================================= */

export function fetchShippingOptions(): Promise<ShippingOption[]> {
  return apiFetchCustomer<ShippingOption[]>('/api/shipping-options');
}

export function validateVoucher(code: string, subtotal: number): Promise<VoucherCheckResult> {
  return apiFetchCustomer<VoucherCheckResult>('/api/vouchers/validate', {
    method: 'POST',
    body: { code, subtotal }
  });
}

/* =========================================
   PEMBAYARAN (snap token)
========================================= */

export interface ChargePayload {
  currency: 'IDR';
  addressId: number;
  shippingOptionId: number;
  voucherCode?: string | null;
  items: { id: string; name: string; price: number; quantity: number }[];
}

/** Buat transaksi Midtrans. Error server (mis. voucher kadaluarsa) jadi ApiError. */
export async function createCharge(payload: ChargePayload): Promise<ChargeResult> {
  const { status, json } = await requestJson('/api/charge', {
    method: 'POST',
    body: payload
  });

  if (status === 401) {
    clearAuth();
    redirectToLogin();
  }

  if (json?.success && json?.data?.token) {
    return json.data as ChargeResult;
  }

  throw new ApiError(json?.message || 'Gagal memproses pembayaran. Silakan coba lagi.', status);
}

export interface PaymentSyncResult {
  orderId: string;
  transactionStatus: string;
  orderStatus: string;
}

/**
 * Tarik status terbaru pesanan langsung dari Midtrans. Dipakai setelah
 * pembayaran berhasil sebagai jaring pengaman bila webhook tidak sampai.
 */
export function syncPaymentStatus(orderId: string): Promise<PaymentSyncResult> {
  return apiFetchCustomer<PaymentSyncResult>('/api/payment/sync', {
    method: 'POST',
    body: { orderId }
  });
}

/* =========================================
   KERANJANG (localStorage) — dipakai bersama
   halaman /products (penulis) & /checkout (pembaca)
========================================= */

export const CART_KEY = 'hero_cart';
export const CURRENCY_KEY = 'hero_cart_currency';

export interface CartItem {
  cartItemId: string;
  name: string;
  optionName: string;
  spec: string;
  category: string;
  grade: string;
  size: string;
  imageUrl: string;
  prices: Record<string, number>;
  qty: number;
}

export function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) => item && typeof item.cartItemId === 'string' && typeof item.qty === 'number'
    );
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]): void {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    // penyimpanan penuh / tidak tersedia — biarkan keranjang hanya di memori
  }
}

export function loadCartCurrency(): string {
  try {
    return localStorage.getItem(CURRENCY_KEY) || 'IDR';
  } catch {
    return 'IDR';
  }
}

export function saveCartCurrency(currency: string): void {
  try {
    localStorage.setItem(CURRENCY_KEY, currency);
  } catch {
    // abaikan
  }
}

export function clearCart(): void {
  try {
    localStorage.removeItem(CART_KEY);
    localStorage.removeItem(CURRENCY_KEY);
  } catch {
    // abaikan
  }
}
