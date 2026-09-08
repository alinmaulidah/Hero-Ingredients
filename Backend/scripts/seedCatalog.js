// Mengisi database dengan katalog awal (salinan data dari
// Frontend/src/data/products.ts) bila belum ada.
// Jalankan: npm run seed:catalog
require('dotenv').config();

const db = require('../config/database');

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const CATALOG = [
  {
    slug: 'turmeric-kunyit',
    name: 'Turmeric (Kunyit)',
    options: [
      {
        name: 'Dry Slice Fine',
        spec: 'Dry Slice',
        grade: 'Fine',
        category: 'Dry Slices',
        imageUrl: '/images/products/turmeric-dry-slice-fine.svg',
        variants: [
          { size: '50 g', priceIDR: 29750, priceUSD: 1.65, priceAED: 5.95, priceEUR: 1.42 },
          { size: '100 g', priceIDR: 50000, priceUSD: 2.78, priceAED: 10.0, priceEUR: 2.38 },
          { size: '1 Kg', priceIDR: 155000, priceUSD: 8.61, priceAED: 31.0, priceEUR: 7.38 },
          { size: '5 Kg', priceIDR: 567500, priceUSD: 31.53, priceAED: 113.5, priceEUR: 27.02 },
          { size: '20 Kg', priceIDR: 1692500, priceUSD: 94.03, priceAED: 338.5, priceEUR: 80.6 }
        ]
      },
      {
        name: 'Dry Slice Eco',
        spec: 'Dry Slice',
        grade: 'Eco',
        category: 'Dry Slices',
        imageUrl: '/images/products/turmeric-dry-slice-eco.svg',
        variants: [
          { size: '50 g', priceIDR: 17375, priceUSD: 0.97, priceAED: 3.48, priceEUR: 0.83 },
          { size: '100 g', priceIDR: 27500, priceUSD: 1.53, priceAED: 5.5, priceEUR: 1.31 },
          { size: '1 Kg', priceIDR: 80000, priceUSD: 4.44, priceAED: 16.0, priceEUR: 3.81 },
          { size: '5 Kg', priceIDR: 286250, priceUSD: 15.9, priceAED: 57.25, priceEUR: 13.63 },
          { size: '20 Kg', priceIDR: 848750, priceUSD: 47.15, priceAED: 169.75, priceEUR: 40.42 }
        ]
      },
      {
        name: 'Dry Grind Fine (Mesh 20-60)',
        spec: 'Mesh 20-60',
        grade: 'Fine',
        category: 'Grind',
        imageUrl: '/images/products/turmeric-grind-fine-2060.svg',
        variants: [
          { size: '50 g', priceIDR: 38000, priceUSD: 2.11, priceAED: 7.6, priceEUR: 1.81 },
          { size: '100 g', priceIDR: 65000, priceUSD: 3.61, priceAED: 13.0, priceEUR: 3.1 },
          { size: '1 Kg', priceIDR: 205000, priceUSD: 11.39, priceAED: 41.0, priceEUR: 9.76 },
          { size: '5 Kg', priceIDR: 755000, priceUSD: 41.94, priceAED: 151.0, priceEUR: 35.95 },
          { size: '20 Kg', priceIDR: 2255000, priceUSD: 125.28, priceAED: 451.0, priceEUR: 107.38 }
        ]
      },
      {
        name: 'Dry Grind Eco (Mesh <60)',
        spec: 'Mesh <60',
        grade: 'Eco',
        category: 'Grind',
        imageUrl: '/images/products/turmeric-grind-eco-60.svg',
        variants: [
          { size: '50 g', priceIDR: 19025, priceUSD: 1.06, priceAED: 3.81, priceEUR: 0.91 },
          { size: '100 g', priceIDR: 30500, priceUSD: 1.69, priceAED: 6.1, priceEUR: 1.45 },
          { size: '1 Kg', priceIDR: 90000, priceUSD: 5.0, priceAED: 18.0, priceEUR: 4.29 },
          { size: '5 Kg', priceIDR: 323750, priceUSD: 17.99, priceAED: 64.75, priceEUR: 15.42 },
          { size: '20 Kg', priceIDR: 961250, priceUSD: 53.4, priceAED: 192.25, priceEUR: 45.77 }
        ]
      },
      {
        name: 'Dry Grind Fine (Mesh 80)',
        spec: 'Mesh 80',
        grade: 'Fine',
        category: 'Grind',
        imageUrl: '/images/products/turmeric-grind-fine-80.svg',
        variants: [
          { size: '50 g', priceIDR: 46250, priceUSD: 2.57, priceAED: 9.25, priceEUR: 2.2 },
          { size: '100 g', priceIDR: 80000, priceUSD: 4.44, priceAED: 16.0, priceEUR: 3.81 },
          { size: '1 Kg', priceIDR: 255000, priceUSD: 14.17, priceAED: 51.0, priceEUR: 12.14 },
          { size: '5 Kg', priceIDR: 942500, priceUSD: 52.36, priceAED: 188.5, priceEUR: 44.88 },
          { size: '20 Kg', priceIDR: 2817500, priceUSD: 156.53, priceAED: 563.5, priceEUR: 134.17 }
        ]
      }
    ]
  },
  {
    slug: 'centella-pegagan',
    name: 'Centella (Pegagan)',
    options: [
      {
        name: 'Centella Extract Liquid Natural',
        spec: 'Liquid Extract',
        grade: 'Natural',
        category: 'Extract Liquid',
        imageUrl: '/images/products/centella-extract-liquid-natural.svg',
        variants: [
          { size: '50 ml', priceIDR: 55000, priceUSD: 3.06, priceAED: 11, priceEUR: 2.62 },
          { size: '100 ml', priceIDR: 95000, priceUSD: 5.28, priceAED: 19, priceEUR: 4.52 },
          { size: '250 ml', priceIDR: 205000, priceUSD: 11.39, priceAED: 41, priceEUR: 9.76 },
          { size: '500 ml', priceIDR: 365000, priceUSD: 20.28, priceAED: 73, priceEUR: 17.38 },
          { size: '1 L', priceIDR: 645000, priceUSD: 35.83, priceAED: 129, priceEUR: 30.71 }
        ]
      },
      {
        name: 'Centella Extract Liquid Eco',
        spec: 'Liquid Extract',
        grade: 'Eco',
        category: 'Extract Liquid',
        imageUrl: '/images/products/centella-extract-liquid-eco.svg',
        variants: [
          { size: '50 ml', priceIDR: 32500, priceUSD: 1.81, priceAED: 6.5, priceEUR: 1.55 },
          { size: '100 ml', priceIDR: 55000, priceUSD: 3.06, priceAED: 11, priceEUR: 2.62 },
          { size: '250 ml', priceIDR: 117500, priceUSD: 6.53, priceAED: 23.5, priceEUR: 5.6 },
          { size: '500 ml', priceIDR: 207500, priceUSD: 11.53, priceAED: 41.5, priceEUR: 9.88 },
          { size: '1 L', priceIDR: 365000, priceUSD: 20.28, priceAED: 73, priceEUR: 17.38 }
        ]
      },
      {
        name: 'Centella Powder Fine',
        spec: 'Powder 100 Mesh',
        grade: 'Fine',
        category: 'Powder',
        imageUrl: '/images/products/centella-powder-fine.svg',
        variants: [
          { size: '50 g', priceIDR: 42000, priceUSD: 2.33, priceAED: 8.4, priceEUR: 2 },
          { size: '100 g', priceIDR: 75000, priceUSD: 4.17, priceAED: 15, priceEUR: 3.57 },
          { size: '250 g', priceIDR: 162500, priceUSD: 9.03, priceAED: 32.5, priceEUR: 7.74 },
          { size: '500 g', priceIDR: 287500, priceUSD: 15.97, priceAED: 57.5, priceEUR: 13.69 },
          { size: '1 Kg', priceIDR: 495000, priceUSD: 27.5, priceAED: 99, priceEUR: 23.57 }
        ]
      },
      {
        name: 'Centella Powder Eco',
        spec: 'Powder 100 Mesh',
        grade: 'Eco',
        category: 'Powder',
        imageUrl: '/images/products/centella-powder-eco.svg',
        variants: [
          { size: '50 g', priceIDR: 24500, priceUSD: 1.36, priceAED: 4.9, priceEUR: 1.17 },
          { size: '100 g', priceIDR: 42500, priceUSD: 2.36, priceAED: 8.5, priceEUR: 2.02 },
          { size: '250 g', priceIDR: 92500, priceUSD: 5.14, priceAED: 18.5, priceEUR: 4.4 },
          { size: '500 g', priceIDR: 162500, priceUSD: 9.03, priceAED: 32.5, priceEUR: 7.74 },
          { size: '1 Kg', priceIDR: 280000, priceUSD: 15.56, priceAED: 56, priceEUR: 13.33 }
        ]
      },
      {
        name: 'Centella Dry Slices',
        spec: 'Dry Slices',
        grade: 'Natural',
        category: 'Dry Slices',
        imageUrl: '/images/products/centella-dry-slices.svg',
        variants: [
          { size: '50 g', priceIDR: 30000, priceUSD: 1.67, priceAED: 6, priceEUR: 1.43 },
          { size: '100 g', priceIDR: 52000, priceUSD: 2.89, priceAED: 10.4, priceEUR: 2.48 },
          { size: '250 g', priceIDR: 112500, priceUSD: 6.25, priceAED: 22.5, priceEUR: 5.36 },
          { size: '500 g', priceIDR: 200000, priceUSD: 11.11, priceAED: 40, priceEUR: 9.52 },
          { size: '1 Kg', priceIDR: 345000, priceUSD: 19.17, priceAED: 69, priceEUR: 16.43 }
        ]
      }
    ]
  }
];

async function seedGroup(group) {
  const [existingGroups] = await db.query(
    'SELECT id FROM product_groups WHERE slug = ?',
    [group.slug]
  );

  let groupId;
  if (existingGroups.length > 0) {
    groupId = existingGroups[0].id;
    console.log(`Produk "${group.name}" sudah ada — dilewati.`);
    return;
  }

  const [groupResult] = await db.query(
    'INSERT INTO product_groups (slug, name, sort_order) VALUES (?, ?, ?)',
    [group.slug, group.name, 0]
  );
  groupId = groupResult.insertId;
  console.log(`Produk "${group.name}" dibuat.`);

  for (let optionIndex = 0; optionIndex < group.options.length; optionIndex += 1) {
    const option = group.options[optionIndex];
    const optionSlug = `${group.slug}-${slugify(option.name)}`;

    const [optionResult] = await db.query(
      `INSERT INTO product_options
         (group_id, slug, name, spec, grade, category, image_url, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        groupId,
        optionSlug,
        option.name,
        option.spec,
        option.grade,
        option.category,
        option.imageUrl,
        optionIndex
      ]
    );

    for (const variant of option.variants) {
      await db.query(
        `INSERT INTO product_variants (option_id, size, price_idr, price_usd, price_aed, price_eur)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          optionResult.insertId,
          variant.size,
          variant.priceIDR,
          variant.priceUSD,
          variant.priceAED,
          variant.priceEUR
        ]
      );
    }
    console.log(`  → ${option.name}: ${option.variants.length} varian ditambahkan.`);
  }
}

async function main() {
  for (const group of CATALOG) {
    await seedGroup(group);
  }
  console.log('Seed katalog selesai.');
}

main()
  .catch((error) => {
    console.error('Gagal seed katalog:', error.message);
    process.exit(1);
  })
  .finally(() => db.end());
