const express = require('express');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const router = express.Router();

// Auth middleware for admin
const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    
    if (!req.user || req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

router.use(adminAuth);

// ============ VENDOR MANAGEMENT ============

// Get all vendors (FIXED - Now returns only vendors, not customers)
router.get('/vendors', async (req, res) => {
  try {
    console.log('Fetching all vendors...');
    
    // Find all vendors and populate user data
    const vendors = await Vendor.find()
      .populate('userId', 'name email isActive createdAt')
      .sort('-createdAt');
    
    console.log(`Found ${vendors.length} vendors`);
    
    // Get additional stats for each vendor
    const vendorsWithStats = await Promise.all(vendors.map(async (vendor) => {
      // Count products for this vendor
      const productCount = await Product.countDocuments({ vendorId: vendor._id });
      
      // Get orders for this vendor
      const orders = await Order.find({ 'items.vendorId': vendor._id });
      const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
      const totalOrders = orders.length;
      
      return {
        ...vendor.toObject(),
        totalProducts: productCount,
        totalOrders: totalOrders,
        totalRevenue: totalRevenue,
        // Ensure user data is included
        userId: vendor.userId || { name: 'N/A', email: 'N/A' }
      };
    }));
    
    res.json({ 
      success: true, 
      data: vendorsWithStats,
      count: vendorsWithStats.length
    });
    
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get pending vendors (awaiting approval)
router.get('/vendors/pending', async (req, res) => {
  try {
    const pendingVendors = await Vendor.find({ isActive: false })
      .populate('userId', 'name email createdAt')
      .sort('-createdAt');
    
    res.json({ 
      success: true, 
      data: pendingVendors,
      count: pendingVendors.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single vendor details
router.get('/vendors/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id)
      .populate('userId', 'name email isActive createdAt');
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Get additional stats
    const productCount = await Product.countDocuments({ vendorId: vendor._id });
    const orders = await Order.find({ 'items.vendorId': vendor._id });
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    
    res.json({ 
      success: true, 
      data: {
        ...vendor.toObject(),
        totalProducts: productCount,
        totalOrders: orders.length,
        totalRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve vendor
router.put('/vendors/:id/approve', async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).populate('userId', 'name email');
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Activate the associated user
    await User.findByIdAndUpdate(vendor.userId._id, { isActive: true });
    
    // Send approval notification to vendor
    const Notification = require('../models/Notification');
    await Notification.create({
      userId: vendor.userId._id,
      title: 'Store Approved!',
      message: `Congratulations! Your store "${vendor.storeName}" has been approved. You can now start selling.`,
      type: 'vendor_approval',
      referenceId: vendor._id,
      referenceModel: 'Vendor'
    });
    
    // Send email notification to vendor
    const { sendEmail } = require('../utils/sendEmail');
    await sendEmail({
      email: vendor.userId.email,
      subject: 'Your Store Has Been Approved!',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2>Congratulations ${vendor.userId.name}!</h2>
          <p>Your store "${vendor.storeName}" has been approved by the admin.</p>
          <p>You can now:</p>
          <ul>
            <li>Add products to your store</li>
            <li>Manage your inventory</li>
            <li>Start selling to customers</li>
          </ul>
          <a href="${process.env.FRONTEND_URL}/vendor/dashboard">Go to Vendor Dashboard</a>
        </div>
      `
    });
    
    res.json({ success: true, data: vendor, message: 'Vendor approved successfully' });
  } catch (error) {
    console.error('Approve vendor error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Suspend vendor
router.put('/vendors/:id/suspend', async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { isActive: 'suspended' },
      { new: true }
    ).populate('userId', 'name email');
    
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Suspend the associated user
    await User.findByIdAndUpdate(vendor.userId._id, { isActive: false });
    
    res.json({ success: true, data: vendor, message: 'Vendor suspended' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update vendor commission
router.put('/vendors/:id/commission', async (req, res) => {
  try {
    const { commission } = req.body;
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { commission },
      { new: true }
    );
    res.json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete vendor
router.delete('/vendors/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }
    
    // Delete associated products
    await Product.deleteMany({ vendorId: vendor._id });
    
    // Delete associated user
    await User.findByIdAndDelete(vendor.userId);
    
    // Delete vendor
    await vendor.deleteOne();
    
    res.json({ success: true, message: 'Vendor and all associated data deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ CUSTOMER MANAGEMENT ============

// Get all customers
router.get('/customers', async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' })
      .select('-password')
      .sort('-createdAt');
    
    // Get order stats for each customer
    const customersWithStats = await Promise.all(customers.map(async (customer) => {
      const orders = await Order.find({ userId: customer._id });
      const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
      
      return {
        ...customer.toObject(),
        totalOrders: orders.length,
        totalSpent
      };
    }));
    
    res.json({ success: true, data: customersWithStats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Suspend customer
router.put('/customers/:id/suspend', async (req, res) => {
  try {
    const customer = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password');
    
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Activate customer
router.put('/customers/:id/activate', async (req, res) => {
  try {
    const customer = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select('-password');
    
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update customer info
router.put('/customers/:id', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const customer = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone },
      { new: true }
    ).select('-password');
    
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete customer
router.delete('/customers/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ NOTIFICATIONS ============

// Get admin notifications
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort('-createdAt')
      .limit(50);
    
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user._id, 
      isRead: false 
    });
    
    res.json({ 
      success: true, 
      data: notifications,
      unreadCount 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ============ PLATFORM STATS ============

// Get platform statistics
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalVendors = await Vendor.countDocuments();
    const activeVendors = await Vendor.countDocuments({ isActive: true });
    const pendingVendors = await Vendor.countDocuments({ isActive: false });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    // Recent activities
    const recentVendors = await Vendor.find()
      .populate('userId', 'name')
      .sort('-createdAt')
      .limit(5);
    
    const recentOrders = await Order.find()
      .populate('userId', 'name')
      .sort('-createdAt')
      .limit(5);
    
    res.json({
      success: true,
      data: {
        totalUsers,
        totalVendors,
        activeVendors,
        pendingVendors,
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        recentVendors,
        recentOrders
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;