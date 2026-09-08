/**
 * ============================================================
 * RENDER HTML KATALOG — dipakai SSR (frontmatter Astro) & client
 * ============================================================
 * Fungsi murni: hanya menyusun string HTML, tanpa akses
 * document/window. Semua nilai yang disisipkan di-escape.
 */

import { PLACEHOLDER_IMAGE, type CatalogGroup } from './catalogData';

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const CART_ICON_SVG = `
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <circle cx="9" cy="21" r="1"></circle>
                      <circle cx="20" cy="21" r="1"></circle>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>`;

function formatIDR(value: number): string {
  return `Rp ${(Number(value) || 0).toLocaleString('id-ID')}`;
}

/** Satu kartu produk (satu grup = bahan yang sama, beberapa jenis olahan). */
export function buildCardHtml(group: CatalogGroup): string {
  const options = group.options || [];
  const first = options[0];
  const groupId = escapeHtml(group.id);
  const groupName = escapeHtml(group.name);

  // Tidak seharusnya terjadi setelah normalizeCatalog, tapi amankan saja.
  if (!first || !first.variants || first.variants.length === 0) {
    return `
      <div class="product-card" id="card-${groupId}" data-category="">
        <div class="product-content">
          <h3 class="product-title">${groupName}</h3>
          <p style="color: var(--text-muted); font-size: 0.85rem;">Produk belum tersedia.</p>
        </div>
      </div>`;
  }

  // Urutan kategori unik yang dimiliki produk ini (untuk chips "Kategori").
  const categoryList: string[] = [];
  const seenCategory = new Set<string>();
  for (const opt of options) {
    const cat = String(opt.category || '').trim();
    if (cat && !seenCategory.has(cat)) {
      seenCategory.add(cat);
      categoryList.push(cat);
    }
  }
  const multiCategory = categoryList.length > 1;
  const activeCategory = first.category || categoryList[0] || '';
  const firstCategory = escapeHtml(first.category ?? '');
  const firstId = escapeHtml(first.id);
  const dataCategories = options.map((opt) => escapeHtml(opt.category ?? '')).join(',');

  const imagesHtml = options
    .map(
      (opt, index) => `
                  <img
                    src="${escapeHtml(opt.imageUrl || PLACEHOLDER_IMAGE)}"
                    alt="${escapeHtml(opt.name)}"
                    class="product-image option-image ${index === 0 ? 'active' : ''}"
                    data-option-image="${escapeHtml(opt.id)}"
                    loading="lazy"
                    onerror="this.onerror=null; this.src='${PLACEHOLDER_IMAGE}';"
                  />`
    )
    .join('\n');

  // Chips kategori (baru muncul bila produk punya > 1 kategori).
  const categoryChipsHtml = multiCategory
    ? `
                <div class="category-selection-area" data-category-area>
                  <span class="size-label">
                    Kategori:
                  </span>
                  <div class="size-pills">
                    ${categoryList
                      .map(
                        (cat) => `
                      <button
                        type="button"
                        class="category-pill ${cat === activeCategory ? 'active' : ''}"
                        data-category-pill="${escapeHtml(cat)}"
                        data-group-id="${groupId}"
                      >
                        ${escapeHtml(cat)}
                      </button>`
                      )
                      .join('\n')}
                  </div>
                </div>`
    : '';

  const optionPillsHtml = options
    .map(
      (opt, index) => `
                      <button
                        type="button"
                        class="option-pill ${index === 0 ? 'active' : ''}${
                          multiCategory && opt.category !== activeCategory ? ' opt-hidden' : ''
                        }"
                        data-option-id="${escapeHtml(opt.id)}"
                        data-group-id="${groupId}"
                        data-cat="${escapeHtml(opt.category ?? '')}"
                      >
                        ${escapeHtml(opt.name)}
                      </button>`
    )
    .join('\n');

  const sizePillsHtml = first.variants
    .map(
      (variant, index) => `
                      <button
                        type="button"
                        class="size-pill ${index === 0 ? 'active' : ''}"
                        data-group-id="${groupId}"
                        data-option-id="${firstId}"
                        data-index="${index}"
                      >
                        ${escapeHtml(variant.size)}
                      </button>`
    )
    .join('\n');

  return `
            <div
              class="product-card"
              id="card-${groupId}"
              data-category="${dataCategories}"
            >
              <!-- GAMBAR PRODUK -->
              <div class="product-image-wrapper">
${imagesHtml}
              </div>

              <!-- KONTEN PRODUK -->
              <div class="product-content">

                <div class="spec-tag" data-spec-tag>
                  ${firstCategory}
                </div>

                <h3 class="product-title">
                  ${groupName}
                </h3>

                ${categoryChipsHtml}

                <div class="type-selection-area">
                  <span class="size-label">
                    Jenis:
                  </span>
                  <div class="size-pills type-pills">
${optionPillsHtml}
                  </div>
                </div>

                <div class="size-selection-area" data-variant-area>
                  <span class="size-label">
                    Kemasan:
                  </span>
                  <div class="size-pills">
${sizePillsHtml}
                  </div>
                </div>

                <div class="price-cart-footer">
                  <div class="price-box">
                    <span class="price-subtext">
                      Harga:
                    </span>
                    <div class="price-value" id="price-${groupId}">
                      ${formatIDR(first.variants[0].priceIDR)}
                    </div>
                  </div>

                  <button
                    type="button"
                    class="btn-add-cart-icon"
                    data-group-id="${groupId}"
                    title="Tambah ke Keranjang"
                    aria-label="Tambah ${groupName} ke keranjang"
                  >
${CART_ICON_SVG}
                  </button>
                </div>

              </div>
            </div>`;
}

export function buildGridHtml(groups: CatalogGroup[]): string {
  return groups.map((group) => buildCardHtml(group)).join('\n');
}

/** Pill filter kategori. `categories` sudah termasuk 'All' di depan. */
export function buildCategoryPillsHtml(categories: string[], active = 'All'): string {
  return categories
    .map(
      (category) => `
              <button
                type="button"
                class="category-btn ${category === active ? 'active' : ''}"
                data-category="${escapeHtml(category)}"
              >
                ${escapeHtml(category)}
              </button>`
    )
    .join('\n');
}
