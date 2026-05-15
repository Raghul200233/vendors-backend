const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

// Import models
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');

// Categories
const categories = ['Electronics', 'Clothing', 'Books', 'Home', 'Beauty', 'Sports', 'Toys', 'Other'];

// Store names (10 unique stores)
const storeNames = [
  'Tech Solutions', 'Fashion Hub', 'Book World', 'Home Decor', 'Beauty Palace',
  'Sports Zone', 'Toy Kingdom', 'Gadget Store', 'Style Studio', 'Fitness First'
];

// Vendor owner names
const vendorNames = [
  'John Smith', 'Emma Wilson', 'Michael Brown', 'Sarah Johnson', 'David Lee',
  'Lisa Anderson', 'James Taylor', 'Maria Garcia', 'Robert Martinez', 'Jennifer Davis'
];

// Product names by category
const productNames = {
  Electronics: [
    'Wireless Headphones', 'Bluetooth Speaker', 'Power Bank', 'Phone Charger', 'USB Cable'
  ],
  Clothing: [
    'Cotton T-Shirt', 'Denim Jeans', 'Summer Dress', 'Winter Jacket', 'Sports Shoes'
  ],
  Books: [
    'Mystery Novel', 'Cookbook', 'Self Help Book', 'Children Story', 'History Book'
  ],
  Home: [
    'Coffee Maker', 'Bed Sheets', 'Decorative Lamp', 'Wall Clock', 'Kitchen Knife Set'
  ],
  Beauty: [
    'Face Cream', 'Lipstick', 'Shampoo', 'Perfume', 'Makeup Kit'
  ],
  Sports: [
    'Yoga Mat', 'Dumbbell Set', 'Jump Rope', 'Gym Bag', 'Water Bottle'
  ],
  Toys: [
    'LEGO Set', 'Action Figure', 'Board Game', 'Puzzle', 'Stuffed Bear'
  ],
  Other: [
    'Phone Stand', 'Keychain', 'Wallet', 'Backpack', 'Sunglasses'
  ]
};

// Generate random number between min and max
const randomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Generate random price
const generatePrice = () => {
  return parseFloat((Math.random() * 490 + 10).toFixed(2));
};

// Generate random inventory
const generateInventory = () => {
  return randomNumber(10, 100);
};

// Get random item from array
const randomItem = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)];
};

// Generate product description
const generateDescription = (productName, category) => {
  const descriptions = [
    `High-quality ${productName} perfect for your ${category.toLowerCase()} needs.`,
    `Premium ${category.toLowerCase()} product with excellent build quality.`,
    `Best-selling ${productName} with great customer reviews.`,
    `Professional grade ${productName} for the best experience.`,
    `Affordable ${productName} without compromising on quality.`,
    `Latest model ${productName} with modern features.`,
    `Durable and long-lasting ${productName} for everyday use.`,
  ];
  return randomItem(descriptions);
};

// Generate attributes based on category
const generateAttributes = (category) => {
  const attributes = {
    Electronics: {
      brand: randomItem(['Apple', 'Samsung', 'Sony', 'LG', 'Dell']),
      warranty: `${randomNumber(1, 2)} year warranty`,
      condition: 'New'
    },
    Clothing: {
      material: randomItem(['Cotton', 'Polyester', 'Wool', 'Denim', 'Silk']),
      careInstructions: 'Machine wash cold',
      gender: randomItem(['Men', 'Women', 'Unisex'])
    },
    Books: {
      author: randomItem(['John Doe', 'Jane Smith', 'Robert Brown', 'Emily Davis']),
      publisher: randomItem(['Penguin', 'HarperCollins', 'Simon & Schuster']),
      pages: randomNumber(150, 400)
    },
    Home: {
      material: randomItem(['Wood', 'Metal', 'Glass', 'Plastic', 'Fabric']),
      dimensions: `${randomNumber(20, 100)}x${randomNumber(20, 100)} cm`,
      weight: `${(Math.random() * 5 + 0.5).toFixed(1)} kg`
    },
    Beauty: {
      brand: randomItem(['L\'Oreal', 'Maybelline', 'Revlon', 'Nivea', 'Olay']),
      organic: Math.random() > 0.5,
      expiryDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000)
    },
    Sports: {
      brand: randomItem(['Nike', 'Adidas', 'Puma', 'Under Armour', 'Reebok']),
      skillLevel: randomItem(['Beginner', 'Intermediate', 'Professional'])
    }
  };
  return attributes[category] || {};
};

// Generate size inventory for clothing
const generateSizeInventory = (basePrice) => {
  const sizes = ['S', 'M', 'L', 'XL'];
  return sizes.map(size => ({
    size,
    quantity: randomNumber(10, 50),
    price: basePrice
  }));
};

// Generate slug from name
const generateSlug = (name) => {
  return name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
};

// Main function to reset and create new vendors
const resetAndCreateVendors = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Delete all existing vendors and their products
    console.log('🗑️  Deleting existing vendors and their products...');
    
    // Find all vendors to delete their products first
    const existingVendors = await Vendor.find({});
    for (const vendor of existingVendors) {
      await Product.deleteMany({ vendorId: vendor._id });
      console.log(`   Deleted products for vendor: ${vendor.storeName}`);
    }
    
    // Delete all vendors
    const deletedVendors = await Vendor.deleteMany({});
    console.log(`   Deleted ${deletedVendors.deletedCount} vendors\n`);
    
    // Delete vendor users
    const deletedUsers = await User.deleteMany({ role: 'vendor' });
    console.log(`   Deleted ${deletedUsers.deletedCount} vendor users\n`);
    
    console.log('✅ All existing vendors and products cleared!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 2. Create 10 new vendors with 5 products each
    console.log('📦 Creating 10 new vendors with 5 products each...\n');
    
    const vendors = [];
    const allProducts = [];
    
    for (let i = 0; i < 10; i++) {
      const storeName = storeNames[i];
      const slug = generateSlug(storeName);
      const email = `vendor${i + 1}@${slug}.com`;
      const hashedPassword = await bcrypt.hash('Vendor@123', 10);
      const vendorName = vendorNames[i];
      
      // Create user for vendor
      const user = await User.create({
        name: vendorName,
        email: email,
        password: hashedPassword,
        role: 'vendor',
        isActive: true,
        createdAt: new Date()
      });
      
      // Create vendor profile
      const vendor = await Vendor.create({
        userId: user._id,
        storeName: storeName,
        storeSlug: slug,
        description: `Welcome to ${storeName}! We offer high-quality products at affordable prices. Shop with us for the best deals.`,
        contactEmail: email,
        contactPhone: `+1 ${randomNumber(200, 999)}-${randomNumber(100, 999)}-${randomNumber(1000, 9999)}`,
        isActive: true,
        commission: 10,
        totalSales: 0,
        totalRevenue: 0,
        createdAt: new Date()
      });
      
      user.vendorId = vendor._id;
      await user.save();
      
      vendors.push(vendor);
      console.log(`✅ Vendor ${i + 1}/10: ${storeName}`);
      console.log(`   📧 Email: ${email}`);
      console.log(`   🔑 Password: Vendor@123`);
      console.log(`   👤 Owner: ${vendorName}`);
      
      // Create 5 products for this vendor
      console.log(`   📝 Creating 5 products...`);
      
      for (let j = 0; j < 5; j++) {
        // Assign categories in rotation to ensure variety
        const categoryIndex = (i * 5 + j) % categories.length;
        const category = categories[categoryIndex];
        
        // Get product name based on category
        const categoryProducts = productNames[category] || productNames.Other;
        const productNameIndex = j % categoryProducts.length;
        const productName = categoryProducts[productNameIndex];
        const fullProductName = `${productName} ${randomNumber(100, 999)}`;
        
        const basePrice = generatePrice();
        const inventory = generateInventory();
        
        // Create product WITHOUT images
        const productData = {
          vendorId: vendor._id,
          name: fullProductName,
          description: generateDescription(productName, category),
          category: category,
          images: [], // Empty array - no images initially
          basePrice: basePrice,
          compareAtPrice: Math.random() > 0.7 ? basePrice * 1.2 : undefined,
          inventory: inventory,
          attributes: generateAttributes(category),
          isActive: true,
          totalSales: 0,
          views: 0,
          createdAt: new Date()
        };
        
        // Add size inventory for clothing
        if (category === 'Clothing') {
          productData.sizeInventory = generateSizeInventory(basePrice);
          productData.inventory = productData.sizeInventory.reduce((sum, s) => sum + s.quantity, 0);
        }
        
        const product = await Product.create(productData);
        allProducts.push(product);
        console.log(`      - ${fullProductName} (${category}) - $${basePrice}`);
      }
      
      console.log(`   ✅ Created 5 products for ${storeName}\n`);
    }
    
    // Display final summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DATABASE RESET AND SEEDING COMPLETED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Summary:`);
    console.log(`   • Vendors created: ${vendors.length}`);
    console.log(`   • Products created: ${allProducts.length}`);
    console.log(`   • Products per vendor: 5`);
    
    // Category distribution
    const categoryCount = {};
    allProducts.forEach(p => {
      categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
    });
    
    console.log(`\n📂 Category Distribution:`);
    Object.entries(categoryCount).forEach(([cat, count]) => {
      console.log(`   • ${cat}: ${count} products`);
    });
    
    // Vendor credentials
    console.log(`\n🔐 VENDOR LOGIN CREDENTIALS (All vendors):`);
    console.log(`   Password for ALL vendors: Vendor@123`);
    console.log(`\n   Vendor Emails:`);
    for (let i = 0; i < vendors.length; i++) {
      const vendor = vendors[i];
      const user = await User.findById(vendor.userId);
      console.log(`   ${i + 1}. ${user.email}`);
    }
    
    console.log(`\n💡 INSTRUCTIONS:`);
    console.log(`   1. Login with any vendor email and password: Vendor@123`);
    console.log(`   2. Go to Vendor Dashboard → Products`);
    console.log(`   3. Click "Add Product" or edit existing products`);
    console.log(`   4. Upload images for your products`);
    console.log(`\n📝 Sample Login:`);
    console.log(`   Email: vendor1@tech-solutions.com`);
    console.log(`   Password: Vendor@123`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Run the function
resetAndCreateVendors();