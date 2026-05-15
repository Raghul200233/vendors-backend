const express = require('express');
const {
  createProduct,
  getVendorProducts,
  getAllProducts,
  getProductBySlug,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  deleteProductImage,
  setPrimaryImage
} = require('../controllers/productController');
const { protect, vendorOwnership } = require('../middleware/auth');
const { uploadMultiple } = require('../config/cloudinary');

const router = express.Router();

// Public routes
router.get('/', getAllProducts);
router.get('/slug/:slug', getProductBySlug);

// Protected routes
router.use(protect);
router.use(vendorOwnership);

// Product CRUD
router.get('/vendor/myproducts', getVendorProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

// Image routes
router.post('/:id/images', uploadMultiple, uploadProductImages);
router.delete('/:productId/images/:imageId', deleteProductImage);
router.put('/:productId/images/:imageId/primary', setPrimaryImage);

module.exports = router;