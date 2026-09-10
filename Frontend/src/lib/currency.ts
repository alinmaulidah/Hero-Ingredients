/**
 * ============================================================
 * KONVERSI MATA UANG KATALOG
 * ============================================================
 * Kurs tetap (IDR per 1 unit) yang sama dengan data seed katalog,
 * dipakai agar harga USD/AED/EUR konsisten dengan produk yang sudah
 * ada. Ubah angka di sini bila kurs berubah.
 */

export const EXCHANGE_RATES = {
  USD: 18000,
  AED: 5000,
  EUR: 21000
} as const;

export type ForeignCurrency = keyof typeof EXCHANGE_RATES;

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Hitung harga mata uang asing dari harga Rupiah. */
export function priceFromIDR(idr: number, currency: ForeignCurrency): number {
  return round2(idr / EXCHANGE_RATES[currency]);
}
