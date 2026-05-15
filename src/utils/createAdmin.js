const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model
const User = require('../models/User');

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'super_admin' });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email:', existingAdmin.email);
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('SuperAdmin@123', 10);
    
    const admin = new User({
      name: 'Super Administrator',
      email: 'superadmin@gmail.com',
      password: hashedPassword,
      role: 'super_admin',
      isActive: true
    });

    await admin.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: superadmin@gmail.com');
    console.log('🔑 Password: SuperAdmin@123');
    console.log('👤 Role: super_admin');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();