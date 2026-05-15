const User = require('../models/User');
const Vendor = require('../models/Vendor');
const jwt = require('jsonwebtoken');
const { sendEmail } = require('../utils/sendEmail');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Register with admin notification
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, storeName, storeDescription } = req.body;
    
    console.log('Registration attempt:', { name, email, role, storeName });
    
    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'customer'
    });
    
    let vendor = null;
    
    // If vendor, create vendor profile and notify admin
    if (role === 'vendor') {
      if (!storeName) {
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({ message: 'Store name required for vendor' });
      }
      
      // Generate slug from store name
      const storeSlug = storeName
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      vendor = await Vendor.create({
        userId: user._id,
        storeName: storeName,
        storeSlug: storeSlug,
        description: storeDescription || '',
        contactEmail: email,
        isActive: false // Requires admin approval
      });
      
      user.vendorId = vendor._id;
      await user.save();
      
      // Send notification to admin (via email or create notification in DB)
      await notifyAdminNewVendor(vendor, user);
    }
    
    const token = generateToken(user._id);
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        vendorId: user.vendorId
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Notify admin about new vendor registration
const notifyAdminNewVendor = async (vendor, user) => {
  try {
    // Find admin users
    const admins = await User.find({ role: 'super_admin' });
    
    // Create notification in database (if you have a Notification model)
    // We'll create a simple notifications collection
    const Notification = require('../models/Notification');
    
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: 'New Vendor Registration',
        message: `${user.name} has registered as a vendor with store "${vendor.storeName}". Please review and approve.`,
        type: 'vendor_approval',
        referenceId: vendor._id,
        isRead: false
      });
      
      // Also send email notification
      try {
        await sendEmail({
          email: admin.email,
          subject: 'New Vendor Registration - Action Required',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">New Vendor Registration</h2>
              <p>A new vendor has registered on the platform and needs your approval.</p>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><strong>Store Name:</strong> ${vendor.storeName}</p>
                <p><strong>Owner Name:</strong> ${user.name}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Registered:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <a href="${process.env.FRONTEND_URL}/admin/vendors" style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Review Vendor</a>
            </div>
          `
        });
        console.log(`Notification email sent to admin: ${admin.email}`);
      } catch (emailError) {
        console.error('Failed to send admin notification email:', emailError);
      }
    }
  } catch (error) {
    console.error('Error notifying admin:', error);
  }
};

// Login function remains the same
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }
    
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is disabled. Please contact support.' });
    }
    
    const token = generateToken(user._id);
    
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        vendorId: user.vendorId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = { register: exports.register, login: exports.login, getMe: exports.getMe };