const express = require('express');
const {
  getInventoryStats,
  getInventory,
  updateInventory,
  bulkUpdateInventory,
  getLowStockAlerts,
  getInventoryHistory,
  setLowStockThreshold,
  exportInventoryReport
} = require('../controllers/inventoryController');
const { protect, vendorOwnership } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and vendor ownership
router.use(protect);
router.use(vendorOwnership);

// Inventory dashboard
router.get('/stats', getInventoryStats);
router.get('/alerts', getLowStockAlerts);
router.get('/export', exportInventoryReport);
router.get('/', getInventory);
router.get('/history/:productId', getInventoryHistory);

// Inventory management
router.put('/update', updateInventory);
router.post('/bulk-update', bulkUpdateInventory);
router.put('/threshold', setLowStockThreshold);

module.exports = router;