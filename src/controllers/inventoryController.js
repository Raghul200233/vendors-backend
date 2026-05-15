const Product = require('../models/Product');
const Vendor = require('../models/Vendor');

// Get inventory dashboard stats
exports.getInventoryStats = async (req, res) => {
  try {
    const vendor = req.vendor;
    
    const products = await Product.find({ vendorId: vendor._id });
    
    const stats = {
      totalProducts: products.length,
      totalStock: products.reduce((sum, p) => sum + p.inventory, 0),
      lowStockProducts: products.filter(p => p.inventory <= p.lowStockThreshold).length,
      outOfStockProducts: products.filter(p => p.inventory === 0).length,
      totalValue: products.reduce((sum, p) => sum + (p.inventory * p.basePrice), 0),
      topProducts: products.sort((a, b) => b.totalSales - a.totalSales).slice(0, 5)
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all inventory items
exports.getInventory = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const vendor = req.vendor;
    
    let query = { vendorId: vendor._id };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status === 'low') {
      query.inventory = { $lte: query.lowStockThreshold };
    } else if (status === 'out') {
      query.inventory = 0;
    }
    
    const products = await Product.find(query)
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Product.countDocuments(query);
    
    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update inventory (bulk or single)
exports.updateInventory = async (req, res) => {
  try {
    const { productId, quantity, type, reason } = req.body;
    const vendor = req.vendor;
    
    const product = await Product.findOne({ _id: productId, vendorId: vendor._id });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    await product.updateInventory(quantity, type, `Manual ${type}`, reason);
    
    res.json({
      success: true,
      message: 'Inventory updated successfully',
      data: product
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Bulk inventory update
exports.bulkUpdateInventory = async (req, res) => {
  try {
    const { updates } = req.body; // Array of {productId, quantity, type}
    const vendor = req.vendor;
    const results = [];
    
    for (const update of updates) {
      const product = await Product.findOne({ _id: update.productId, vendorId: vendor._id });
      if (product) {
        await product.updateInventory(update.quantity, update.type, 'Bulk update');
        results.push({ productId: update.productId, success: true });
      } else {
        results.push({ productId: update.productId, success: false, error: 'Product not found' });
      }
    }
    
    res.json({
      success: true,
      message: `${results.filter(r => r.success).length} products updated`,
      results
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get low stock alerts
exports.getLowStockAlerts = async (req, res) => {
  try {
    const vendor = req.vendor;
    
    const lowStockProducts = await Product.find({
      vendorId: vendor._id,
      inventory: { $lte: '$lowStockThreshold' },
      isActive: true
    }).sort('inventory');
    
    res.json({
      success: true,
      data: lowStockProducts,
      count: lowStockProducts.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get inventory history for a product
exports.getInventoryHistory = async (req, res) => {
  try {
    const { productId } = req.params;
    const vendor = req.vendor;
    
    const product = await Product.findOne({ _id: productId, vendorId: vendor._id });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({
      success: true,
      data: product.inventoryHistory.sort((a, b) => b.createdAt - a.createdAt)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Set low stock threshold
exports.setLowStockThreshold = async (req, res) => {
  try {
    const { productId, threshold } = req.body;
    const vendor = req.vendor;
    
    const product = await Product.findOneAndUpdate(
      { _id: productId, vendorId: vendor._id },
      { lowStockThreshold: threshold },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({
      success: true,
      message: 'Low stock threshold updated',
      data: product
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Export inventory report
exports.exportInventoryReport = async (req, res) => {
  try {
    const vendor = req.vendor;
    
    const products = await Product.find({ vendorId: vendor._id })
      .select('name sku inventory basePrice totalSales lowStockThreshold');
    
    const report = {
      generatedAt: new Date(),
      vendor: vendor.storeName,
      totalProducts: products.length,
      totalValue: products.reduce((sum, p) => sum + (p.inventory * p.basePrice), 0),
      products: products.map(p => ({
        name: p.name,
        sku: p.sku,
        stock: p.inventory,
        price: p.basePrice,
        value: p.inventory * p.basePrice,
        totalSold: p.totalSales,
        status: p.inventory === 0 ? 'Out of Stock' : 
                p.inventory <= p.lowStockThreshold ? 'Low Stock' : 'In Stock'
      }))
    };
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};