/**
 * ============================================================
 * DATA PERUSAHAAN TERPUSAT — SATU-SATUNYA SUMBER KEBENARAN
 * ============================================================
 * Ubah identitas perusahaan di file ini saja; Navbar, Footer,
 * halaman kontak, tombol WhatsApp, dan judul halaman otomatis
 * mengikuti.
 *
 * Catatan: beberapa nilai diberi komentar "verifikasi:" karena
 * sebelumnya tersebar & bertabrakan di banyak file (Navbar, Footer,
 * about, contact). Nilai yang dipilih adalah yang paling konsisten.
 */

export const company = {
  /** Nama brand yang tampil di logo & halaman */
  brand: {
    // verifikasi: sebelumnya "HERO INGREDIENTS" (Navbar) vs "Hero Ingredients" (Footer).
    // Dipilih "Hero Ingredients" karena konsisten: DB magna_ingredients, order id "MAGNA-*",
    // pesan API "MAGNA API", dan logo footer.
    siteName: 'Hero Ingredients',
    logoMain: 'HERO',
    logoSub: 'INGREDIENTS',
    ariaLabel: 'Hero Ingredients',

    /** Nama badan hukum */
    // verifikasi: dipakai di pesan default WhatsApp (WhatsAppButton) & konteks legal.
    legalName: 'PT Panca Nature Internasional',

    tagline: {
      id: 'Bahan Baku Alam Dengan Proses Terbaik',
      en: 'Natural Raw Materials with Best Processing',
    },
  },

  /** Info kontak */
  contact: {
    // Email resmi yang dipakai di footer, halaman kontak, dsb.
    email: 'info@heroingredient.com',
    // verifikasi: typo "magnaingridients.com" di Footer lama diperbaiki. Cek juga apakah domain
    // asli = indonesiaingredient.com (astro.config.mjs) atau magnaingredients.com.
    website: 'magnaingredients.com',
    phoneDisplay: '+62 21 8459 1234',
    whatsappDisplay: '+62 823 451 417',
    /** Format internasional tanpa "+" / spasi, untuk https://wa.me/ */
    whatsappNumber: '62823451417',
  },

  /** Alamat. Dua lokasi disimpan karena keduanya muncul di situs. */
  address: {
    // Alamat yang tampil di Footer
    office: {
      label: 'Kantor',
      street:
        'Jl. Jati Blok Pulo Seger, Plumbon, Kec. Indramayu, Kabupaten Indramayu, Jawa Barat 45215, Indonesia',
    },
    // Alamat yang tampil di halaman Kontak (kantor/pabrik produksi)
    factory: {
      label: 'Kantor & Pabrik',
      name: 'Aquila New Factory',
      street:
        'Jalan Raya Indramayu, Kabupaten Indramayu, Jawa Barat, Indonesia',
      mapsQuery: 'Aquila Indramayu',
    },
  },

  /** Jam operasional (halaman Kontak) */
  hours: [
    { days: 'Senin – Jumat', time: '08.00 – 17.00 WIB' },
    { days: 'Sabtu', time: '08.00 – 12.00 WIB' },
  ],

  /** Menu navigasi utama (Navbar & Footer) */
  nav: [
    { href: '/', labelId: 'Beranda', labelEn: 'Home' },
    { href: '/about', labelId: 'Tentang Kami', labelEn: 'About Us' },
    { href: '/products', labelId: 'Produk', labelEn: 'Products' },
    { href: '/contact', labelId: 'Kontak', labelEn: 'Contact' },
  ],

  /** Meta default (dipakai Layout bila halaman tidak mengirim title) */
  meta: {
    defaultTitle: 'Hero Ingredients - Natural Raw Materials',
  },
};

/** Helper: tautan WhatsApp dengan pesan ter-encode. */
export function whatsappLink(message?: string): string {
  const number = company.contact.whatsappNumber;
  const text = message
    ? encodeURIComponent(message)
    : encodeURIComponent(
        `Halo ${company.brand.legalName}, saya ingin bertanya mengenai produk bahan alam.`
      );
  return `https://wa.me/${number}?text=${text}`;
}
