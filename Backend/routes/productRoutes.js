const express = require('express');

const { protectAdmin } = require('../middleware/authMiddleware');
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
router.post('/', protectAdmin, createProduct);
router.put('/:id', protectAdmin, updateProduct);
router.delete('/:id', protectAdmin, deleteProduct);

router.post('/:groupId/options', protectAdmin, createOption);
router.put('/:groupId/options/:optionId', protectAdmin, updateOption);
router.delete('/:groupId/options/:optionId', protectAdmin, deleteOption);

router.post('/:groupId/options/:optionId/variants', protectAdmin, createVariant);
router.put('/:groupId/options/:optionId/variants/:variantId', protectAdmin, updateVariant);
router.delete('/:groupId/options/:optionId/variants/:variantId', protectAdmin, deleteVariant);

module.exports = router;
