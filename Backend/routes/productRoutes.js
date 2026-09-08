const express = require('express');

const { protect } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/productController');

const router = express.Router();

// Public
router.get('/', getProducts);
router.get('/:id', getProductById);

// Admin (JWT)
router.post('/', protect, createProduct);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);

router.post('/:groupId/options', protect, createOption);
router.put('/:groupId/options/:optionId', protect, updateOption);
router.delete('/:groupId/options/:optionId', protect, deleteOption);

router.post('/:groupId/options/:optionId/variants', protect, createVariant);
router.put('/:groupId/options/:optionId/variants/:variantId', protect, updateVariant);
router.delete('/:groupId/options/:optionId/variants/:variantId', protect, deleteVariant);

module.exports = router;
