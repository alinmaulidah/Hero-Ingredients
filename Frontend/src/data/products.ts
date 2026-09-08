export interface Variant {
  size: string;
  priceIDR: number;
  priceUSD: number;
  priceAED: number;
  priceEUR: number;
}

/** Satu jenis olahan dari bahan yang sama (mis. Dry Slice Fine, Dry Grind Eco). */
export interface ProductOption {
  id: string;
  name: string;
  /** Spesifikasi proses (Dry Slice, Mesh 20-60, ...) */
  spec: string;
  /** Kelas mutu (Fine, Eco) */
  grade: string;
  /** Kategori katalog (Dry Slices, Grind, ...) */
  category: string;
  imageUrl: string;
  variants: Variant[];
}

/** Satu produk inti (bahan yang sama) yang punya beberapa jenis olahan. */
export interface ProductGroup {
  id: string;
  name: string;
  options: ProductOption[];
}

export const productGroups: ProductGroup[] = [
  {
    id: 'turmeric-kunyit',
    name: 'Turmeric (Kunyit)',

    options: [
      {
        id: 'dry-slice-fine',
        name: 'Dry Slice Fine',
        spec: 'Dry Slice',
        grade: 'Fine',
        category: 'Dry Slices',
        imageUrl: '/images/products/turmeric-dry-slice-fine.svg',

        variants: [
          { size: '50 g', priceIDR: 29750, priceUSD: 1.65, priceAED: 5.95, priceEUR: 1.42 },
          { size: '100 g', priceIDR: 50000, priceUSD: 2.78, priceAED: 10.00, priceEUR: 2.38 },
          { size: '1 Kg', priceIDR: 155000, priceUSD: 8.61, priceAED: 31.00, priceEUR: 7.38 },
          { size: '5 Kg', priceIDR: 567500, priceUSD: 31.53, priceAED: 113.50, priceEUR: 27.02 },
          { size: '20 Kg', priceIDR: 1692500, priceUSD: 94.03, priceAED: 338.50, priceEUR: 80.60 }
        ]
      },

      {
        id: 'dry-slice-eco',
        name: 'Dry Slice Eco',
        spec: 'Dry Slice',
        grade: 'Eco',
        category: 'Dry Slices',
        imageUrl: '/images/products/turmeric-dry-slice-eco.svg',

        variants: [
          { size: '50 g', priceIDR: 17375, priceUSD: 0.97, priceAED: 3.48, priceEUR: 0.83 },
          { size: '100 g', priceIDR: 27500, priceUSD: 1.53, priceAED: 5.50, priceEUR: 1.31 },
          { size: '1 Kg', priceIDR: 80000, priceUSD: 4.44, priceAED: 16.00, priceEUR: 3.81 },
          { size: '5 Kg', priceIDR: 286250, priceUSD: 15.90, priceAED: 57.25, priceEUR: 13.63 },
          { size: '20 Kg', priceIDR: 848750, priceUSD: 47.15, priceAED: 169.75, priceEUR: 40.42 }
        ]
      },

      {
        id: 'dry-grind-fine-2060',
        name: 'Dry Grind Fine (Mesh 20-60)',
        spec: 'Mesh 20-60',
        grade: 'Fine',
        category: 'Grind',
        imageUrl: '/images/products/turmeric-grind-fine-2060.svg',

        variants: [
          { size: '50 g', priceIDR: 38000, priceUSD: 2.11, priceAED: 7.60, priceEUR: 1.81 },
          { size: '100 g', priceIDR: 65000, priceUSD: 3.61, priceAED: 13.00, priceEUR: 3.10 },
          { size: '1 Kg', priceIDR: 205000, priceUSD: 11.39, priceAED: 41.00, priceEUR: 9.76 },
          { size: '5 Kg', priceIDR: 755000, priceUSD: 41.94, priceAED: 151.00, priceEUR: 35.95 },
          { size: '20 Kg', priceIDR: 2255000, priceUSD: 125.28, priceAED: 451.00, priceEUR: 107.38 }
        ]
      },

      {
        id: 'dry-grind-eco-60',
        name: 'Dry Grind Eco (Mesh <60)',
        spec: 'Mesh <60',
        grade: 'Eco',
        category: 'Grind',
        imageUrl: '/images/products/turmeric-grind-eco-60.svg',

        variants: [
          { size: '50 g', priceIDR: 19025, priceUSD: 1.06, priceAED: 3.81, priceEUR: 0.91 },
          { size: '100 g', priceIDR: 30500, priceUSD: 1.69, priceAED: 6.10, priceEUR: 1.45 },
          { size: '1 Kg', priceIDR: 90000, priceUSD: 5.00, priceAED: 18.00, priceEUR: 4.29 },
          { size: '5 Kg', priceIDR: 323750, priceUSD: 17.99, priceAED: 64.75, priceEUR: 15.42 },
          { size: '20 Kg', priceIDR: 961250, priceUSD: 53.40, priceAED: 192.25, priceEUR: 45.77 }
        ]
      },

      {
        id: 'dry-grind-fine-80',
        name: 'Dry Grind Fine (Mesh 80)',
        spec: 'Mesh 80',
        grade: 'Fine',
        category: 'Grind',
        imageUrl: '/images/products/turmeric-grind-fine-80.svg',

        variants: [
          { size: '50 g', priceIDR: 46250, priceUSD: 2.57, priceAED: 9.25, priceEUR: 2.20 },
          { size: '100 g', priceIDR: 80000, priceUSD: 4.44, priceAED: 16.00, priceEUR: 3.81 },
          { size: '1 Kg', priceIDR: 255000, priceUSD: 14.17, priceAED: 51.00, priceEUR: 12.14 },
          { size: '5 Kg', priceIDR: 942500, priceUSD: 52.36, priceAED: 188.50, priceEUR: 44.88 },
          { size: '20 Kg', priceIDR: 2817500, priceUSD: 156.53, priceAED: 563.50, priceEUR: 134.17 }
        ]
      }
    ]
  }
];
