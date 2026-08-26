const db = require('../config/database');

const getProducts = async (req, res) => {
  try {
    const [products] = await db.query(
      'SELECT * FROM products ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      data: products
    });

  } catch (error) {
    console.error('Get products error:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data produk'
    });
  }
};


const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const [products] = await db.query(
      'SELECT * FROM products WHERE id = ?',
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Produk tidak ditemukan'
      });
    }

    res.json({
      success: true,
      data: products[0]
    });

  } catch (error) {
    console.error('Get product error:', error);

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil produk'
    });
  }
};


module.exports = {
  getProducts,
  getProductById
};