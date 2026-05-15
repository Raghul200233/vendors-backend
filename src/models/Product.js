const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    sparse: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  category: {
    type: String,
    required: true,
    enum: ['Electronics', 'Clothing', 'Books', 'Home', 'Beauty', 'Sports', 'Toys', 'Other']
  },
  images: [{
    url: String,
    public_id: String,
    isPrimary: Boolean
  }],
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  compareAtPrice: Number,
  inventory: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  attributes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  sizeInventory: [{
    size: String,
    quantity: Number,
    price: Number
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  totalSales: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate slug from name before validation
productSchema.pre('validate', function(next) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Generate slug before saving if name changed
productSchema.pre('save', async function(next) {
  if (this.isModified('name')) {
    let baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Make slug unique if needed
    let slug = baseSlug;
    let counter = 1;
    while (await mongoose.models.Product?.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    this.slug = slug;
  }
  this.updatedAt = Date.now();
  next();
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

module.exports = Product;