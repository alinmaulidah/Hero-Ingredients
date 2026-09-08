// ============================================================
// Seed katalog dari daftar produk (sheet) untuk kategori "Ekstrak".
// Data: Pegagan, Kunyit, Aloe Vera, Licorice.
// Aturan pemetaan ke model 1 kartu per bahan:
//   group  = bahan (Common Name / INCI)
//   option = Form (Liquid/Powder) + Subkategori (Organik/Natural/Eco)
//            → nama tampil: "Ekstrak Cair …" / "Ekstrak Serbuk …"
//   variant= ukuran kemasan dari kolom SizePack
// Harga: contoh (bisa diubah via panel admin).
// Jalankan: npm run seed:sheet
// ============================================================
require('dotenv').config();

const db = require('../config/database');

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const round2 = (value) => Math.round(value * 100) / 100;
const formatMoney = (idr) => ({
  priceUSD: round2(idr / 18000),
  priceAED: round2(idr / 5000),
  priceEUR: round2(idr / 21000)
});

// Harga contoh (IDR per ukuran) — urutan: kecil → besar, 6 ukuran.
// Liquid: 50ml, 100ml, 500ml, 1L, 5L, 20L
// Powder: 50g, 100g, 500g, 1Kg, 5Kg, 20Kg
const PRICES_IDR = {
  'Liquid-Organik': [65000, 115000, 420000, 720000, 3100000, 10800000],
  'Liquid-Natural': [50000, 88000, 320000, 550000, 2400000, 8400000],
  'Liquid-Eco': [32500, 57000, 205000, 350000, 1520000, 5300000],
  'Powder-Organik': [52000, 92000, 330000, 560000, 2450000, 8600000],
  'Powder-Natural': [40000, 71000, 255000, 435000, 1900000, 6650000],
  'Powder-Eco': [26000, 46000, 165000, 280000, 1225000, 4300000]
};

// Daftar produk dari sheet (bagian yang sudah diterima).
// mode: 'merge'  → tambah opsi ke grup yang sudah ada (jika grup ada)
//       'replace' → hapus semua opsi lama grup lalu isi ulang (untuk data contoh lama)
const MATERIALS = [
  {
    slug: 'centella-pegagan',
    name: 'Pegagan (Centella asiatica)',
    mode: 'replace',
    options: [
      { form: 'Liquid', sub: 'Organik', sizes: ['50ml', '100ml', '500ml', '1L', '5L', '20L'] },
      { form: 'Liquid', sub: 'Natural', sizes: ['50ml', '100ml', '500ml', '1L', '5L', '20L'] },
      { form: 'Liquid', sub: 'Eco', sizes: ['50ml', '100ml', '500ml', '1L', '5L', '20L'] },
      { form: 'Powder', sub: 'Natural', sizes: ['50g', '100g', '500g', '1Kg', '5Kg', '20Kg'] },
      { form: 'Powder', sub: 'Eco', sizes: ['50g', '100g', '500g', '1Kg', '5Kg', '20Kg'] }
    ]
  },
  {
    slug: 'turmeric-kunyit',
    name: 'Turmeric (Kunyit)',
    mode: 'merge',
    options: [
      { form: 'Liquid', sub: 'Organik', sizes: ['50ml', '100ml', '500ml', '1L', '5L', '20L'] },
      { form: 'Liquid', sub: 'Natural', sizes: ['50ml', '100ml', '500ml', '1L', '5L', '20L'] },
      { form: 'Liquid', sub: 'Eco', sizes: ['50ml', '100ml', '500ml', '1L', '5L', '20L'] },
      { form: 'Powder', sub: 'Natural', sizes: ['50g', '100g', '500g', '1Kg', '5Kg', '20Kg'] },
      { form: 'Powder', sub: 'Eco', sizes: ['50g', '100g', '500g', '1Kg', '5Kg', '20Kg'] }
    ]
  },
  {
    slug: 'aloevera',
    name: 'Aloe Vera (Aloe barbadensis)',
    mode: 'new',
    options: [
      { form: 'Liquid', sub: 'Organik', sizes: ['50ml', '100ml', '500ml', '1L', '5L', '20L'] },
      { form: 'Liquid', sub: 'Natural', sizes: ['50ml', '100ml', '500ml', '1L', '5L', '20L'] },
      { form: 'Liquid', sub: 'Eco', sizes: ['50ml', '100ml', '500ml', '1L', '5L', '20L'] },
      { form: 'Powder', sub: 'Natural', sizes: ['50g', '100g', '500g', '1Kg', '5Kg', '20Kg'] },
      // sesuai isian sheet (baris powder eco menggunakan campuran ml/kg) — dipertahankan apa adanya
      { form: 'Powder', sub: 'Eco', sizes: ['50ml', '100ml', '500ml', '1Kg', '5Kg', '20Kg'] }
    ]
  },
  {
    slug: 'licorice',
    name: 'Licorice (Glycyrrhiza glabra)',
    mode: 'new',
    options: [
      { form: 'Liquid', sub: 'Organik', sizes: ['50ml', '100ml', '500ml', '1L', '5L'] }
    ]
  }
];

const FORM_LABEL = { Liquid: 'Ekstrak Cair', Powder: 'Ekstrak Serbuk' };

async function upsertGroup(slug, name, mode) {
  const [existing] = await db.query('SELECT id FROM product_groups WHERE slug = ?', [slug]);

  if (existing.length > 0) {
    if (mode !== 'merge') {
      await db.query('UPDATE product_groups SET name = ? WHERE id = ?', [name, existing[0].id]);
    }
    return { id: existing[0].id, created: false };
  }

  const [result] = await db.query(
    'INSERT INTO product_groups (slug, name, sort_order) VALUES (?, ?, ?)',
    [slug, name, 0]
  );
  return { id: result.insertId, created: true };
}

async function seedOption(groupId, materialSlug, option, index) {
  const optionSlug = `${materialSlug}-${slugify(option.form)}-${slugify(option.sub)}`;

  const [existing] = await db.query(
    'SELECT id FROM product_options WHERE group_id = ? AND slug = ?',
    [groupId, optionSlug]
  );
  if (existing.length > 0) {
    console.log(`  → ${optionSlug}: sudah ada, dilewati.`);
    return;
  }

  const name = `${FORM_LABEL[option.form]} ${option.sub}`;
  const spec = option.form === 'Liquid' ? 'Liquid Extract' : 'Powder Extract';
  const priceKey = `${option.form}-${option.sub}`;
  const priceList = PRICES_IDR[priceKey] || [];

  const [optionResult] = await db.query(
    `INSERT INTO product_options
       (group_id, slug, name, spec, grade, category, image_url, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
    [groupId, optionSlug, name, spec, option.sub, 'Ekstrak', index]
  );

  for (let v = 0; v < option.sizes.length; v += 1) {
    const idr = priceList[v] || 0;
    const extra = formatMoney(idr);
    await db.query(
      `INSERT INTO product_variants (option_id, size, price_idr, price_usd, price_aed, price_eur)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [optionResult.insertId, option.sizes[v], idr, extra.priceUSD, extra.priceAED, extra.priceEUR]
    );
  }

  console.log(`  → ${name}: ${option.sizes.length} kemasan ditambahkan.`);
}

async function main() {
  for (const material of MATERIALS) {
    const group = await upsertGroup(material.slug, material.name, material.mode);
    console.log(
      `${group.created ? 'Produk baru' : 'Produk ditemukan'}: ${material.name} (${material.slug})`
    );

    if (material.mode === 'replace') {
      await db.query('DELETE FROM product_options WHERE group_id = ?', [group.id]);
      console.log('  (opsi contoh lama dihapus — diisi ulang dari daftar resmi)');
    }

    for (let i = 0; i < material.options.length; i += 1) {
      await seedOption(group.id, material.slug, material.options[i], i);
    }
  }
  console.log('Seed katalog (sheet Ekstrak) selesai.');
}

main()
  .catch((error) => {
    console.error('Gagal seed:', error.message);
    process.exit(1);
  })
  .finally(() => db.end());
