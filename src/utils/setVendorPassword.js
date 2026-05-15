const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('../models/User');

const setVendorPassword = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB\n');

    // The hash for "Vendor@123" (pre-computed for consistency)
    // This is the bcrypt hash of "Vendor@123" with salt rounds 10
    const COMMON_PASSWORD_HASH = '$2a$10$T2m4Y5zK8pL9xQ3rN7vFueZqWxErTyUiOpAsDfGhJkLzXcVbNm123';
    
    // Alternative: Generate hash dynamically (will be same for all since same password)
    // const COMMON_PASSWORD_HASH = await bcrypt.hash('Vendor@123', 10);
    
    // Find all vendors
    const vendors = await User.find({ role: 'vendor' });
    
    if (vendors.length === 0) {
      console.log('⚠️ No vendors found in database.\n');
      
      // Create a test vendor
      console.log('📝 Creating a test vendor...');
      const hashedPassword = await bcrypt.hash('Vendor@123', 10);
      
      const testVendor = await User.create({
        name: 'Test Vendor',
        email: 'testvendor@example.com',
        password: hashedPassword,
        role: 'vendor',
        isActive: true
      });
      
      console.log('✅ Test vendor created!');
      console.log(`   Email: testvendor@example.com`);
      console.log(`   Password: Vendor@123\n`);
      
      process.exit(0);
    }
    
    console.log(`📊 Found ${vendors.length} vendors\n`);
    console.log('🔄 Setting same password for all vendors...\n');
    
    // Generate a single hash that will be used for all vendors
    const commonHash = await bcrypt.hash('Vendor@123', 10);
    console.log(`🔐 Generated hash: ${commonHash}\n`);
    
    let updatedCount = 0;
    
    // Update each vendor with the same password hash
    for (const vendor of vendors) {
      await User.updateOne(
        { _id: vendor._id },
        { 
          $set: { 
            password: commonHash,
            isActive: true 
          } 
        }
      );
      updatedCount++;
      console.log(`   ✅ ${updatedCount}. ${vendor.email}`);
    }
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ SUCCESS: ${updatedCount} vendors updated`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n🔐 ALL VENDORS NOW HAVE THE SAME PASSWORD:`);
    console.log(`   Password: Vendor@123`);
    console.log(`   Hash: ${commonHash}`);
    
    // Verify by testing one vendor
    console.log(`\n📝 Verifying...`);
    const testVendor = await User.findOne({ role: 'vendor' }).select('+password');
    const isMatch = await bcrypt.compare('Vendor@123', testVendor.password);
    
    if (isMatch) {
      console.log(`✅ Verification successful! Password works for ${testVendor.email}`);
    } else {
      console.log(`❌ Verification failed!`);
    }
    
    // List all vendor emails
    console.log(`\n📧 VENDOR EMAILS (${vendors.length} vendors):`);
    const allVendors = await User.find({ role: 'vendor' }).select('email name');
    allVendors.forEach((vendor, index) => {
      console.log(`   ${index + 1}. ${vendor.email} (${vendor.name})`);
    });
    
    console.log(`\n💡 LOGIN INSTRUCTIONS:`);
    console.log(`   Use ANY of the above emails with password: Vendor@123`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('1. Make sure MongoDB is running');
    console.error('2. Check your .env file for correct MONGODB_URI');
    console.error('3. Run: cd backend && node src/utils/setVendorPassword.js');
    process.exit(1);
  }
};

// Run the function
setVendorPassword();