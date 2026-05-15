const express = require('express');
const {
  getDashboard,
  getProfile,
  updateProfile,
  uploadLogo,
  uploadBanner,
  uploadShopImages,
  deleteShopImage,
  getAllVendors,
  getVendorProducts
} = require('../controllers/vendorController');
const { protect, authorize, vendorOwnership } = require('../middleware/auth');
const { uploadSingle, uploadMultiple } = require('../config/cloudinary');

const router = express.Router();

// Public routes
router.get('/all', getAllVendors);
router.get('/store/:storeSlug', getVendorProducts);

// Protected routes
router.use(protect);
router.use(authorize('vendor', 'super_admin'));
router.use(vendorOwnership);

// Dashboard and profile
router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Image uploads
router.post('/upload-logo', uploadSingle, uploadLogo);
router.post('/upload-banner', uploadSingle, uploadBanner);
router.post('/upload-shop-images', uploadMultiple, uploadShopImages);
router.delete('/shop-images/:imageId', deleteShopImage);

module.exports = router;