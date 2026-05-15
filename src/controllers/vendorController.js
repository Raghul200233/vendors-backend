const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Get vendor profile
exports.getProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.vendor._id)
      .populate('userId', 'name email');
    
    if (!vendor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vendor not found' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      data: vendor 
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update vendor profile
exports.updateProfile = async (req, res) => {
  try {
    const {
      storeName,
      description,
      address,
      location,
      contactEmail,
      contactPhone,
      socialLinks,
      businessHours
    } = req.body;
    
    const updateData = {
      storeName,
      description,
      address,
      location,
      contactEmail,
      contactPhone,
      socialLinks,
      businessHours,
      updatedAt: Date.now()
    };
    
    const vendor = await Vendor.findByIdAndUpdate(
      req.vendor._id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({ 
      success: true, 
      data: vendor,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Upload shop logo
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }
    
    // Delete old logo if exists
    if (req.vendor.logo && req.vendor.logo.includes('cloudinary')) {
      const publicId = req.vendor.logo.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`vendors/${req.vendor._id}/logo/${publicId}`);
    }
    
    const vendor = await Vendor.findByIdAndUpdate(
      req.vendor._id,
      { logo: req.file.path },
      { new: true }
    );
    
    res.status(200).json({ 
      success: true, 
      data: vendor.logo,
      message: 'Logo uploaded successfully'
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Upload shop banner
exports.uploadBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }
    
    // Delete old banner if exists
    if (req.vendor.banner && req.vendor.banner.includes('cloudinary')) {
      const publicId = req.vendor.banner.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`vendors/${req.vendor._id}/banner/${publicId}`);
    }
    
    const vendor = await Vendor.findByIdAndUpdate(
      req.vendor._id,
      { banner: req.file.path },
      { new: true }
    );
    
    res.status(200).json({ 
      success: true, 
      data: vendor.banner,
      message: 'Banner uploaded successfully'
    });
  } catch (error) {
    console.error('Upload banner error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Upload shop images (gallery)
exports.uploadShopImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No files uploaded' 
      });
    }
    
    const uploadedImages = req.files.map((file, index) => ({
      url: file.path,
      public_id: file.filename,
      isPrimary: req.vendor.shopImages.length === 0 && index === 0
    }));
    
    const vendor = await Vendor.findByIdAndUpdate(
      req.vendor._id,
      { $push: { shopImages: { $each: uploadedImages } } },
      { new: true }
    );
    
    res.status(200).json({ 
      success: true, 
      data: vendor.shopImages,
      message: `${uploadedImages.length} image(s) uploaded successfully`
    });
  } catch (error) {
    console.error('Upload shop images error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete shop image
exports.deleteShopImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    
    const vendor = await Vendor.findById(req.vendor._id);
    const image = vendor.shopImages.id(imageId);
    
    if (!image) {
      return res.status(404).json({ 
        success: false, 
        message: 'Image not found' 
      });
    }
    
    // Delete from Cloudinary
    if (image.public_id) {
      await cloudinary.uploader.destroy(image.public_id);
    }
    
    image.remove();
    await vendor.save();
    
    res.status(200).json({ 
      success: true, 
      data: vendor.shopImages,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete shop image error:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.getDashboard = async (req, res) => {
  try {
    const vendor = req.vendor;
    
    const totalProducts = await Product.countDocuments({ vendorId: vendor._id });
    const totalOrders = await Order.countDocuments({
      'items.vendorId': vendor._id
    });
    
    const orders = await Order.find({ 'items.vendorId': vendor._id });
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    
    // Get recent orders
    const recentOrders = await Order.find({ 'items.vendorId': vendor._id })
      .sort('-createdAt')
      .limit(5);
    
    // Get sales data for chart
    const salesData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const dayOrders = await Order.find({
        'items.vendorId': vendor._id,
        createdAt: { $gte: dayStart, $lte: dayEnd }
      });
      
      salesData.push({
        date: date.toLocaleDateString(),
        sales: dayOrders.reduce((sum, order) => sum + order.total, 0),
        orders: dayOrders.length
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        totalSales: totalRevenue,
        totalOrders,
        totalProducts,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        recentOrders,
        salesData
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.vendor._id);
    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.vendor._id,
      req.body,
      { new: true, runValidators: true }
    );
    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all active vendors for homepage
exports.getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({ isActive: true })
      .populate('userId', 'name')
      .select('storeName storeSlug logo banner description rating totalProducts')
      .sort('-createdAt');
    
    // Get product count for each vendor
    const vendorsWithCount = await Promise.all(vendors.map(async (vendor) => {
      const productCount = await Product.countDocuments({ 
        vendorId: vendor._id, 
        isActive: true 
      });
      return {
        ...vendor.toObject(),
        productCount
      };
    }));
    
    res.status(200).json({
      success: true,
      data: vendorsWithCount,
      count: vendorsWithCount.length
    });
  } catch (error) {
    console.error('Get all vendors error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get products by vendor slug (for store page)
exports.getVendorProducts = async (req, res) => {
  try {
    const { storeSlug } = req.params;
    
    // Find vendor by slug
    const vendor = await Vendor.findOne({ storeSlug, isActive: true })
      .populate('userId', 'name');
    
    if (!vendor) {
      return res.status(404).json({ 
        success: false, 
        message: 'Store not found' 
      });
    }
    
    // Get all products for this vendor
    const products = await Product.find({ 
      vendorId: vendor._id, 
      isActive: true 
    }).sort('-createdAt');
    
    res.status(200).json({
      success: true,
      vendor: {
        id: vendor._id,
        storeName: vendor.storeName,
        storeSlug: vendor.storeSlug,
        logo: vendor.logo,
        banner: vendor.banner,
        description: vendor.description,
        rating: vendor.rating,
        totalReviews: vendor.totalReviews
      },
      products: products,
      count: products.length
    });
  } catch (error) {
    console.error('Get vendor products error:', error);
    res.status(500).json({ message: error.message });
  }
};