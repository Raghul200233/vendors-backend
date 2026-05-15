const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const Product = require('../models/Product');

exports.getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().populate('userId', 'name email');
    res.status(200).json({ success: true, data: vendors });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );
    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPlatformStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalVendors = await Vendor.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalVendors,
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};