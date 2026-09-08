const db = require('../config/database');

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

const mapOptionRow = (row) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  spec: row.spec,
  grade: row.grade,
  category: row.category,
  imageUrl: row.image_url,
  variants: []
});

const mapVariantRow = (row) => ({
  id: row.id,
  size: row.size,
  priceIDR: row.price_idr,
  priceUSD: toNumberOrNull(row.price_usd),
  priceAED: toNumberOrNull(row.price_aed),
  priceEUR: toNumberOrNull(row.price_eur)
});

const handleError = (res, error, label, fallbackMessage) => {
  console.error(`${label}:`, error);

  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Data sudah ada (slug atau ukuran duplikat)'
    });
  }
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(404).json({
      success: false,
      message: 'Data induk tidak ditemukan'
    });
  }

  return res.status(500).json({
    success: false,
    message: fallbackMessage
  });
};

/* ================= Group (produk inti) ================= */

const getProducts = async (req, res) => {
  try {
    const [groups] = await db.query(
      'SELECT id, slug, name FROM product_groups ORDER BY sort_order ASC, id ASC'
    );
    const [options] = await db.query(
      `SELECT id, group_id, slug, name, spec, grade, category, image_url
         FROM product_options
        ORDER BY sort_order ASC, id ASC`
    );
    const [variants] = await db.query(
      `SELECT id, option_id, size, price_idr, price_usd, price_aed, price_eur
         FROM product_variants
        ORDER BY id ASC`
    );

    const optionsByGroup = new Map();
    for (const option of options) {
      const list = optionsByGroup.get(option.group_id) || [];
      list.push(mapOptionRow(option));
      optionsByGroup.set(option.group_id, list);
    }

    const variantsByOption = new Map();
    for (const variant of variants) {
      const list = variantsByOption.get(variant.option_id) || [];
      list.push(mapVariantRow(variant));
      variantsByOption.set(variant.option_id, list);
    }

    const data = groups.map((group) => ({
      id: group.id,
      slug: group.slug,
      name: group.name,
      options: (optionsByGroup.get(group.id) || []).map((option) => ({
        ...option,
        variants: variantsByOption.get(option.id) || []
      }))
    }));

    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Get products error', 'Gagal mengambil data produk');
  }
};

const getProductById = async (req, res) => {
  try {
    const groupId = parseId(req.params.id);
    if (!groupId) {
      return res.status(400).json({ success: false, message: 'ID produk tidak valid' });
    }

    const [groups] = await db.query(
      'SELECT id, slug, name FROM product_groups WHERE id = ?',
      [groupId]
    );
    if (groups.length === 0) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    }

    const [options] = await db.query(
      `SELECT id, group_id, slug, name, spec, grade, category, image_url
         FROM product_options
        WHERE group_id = ?
        ORDER BY sort_order ASC, id ASC`,
      [groupId]
    );
    const [variants] = await db.query(
      `SELECT id, option_id, size, price_idr, price_usd, price_aed, price_eur
         FROM product_variants
        WHERE option_id IN (SELECT id FROM product_options WHERE group_id = ?)
        ORDER BY id ASC`,
      [groupId]
    );

    const variantsByOption = new Map();
    for (const variant of variants) {
      const list = variantsByOption.get(variant.option_id) || [];
      list.push(mapVariantRow(variant));
      variantsByOption.set(variant.option_id, list);
    }

    const group = groups[0];
    const data = {
      id: group.id,
      slug: group.slug,
      name: group.name,
      options: options.map((option) => ({
        ...mapOptionRow(option),
        variants: variantsByOption.get(option.id) || []
      }))
    };

    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error, 'Get product error', 'Gagal mengambil produk');
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, slug, sortOrder } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Nama produk wajib diisi' });
    }

    const productSlug = slugify(slug || name);
    const [result] = await db.query(
      'INSERT INTO product_groups (slug, name, sort_order) VALUES (?, ?, ?)',
      [productSlug, String(name), Number(sortOrder) || 0]
    );

    res.status(201).json({
      success: true,
      data: { id: result.insertId, slug: productSlug, name: String(name) }
    });
  } catch (error) {
    handleError(res, error, 'Create product error', 'Gagal membuat produk');
  }
};

const updateProduct = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID produk tidak valid' });
    }

    const { name, slug, sortOrder } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(String(name));
    }
    if (slug !== undefined) {
      updates.push('slug = ?');
      params.push(slugify(slug));
    }
    if (sortOrder !== undefined) {
      updates.push('sort_order = ?');
      params.push(Number(sortOrder) || 0);
    }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diperbarui' });
    }

    await db.query(`UPDATE product_groups SET ${updates.join(', ')} WHERE id = ?`, [...params, id]);

    const [rows] = await db.query(
      'SELECT id, slug, name, sort_order FROM product_groups WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    handleError(res, error, 'Update product error', 'Gagal memperbarui produk');
  }
};

const deleteProduct = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID produk tidak valid' });
    }

    const [result] = await db.query('DELETE FROM product_groups WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });
    }

    res.json({ success: true, message: 'Produk berhasil dihapus' });
  } catch (error) {
    handleError(res, error, 'Delete product error', 'Gagal menghapus produk');
  }
};

/* ================= Option (olahan dalam grup) ================= */

const requireGroup = async (groupId) => {
  const [rows] = await db.query('SELECT id FROM product_groups WHERE id = ?', [groupId]);
  return rows.length > 0;
};

const createOption = async (req, res) => {
  try {
    const groupId = parseId(req.params.groupId);
    if (!groupId) {
      return res.status(400).json({ success: false, message: 'ID grup tidak valid' });
    }

    const { name, slug, spec, grade, category, imageUrl, sortOrder } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Nama opsi wajib diisi' });
    }
    if (!(await requireGroup(groupId))) {
      return res.status(404).json({ success: false, message: 'Grup produk tidak ditemukan' });
    }

    const optionSlug = slugify(slug || name);
    const [result] = await db.query(
      `INSERT INTO product_options
         (group_id, slug, name, spec, grade, category, image_url, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        groupId,
        optionSlug,
        String(name),
        spec || null,
        grade || null,
        category || null,
        imageUrl || null,
        Number(sortOrder) || 0
      ]
    );

    res.status(201).json({
      success: true,
      data: { id: result.insertId, groupId, slug: optionSlug, name: String(name) }
    });
  } catch (error) {
    handleError(res, error, 'Create option error', 'Gagal membuat opsi produk');
  }
};

const updateOption = async (req, res) => {
  try {
    const groupId = parseId(req.params.groupId);
    const optionId = parseId(req.params.optionId);
    if (!groupId || !optionId) {
      return res.status(400).json({ success: false, message: 'ID tidak valid' });
    }

    const { name, slug, spec, grade, category, imageUrl, sortOrder } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(String(name));
    }
    if (slug !== undefined) {
      updates.push('slug = ?');
      params.push(slugify(slug));
    }
    if (spec !== undefined) {
      updates.push('spec = ?');
      params.push(spec || null);
    }
    if (grade !== undefined) {
      updates.push('grade = ?');
      params.push(grade || null);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category || null);
    }
    if (imageUrl !== undefined) {
      updates.push('image_url = ?');
      params.push(imageUrl || null);
    }
    if (sortOrder !== undefined) {
      updates.push('sort_order = ?');
      params.push(Number(sortOrder) || 0);
    }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diperbarui' });
    }

    await db.query(
      `UPDATE product_options SET ${updates.join(', ')}
        WHERE id = ? AND group_id = ?`,
      [...params, optionId, groupId]
    );

    const [rows] = await db.query(
      `SELECT id, group_id, slug, name, spec, grade, category, image_url, sort_order
         FROM product_options WHERE id = ? AND group_id = ?`,
      [optionId, groupId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Opsi produk tidak ditemukan' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    handleError(res, error, 'Update option error', 'Gagal memperbarui opsi produk');
  }
};

const deleteOption = async (req, res) => {
  try {
    const groupId = parseId(req.params.groupId);
    const optionId = parseId(req.params.optionId);
    if (!groupId || !optionId) {
      return res.status(400).json({ success: false, message: 'ID tidak valid' });
    }

    const [result] = await db.query(
      'DELETE FROM product_options WHERE id = ? AND group_id = ?',
      [optionId, groupId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Opsi produk tidak ditemukan' });
    }

    res.json({ success: true, message: 'Opsi produk berhasil dihapus' });
  } catch (error) {
    handleError(res, error, 'Delete option error', 'Gagal menghapus opsi produk');
  }
};

/* ================= Variant (ukuran + harga) ================= */

const requireOptionInGroup = async (optionId, groupId) => {
  const [rows] = await db.query(
    'SELECT id FROM product_options WHERE id = ? AND group_id = ?',
    [optionId, groupId]
  );
  return rows.length > 0;
};

const createVariant = async (req, res) => {
  try {
    const groupId = parseId(req.params.groupId);
    const optionId = parseId(req.params.optionId);
    if (!groupId || !optionId) {
      return res.status(400).json({ success: false, message: 'ID tidak valid' });
    }

    const { size, priceIDR, priceUSD, priceAED, priceEUR } = req.body;
    if (!size) {
      return res.status(400).json({ success: false, message: 'Ukuran (size) wajib diisi' });
    }
    if (!(await requireOptionInGroup(optionId, groupId))) {
      return res.status(404).json({ success: false, message: 'Opsi produk tidak ditemukan' });
    }

    const [result] = await db.query(
      `INSERT INTO product_variants (option_id, size, price_idr, price_usd, price_aed, price_eur)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        optionId,
        String(size),
        Math.round(Number(priceIDR)) || 0,
        toNumberOrNull(priceUSD),
        toNumberOrNull(priceAED),
        toNumberOrNull(priceEUR)
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        optionId,
        size: String(size),
        priceIDR: Math.round(Number(priceIDR)) || 0,
        priceUSD: toNumberOrNull(priceUSD),
        priceAED: toNumberOrNull(priceAED),
        priceEUR: toNumberOrNull(priceEUR)
      }
    });
  } catch (error) {
    handleError(res, error, 'Create variant error', 'Gagal membuat varian produk');
  }
};

const updateVariant = async (req, res) => {
  try {
    const groupId = parseId(req.params.groupId);
    const optionId = parseId(req.params.optionId);
    const variantId = parseId(req.params.variantId);
    if (!groupId || !optionId || !variantId) {
      return res.status(400).json({ success: false, message: 'ID tidak valid' });
    }

    const { size, priceIDR, priceUSD, priceAED, priceEUR } = req.body;
    const updates = [];
    const params = [];

    if (size !== undefined) {
      updates.push('size = ?');
      params.push(String(size));
    }
    if (priceIDR !== undefined) {
      updates.push('price_idr = ?');
      params.push(Math.round(Number(priceIDR)) || 0);
    }
    if (priceUSD !== undefined) {
      updates.push('price_usd = ?');
      params.push(toNumberOrNull(priceUSD));
    }
    if (priceAED !== undefined) {
      updates.push('price_aed = ?');
      params.push(toNumberOrNull(priceAED));
    }
    if (priceEUR !== undefined) {
      updates.push('price_eur = ?');
      params.push(toNumberOrNull(priceEUR));
    }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diperbarui' });
    }

    await db.query(
      `UPDATE product_variants SET ${updates.join(', ')}
        WHERE id = ? AND option_id = ? AND option_id IN
          (SELECT id FROM product_options WHERE group_id = ?)`,
      [...params, variantId, optionId, groupId]
    );

    const [rows] = await db.query(
      `SELECT v.id, v.option_id, v.size, v.price_idr, v.price_usd, v.price_aed, v.price_eur
         FROM product_variants v
        WHERE v.id = ? AND v.option_id = ?
          AND v.option_id IN (SELECT id FROM product_options WHERE group_id = ?)`,
      [variantId, optionId, groupId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Varian produk tidak ditemukan' });
    }

    res.json({ success: true, data: mapVariantRow(rows[0]) });
  } catch (error) {
    handleError(res, error, 'Update variant error', 'Gagal memperbarui varian produk');
  }
};

const deleteVariant = async (req, res) => {
  try {
    const groupId = parseId(req.params.groupId);
    const optionId = parseId(req.params.optionId);
    const variantId = parseId(req.params.variantId);
    if (!groupId || !optionId || !variantId) {
      return res.status(400).json({ success: false, message: 'ID tidak valid' });
    }

    const [result] = await db.query(
      `DELETE FROM product_variants
        WHERE id = ? AND option_id = ?
          AND option_id IN (SELECT id FROM product_options WHERE group_id = ?)`,
      [variantId, optionId, groupId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Varian produk tidak ditemukan' });
    }

    res.json({ success: true, message: 'Varian produk berhasil dihapus' });
  } catch (error) {
    handleError(res, error, 'Delete variant error', 'Gagal menghapus varian produk');
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createOption,
  updateOption,
  deleteOption,
  createVariant,
  updateVariant,
  deleteVariant
};
