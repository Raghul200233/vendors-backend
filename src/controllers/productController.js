const Product = require('../models/Product');
const { cloudinary } = require('../config/cloudinary');

// Create product with auto-generated slug
exports.createProduct = async (req, res) => {
  try {
    console.log('Creating product with data:', req.body);
    
    const { category, attributes, sizeInventory, name } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product name is required' 
      });
    }
    
    if (!req.body.basePrice) {
      return res.status(400).json({ 
        success: false, 
        message: 'Product price is required' 
      });
    }
    
    // Prepare product data
    const productData = {
      name: req.body.name,
      description: req.body.description,
      category: category || req.body.category,
      basePrice: parseFloat(req.body.basePrice),
      compareAtPrice: req.body.compareAtPrice ? parseFloat(req.body.compareAtPrice) : undefined,
      vendorId: req.vendor._id,
      isActive: true
    };
    
    // Handle attributes if provided
    if (attributes) {
      productData.attributes = attributes;
    }
    
    // Handle inventory based on category
    if (category === 'Clothing' && sizeInventory && sizeInventory.length > 0) {
      productData.sizeInventory = sizeInventory;
      // Calculate total inventory from sizes
      productData.inventory = sizeInventory.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    } else {
      productData.inventory = parseInt(req.body.inventory) || 0;
    }
    
    // Create product (slug will be generated automatically by pre-save hook)
    const product = new Product(productData);
    await product.save();
    
    console.log('Product created successfully with slug:', product.slug);
    
    res.status(201).json({ 
      success: true, 
      data: product,
      message: 'Product created successfully'
    });
    
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create product' 
    });
  }
};

// Get vendor products (for management)
exports.getVendorProducts = async (req, res) => {
  try {
    const products = await Product.find({ vendorId: req.vendor._id })
      .sort('-createdAt');
    
    console.log(`Found ${products.length} products for vendor`);
    
    res.status(200).json({ 
      success: true, 
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Get vendor products error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get all active products for customers
exports.getAllProducts = async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = { isActive: true };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const products = await Product.find(query)
      .populate('vendorId', 'storeName storeSlug')
      .sort('-createdAt');
    
    res.status(200).json({ 
      success: true, 
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get product by slug
exports.getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug })
      .populate('vendorId', 'storeName storeSlug description contactEmail');
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    // Increment view count (optional)
    product.views = (product.views || 0) + 1;
    await product.save();
    
    res.status(200).json({ 
      success: true, 
      data: product 
    });
  } catch (error) {
    console.error('Get product by slug error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('vendorId', 'storeName storeSlug');
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      data: product 
    });
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    // Check authorization
    if (product.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this product' 
      });
    }
    
    const updateData = req.body;
    
    // Handle price conversion
    if (updateData.basePrice) {
      updateData.basePrice = parseFloat(updateData.basePrice);
    }
    if (updateData.compareAtPrice) {
      updateData.compareAtPrice = parseFloat(updateData.compareAtPrice);
    }
    
    // Handle clothing inventory update
    if (product.category === 'Clothing' && updateData.sizeInventory) {
      updateData.inventory = updateData.sizeInventory.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    } else if (updateData.inventory) {
      updateData.inventory = parseInt(updateData.inventory);
    }
    
    // Update product (slug will be regenerated if name changed)
    product = await Product.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    );
    
    res.status(200).json({ 
      success: true, 
      data: product,
      message: 'Product updated successfully'
    });
    
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    // Check authorization
    if (product.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this product' 
      });
    }
    
    // Delete all images from Cloudinary
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        if (image.public_id) {
          try {
            await cloudinary.uploader.destroy(image.public_id);
            console.log(`Deleted image: ${image.public_id}`);
          } catch (cloudinaryError) {
            console.error('Failed to delete image from Cloudinary:', cloudinaryError);
          }
        }
      }
    }
    
    await product.deleteOne();
    
    res.status(200).json({ 
      success: true, 
      message: 'Product deleted successfully' 
    });
    
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ============ IMAGE UPLOAD FUNCTIONS ============

// Upload product images
exports.uploadProductImages = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    // Check authorization
    if (product.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to upload images for this product' 
      });
    }
    
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No files uploaded' 
      });
    }
    
    console.log(`Uploading ${req.files.length} images for product: ${product.name}`);
    
    // Process uploaded images
    const uploadedImages = req.files.map((file, index) => ({
      url: file.path || file.secure_url,
      public_id: file.filename || file.public_id,
      isPrimary: product.images.length === 0 && index === 0 // First image becomes primary if no images exist
    }));
    
    // Add images to product
    product.images.push(...uploadedImages);
    await product.save();
    
    res.status(200).json({
      success: true,
      message: `${uploadedImages.length} image(s) uploaded successfully`,
      data: product.images
    });
    
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to upload images' 
    });
  }
};

// Delete product image
exports.deleteProductImage = async (req, res) => {
  try {
    const { productId, imageId } = req.params;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    // Check authorization
    if (product.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete images from this product' 
      });
    }
    
    // Find the image
    const image = product.images.id(imageId);
    if (!image) {
      return res.status(404).json({ 
        success: false, 
        message: 'Image not found' 
      });
    }
    
    // Delete from Cloudinary
    if (image.public_id) {
      try {
        await cloudinary.uploader.destroy(image.public_id);
        console.log(`Deleted image from Cloudinary: ${image.public_id}`);
      } catch (cloudinaryError) {
        console.error('Failed to delete image from Cloudinary:', cloudinaryError);
      }
    }
    
    // Remove from product
    image.remove();
    
    // If the deleted image was primary and there are other images, set the first as primary
    if (image.isPrimary && product.images.length > 0) {
      product.images[0].isPrimary = true;
    }
    
    await product.save();
    
    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: product.images
    });
    
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to delete image' 
    });
  }
};

// Set primary image
exports.setPrimaryImage = async (req, res) => {
  try {
    const { productId, imageId } = req.params;
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    // Check authorization
    if (product.vendorId.toString() !== req.vendor._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized' 
      });
    }
    
    // Find the image
    const image = product.images.id(imageId);
    if (!image) {
      return res.status(404).json({ 
        success: false, 
        message: 'Image not found' 
      });
    }
    
    // Update all images to not primary
    product.images.forEach(img => {
      img.isPrimary = false;
    });
    
    // Set selected image as primary
    image.isPrimary = true;
    await product.save();
    
    res.status(200).json({
      success: true,
      message: 'Primary image updated successfully',
      data: product.images
    });
    
  } catch (error) {
    console.error('Set primary image error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to set primary image' 
    });
  }
};

// ============ BULK OPERATIONS ============

// Bulk update inventory
exports.bulkUpdateInventory = async (req, res) => {
  try {
    const { updates } = req.body; // Array of {productId, inventory}
    const results = [];
    
    for (const update of updates) {
      const product = await Product.findOne({ 
        _id: update.productId, 
        vendorId: req.vendor._id 
      });
      
      if (product) {
        product.inventory = parseInt(update.inventory);
        await product.save();
        results.push({ productId: update.productId, success: true });
      } else {
        results.push({ productId: update.productId, success: false, error: 'Product not found' });
      }
    }
    
    res.status(200).json({
      success: true,
      message: `${results.filter(r => r.success).length} products updated`,
      results
    });
    
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Bulk delete products
exports.bulkDeleteProducts = async (req, res) => {
  try {
    const { productIds } = req.body;
    let deletedCount = 0;
    
    for (const productId of productIds) {
      const product = await Product.findOne({ 
        _id: productId, 
        vendorId: req.vendor._id 
      });
      
      if (product) {
        // Delete images from Cloudinary
        if (product.images && product.images.length > 0) {
          for (const image of product.images) {
            if (image.public_id) {
              try {
                await cloudinary.uploader.destroy(image.public_id);
              } catch (err) {
                console.error('Failed to delete image:', err);
              }
            }
          }
        }
        await product.deleteOne();
        deletedCount++;
      }
    }
    
    res.status(200).json({
      success: true,
      message: `${deletedCount} products deleted successfully`
    });
    
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Get low stock products
exports.getLowStockProducts = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 10;
    
    const products = await Product.find({
      vendorId: req.vendor._id,
      inventory: { $lte: threshold },
      isActive: true
    }).sort('inventory');
    
    res.status(200).json({
      success: true,
      data: products,
      count: products.length
    });
    
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// Search products
exports.searchProducts = async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice } = req.query;
    let query = { isActive: true };
    
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ];
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (minPrice || maxPrice) {
      query.basePrice = {};
      if (minPrice) query.basePrice.$gte = parseFloat(minPrice);
      if (maxPrice) query.basePrice.$lte = parseFloat(maxPrice);
    }
    
    const products = await Product.find(query)
      .populate('vendorId', 'storeName')
      .limit(50);
    
    res.status(200).json({
      success: true,
      data: products,
      count: products.length
    });
    
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};