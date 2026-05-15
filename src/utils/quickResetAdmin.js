const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const quickResetAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = require('../models/User');
    
    // Delete ALL existing admins
    const deleted = await User.deleteMany({ role: 'super_admin' });
    console.log(`Deleted ${deleted.deletedCount} existing admin(s)`);
    
    // Create new admin
    const hashedPassword = await bcrypt.hash('SuperAdmin@123', 10);
    
    const newAdmin = new User({
      name: 'Super Administrator',
      email: 'superadmin@gmail.com',
      password: hashedPassword,
      role: 'super_admin',
      isActive: true
    });
    
    await newAdmin.save();
    
    console.log('\n✅ NEW ADMIN CREATED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email: superadmin@gmail.com');
    console.log('Password: SuperAdmin@123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

quickResetAdmin();