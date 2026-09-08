/**
 * ============================================================
 * DATA KATALOG — sumber kebenaran tunggal untuk halaman produk
 * ============================================================
 * - Fallback statis: data/products.ts (dipakai saat SSR & bila API mati).
 * - Live: fetch dari Backend GET /api/products lalu di-normalisasi ke
 *   bentuk yang sama, sehingga render (SSR & client) memakai satu bentuk.
 * File ini murni (tanpa akses document/window) agar aman dipakai
 * di frontmatter Astro dan di browser.
 */

import type { ProductGroup } from '../data/products';

export const PLACEHOLDER_IMAGE = '/images/products/placeholder.svg';

export interface CatalogVariant {
  size: string;
  priceIDR: number;
  priceUSD: number | null;
  priceAED: number | null;
  priceEUR: number | null;
}

export interface CatalogOption {
  id: string;
  name: string;
  spec?: string | null;
  grade?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  variants: CatalogVariant[];
}

export interface CatalogGroup {
  id: string;
  name: string;
  options: CatalogOption[];
}

/** Urutan kategori default (mengikuti daftar filter lama di products.astro). */
const BASE_CATEGORIES = [
  'Raw Material',
  'Dry Slices',
  'Grind',
  'Powder',
  'Extract Liquid',
  'Extract Powder',
  'Aromatic Water',
  'Oil'
];

/** Union kategori: urutan dasar + kategori baru dari data (tanpa duplikat). */
export function catalogCategoriesFor(groups: CatalogGroup[]): string[] {
  const list = [...BASE_CATEGORIES];
  for (const group of groups) {
    for (const option of group.options) {
      const category = option.category;
      if (category && !list.includes(category)) {
        list.push(category);
      }
    }
  }
  return ['All', ...list];
}

/**
 * Normalisasi data (dari API atau fallback) ke bentuk yang dipakai render.
 * - id grup/opsi diubah ke string agar perbandingan dataset DOM konsisten.
 * - opsi tanpa varian & grup tanpa opsi tidak ditampilkan (belum bisa dijual).
 * - imageUrl kosong diganti placeholder.
 */
export function normalizeCatalog(groups: CatalogGroup[]): CatalogGroup[] {
  return groups
    .map((group) => ({
      ...group,
      id: String(group.id),
      options: (group.options || [])
        .filter((option) => option.variants && option.variants.length > 0)
        .map((option) => ({
          ...option,
          id: String(option.id),
          imageUrl: option.imageUrl || PLACEHOLDER_IMAGE
        }))
    }))
    .filter((group) => group.options.length > 0);
}

/** Ambil katalog live dari Backend. Lempar error bila gagal. */
export async function fetchCatalog(apiBase: string): Promise<CatalogGroup[]> {
  const res = await fetch(`${apiBase}/api/products`, {
    headers: { Accept: 'application/json' }
  });
  if (!res.ok) {
    throw new Error(`Gagal mengambil produk (HTTP ${res.status})`);
  }
  const json = await res.json();
  const raw: unknown = json && json.success ? json.data : json;
  const groups = Array.isArray(raw) ? raw : [];
  return normalizeCatalog(groups as CatalogGroup[]);
}

/** Konversi data statis products.ts ke bentuk katalog bersama. */
export function fromStaticData(staticGroups: ProductGroup[]): CatalogGroup[] {
  return normalizeCatalog(staticGroups as unknown as CatalogGroup[]);
}
